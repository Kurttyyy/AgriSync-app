export type ID = string

export type ChannelId = 'cloud-api' | 'sms-gateway' | 'ussd-gateway' | 'gmail'

export type Health = 'good' | 'fair' | 'poor'
export type Risk = 'low' | 'medium' | 'high'
export type ExpenseCategory = 'seeds' | 'fertilizer' | 'fuel' | (string & {})

export type UserRole = 'farmer'

export interface User {
  id: ID
  username: string
  password?: string
  passwordHash?: string
  name: string
  role: UserRole
  roleLabel: string
  region: string
  badge: string
  initials: string
  channels: ChannelId[]
  farmerId?: ID
  farmerIds?: ID[]
}

export type AuthUser = Omit<User, 'password' | 'passwordHash'>

export interface AuthState {
  user: AuthUser | null
  authenticated: boolean
}

export interface Farmer {
  id: ID
  name: string
  phone: string
  email?: string
  village: string
  district: string
  farmSizeHa: number
  primaryCrop: string
  creditRisk: Risk
  joinedDate: string
  notes?: string
  sourceChannel: ChannelId
  createdAt: string
  updatedAt: string
}

export interface Plot {
  id: ID
  farmerId: ID
  name: string
  crop: string
  areaHa: number
  soilType: string
  season: string
  plantedDate: string
  expectedYieldT: number
  health: Health
}

export interface Visit {
  id: ID
  farmerId: ID
  date: string
  purpose: string
  cropStage: string
  health: Health
  pests: string[]
  inputsUsed: string[]
  notes: string
  followUpDate?: string
  offline: boolean
  createdAt: string
}

export interface Repayment {
  id: ID
  cashAdvanceId: ID
  date: string
  amount: number
  method: 'cash' | 'mobile-money' | 'auto-deduct' | 'bank-transfer'
}

export interface FarmerNote {
  id: ID
  date: string
  text: string
}

export interface SmsRecord {
  id: ID
  date: string
  to: string
  text: string
}

export interface EmailRecord {
  id: ID
  date: string
  to: string
  subject: string
  body: string
}

export interface CashAdvance {
  id: ID
  farmerId: ID
  kind: 'cash-advance' | 'equipment' | 'inputs-financing' | 'grant'
  label: string
  principal: number
  disbursedDate: string
  dueDate: string
  dueAfterHarvest?: boolean
  status: 'active' | 'repaid' | 'overdue' | 'defaulted'
  repayments: Repayment[]
  farmerMessages?: FarmerNote[]
  sms?: SmsRecord[]
  emails?: EmailRecord[]
  createdAt: string
}

export interface Expense {
  id: ID
  farmerId: ID
  date: string
  season: string
  category: ExpenseCategory
  amount: number
  description?: string
  createdAt: string
}

export interface Harvest {
  id: ID
  farmerId: ID
  date: string
  season: string
  quantityKg: number
  pricePerKg: number
  createdAt: string
}

export interface SeasonBudget {
  id: ID
  farmerId: ID
  season: string
  amount: number
  updatedAt: string
}

export type OutboxStatus = 'pending' | 'syncing' | 'synced' | 'failed'

export interface OutboxItem {
  id: ID
  entity: 'farmer' | 'plot' | 'visit' | 'cashAdvance' | 'expense' | 'sms' | 'email'
  entityId: ID
  action: 'create' | 'update' | 'delete' | 'notify'
  payload: unknown
  status: OutboxStatus
  channel: ChannelId
  attempts: number
  error?: string
  createdAt: string
  syncedAt?: string
}

export type SyncOutcome = 'success' | 'partial' | 'failed'

export interface SyncLog {
  id: ID
  startedAt: string
  finishedAt: string
  channel: ChannelId
  items: number
  synced: number
  failed: number
  outcome: SyncOutcome
  triggeredBy: 'auto' | 'manual' | 'online-event' | 'interval'
}

export interface AppSettings {
  region: string
  autoSync: boolean
  preferredChannel: ChannelId
  lastFullSync: string | null
  mail: {
    serviceId: string
    templateId: string
    publicKey: string
  }
}

export interface DB {
  farmers: Farmer[]
  plots: Plot[]
  visits: Visit[]
  cashAdvances: CashAdvance[]
  expenses: Expense[]
  harvests: Harvest[]
  budgets: SeasonBudget[]
}