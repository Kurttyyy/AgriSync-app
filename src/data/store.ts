import { useSyncExternalStore } from 'react'
import { seed } from './seed'
import { defaultRiceSeason, uid } from './util'
import {
  emptyDatabase,
  loadFarmerData,
  requireSupabase,
  saveFarmerData,
  supabaseConfigured,
} from './supabase'
import type { AppSettings, AuthState, AuthUser, CashAdvance, DB, Expense, Farmer, OutboxItem, Repayment, SyncLog, User } from '../domain/types'

const KEYS = {
  db: 'agriledger.db.v1',
  outbox: 'agriledger.outbox.v1',
  logs: 'agriledger.synclogs.v1',
  settings: 'agriledger.settings.v1',
  meta: 'agriledger.meta.v1',
  auth: 'agriledger.auth.v1',
  users: 'agriledger.users.v1',
  owner: 'agriledger.owner.v1',
  legacyDb: 'agriledger.legacy.db.v1',
}

const DEFAULT_SETTINGS: AppSettings = {
  region: '',
  autoSync: true,
  preferredChannel: 'cloud-api',
  lastFullSync: new Date().toISOString(),
  mail: {
    serviceId: '',
    templateId: '',
    publicKey: '',
  },
}

export interface AppState {
  db: DB
  outbox: OutboxItem[]
  syncLogs: SyncLog[]
  settings: AppSettings
  auth: AuthState
  users: User[]
  online: boolean
  syncing: boolean
  syncingPct: number
  lastSyncAt: string | null
  seeded: boolean
  authReady: boolean
  databaseError: string | null
  databaseSaveStatus: 'saved' | 'pending' | 'saving' | 'error'
  databaseSavedAt: string | null
  databaseSaveError: string | null
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch (error) {
    reportStorageError(key, error)
    return fallback
  }
}

function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    reportStorageError(key, error)
  }
}

function reportStorageError(key: string, error: unknown): void {
  console.error(`Unable to access saved application data for "${key}".`, error)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('agriledger:storage-error', { detail: { key } }))
  }
}

const meta = load<{ seeded?: boolean; lastSyncAt?: string | null } | null>(KEYS.meta, null)
let localOwnerId = load<string | null>(KEYS.owner, null)
const loadedUsers = load<unknown>(KEYS.users, seed.users)
const users = (Array.isArray(loadedUsers) ? loadedUsers : seed.users)
  .filter((user): user is User => user?.role === 'farmer' && typeof user.farmerId === 'string')
const savedAuth = load<AuthState>(KEYS.auth, { user: null, authenticated: false })
const signedInUser = savedAuth.user?.id === localOwnerId && savedAuth.user.role === 'farmer'
  ? savedAuth.user
  : savedAuth.user
    ? users.find((user) => user.id === savedAuth.user?.id && user.role === 'farmer')
    : undefined
type StoredCashAdvance = Omit<CashAdvance, 'kind'> & { kind: CashAdvance['kind'] | 'microloan' }
const loadedDb = load<Partial<Omit<DB, 'cashAdvances'>> & {
  cashAdvances?: StoredCashAdvance[]
  investments?: StoredCashAdvance[]
}>(KEYS.db, {})
function normalizeCashAdvance(advance: StoredCashAdvance): CashAdvance {
  return {
    ...advance,
    kind: advance.kind === 'microloan' ? 'cash-advance' : advance.kind,
    dueAfterHarvest: advance.dueAfterHarvest ?? false,
    repayments: Array.isArray(advance.repayments) ? advance.repayments : [],
  }
}
function normalizeLegacyExpense(expense: Expense): Expense {
  const season = typeof expense.season === 'string' && expense.season.trim()
    ? expense.season
    : defaultRiceSeason(new Date(expense.date))
  if (expense.category !== 'other') return { ...expense, season }
  return {
    ...expense,
    season,
    category: expense.description?.trim() || 'Unspecified expense',
    description: undefined,
  }
}
const migratedCashAdvances = !Array.isArray(loadedDb.cashAdvances) && Array.isArray(loadedDb.investments)
  ? loadedDb.investments.map((advance) => ({
    ...normalizeCashAdvance(advance),
    repayments: (advance.repayments ?? []).map((repayment) => {
      const legacyRepayment = repayment as Repayment & { investmentId?: string }
      const { cashAdvanceId, investmentId, ...rest } = legacyRepayment
      return { ...rest, cashAdvanceId: cashAdvanceId ?? investmentId ?? advance.id }
    }),
  }))
  : []
