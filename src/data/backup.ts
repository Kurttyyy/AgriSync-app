import type { DB, Farmer, Plot, Visit, CashAdvance, Expense, Harvest, SeasonBudget } from '../domain/types'

export interface AccountBackup {
  format: 'agrisync-account-backup'
  version: 1
  exportedAt: string
  db: DB
}

type RecordValue = Record<string, unknown>

function isRecord(value: unknown): value is RecordValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isDateString(value: unknown): boolean {
  return isString(value) && Number.isFinite(new Date(value).getTime())
}

function records<T>(
  value: unknown,
  name: string,
  validate: (entry: RecordValue) => boolean,
): T[] {
  if (!Array.isArray(value) || !value.every((entry) => isRecord(entry) && validate(entry))) {
    throw new Error(`Backup contains invalid ${name} records.`)
  }
  const ids = value.map((entry) => (entry as RecordValue).id)
  if (new Set(ids).size !== ids.length) throw new Error(`Backup contains duplicate ${name} IDs.`)
  return value as T[]
}

export function makeAccountBackup(db: DB): AccountBackup {
  return {
    format: 'agrisync-account-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    db,
  }
}

export function parseAccountBackup(value: unknown, allowedFarmerIds: ReadonlySet<string>): DB {
  if (
    !isRecord(value) ||
    value.format !== 'agrisync-account-backup' ||
    value.version !== 1 ||
    !isDateString(value.exportedAt) ||
    !isRecord(value.db)
  ) {
    throw new Error('This is not a supported AgriSync account backup.')
  }
  const input = value.db
  const farmers = records<Farmer>(input.farmers, 'farmer', (entry) =>
    isString(entry.id) && isString(entry.name) && isString(entry.phone) &&
    isString(entry.village) && isString(entry.district) &&
    isFiniteNumber(entry.farmSizeHa) && entry.farmSizeHa > 0 && isString(entry.primaryCrop) &&
    isString(entry.joinedDate) && isString(entry.sourceChannel) &&
    isDateString(entry.joinedDate) && isDateString(entry.createdAt) && isDateString(entry.updatedAt) &&
    ['low', 'medium', 'high'].includes(String(entry.creditRisk)),
  )
  if (farmers.some((farmer) => !allowedFarmerIds.has(farmer.id))) {
    throw new Error('Backup contains farmer profiles that do not belong to this signed-in account.')
  }
  const farmerIds = new Set(farmers.map((farmer) => farmer.id))
  const hasFarmer = (entry: RecordValue) => isString(entry.farmerId) && farmerIds.has(entry.farmerId)
  const plots = records<Plot>(input.plots, 'plot', (entry) =>
    isString(entry.id) && hasFarmer(entry) && isString(entry.name) && isString(entry.crop) &&
    isFiniteNumber(entry.areaHa) && entry.areaHa > 0 && isString(entry.soilType) && isString(entry.season) &&
    isDateString(entry.plantedDate) && isFiniteNumber(entry.expectedYieldT) && entry.expectedYieldT >= 0 &&
    ['good', 'fair', 'poor'].includes(String(entry.health)),
  )
  const visits = records<Visit>(input.visits, 'visit', (entry) =>
    isString(entry.id) && hasFarmer(entry) && isDateString(entry.date) &&
    isString(entry.purpose) && isString(entry.cropStage) &&
    ['good', 'fair', 'poor'].includes(String(entry.health)) &&
    Array.isArray(entry.pests) && entry.pests.every(isString) &&
    Array.isArray(entry.inputsUsed) && entry.inputsUsed.every(isString) &&
    isString(entry.notes) && typeof entry.offline === 'boolean' && isDateString(entry.createdAt),
  )
  const cashAdvances = records<CashAdvance>(input.cashAdvances, 'cash advance', (entry) =>
    isString(entry.id) && hasFarmer(entry) && isString(entry.kind) &&
    isString(entry.label) && isFiniteNumber(entry.principal) && entry.principal > 0 &&
    isDateString(entry.disbursedDate) && isString(entry.dueDate) &&
    ['active', 'repaid', 'overdue', 'defaulted'].includes(String(entry.status)) &&
    Array.isArray(entry.repayments) && entry.repayments.every((repayment) =>
      isRecord(repayment) && isString(repayment.id) && repayment.cashAdvanceId === entry.id &&
      isDateString(repayment.date) && isFiniteNumber(repayment.amount) && repayment.amount > 0,
    ) && isDateString(entry.createdAt),
  )
  const expenses = records<Expense>(input.expenses, 'expense', (entry) =>
    isString(entry.id) && hasFarmer(entry) && isDateString(entry.date) &&
    isString(entry.season) && isString(entry.category) &&
    isFiniteNumber(entry.amount) && entry.amount > 0 && isDateString(entry.createdAt),
  )
  const harvests = records<Harvest>(input.harvests, 'harvest', (entry) =>
    isString(entry.id) && hasFarmer(entry) && isDateString(entry.date) &&
    isString(entry.season) && isFiniteNumber(entry.quantityKg) && entry.quantityKg > 0 &&
    isFiniteNumber(entry.pricePerKg) && entry.pricePerKg >= 0 && isDateString(entry.createdAt),
  )
  const budgets = records<SeasonBudget>(input.budgets, 'budget', (entry) =>
    isString(entry.id) && hasFarmer(entry) && isString(entry.season) &&
    isFiniteNumber(entry.amount) && entry.amount > 0 && isDateString(entry.updatedAt),
  )
  return { farmers, plots, visits, cashAdvances, expenses, harvests, budgets }
}
