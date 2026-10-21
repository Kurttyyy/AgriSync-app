import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAppState } from '../data/store'
import { createExpense } from '../data/repository'
import { dbForUser } from '../data/selectors'
import { fmtDate, fmtMoney } from '../data/format'
import { Button, Chip, Field, Seg, toast } from '../components/kit'
import { IconDownload, IconExpense, IconPlus, IconSearch, IconWallet } from '../components/icons'
import type { DB, Expense, ExpenseCategory } from '../domain/types'

export const CATEGORIES: { id: ExpenseCategory; label: string; tone: string; color: string }[] = [
  { id: 'seeds', label: 'Seeds', tone: 'tone-green', color: '#2f7d4f' },
  { id: 'fertilizer', label: 'Fertilizer', tone: 'tone-gold', color: '#d99a2b' },
  { id: 'fuel', label: 'Fuel', tone: 'tone-blue', color: '#2f6b8f' },
]

const CATEGORY_TONE: Record<string, { label: string; tone: string; color: string }> = Object.fromEntries(
  CATEGORIES.map(({ id, label, tone, color }) => [id, { label, tone, color }]),
)

export function categoryLabel(category: ExpenseCategory): string {
  return CATEGORY_TONE[category]?.label ?? category
}

export function categoryTone(category: ExpenseCategory): string {
  return CATEGORY_TONE[category]?.tone ?? 'tone-grey'
}

function categoryColor(category: ExpenseCategory): string {
  return CATEGORY_TONE[category]?.color ?? '#7b8794'
}

export default function Expenses() {
  const allDb = useAppState((s) => s.db)
  const user = useAppState((s) => s.auth.user)
  const db = dbForUser(allDb, user)
  const online = useAppState((s) => s.online)
  const [showForm, setShowForm] = useState(db.expenses.length === 0)

  const expenses = useMemo(
    () => [...db.expenses].sort((a, b) => b.date.localeCompare(a.date)),
    [db.expenses],
  )
  const total = expenses.reduce((s, e) => s + e.amount, 0)

  const byCategory = useMemo(() => {
    const sums = new Map<ExpenseCategory, number>()
    for (const e of db.expenses) sums.set(e.category, (sums.get(e.category) ?? 0) + e.amount)
    return [...sums.entries()]
      .map(([category, amount]) => ({ category, label: categoryLabel(category), amount }))
      .sort((a, b) => b.amount - a.amount)
  }, [db.expenses])

  return (
    <>
      <div className="page-header">
        <div>
          <div className="crumb">Farm operations finance</div>
          <h1 className="mt-2">Farm Expenses</h1>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm((v) => !v)}>
          <IconPlus width={16} height={16} /> {showForm ? 'Hide form' : 'New expense'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="card-row">
            <div>
              <span className="card-title">Add an expense</span>
              <p className="text-sm mt-2">Enter who, when, and what the expense was for.</p>
            </div>
          </div>
          {db.farmers.length === 0 ? (
            <div className="empty">
              <div style={{ fontWeight: 650, color: 'var(--ink)', fontSize: 14 }}>Add a farmer first</div>
              <div className="text-sm mt-2">Expenses need to be linked to a farmer.</div>
              <Link to="/farmers/new" className="btn btn-primary btn-sm mt-4">
                <IconPlus width={15} height={15} /> Add farmer
              </Link>
            </div>
          ) : (
            <ExpenseForm db={db} online={online} onSaved={() => setShowForm(false)} />
          )}
        </div>
      )}

      {expenses.length > 0 && <RecordsTable expenses={expenses} farmers={db.farmers} />}

      <div className="seg-title mt-5">
        <IconExpense width={14} height={14} /> Expense summary
      </div>
      <div className="card">
        <div className="stat-grid">
          <StatBox label="My farm" value={String(db.farmers.length)} note={db.farmers[0]?.name ?? 'Your profile'} />
          <StatBox label="Total expenses" value={fmtMoney(total)} note={`${expenses.length} records`} />
          <StatBox label="Avg per record" value={fmtMoney(Math.round(total / Math.max(1, expenses.length)))} note="Approximate" />
          <StatBox label="Top category" value={byCategory[0]?.label ?? '—'} note={byCategory[0] ? fmtMoney(byCategory[0].amount) : 'No expenses yet'} />
        </div>

        <Seg icon={<IconWallet width={13} height={13} />} style={{ marginTop: 18 }}>
          Breakdown by category
        </Seg>
        {byCategory.length === 0 ? (
          <p className="text-sm text-mute">No expenses recorded yet — add your first expense above.</p>
        ) : (
          <div className="mt-2">
            {byCategory.map(({ category, label, amount }) => (
              <div key={category} className="expense-bar">
                <div className="flex between" style={{ fontSize: 13, marginBottom: 6 }}>
                  <span className="expense-bar-label">
                    <ChipDot color={categoryColor(category)} /> {label}
                  </span>
                  <span style={{ fontWeight: 650, color: 'var(--ink)' }}>{fmtMoney(amount)}</span>
                </div>
                <div className="progress" style={{ height: 14 }}>
                  <span style={{ width: `${Math.max(4, (amount / Math.max(1, total)) * 100)}%`, background: `linear-gradient(90deg, ${categoryColor(category)}, ${categoryColor(category)}cc)` }} />
                </div>
              </div>
            ))}
          </div>
        )}

        <Button variant="accent" block className="mt-4" onClick={() => downloadReport(db)}>
          <IconDownload width={16} height={16} /> Generate report
        </Button>
      </div>
    </>
  )
}