const loadedOutbox = load<unknown>(KEYS.outbox, [])
const loadedSyncLogs = load<unknown>(KEYS.logs, [])
const normalizedExpenses = Array.isArray(loadedDb.expenses)
  ? loadedDb.expenses.map(normalizeLegacyExpense)
  : seed.db.expenses

function loadSettings(): AppSettings {
  const saved = load<Partial<AppSettings>>(KEYS.settings, {})
  return {
    ...DEFAULT_SETTINGS,
    ...saved,
    mail: { ...DEFAULT_SETTINGS.mail, ...(saved.mail ?? {}) },
  }
}

let state: AppState = {
  db: {
    farmers: Array.isArray(loadedDb.farmers) ? loadedDb.farmers : seed.db.farmers,
    plots: Array.isArray(loadedDb.plots) ? loadedDb.plots : seed.db.plots,
    visits: Array.isArray(loadedDb.visits) ? loadedDb.visits : seed.db.visits,
    cashAdvances: Array.isArray(loadedDb.cashAdvances)
      ? loadedDb.cashAdvances.map(normalizeCashAdvance)
      : migratedCashAdvances,
    expenses: normalizedExpenses.map(normalizeLegacyExpense),
    harvests: Array.isArray(loadedDb.harvests) ? loadedDb.harvests : [],
    budgets: Array.isArray(loadedDb.budgets) ? loadedDb.budgets : [],
  },
  outbox: Array.isArray(loadedOutbox) ? loadedOutbox : [],
  syncLogs: Array.isArray(loadedSyncLogs) ? loadedSyncLogs : [],
  settings: loadSettings(),
  auth: savedAuth.authenticated && signedInUser
    ? { user: publicUser(signedInUser), authenticated: true }
    : { user: null, authenticated: false },
  users,
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  syncing: false,
  syncingPct: 0,
  lastSyncAt: meta?.lastSyncAt ?? null,
  seeded: true,
  authReady: Boolean(savedAuth.authenticated && signedInUser),
  databaseError: null,
  databaseSaveStatus: savedAuth.authenticated ? 'pending' : 'saved',
  databaseSavedAt: null,
  databaseSaveError: null,
}
if (migratedCashAdvances.length > 0 ||
  (Array.isArray(loadedDb.cashAdvances) && loadedDb.cashAdvances.some((advance) =>
    advance.kind === 'microloan' || advance.dueAfterHarvest == null || !Array.isArray(advance.repayments))) ||
  (Array.isArray(loadedDb.expenses) && loadedDb.expenses.some((expense) =>
    expense.category === 'other' ||
    typeof (expense as { season?: unknown }).season !== 'string' ||
    !(expense as { season?: string }).season?.trim())) ||
  !Array.isArray(loadedDb.expenses) ||
  !Array.isArray(loadedDb.farmers) || !Array.isArray(loadedDb.plots) || !Array.isArray(loadedDb.visits) ||
  !Array.isArray(loadedDb.cashAdvances) ||
  !Array.isArray(loadedDb.harvests) ||
  !Array.isArray(loadedDb.budgets)) {
  save(KEYS.db, state.db)
}

