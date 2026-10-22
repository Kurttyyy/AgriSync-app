import { useMemo, useState, type FormEvent } from 'react'
import { useAppState } from '../data/store'
import { createHarvest, setSeasonBudget } from '../data/repository'
import { dbForUser } from '../data/selectors'
import { fmtDate, fmtFinanceMoney, fmtNum } from '../data/format'
import { riceSeasonForFarmer } from '../data/util'
import { Button, Field, toast } from '../components/kit'
import type { DB } from '../domain/types'

export default function FarmFinance() {
  const allDb = useAppState((state) => state.db)
  const user = useAppState((state) => state.auth.user)
  const db = dbForUser(allDb, user)
  const [farmerId, setFarmerId] = useState(db.farmers[0]?.id ?? '')
  const [harvestDate, setHarvestDate] = useState(todayInput())
  const [harvestSeason, setHarvestSeason] = useState(riceSeasonForFarmer(db.farmers[0], db.plots))
  const [quantityKg, setQuantityKg] = useState('')
  const [pricePerKg, setPricePerKg] = useState('')
  const [budgetFarmerId, setBudgetFarmerId] = useState(db.farmers[0]?.id ?? '')
  const [budgetSeason, setBudgetSeason] = useState(riceSeasonForFarmer(db.farmers[0], db.plots))
  const [budgetAmount, setBudgetAmount] = useState('')

  const seasonRows = useMemo(() => buildSeasonRows(db), [db])
  const grossIncome = db.harvests.reduce((sum, harvest) => sum + harvest.quantityKg * harvest.pricePerKg, 0)
  const totalExpenses = db.expenses.reduce((sum, expense) => sum + expense.amount, 0)

  function saveHarvest(event: FormEvent) {
    event.preventDefault()
    const kg = Number(quantityKg)
    const price = Number(pricePerKg)
    if (!db.farmers.some((farmer) => farmer.id === farmerId)) {
      toast('Choose a farmer profile for this harvest.', 'alert')
      return
    }
    if (!harvestSeason.trim() || !Number.isFinite(kg) || kg <= 0 || !Number.isFinite(price) || price < 0) {
      toast('Enter a season, a positive harvest weight, and a valid price per kilogram.', 'alert')
      return
    }
    createHarvest({
      farmerId,
      date: new Date(`${harvestDate}T12:00:00`).toISOString(),
      season: harvestSeason.trim(),
      quantityKg: kg,
      pricePerKg: price,
    })
    setQuantityKg('')
    setPricePerKg('')
    toast('Rice harvest and income saved.')
  }

  function saveBudget(event: FormEvent) {
    event.preventDefault()
    const amount = Number(budgetAmount)
    if (!db.farmers.some((farmer) => farmer.id === budgetFarmerId)) {
      toast('Choose a farmer profile for this budget.', 'alert')
      return
    }
    if (!budgetSeason.trim() || !Number.isFinite(amount) || amount <= 0) {
      toast('Enter a season and a budget greater than zero.', 'alert')
      return
    }
    setSeasonBudget({ farmerId: budgetFarmerId, season: budgetSeason.trim(), amount })
    setBudgetAmount('')
    toast('Season budget saved. A matching farmer and season budget is replaced.')
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="crumb">Rice farm finance</div>
          <h1 className="mt-2">Harvest, budget &amp; profit</h1>
          <p className="text-sm mt-2">Record rice harvest income and compare it with expenses by season.</p>
        </div>
        <div className="flex gap-sm wrap finance-entries">
          <button className="btn btn-ghost btn-sm" onClick={() => exportFinanceReport(db)}>Export CSV (Excel compatible)</button>
          <button className="btn btn-primary btn-sm" onClick={() => window.print()}>Save report as PDF / Print</button>
        </div>
      </div>

      <div className="stat-grid">
        <FinanceStat label="Harvest income" value={fmtFinanceMoney(grossIncome)} />
        <FinanceStat label="Recorded expenses" value={fmtFinanceMoney(totalExpenses)} />
        <FinanceStat label="Net profit / loss" value={fmtFinanceMoney(grossIncome - totalExpenses)} />
      </div>

      {db.farmers.length === 0 ? (
        <section className="card mt-4">
          <p className="text-sm text-mute">Add a farmer profile before recording harvests or budgets.</p>
        </section>
      ) : (
        <div className="split-layout mt-4 finance-entries">
          <section className="card">
            <h2 className="card-title mb-3">Record rice harvest</h2>
            <form onSubmit={saveHarvest}>
              <Field label="Farmer profile">
                <select className="select" value={farmerId} onChange={(event) => {
                  setFarmerId(event.target.value)
                  const selected = db.farmers.find((farmer) => farmer.id === event.target.value)
                  setHarvestSeason(riceSeasonForFarmer(selected, db.plots))
                }} required>
                {db.farmers.map((farmer) => <option key={farmer.id} value={farmer.id}>{farmer.name}</option>)}
                </select>
              </Field>
              <div className="form-grid">
                <Field label="Harvest date">
                  <input className="input" type="date" value={harvestDate} onChange={(event) => setHarvestDate(event.target.value)} required />
                </Field>
                <Field label="Rice season">
                  <input className="input" value={harvestSeason} onChange={(event) => setHarvestSeason(event.target.value)} maxLength={60} required />
                </Field>
                <Field label="Harvested weight (kg)">
                  <input className="input" type="number" min="0.01" step="0.01" value={quantityKg} onChange={(event) => setQuantityKg(event.target.value)} required />
                </Field>
                <Field label="Sale price per kg (₱)">
                  <input className="input" type="number" min="0" step="0.01" value={pricePerKg} onChange={(event) => setPricePerKg(event.target.value)} required />
                </Field>
              </div>
              <p className="text-sm text-mute mb-3">
                Estimated income: {fmtFinanceMoney((Number(quantityKg) || 0) * (Number(pricePerKg) || 0))}
              </p>
              <Button type="submit">Save harvest</Button>
            </form>
          </section>
          <section className="card">
            <h2 className="card-title mb-3">Set season budget</h2>
            <form onSubmit={saveBudget}>
              <Field label="Farmer profile">
                <select className="select" value={budgetFarmerId} onChange={(event) => {
                  setBudgetFarmerId(event.target.value)
                  const selected = db.farmers.find((farmer) => farmer.id === event.target.value)
                  setBudgetSeason(riceSeasonForFarmer(selected, db.plots))
                }} required>
                  {db.farmers.map((farmer) => <option key={farmer.id} value={farmer.id}>{farmer.name}</option>)}
                </select>
              </Field>
              <Field label="Rice season">
                <input className="input" value={budgetSeason} onChange={(event) => setBudgetSeason(event.target.value)} maxLength={60} required />
              </Field>
              <Field label="Season budget (₱)">
                <input className="input" type="number" min="0.01" step="0.01" value={budgetAmount} onChange={(event) => setBudgetAmount(event.target.value)} required />
              </Field>
              <p className="text-sm text-mute mb-3">Saving an existing farmer + season updates its budget.</p>
              <Button type="submit">Save budget</Button>
            </form>
          </section>
        </div>
      )}

      <section className="card mt-4">
        <h2 className="card-title">Season profit and budget report</h2>
        {seasonRows.length === 0 ? (
          <p className="text-sm text-mute mt-3">Add expenses, harvests, or a budget to see a seasonal report.</p>
        ) : (
          <div className="expense-table mt-3">
            <div className="expense-row finance-report-row finance-report-head">
              <span>Farmer</span><span>Season</span><span>Income</span><span>Expenses</span><span>Budget / Net</span>
            </div>
            {seasonRows.map((row) => (
              <div className="expense-row finance-report-row" key={`${row.farmerId}-${row.season}`}>
                <span>{row.farmerName}</span>
                <span>{row.season}</span>
                <span>{fmtFinanceMoney(row.income)}</span>
                <span>{fmtFinanceMoney(row.expenses)}</span>
                <span>
                  Budget: {row.budget == null ? '—' : fmtFinanceMoney(row.budget)}
                  <br />
                  Net: {fmtFinanceMoney(row.income - row.expenses)}
                  {row.budget != null && (
                    <small className="d-block text-mute">
                      {row.expenses > row.budget
                        ? `${fmtFinanceMoney(row.expenses - row.budget)} over budget`
                        : `${fmtFinanceMoney(row.budget - row.expenses)} remaining`}
                    </small>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card mt-4">
        <h2 className="card-title">Harvest records</h2>
        {db.harvests.length === 0 ? <p className="text-sm text-mute mt-3">No harvests recorded yet.</p> : (
          <div className="feed mt-2">
            {[...db.harvests].sort((a, b) => b.date.localeCompare(a.date)).map((harvest) => (
              <div className="feed-item" key={harvest.id}>
                <div className="feed-body grow">
                  <div className="feed-title">{db.farmers.find((farmer) => farmer.id === harvest.farmerId)?.name ?? 'Farmer'} · {harvest.season}</div>
                  <div className="feed-sub">{fmtDate(harvest.date)} · {fmtNum(harvest.quantityKg, 2)} kg × {fmtFinanceMoney(harvest.pricePerKg)}/kg</div>
                </div>
                <strong>{fmtFinanceMoney(harvest.quantityKg * harvest.pricePerKg)}</strong>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  )
}

function FinanceStat({ label, value }: { label: string; value: string }) {
  return <div className="stat"><div className="stat-label">{label}</div><div className="stat-value">{value}</div></div>
}

function buildSeasonRows(db: DB) {
  const rows = new Map<string, {
    farmerId: string
    farmerName: string
    season: string
    income: number
    expenses: number
    budget: number | null
  }>()
  const getRow = (farmerId: string, season: string) => {
    const key = `${farmerId}\u0000${season.toLowerCase()}`
    let row = rows.get(key)
    if (!row) {
      row = {
        farmerId,
        farmerName: db.farmers.find((farmer) => farmer.id === farmerId)?.name ?? 'Farmer',
        season,
        income: 0,
        expenses: 0,
        budget: null,
      }
      rows.set(key, row)
    }
    return row
  }
  db.expenses.forEach((expense) => { getRow(expense.farmerId, expense.season).expenses += expense.amount })
  db.harvests.forEach((harvest) => { getRow(harvest.farmerId, harvest.season).income += harvest.quantityKg * harvest.pricePerKg })
  db.budgets.forEach((budget) => { getRow(budget.farmerId, budget.season).budget = budget.amount })
  return [...rows.values()].sort((a, b) => a.farmerName.localeCompare(b.farmerName) || a.season.localeCompare(b.season))
}

function exportFinanceReport(db: DB): void {
  const farmerName = (id: string) => db.farmers.find((farmer) => farmer.id === id)?.name ?? 'Unknown'
  const rows: (string | number)[][] = [
    ['Type', 'Date', 'Farmer', 'Rice season', 'Details', 'Quantity (kg)', 'Price per kg', 'Amount (PHP)'],
    ...db.expenses.map((expense) => [
      'Expense', expense.date.slice(0, 10), farmerName(expense.farmerId), expense.season,
      `${expense.category}${expense.description ? ` — ${expense.description}` : ''}`, '', '', expense.amount,
    ]),
    ...db.harvests.map((harvest) => [
      'Harvest income', harvest.date.slice(0, 10), farmerName(harvest.farmerId), harvest.season,
      'Rice harvest', harvest.quantityKg, harvest.pricePerKg, harvest.quantityKg * harvest.pricePerKg,
    ]),
    ...db.budgets.map((budget) => [
      'Season budget', '', farmerName(budget.farmerId), budget.season, 'Budget target', '', '', budget.amount,
    ]),
  ]
  const csvCell = (value: string | number) => {
    const text = String(value)
    const safeText = /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text
    return `"${safeText.replace(/"/g, '""')}"`
  }
  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `agrisync-rice-finance-${todayInput()}.csv`
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

function todayInput(): string {
  const date = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
