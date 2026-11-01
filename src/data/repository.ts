import { getState, setState } from './store'
import type {
  ChannelId,
  EmailRecord,
  Expense,
  Harvest,
  Farmer,
  FarmerNote,
  CashAdvance,
  OutboxItem,
  Plot,
  Repayment,
  SeasonBudget,
  Visit,
} from '../domain/types'
import { uid, isoNow } from './util'
import { cashAdvanceEmailDraft } from './emailDraft'

function channelFor(entity: OutboxItem['entity']): ChannelId {
  const map: Record<OutboxItem['entity'], ChannelId> = {
    farmer: 'cloud-api',
    plot: 'cloud-api',
    visit: 'cloud-api',
    cashAdvance: 'cloud-api',
    expense: 'cloud-api',
    harvest: 'cloud-api',
    budget: 'cloud-api',
    email: 'gmail',
  }
  return map[entity]
}

function enqueue(
  entity: OutboxItem['entity'],
  entityId: string,
  action: OutboxItem['action'],
  payload: unknown,
  status: OutboxItem['status'] = 'pending',
): OutboxItem {
  const item: OutboxItem = {
    id: uid('obx'),
    entity,
    entityId,
    action,
    payload,
    status,
    channel: channelFor(entity),
    attempts: 0,
    createdAt: isoNow(),
  }
  setState((s) => ({ outbox: [item, ...s.outbox] }))
  return item
}

export function createFarmer(
  data: Omit<Farmer, 'id' | 'sourceChannel' | 'createdAt' | 'updatedAt'>,
): Farmer {
  const now = isoNow()
  const farmer: Farmer = {
    ...data,
    id: uid('farmer'),
    sourceChannel: 'cloud-api',
    createdAt: now,
    updatedAt: now,
  }
  setState((s) => ({ db: { ...s.db, farmers: [farmer, ...s.db.farmers] } }))
  enqueue('farmer', farmer.id, 'create', farmer)
  return farmer
}

export function updateFarmer(id: string, patch: Partial<Omit<Farmer, 'id' | 'createdAt'>>): void {
  const farmer = getState().db.farmers.find((f) => f.id === id)
  if (!farmer) return
  const updated: Farmer = { ...farmer, ...patch, updatedAt: isoNow() }
  setState((s) => ({
    db: { ...s.db, farmers: s.db.farmers.map((f) => (f.id === id ? updated : f)) },
  }))
  enqueue('farmer', id, 'update', updated)
}

export function startNewRiceSeason(farmerId: string, season: string): void {
  const name = season.trim()
  if (!name) throw new Error('Enter a name for the new rice season.')
  const farmer = getState().db.farmers.find((item) => item.id === farmerId)
  if (!farmer) throw new Error('The farmer profile could not be found.')
  const alreadyUsed = [
    farmer.activeSeason ?? '',
    ...getState().db.plots.filter((item) => item.farmerId === farmerId).map((item) => item.season),
    ...getState().db.visits.filter((item) => item.farmerId === farmerId).map((item) => item.season ?? ''),
    ...getState().db.cashAdvances.filter((item) => item.farmerId === farmerId).map((item) => item.season ?? ''),
    ...getState().db.expenses.filter((item) => item.farmerId === farmerId).map((item) => item.season),
    ...getState().db.harvests.filter((item) => item.farmerId === farmerId).map((item) => item.season),
    ...getState().db.budgets.filter((item) => item.farmerId === farmerId).map((item) => item.season),
  ].some((used) => used.trim().toLowerCase() === name.toLowerCase())
  if (alreadyUsed) throw new Error('That season already has finance records. Choose a new season name to keep history separate.')

  const plantedDate = isoNow()
  const db = getState().db
  const updatedFarmer = { ...farmer, activeSeason: name, updatedAt: plantedDate }
  const updatedPlots = db.plots.filter((plot) => plot.farmerId === farmerId).map((plot) => ({
    ...plot,
    season: name,
    plantedDate,
    expectedYieldT: 0,
    health: 'good' as const,
  }))
  setState({
    db: {
      ...db,
      farmers: db.farmers.map((item) => item.id === farmerId ? updatedFarmer : item),
      plots: db.plots.map((plot) => plot.farmerId === farmerId
        ? updatedPlots.find((updated) => updated.id === plot.id) ?? plot
        : plot),
    },
  })
  enqueue('farmer', farmerId, 'update', updatedFarmer)
  updatedPlots.forEach((plot) => enqueue('plot', plot.id, 'update', plot))
}