const registeredFarmerIds = new Set(state.users.flatMap((user) => [
  ...(user.farmerIds ?? []),
  ...(user.farmerId ? [user.farmerId] : []),
]))
const farmerOnlyDb: DB = localOwnerId ? state.db : {
  farmers: state.db.farmers.filter((farmer) => registeredFarmerIds.has(farmer.id)),
  plots: state.db.plots.filter((plot) => registeredFarmerIds.has(plot.farmerId)),
  visits: state.db.visits.filter((visit) => registeredFarmerIds.has(visit.farmerId)),
  cashAdvances: state.db.cashAdvances.filter((advance) => registeredFarmerIds.has(advance.farmerId)),
  expenses: state.db.expenses.filter((expense) => registeredFarmerIds.has(expense.farmerId)),
  harvests: (state.db.harvests ?? []).filter((harvest) => registeredFarmerIds.has(harvest.farmerId)),
  budgets: (state.db.budgets ?? []).filter((budget) => registeredFarmerIds.has(budget.farmerId)),
}
const ownedRecordIds = new Set([
  ...farmerOnlyDb.farmers.map((farmer) => farmer.id),
  ...farmerOnlyDb.plots.map((plot) => plot.id),
  ...farmerOnlyDb.visits.map((visit) => visit.id),
  ...farmerOnlyDb.cashAdvances.map((advance) => advance.id),
  ...farmerOnlyDb.expenses.map((expense) => expense.id),
  ...farmerOnlyDb.harvests.map((harvest) => harvest.id),
  ...farmerOnlyDb.budgets.map((budget) => budget.id),
])
const farmerOnlyOutbox = state.outbox.filter((item) => ownedRecordIds.has(item.entityId))
if (JSON.stringify(farmerOnlyDb) !== JSON.stringify(state.db)) {
  state = { ...state, db: farmerOnlyDb }
  save(KEYS.db, farmerOnlyDb)
}
if (farmerOnlyOutbox.length !== state.outbox.length) {
  state = { ...state, outbox: farmerOnlyOutbox }
  save(KEYS.outbox, farmerOnlyOutbox)
}
const authenticatedFarmerIds = state.auth.user?.farmerIds?.length
  ? state.auth.user.farmerIds
  : state.auth.user?.farmerId
    ? [state.auth.user.farmerId]
    : []
if (state.auth.user && !authenticatedFarmerIds.some((id) => farmerOnlyDb.farmers.some((farmer) => farmer.id === id))) {
  state = { ...state, auth: { user: null, authenticated: false } }
  save(KEYS.auth, state.auth)
}

const listeners = new Set<() => void>()

function preserveLegacyLocalData(): void {
  if (localOwnerId !== null || Object.values(state.db).every((records) => records.length === 0)) return
  save(KEYS.legacyDb, state.db)
}

function persist(patch: Partial<AppState>): void {
  if ('db' in patch) save(KEYS.db, patch.db)
  if ('outbox' in patch) save(KEYS.outbox, patch.outbox)
  if ('syncLogs' in patch) save(KEYS.logs, patch.syncLogs)
  if ('settings' in patch) save(KEYS.settings, patch.settings)
  if ('auth' in patch) {
    save(KEYS.auth, patch.auth)
    localOwnerId = patch.auth?.user?.id ?? null
    save(KEYS.owner, localOwnerId)
  }
  if ('users' in patch) save(KEYS.users, patch.users)
  if ('lastSyncAt' in patch) save(KEYS.meta, { seeded: true, lastSyncAt: patch.lastSyncAt })
  if ('db' in patch && patch.db && state.auth.user) {
    const userId = state.auth.user.id
    state = { ...state, databaseSaveStatus: 'pending', databaseSaveError: null }
    scheduleDatabaseSave(userId, patch.db)
  }
}

let databaseSaveTimer: ReturnType<typeof setTimeout> | undefined
let databaseSaveQueue: Promise<void> = Promise.resolve()

function queueDatabaseSave(userId: string, db: DB): Promise<void> {
  const saveRequest = databaseSaveQueue.then(async () => {
    if (state.auth.user?.id !== userId) return
    if (!state.online) {
      setState({ databaseSaveStatus: 'pending' })
      return
    }
    setState({ databaseSaveStatus: 'saving', databaseSaveError: null })
    await saveFarmerData(userId, db)
    if (state.auth.user?.id === userId && state.db === db) {
      setState({
        databaseSaveStatus: 'saved',
        databaseSavedAt: new Date().toISOString(),
        databaseSaveError: null,
      })
    }
  }).catch((error: unknown) => {
    if (state.auth.user?.id === userId) {
      const message = error instanceof Error ? error.message : 'Unable to save data to the database.'
      setState({ databaseSaveStatus: 'error', databaseSaveError: message })
    }
    reportDatabaseError(error)
    throw error
  })
  databaseSaveQueue = saveRequest.catch(() => undefined)
  return saveRequest
}