function StatBox({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ fontSize: 20 }}>{value}</div>
      <div className="stat-note">{note}</div>
    </div>
  )
}

function ChipDot({ color }: { color: string }) {
  return <span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 3, background: color, verticalAlign: '-0.5px' }} />
}

function ExpenseForm({ db, online, onSaved }: { db: DB; online: boolean; onSaved: () => void }) {
  const farmers = [...db.farmers].sort((a, b) => a.name.localeCompare(b.name))
  const [farmerId, setFarmerId] = useState('')
  const [date, setDate] = useState(todayInput())
  const [category, setCategory] = useState<ExpenseCategory>('seeds')
  const [customCategoryMode, setCustomCategoryMode] = useState(false)
  const [customCategory, setCustomCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    const f = db.farmers.find((x) => x.id === farmerId)
    if (!f) {
      toast('Select a farmer', 'alert')
      return
    }
    const amt = parseFloat(amount)
    if (!Number.isFinite(amt) || amt <= 0) {
      toast('Enter a valid amount', 'alert')
      return
    }
    if (customCategoryMode && !customCategory.trim()) {
      toast('Enter a name for your custom expense category.', 'alert')
      return
    }
    const savedCategory = customCategoryMode ? customCategory.trim() : category
    createExpense({
      farmerId: f.id,
      date: date ? new Date(date).toISOString() : new Date().toISOString(),
      category: savedCategory,
      amount: Math.round(amt),
      description: description.trim() || undefined,
    })
    toast(
      'Expense saved on this device and added to the local queue.',
      online ? 'ok' : 'alert',
    )
    onSaved()
    setFarmerId(''); setDate(todayInput()); setAmount(''); setDescription(''); setCustomCategory(''); setCustomCategoryMode(false); setCategory('seeds')
  }

  return (
    <form onSubmit={submit}>
      <div className="expense-form-grid">
        <Field label="Farmer profile">
          <select className="select" value={farmerId} onChange={(e) => setFarmerId(e.target.value)} required>
            <option value="">Choose a profile</option>
            {farmers.map((f) => (
              <option key={f.id} value={f.id}>{f.name} — {f.village}</option>
            ))}
          </select>
        </Field>
        <Field label="Date">
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </Field>
        <Field label="Expense category">
          <div className="pill-row" role="group" aria-label="Expense category">
            {CATEGORIES.map((c) => (
              <button
                type="button"
                key={c.id}
                className={`pill${category === c.id ? ' on' : ''}`}
                aria-pressed={category === c.id}
                onClick={() => { setCategory(c.id); setCustomCategoryMode(false) }}
              >
                {c.label}
              </button>
            ))}
            <button
              type="button"
              className={`pill${customCategoryMode ? ' on' : ''}`}
              aria-pressed={customCategoryMode}
              onClick={() => setCustomCategoryMode(true)}
            >
              Custom category
            </button>
          </div>
        </Field>

        {customCategoryMode && (
          <Field label="Custom category name" className="expense-description">
            <input
              className="input"
              value={customCategory}
              onChange={(event) => setCustomCategory(event.target.value)}
              placeholder="Type the category name (e.g. Labor)"
              maxLength={60}
              required
            />
          </Field>
        )}
        <Field
          label="Description (optional)"
          hint="Add more details about this expense if needed."
          className="expense-description"
        >
          <textarea
            className="textarea"
            style={{ minHeight: 72 }}
            placeholder="Add details about this expense"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>

        <Field label="Amount (₱)">
          <div className="amount-wrap">
            <span className="amount-prefix">₱</span>
            <input
              className="input"
              type="number"
              inputMode="decimal"
              min="1"
              step="1"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
        </Field>
      </div>

      <div className="flex gap-md mt-3 expense-form-actions">
        <button type="button" className="btn btn-ghost" onClick={onSaved}>Cancel</button>
        <Button type="submit">
          <IconPlus width={15} height={15} /> Save expense
        </Button>
      </div>
    </form>
  )
}