export function deleteFarmer(id: string): void {
  const farmer = getState().db.farmers.find((f) => f.id === id)
  if (!farmer) return
  setState((s) => ({
    db: {
      farmers: s.db.farmers.filter((f) => f.id !== id),
      plots: s.db.plots.filter((p) => p.farmerId !== id),
      visits: s.db.visits.filter((v) => v.farmerId !== id),
      cashAdvances: s.db.cashAdvances.filter((i) => i.farmerId !== id),
      expenses: s.db.expenses.filter((e) => e.farmerId !== id),
      harvests: s.db.harvests.filter((harvest) => harvest.farmerId !== id),
      budgets: s.db.budgets.filter((budget) => budget.farmerId !== id),
    },
  }))
  enqueue('farmer', id, 'delete', { id, name: farmer.name })
}

export function createPlot(
  data: Omit<Plot, 'id'>,
): Plot {
  const plot: Plot = { ...data, id: uid('plot') }
  setState((s) => ({ db: { ...s.db, plots: [plot, ...s.db.plots] } }))
  enqueue('plot', plot.id, 'create', plot)
  return plot
}

export function updatePlot(id: string, patch: Omit<Plot, 'id'>): void {
  const current = getState().db.plots.find((item) => item.id === id)
  if (!current) throw new Error('The plot record could not be found.')
  const updated = { ...current, ...patch }
  setState((s) => ({ db: { ...s.db, plots: s.db.plots.map((item) => item.id === id ? updated : item) } }))
  enqueue('plot', id, 'update', updated)
}

export function deletePlot(id: string): void {
  const current = getState().db.plots.find((item) => item.id === id)
  if (!current) throw new Error('The plot record could not be found.')
  setState((s) => ({ db: { ...s.db, plots: s.db.plots.filter((item) => item.id !== id) } }))
  enqueue('plot', id, 'delete', { id })
}

export function createVisit(
  data: Omit<Visit, 'id' | 'offline' | 'createdAt'>,
): Visit {
  const visit: Visit = {
    ...data,
    id: uid('visit'),
    offline: !getState().online,
    createdAt: isoNow(),
  }
  setState((s) => ({ db: { ...s.db, visits: [visit, ...s.db.visits] } }))
  enqueue('visit', visit.id, 'create', visit)
  return visit
}

export function updateVisit(id: string, patch: Omit<Visit, 'id' | 'createdAt'>): void {
  const current = getState().db.visits.find((item) => item.id === id)
  if (!current) throw new Error('The visit record could not be found.')
  const updated = { ...current, ...patch }
  setState((s) => ({ db: { ...s.db, visits: s.db.visits.map((item) => item.id === id ? updated : item) } }))
  enqueue('visit', id, 'update', updated)
}

export function deleteVisit(id: string): void {
  const current = getState().db.visits.find((item) => item.id === id)
  if (!current) throw new Error('The visit record could not be found.')
  setState((s) => ({ db: { ...s.db, visits: s.db.visits.filter((item) => item.id !== id) } }))
  enqueue('visit', id, 'delete', { id })
}

export function createCashAdvance(
  data: Omit<CashAdvance, 'id' | 'repayments' | 'farmerMessages' | 'createdAt' | 'status'> & {
    status?: CashAdvance['status']
    initialMessage?: string
  },
): CashAdvance {
  const cashAdvance: CashAdvance = {
    ...data,
    id: uid('cash-advance'),
    status: data.status ?? 'active',
    repayments: [],
    farmerMessages: data.initialMessage?.trim()
      ? [{ id: uid('note'), date: isoNow(), text: data.initialMessage.trim() }]
      : [],
    emails: [],
    createdAt: isoNow(),
  }
  setState((s) => ({ db: { ...s.db, cashAdvances: [cashAdvance, ...s.db.cashAdvances] } }))
  enqueue('cashAdvance', cashAdvance.id, 'create', cashAdvance)
  return cashAdvance
}