function scheduleDatabaseSave(userId: string, db: DB): void {
  if (databaseSaveTimer) clearTimeout(databaseSaveTimer)
  databaseSaveTimer = setTimeout(() => {
    databaseSaveTimer = undefined
    if (state.auth.user?.id !== userId || !state.online) return
    void queueDatabaseSave(userId, db).catch(() => undefined)
  }, 350)
}

export async function syncDatabaseNow(): Promise<void> {
  const userId = state.auth.user?.id
  if (!userId) throw new Error('Sign in before syncing account records.')
  if (!state.online) throw new Error('You are offline. Your changes will sync when the connection returns.')
  if (databaseSaveTimer) {
    clearTimeout(databaseSaveTimer)
    databaseSaveTimer = undefined
  }
  await queueDatabaseSave(userId, state.db)
}

export async function replaceAccountDatabase(db: DB): Promise<void> {
  if (!state.auth.user) throw new Error('Sign in before restoring an account backup.')
  setState({ db, outbox: [] })
  if (state.online) await syncDatabaseNow()
}

function reportDatabaseError(error: unknown): void {
  const message = error instanceof Error ? error.message : 'Unable to save data to the database.'
  console.error('Database operation failed.', error)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('agriledger:database-error', { detail: { message } }))
  }
}

export function setState(patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)): void {
  const next = typeof patch === 'function' ? patch(state) : patch
  state = { ...state, ...next }
  persist(next)
  listeners.forEach((l) => l())
}

export function getState(): AppState {
  return state
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useAppState<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(subscribe, () => selector(getState()))
}

function authUserFromSupabase(user: {
  id: string
  email?: string
  user_metadata?: Record<string, unknown>
}, farmerIds: string[] = []): AuthUser {
  const metadata = user.user_metadata ?? {}
  const name = typeof metadata.name === 'string' ? metadata.name : user.email ?? 'Farmer'
  const metadataFarmerIds = Array.isArray(metadata.farmerIds)
    ? metadata.farmerIds.filter((id): id is string => typeof id === 'string')
    : []
  const farmerId = typeof metadata.farmerId === 'string' ? metadata.farmerId : farmerIds[0]
  const ids = [...new Set([...metadataFarmerIds, ...farmerIds, ...(farmerId ? [farmerId] : [])])]
  return {
    id: user.id,
    username: user.email ?? '',
    name,
    role: 'farmer',
    roleLabel: 'Farmer',
    region: typeof metadata.region === 'string' ? metadata.region : '',
    badge: typeof metadata.badge === 'string' ? metadata.badge : 'FARMER',
    initials: name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join(''),
    channels: ['cloud-api'],
    farmerId: ids[0],
    farmerIds: ids,
  }
}

function farmerFromMetadata(value: unknown): Farmer | null {
  if (!value || typeof value !== 'object') return null
  const farmer = value as Partial<Farmer>
  if (
    typeof farmer.id !== 'string' ||
    typeof farmer.name !== 'string' ||
    typeof farmer.phone !== 'string' ||
    typeof farmer.village !== 'string' ||
    typeof farmer.district !== 'string' ||
    typeof farmer.farmSizeHa !== 'number' ||
    typeof farmer.primaryCrop !== 'string' ||
    typeof farmer.joinedDate !== 'string'
  ) return null
  return {
    ...farmer,
    id: farmer.id,
    name: farmer.name,
    phone: farmer.phone,
    village: farmer.village,
    district: farmer.district,
    farmSizeHa: farmer.farmSizeHa,
    primaryCrop: farmer.primaryCrop,
    joinedDate: farmer.joinedDate,
    creditRisk: farmer.creditRisk ?? 'medium',
    sourceChannel: 'cloud-api',
    createdAt: farmer.createdAt ?? new Date().toISOString(),
    updatedAt: farmer.updatedAt ?? new Date().toISOString(),
  }
}

