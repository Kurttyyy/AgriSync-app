import type { AuthUser, CashAdvance, DB, Health, OutboxItem, Risk } from '../domain/types'
import { totalRepaid } from './repository'
import { isOverdue } from './format'
import { monthKey } from './util'

export interface PortfolioRow {
  month: string
  disbursed: number
  repaid: number
}

export function outboxForUser(outbox: OutboxItem[], db: DB): OutboxItem[] {
  const ownedRecordIds = new Set([
    ...db.farmers.map((farmer) => farmer.id),
    ...db.plots.map((plot) => plot.id),
    ...db.visits.map((visit) => visit.id),
    ...db.cashAdvances.map((advance) => advance.id),
    ...db.expenses.map((expense) => expense.id),
    ...db.harvests.map((harvest) => harvest.id),
    ...db.budgets.map((budget) => budget.id),
  ])
  return outbox.filter((item) => ownedRecordIds.has(item.entityId))
}

export function cashAdvanceStatus(advance: CashAdvance, now = Date.now()): CashAdvance['status'] {
  if (advance.principal > 0 && totalRepaid(advance) >= advance.principal) return 'repaid'
  if (advance.status !== 'active' || advance.dueAfterHarvest || !advance.dueDate) {
    return advance.status
  }
  const due = new Date(advance.dueDate)
  if (!Number.isFinite(due.getTime())) return advance.status
  due.setHours(24, 0, 0, 0)
  if (due.getTime() <= now) {
    return 'overdue'
  }
  return advance.status
}

export function dbForUser(db: DB, user: AuthUser | null): DB {
  const farmerIds = user?.farmerIds?.length ? user.farmerIds : user?.farmerId ? [user.farmerId] : []
  if (user?.role !== 'farmer' || farmerIds.length === 0) {
    return { farmers: [], plots: [], visits: [], cashAdvances: [], expenses: [], harvests: [], budgets: [] }
  }
  const visibleFarmerIds = new Set(farmerIds)
  return {
    farmers: db.farmers.filter((farmer) => visibleFarmerIds.has(farmer.id)),
    plots: db.plots.filter((plot) => visibleFarmerIds.has(plot.farmerId)),
    visits: db.visits.filter((visit) => visibleFarmerIds.has(visit.farmerId)),
    cashAdvances: db.cashAdvances.filter((advance) => visibleFarmerIds.has(advance.farmerId)),
    expenses: db.expenses.filter((expense) => visibleFarmerIds.has(expense.farmerId)),
    harvests: db.harvests.filter((harvest) => visibleFarmerIds.has(harvest.farmerId)),
    budgets: db.budgets.filter((budget) => visibleFarmerIds.has(budget.farmerId)),
  }
}

export function dashboardMetrics(db: DB, outbox: OutboxItem[], now = new Date()) {
  const weekAgo = now.getTime() - 7 * 24 * 3600 * 1000
  const visitsThisWeek = db.visits.filter((visit) => {
    const visitTime = new Date(visit.date).getTime()
    return visitTime >= weekAgo && visitTime <= now.getTime()
  }).length
  const overdueFollowUps = db.visits.filter((v) => v.followUpDate && isOverdue(v.followUpDate)).length
  const activeCashAdvances = db.cashAdvances.filter((advance) => {
    const status = cashAdvanceStatus(advance, now.getTime())
    return status === 'active' || status === 'overdue'
  })
  const outstanding = activeCashAdvances.reduce(
    (sum, advance) => sum + Math.max(0, advance.principal - totalRepaid(advance)),
    0,
  )
  const pendingSync = outbox.filter((o) => o.status === 'pending' || o.status === 'failed').length
  const poorHealthPlots = db.plots.filter((p) => p.health === 'poor').length
  return {
    farmers: db.farmers.length,
    visitsThisWeek,
    overdueFollowUps,
    activeCashAdvances: activeCashAdvances.length,
    outstanding,
    pendingSync,
    poorHealthPlots,
  }
}

export function healthCounts(db: DB): Record<Health, number> {
  return {
    good: db.plots.filter((p) => p.health === 'good').length,
    fair: db.plots.filter((p) => p.health === 'fair').length,
    poor: db.plots.filter((p) => p.health === 'poor').length,
  }
}

export function riskCounts(db: DB): Record<Risk, number> {
  return {
    low: db.farmers.filter((f) => f.creditRisk === 'low').length,
    medium: db.farmers.filter((f) => f.creditRisk === 'medium').length,
    high: db.farmers.filter((f) => f.creditRisk === 'high').length,
  }
}

export function visitsPerWeek(db: DB, weeks = 8): { label: string; visits: number }[] {
  const buckets: { label: string; visits: number; start: number }[] = []
  const now = new Date()
  for (let w = weeks - 1; w >= 0; w--) {
    const start = new Date(now)
    start.setDate(start.getDate() - start.getDay() - w * 7)
    const end = start.getTime() + 7 * 24 * 3600 * 1000
    buckets.push({
      label: start.toLocaleDateString('en-PH', { day: 'numeric', month: 'short' }),
      visits: db.visits.filter((v) => {
        const t = new Date(v.date).getTime()
        return t >= start.getTime() && t < end
      }).length,
      start: start.getTime(),
    })
  }
  return buckets.map(({ visits, label }) => ({ visits, label }))
}

export function cashAdvanceMix(db: DB): { name: string; value: number }[] {
  const kinds: Record<string, string> = {
    'cash-advance': 'Cash advances',
    equipment: 'Equipment',
    'inputs-financing': 'Farm inputs',
    grant: 'Grants',
  }
  const sums = new Map<string, number>()
  for (const inv of db.cashAdvances) {
    sums.set(inv.kind, (sums.get(inv.kind) ?? 0) + inv.principal)
  }
  return [...sums.entries()].map(([k, v]) => ({ name: kinds[k] ?? k, value: v }))
}

export function portfolioTrend(db: DB): PortfolioRow[] {
  const rows = new Map<string, PortfolioRow>()
  for (const inv of db.cashAdvances) {
    const m = monthKey(inv.disbursedDate)
    const row = rows.get(m) ?? { month: m, disbursed: 0, repaid: 0 }
    row.disbursed += inv.principal
    row.repaid += totalRepaid(inv)
    rows.set(m, row)
  }
  return [...rows.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, r]) => ({ ...r, month: fmtMonth(r.month) }))

  function fmtMonth(key: string): string {
    const d = new Date(`${key}-02T00:00:00`)
    return d.toLocaleDateString('en-PH', { month: 'short' })
  }
}

export function plotYieldByCrop(db: DB): { name: string; plots: number; totalT: number }[] {
  const crops = new Map<string, { plots: number; totalT: number }>()
  for (const p of db.plots) {
    const c = crops.get(p.crop) ?? { plots: 0, totalT: 0 }
    c.plots += 1
    c.totalT += p.expectedYieldT
    crops.set(p.crop, c)
  }
  return [...crops.entries()].map(([name, v]) => ({ name, ...v }))
}

export function statusCounts(db: DB, now = Date.now()): { name: string; value: number }[] {
  const labels: Record<string, string> = {
    active: 'Active',
    repaid: 'Repaid',
    overdue: 'Overdue',
    defaulted: 'Defaulted',
  }
  const counts = new Map<string, number>()
  for (const inv of db.cashAdvances) {
    const status = cashAdvanceStatus(inv, now)
    counts.set(status, (counts.get(status) ?? 0) + 1)
  }
  return [...counts.entries()].map(([k, v]) => ({ name: labels[k] ?? k, value: v }))
}