export function updateCashAdvance(
  id: string,
  patch: Partial<Omit<CashAdvance, 'id' | 'createdAt'>>,
): void {
  const current = getState().db.cashAdvances.find((item) => item.id === id)
  if (!current) throw new Error('The cash advance record could not be found.')
  const updated = { ...current, ...patch }
  if (!Number.isFinite(updated.principal) || updated.principal <= 0) {
    throw new RangeError('Cash advance principal must be greater than zero.')
  }
  if (totalRepaid(updated) > updated.principal) {
    throw new RangeError('Cash advance principal cannot be less than the amount already repaid.')
  }
  setState((s) => ({
    db: { ...s.db, cashAdvances: s.db.cashAdvances.map((item) => item.id === id ? updated : item) },
  }))
  enqueue('cashAdvance', id, 'update', updated)
}

export function addFarmerMessage(cashAdvanceId: string, text: string): void {
  const inv = getState().db.cashAdvances.find((i) => i.id === cashAdvanceId)
  if (!inv || !text.trim()) return
  const note: FarmerNote = { id: uid('note'), date: isoNow(), text: text.trim() }
  const updated: CashAdvance = {
    ...inv,
    farmerMessages: [...(inv.farmerMessages ?? []), note],
  }
  setState((s) => ({
    db: { ...s.db, cashAdvances: s.db.cashAdvances.map((i) => (i.id === cashAdvanceId ? updated : i)) },
  }))
  enqueue('cashAdvance', cashAdvanceId, 'update', updated)
}

export function updateFarmerMessage(cashAdvanceId: string, noteId: string, text: string): void {
  const advance = getState().db.cashAdvances.find((item) => item.id === cashAdvanceId)
  if (!advance) throw new Error('The cash advance record could not be found.')
  const note = advance.farmerMessages?.find((item) => item.id === noteId)
  if (!note) throw new Error('The farmer note could not be found.')
  if (!text.trim()) throw new Error('A farmer note cannot be empty.')
  const updated = {
    ...advance,
    farmerMessages: advance.farmerMessages?.map((item) =>
      item.id === noteId ? { ...item, text: text.trim() } : item,
    ),
  }
  setState((s) => ({
    db: { ...s.db, cashAdvances: s.db.cashAdvances.map((item) => item.id === cashAdvanceId ? updated : item) },
  }))
  enqueue('cashAdvance', cashAdvanceId, 'update', updated)
}

export function deleteFarmerMessage(cashAdvanceId: string, noteId: string): void {
  const advance = getState().db.cashAdvances.find((item) => item.id === cashAdvanceId)
  if (!advance?.farmerMessages?.some((item) => item.id === noteId)) {
    throw new Error('The farmer note could not be found.')
  }
  const updated = { ...advance, farmerMessages: advance.farmerMessages.filter((item) => item.id !== noteId) }
  setState((s) => ({
    db: { ...s.db, cashAdvances: s.db.cashAdvances.map((item) => item.id === cashAdvanceId ? updated : item) },
  }))
  enqueue('cashAdvance', cashAdvanceId, 'update', updated)
}

export function deleteEmailRecord(cashAdvanceId: string, emailId: string): void {
  const advance = getState().db.cashAdvances.find((item) => item.id === cashAdvanceId)
  if (!advance?.emails?.some((item) => item.id === emailId)) throw new Error('The email record could not be found.')
  const updated = { ...advance, emails: advance.emails.filter((item) => item.id !== emailId) }
  setState((s) => ({
    db: { ...s.db, cashAdvances: s.db.cashAdvances.map((item) => item.id === cashAdvanceId ? updated : item) },
  }))
  enqueue('cashAdvance', cashAdvanceId, 'update', updated)
}

export function updateEmailRecord(
  cashAdvanceId: string,
  emailId: string,
  patch: Omit<EmailRecord, 'id'>,
): void {
  const advance = getState().db.cashAdvances.find((item) => item.id === cashAdvanceId)
  if (!advance) throw new Error('The cash advance record could not be found.')
  if (!advance.emails?.some((item) => item.id === emailId)) throw new Error('The email record could not be found.')
  if (!patch.to.trim() || !patch.subject.trim() || !patch.body.trim()) {
    throw new Error('An email recipient, subject, and message are required.')
  }
  const updated = {
    ...advance,
    emails: advance.emails.map((item) => item.id === emailId
      ? {
        ...patch,
        to: patch.to.trim(),
        subject: patch.subject.trim(),
        body: patch.body.trim(),
        id: emailId,
      }
      : item),
  }
  setState((s) => ({
    db: { ...s.db, cashAdvances: s.db.cashAdvances.map((item) => item.id === cashAdvanceId ? updated : item) },
  }))
  enqueue('cashAdvance', cashAdvanceId, 'update', updated)
}