function RecordsTable({ expenses, farmers }: { expenses: Expense[]; farmers: DB['farmers'] }) {
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'' | ExpenseCategory>('')

  const query = q.trim().toLowerCase()
  const rows = expenses
    .map((e) => ({ expense: e, farmerName: farmers.find((farmer) => farmer.id === e.farmerId)?.name ?? 'Unknown' }))
    .filter(({ expense, farmerName }) => {
      const matchQ =
        !query ||
        farmerName.toLowerCase().includes(query) ||
        expense.description?.toLowerCase().includes(query) ||
        categoryLabel(expense.category).toLowerCase().includes(query)
      const matchF = !filter || expense.category === filter
      return matchQ && matchF
    })

  return (
    <>
      <div className="seg-title mt-5">
        <IconWallet width={14} height={14} /> Expense records
      </div>
      <div className="card">
        <div className="flex gap-md wrap mb-3" style={{ alignItems: 'flex-end' }}>
          <div className="search-box">
            <IconSearch width={18} height={18} />
            <input className="input" placeholder="Search farmer, description or category…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className="select" style={{ width: 170 }} value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">All categories</option>
            {[...new Set(expenses.map((expense) => expense.category))]
              .sort((a, b) => categoryLabel(a).localeCompare(categoryLabel(b)))
              .map((category) => (
                <option key={category} value={category}>{categoryLabel(category)}</option>
              ))}
          </select>
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-mute">No expense records match.</p>
        ) : (
          <>
            <div className="expense-table">
              <div className="expense-row expense-head">
                <span>Date</span>
                <span>Farmer</span>
                <span>Category</span>
                <span className="mono">Amount</span>
              </div>
              {rows.map(({ expense, farmerName }) => {
                return (
                  <div className="expense-row" key={expense.id}>
                    <span>{fmtDate(expense.date)}</span>
                    <span>{farmerName}</span>
                    <span>
                      <Chip tone={categoryTone(expense.category)}>{categoryLabel(expense.category)}</Chip>
                    </span>
                    <span className="mono" style={{ fontWeight: 650, color: 'var(--ink)' }}>{fmtMoney(expense.amount)}</span>
                  </div>
                )
              })}
            </div>
            <div className="flex between" style={{ marginTop: 14, borderTop: '1px dashed var(--line)', paddingTop: 12 }}>
              <span className="text-mute text-sm" style={{ fontWeight: 650 }}>TOTAL EXPENSE · {rows.length} record{rows.length === 1 ? '' : 's'}</span>
              <span className="mono" style={{ fontWeight: 750, color: 'var(--ink)', fontSize: 16 }}>{fmtMoney(rows.reduce((s, r) => s + r.expense.amount, 0))}</span>
            </div>
          </>
        )}
      </div>
    </>
  )
}

function downloadReport(db: DB): void {
  const farmerName = (id: string) => db.farmers.find((f) => f.id === id)?.name ?? 'Unknown'
  const header = 'Date,Farmer,Category,Amount,Description'
  const csvCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`
  const lines = db.expenses.map((e) => {
    return [e.date.slice(0, 10), farmerName(e.farmerId), e.category, e.amount, e.description ?? '']
      .map(csvCell)
      .join(',')
  })
  const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `rice-farm-expense-report-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
  toast('Expense report generated — download started')
}

function todayInput(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}