function publicUser(user: User): AuthUser {
  const safeUser = { ...user }
  delete safeUser.password
  delete safeUser.passwordHash
  return safeUser
}

export async function initializeAuth(): Promise<void> {
  if (!supabaseConfigured) {
    setState({
      authReady: true,
      databaseError: 'Database is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the project root .env.local.',
    })
    return
  }

  try {
    const client = requireSupabase()
    const { data, error } = await client.auth.getSession()
    if (error) throw error
    const session = data.session
    if (session) {
      let cloudDb: DB | null
      try {
        cloudDb = await loadFarmerData(session.user.id)
      } catch (error) {
        if (localOwnerId !== session.user.id) throw error
        const authUser = authUserFromSupabase(session.user, state.db.farmers.map((item) => item.id))
        setState({
          auth: { user: authUser, authenticated: true },
          authReady: true,
          databaseError: error instanceof Error
            ? `Showing saved offline records. Database connection failed: ${error.message}`
            : 'Showing saved offline records. Unable to connect to the database.',
        })
        return
      }
      preserveLegacyLocalData()
      const farmer = cloudDb ? null : farmerFromMetadata(session.user.user_metadata?.farmerProfile)
      const db = cloudDb ?? { ...emptyDatabase(), ...(farmer ? { farmers: [farmer] } : {}) }
      const authUser = authUserFromSupabase(session.user, db.farmers.map((item) => item.id))
      setState({
        auth: { user: authUser, authenticated: true },
        db,
        outbox: [],
        authReady: true,
        databaseError: null,
      })
      if (!cloudDb && farmer) await saveFarmerData(session.user.id, db)
    } else {
      setState({
        auth: { user: null, authenticated: false },
        db: emptyDatabase(),
        outbox: [],
        authReady: true,
        databaseError: null,
      })
    }
  } catch (error) {
    if (localOwnerId && savedAuth.user?.id === localOwnerId) {
      setState({
        auth: { user: savedAuth.user, authenticated: true },
        authReady: true,
        databaseError: error instanceof Error
          ? `Showing saved offline records. Database connection failed: ${error.message}`
          : 'Showing saved offline records. Unable to connect to the database.',
      })
      return
    }
    preserveLegacyLocalData()
    setState({
      auth: { user: null, authenticated: false },
      db: emptyDatabase(),
      outbox: [],
      authReady: true,
      databaseError: error instanceof Error ? error.message : 'Unable to connect to the database.',
    })
  }
}

export async function login(username: string, password: string): Promise<AuthUser | null> {
  const client = requireSupabase()
  const { data, error } = await client.auth.signInWithPassword({
    email: username.trim().toLowerCase(),
    password,
  })
  if (error) {
    if (error.message.toLowerCase().includes('invalid login credentials')) return null
    throw error
  }
  if (!data.user) return null
  const cloudDb = await loadFarmerData(data.user.id)
  preserveLegacyLocalData()
  const farmer = cloudDb ? null : farmerFromMetadata(data.user.user_metadata?.farmerProfile)
  const db = cloudDb ?? { ...emptyDatabase(), ...(farmer ? { farmers: [farmer] } : {}) }
  const authenticatedUser = authUserFromSupabase(data.user, db.farmers.map((item) => item.id))
  setState({
    auth: { user: authenticatedUser, authenticated: true },
    db,
    outbox: [],
    authReady: true,
    databaseError: null,
    databaseSaveStatus: 'saved',
    databaseSavedAt: new Date().toISOString(),
    databaseSaveError: null,
  })
  if (!cloudDb && farmer) await saveFarmerData(data.user.id, db)
  return authenticatedUser
}

export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await requireSupabase().auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: `${window.location.origin}/reset-password`,
  })
  if (error) throw error
}