export function sendCashAdvanceEmail(
  cashAdvanceId: string,
  to: string,
  subject: string,
  body: string,
): EmailRecord | null {
  const inv = getState().db.cashAdvances.find((i) => i.id === cashAdvanceId)
  if (!inv || !to.trim() || !subject.trim() || !body.trim()) return null
  const record: EmailRecord = {
    id: uid('email'),
    date: isoNow(),
    to: to.trim(),
    subject: subject.trim(),
    body: body.trim(),
  }
  const updated: CashAdvance = {
    ...inv,
    emails: [...(inv.emails ?? []), record],
  }
  setState((s) => ({
    db: { ...s.db, cashAdvances: s.db.cashAdvances.map((i) => (i.id === cashAdvanceId ? updated : i)) },
  }))
  enqueue('email', cashAdvanceId, 'notify', { recipient: record.to, subject: record.subject, body: record.body, cashAdvanceId })
  return record
}

export function addRepayment(cashAdvanceId: string, data: Omit<Repayment, 'id' | 'cashAdvanceId'>): void {
  const inv = getState().db.cashAdvances.find((i) => i.id === cashAdvanceId)
  if (!inv) return
  if (!Number.isFinite(data.amount) || data.amount <= 0) {
    throw new RangeError('Repayment amount must be greater than zero.')
  }
  if (data.amount > Math.max(0, inv.principal - totalRepaid(inv))) {
    throw new RangeError('Repayment cannot exceed the remaining cash advance balance.')
  }
  const repayment: Repayment = { ...data, id: uid('repay'), cashAdvanceId }
  const paid = totalRepaid(inv) + repayment.amount
  const updated: CashAdvance = {
    ...inv,
    repayments: [...inv.repayments, repayment],
    status: paid >= inv.principal ? 'repaid' : inv.status,
  }
  setState((s) => ({
    db: { ...s.db, cashAdvances: s.db.cashAdvances.map((i) => (i.id === cashAdvanceId ? updated : i)) },
  }))
  enqueue('cashAdvance', cashAdvanceId, 'update', updated)
  autoEmailStatusUpdate(updated)
}

export function updateRepayment(
  cashAdvanceId: string,
  repaymentId: string,
  patch: Omit<Repayment, 'id' | 'cashAdvanceId'>,
): void {
  const advance = getState().db.cashAdvances.find((item) => item.id === cashAdvanceId)
  if (!advance) throw new Error('The cash advance record could not be found.')
  const current = advance.repayments.find((item) => item.id === repaymentId)
  if (!current) throw new Error('The repayment record could not be found.')
  if (!Number.isFinite(patch.amount) || patch.amount <= 0) {
    throw new RangeError('Repayment amount must be greater than zero.')
  }
  const totalWithoutCurrent = totalRepaid(advance) - current.amount
  if (patch.amount > Math.max(0, advance.principal - totalWithoutCurrent)) {
    throw new RangeError('Repayment cannot exceed the remaining cash advance balance.')
  }
  const repayments = advance.repayments.map((item) => item.id === repaymentId ? { ...item, ...patch } : item)
  const repaidTotal = repayments.reduce((sum, item) => sum + item.amount, 0)
  const updated: CashAdvance = {
    ...advance,
    repayments,
    status: repaidTotal >= advance.principal
      ? 'repaid'
      : advance.status === 'repaid' ? 'active' : advance.status,
  }
  setState((s) => ({
    db: { ...s.db, cashAdvances: s.db.cashAdvances.map((item) => item.id === cashAdvanceId ? updated : item) },
  }))
  enqueue('cashAdvance', cashAdvanceId, 'update', updated)
}

export function deleteRepayment(cashAdvanceId: string, repaymentId: string): void {
  const advance = getState().db.cashAdvances.find((item) => item.id === cashAdvanceId)
  if (!advance?.repayments.some((item) => item.id === repaymentId)) {
    throw new Error('The repayment record could not be found.')
  }
  const repayments = advance.repayments.filter((item) => item.id !== repaymentId)
  const updated: CashAdvance = {
    ...advance,
    repayments,
    status: advance.status === 'repaid' ? 'active' : advance.status,
  }
  setState((s) => ({
    db: { ...s.db, cashAdvances: s.db.cashAdvances.map((item) => item.id === cashAdvanceId ? updated : item) },
  }))
  enqueue('cashAdvance', cashAdvanceId, 'update', updated)
}

export function deleteCashAdvance(id: string): void {
  const current = getState().db.cashAdvances.find((item) => item.id === id)
  if (!current) throw new Error('The cash advance record could not be found.')
  setState((s) => ({ db: { ...s.db, cashAdvances: s.db.cashAdvances.filter((item) => item.id !== id) } }))
  enqueue('cashAdvance', id, 'delete', { id })
}

function autoEmailStatusUpdate(inv: CashAdvance): void {
  const farmer = getState().db.farmers.find((f) => f.id === inv.farmerId)
  if (!farmer?.email) return
  const { subject, body } = cashAdvanceEmailDraft(inv, farmer)
  sendCashAdvanceEmail(inv.id, farmer.email, subject, body)
}

export function totalRepaid(inv: CashAdvance): number {
  return inv.repayments.reduce((sum, r) => sum + r.amount, 0)
}

export function createExpense(data: Omit<Expense, 'id' | 'createdAt'>): Expense {
  const expense: Expense = {
    ...data,
    id: uid('expense'),
    createdAt: isoNow(),
  }
  setState((s) => ({ db: { ...s.db, expenses: [expense, ...s.db.expenses] } }))
  enqueue('expense', expense.id, 'create', expense)
  return expense
}

export function updateExpense(id: string, patch: Omit<Expense, 'id' | 'createdAt'>): void {
  const current = getState().db.expenses.find((item) => item.id === id)
  if (!current) throw new Error('The expense record could not be found.')
  const updated = { ...current, ...patch }
  setState((s) => ({
    db: { ...s.db, expenses: s.db.expenses.map((item) => item.id === id ? updated : item) },
  }))
  enqueue('expense', id, 'update', updated)
}

export function deleteExpense(id: string): void {
  const current = getState().db.expenses.find((item) => item.id === id)
  if (!current) throw new Error('The expense record could not be found.')
  setState((s) => ({ db: { ...s.db, expenses: s.db.expenses.filter((item) => item.id !== id) } }))
  enqueue('expense', id, 'delete', { id })
}

export function createHarvest(data: Omit<Harvest, 'id' | 'createdAt'>): Harvest {
  const harvest: Harvest = { ...data, id: uid('harvest'), createdAt: isoNow() }
  setState((s) => ({ db: { ...s.db, harvests: [harvest, ...s.db.harvests] } }))
  enqueue('harvest', harvest.id, 'create', harvest)
  return harvest
}

export function updateHarvest(id: string, patch: Omit<Harvest, 'id' | 'createdAt'>): void {
  const current = getState().db.harvests.find((item) => item.id === id)
  if (!current) throw new Error('The harvest record could not be found.')
  const updated = { ...current, ...patch }
  setState((s) => ({ db: { ...s.db, harvests: s.db.harvests.map((item) => item.id === id ? updated : item) } }))
  enqueue('harvest', id, 'update', updated)
}

export function deleteHarvest(id: string): void {
  const current = getState().db.harvests.find((item) => item.id === id)
  if (!current) throw new Error('The harvest record could not be found.')
  setState((s) => ({ db: { ...s.db, harvests: s.db.harvests.filter((item) => item.id !== id) } }))
  enqueue('harvest', id, 'delete', { id })
}

export function setSeasonBudget(data: Omit<SeasonBudget, 'id' | 'updatedAt'>): SeasonBudget {
  const current = getState().db.budgets.find((item) =>
    item.farmerId === data.farmerId && item.season.toLowerCase() === data.season.toLowerCase(),
  )
  const budget: SeasonBudget = {
    ...data,
    id: current?.id ?? uid('budget'),
    updatedAt: isoNow(),
  }
  setState((s) => ({
    db: {
      ...s.db,
      budgets: current
        ? s.db.budgets.map((item) => item.id === current.id ? budget : item)
        : [budget, ...s.db.budgets],
    },
  }))
  enqueue('budget', budget.id, current ? 'update' : 'create', budget)
  return budget
}

export function deleteSeasonBudget(id: string): void {
  const current = getState().db.budgets.find((item) => item.id === id)
  if (!current) throw new Error('The season budget could not be found.')
  setState((s) => ({ db: { ...s.db, budgets: s.db.budgets.filter((item) => item.id !== id) } }))
  enqueue('budget', id, 'delete', { id })
}