export async function updateAccountPassword(password: string): Promise<void> {
  const { error } = await requireSupabase().auth.updateUser({ password })
  if (error) throw error
}

export async function registerFarmerAccount(
  details: Omit<Farmer, 'id' | 'sourceChannel' | 'createdAt' | 'updatedAt'>,
  password: string,
): Promise<{ user: AuthUser | null; confirmationRequired: boolean }> {
  const client = requireSupabase()
  const now = new Date().toISOString()
  const farmer: Farmer = {
    ...details,
    id: uid('farmer'),
    sourceChannel: 'cloud-api',
    createdAt: now,
    updatedAt: now,
  }
  const { data, error } = await client.auth.signUp({
    email: details.email?.trim().toLowerCase() ?? '',
    password,
    options: {
      data: {
        name: farmer.name,
        region: farmer.district,
        badge: 'FARMER',
        farmerId: farmer.id,
        farmerIds: [farmer.id],
        farmerProfile: farmer,
      },
    },
  })
  if (error) throw error
  if (!data.user) throw new Error('The account could not be created.')
  if (!data.session) return { user: null, confirmationRequired: true }

  preserveLegacyLocalData()
  const db: DB = { ...emptyDatabase(), farmers: [farmer] }
  const authenticatedUser = authUserFromSupabase(data.user, [farmer.id])
  await saveFarmerData(data.user.id, db)
  setState({
    auth: { user: authenticatedUser, authenticated: true },
    db,
    outbox: [],
    authReady: true,
    databaseError: null,
    databaseSaveStatus: 'saved',
    databaseSavedAt: new Date().toISOString(),
    databaseSaveError: null,
  })
  return { user: authenticatedUser, confirmationRequired: false }
}

export function linkFarmerProfile(farmerId: string): void {
  const farmer = getState().db.farmers.find((item) => item.id === farmerId)
  const currentUser = getState().auth.user
  if (!farmer || !currentUser || currentUser.role !== 'farmer') {
    throw new Error('Could not link the farm profile to your account.')
  }
  const farmerIds = [...new Set([...(currentUser.farmerIds ?? []), ...(currentUser.farmerId ? [currentUser.farmerId] : []), farmerId])]
  const firstFarmerId = farmerIds[0] ?? farmerId
  const updatedUser: AuthUser = { ...currentUser, farmerId: firstFarmerId, farmerIds }
  setState({
    auth: { user: updatedUser, authenticated: true },
  })
  void requireSupabase().auth.updateUser({ data: { farmerId: firstFarmerId, farmerIds } })
    .then(({ error }) => { if (error) throw error })
    .catch(reportDatabaseError)
}

export async function logout(): Promise<void> {
  const userId = state.auth.user?.id
  if (databaseSaveTimer) {
    clearTimeout(databaseSaveTimer)
    databaseSaveTimer = undefined
  }
  if (userId && state.databaseSaveStatus !== 'saved') {
    if (!state.online) throw new Error('You are offline and have unsynced changes. Reconnect and sync before signing out.')
    await queueDatabaseSave(userId, state.db)
  }
  const { error } = await requireSupabase().auth.signOut()
  if (error) throw error
  setState({
    auth: { user: null, authenticated: false },
    db: emptyDatabase(),
    outbox: [],
  })
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    if (!getState().online) setState({ online: true })
  })
  window.addEventListener('offline', () => {
    if (getState().online) setState({ online: false })
  })
}

export function resetAll(): void {
  Object.values(KEYS).forEach((k) => {
    try {
      localStorage.removeItem(k)
    } catch {
      /* noop */
    }
  })
  state = {
    db: seed.db,
    outbox: [],
    syncLogs: [],
    settings: DEFAULT_SETTINGS,
    auth: { user: null, authenticated: false },
    users: seed.users,
    online: navigator.onLine,
    syncing: false,
    syncingPct: 0,
    lastSyncAt: new Date().toISOString(),
    seeded: true,
    authReady: true,
    databaseError: null,
    databaseSaveStatus: 'saved',
    databaseSavedAt: null,
    databaseSaveError: null,
  }
  listeners.forEach((l) => l())
}