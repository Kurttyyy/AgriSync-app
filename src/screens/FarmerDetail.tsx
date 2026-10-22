import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAppState } from '../data/store'
import { createPlot } from '../data/repository'
import { createExpense } from '../data/repository'
import { totalRepaid } from '../data/repository'
import { cashAdvanceStatus, dbForUser } from '../data/selectors'
import { fmtCashAdvanceDueDate, fmtDate, fmtMoney, fmtRelative, fmtShortDate } from '../data/format'
import { Avatar, Chip, HEALTH_TONE, Initials, Meta, toast, Button, Field, Seg } from '../components/kit'
import {
  IconBell,
  IconChevronLeft,
  IconChevronRight,
  IconExpense,
  IconLeaf,
  IconMail,
  IconMapPin,
  IconPhone,
  IconPlus,
  IconSync,
  IconWallet,
} from '../components/icons'
import type { ExpenseCategory } from '../domain/types'
import { CATEGORIES, categoryLabel, categoryTone } from './Expenses'
import { riceSeasonForFarmer } from '../data/util'

export default function FarmerDetail() {
  const { id } = useParams()
  const allDb = useAppState((s) => s.db)
  const user = useAppState((s) => s.auth.user)
  const db = dbForUser(allDb, user)
  const online = useAppState((s) => s.online)
  const farmer = db.farmers.find((f) => f.id === id)

  const [showPlot, setShowPlot] = useState(false)
  const [plot, setPlot] = useState({
    name: '',
    areaHa: '1.0',
    soilType: 'Sandy loam',
    plantedDate: new Date().toISOString().slice(0, 10),
    expectedYieldT: '2.0',
    health: 'good',
  })
  const [showExpense, setShowExpense] = useState(false)
  const [expense, setExpense] = useState({
    date: new Date().toISOString().slice(0, 10),
    category: 'seeds' as ExpenseCategory,
    customCategory: '',
    customCategoryMode: false,
    amount: '',
    description: '',
  })

  if (!farmer) {
    return (
      <div className="card">
        <p>Farmer not found.</p>
        <Link to="/" className="btn btn-ghost mt-4">Back to home</Link>
      </div>
    )
  }
  const f = farmer
  const plots = db.plots.filter((p) => p.farmerId === f.id)
  const activeSeason = riceSeasonForFarmer(f, plots)
  const visits = db.visits
    .filter((v) => v.farmerId === f.id)
    .sort((a, b) => b.date.localeCompare(a.date))
  const cashAdvances = db.cashAdvances.filter((i) => i.farmerId === f.id)
  const expenses = db.expenses
    .filter((e) => e.farmerId === f.id)
    .sort((a, b) => b.date.localeCompare(a.date))
  const expensesTotal = expenses.reduce((s, e) => s + e.amount, 0)
  const outstanding = cashAdvances.reduce(
    (sum, i) => sum + (['active', 'overdue'].includes(cashAdvanceStatus(i)) ? Math.max(0, i.principal - totalRepaid(i)) : 0),
    0,
  )

  function addPlot(e: FormEvent) {
    e.preventDefault()
    const areaHa = Number(plot.areaHa)
    const expectedYieldT = Number(plot.expectedYieldT)
    const plantedDate = new Date(`${plot.plantedDate}T00:00:00`)
    if (!Number.isFinite(areaHa) || areaHa <= 0 || !Number.isFinite(expectedYieldT) || expectedYieldT < 0) {
      toast('Enter a valid plot area and expected yield.', 'alert')
      return
    }
    if (!plot.plantedDate || !Number.isFinite(plantedDate.getTime())) {
      toast('Choose a valid planting date.', 'alert')
      return
    }
    createPlot({
        farmerId: f.id,
        name: plot.name.trim() || 'Palay (rice) field',
        crop: 'Palay (rice)',
        areaHa,
        soilType: plot.soilType,
        season: activeSeason,
        plantedDate: plantedDate.toISOString(),
        expectedYieldT,
        health: plot.health as 'good' | 'fair' | 'poor',
      })
    toast(online ? 'Plot saved and syncing to your account.' : 'Plot saved on this device; it will sync when online.', online ? 'ok' : 'alert')
    setShowPlot(false)
  }

  function addExpense(e: FormEvent) {
    e.preventDefault()
    const amt = parseFloat(expense.amount)
    if (!Number.isFinite(amt) || amt <= 0) {
      toast('Enter a valid amount', 'alert')
      return
    }
    if (expense.customCategoryMode && !expense.customCategory.trim()) {
      toast('Enter a name for your custom expense category.', 'alert')
      return
    }
    createExpense({
      farmerId: f.id,
      date: new Date(expense.date).toISOString(),
      season: activeSeason,
      category: expense.customCategoryMode ? expense.customCategory.trim() : expense.category,
      amount: Math.round(amt),
      description: expense.description.trim() || undefined,
    })
    toast(online ? 'Expense saved and syncing to your account.' : 'Expense saved on this device; it will sync when online.', online ? 'ok' : 'alert')
    setShowExpense(false)
    setExpense({
      date: new Date().toISOString().slice(0, 10),
      category: 'seeds',
      customCategory: '',
      customCategoryMode: false,
      amount: '',
      description: '',
    })
  }

  return (
    <>
      <div className="page-header">
        <div className="flex gap-md">
          <Link to="/" className="icon-btn" aria-label="Back">
            <IconChevronLeft />
          </Link>
          <div>
            <div className="crumb">{f.village}, {f.district}</div>
            <h1 className="mt-2" style={{ fontSize: 21 }}>{f.name}</h1>
          </div>
        </div>
        <div className="flex gap-sm wrap">
          <Link to={`/farmers/${f.id}/edit`} className="btn btn-ghost btn-sm">Edit profile</Link>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-row">
          <div>
            <span className="card-title">Current rice season</span>
            <p className="text-sm text-mute mt-2">{activeSeason} · edit the farmer profile to change seasons; new farm records will use this season.</p>
          </div>
        </div>
      </div>

      <section className="card">
        <div className="flex between">
          <div className="flex gap-md">
            <Avatar initials={Initials(f.name)} size={48} />
            <div>
              <div className="flex gap-md" style={{ flexWrap: 'wrap' }}>
                <span className="flex gap-sm" style={{ fontSize: 13, color: 'var(--text)' }}>
                  <IconMapPin width={14} height={14} /> {f.village}
                </span>
                <span className="flex gap-sm" style={{ fontSize: 13, color: 'var(--text)' }}>
                  <IconPhone width={14} height={14} /> {f.phone}
                </span>
                {f.email && (
                  <span className="flex gap-sm" style={{ fontSize: 13, color: 'var(--text)' }}>
                    <IconMail width={14} height={14} /> {f.email}
                  </span>
                )}
              </div>
              <div className="flex gap-sm mt-2 wrap">
                <Chip tone={f.creditRisk === 'low' ? 'tone-green' : f.creditRisk === 'medium' ? 'tone-amber' : 'tone-red'}>
                  {f.creditRisk} credit risk
                </Chip>
                <Chip tone="tone-brand">Joined {fmtRelative(f.joinedDate)}</Chip>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <Meta
            rows={[
              ['Farm size', `${f.farmSizeHa} ha`],
              ['Primary crop', f.primaryCrop],
              ['Municipality', f.district],
              ['Plots', String(plots.length)],
              ['Visits logged', String(visits.length)],
              ['Outstanding cash advance', fmtMoney(outstanding)],
              ['Farm expenses', fmtMoney(expensesTotal)],
            ]}
          />
        </div>

        <div className="flex gap-md mt-4">
          <a className="btn btn-soft grow" href={`sms:${f.phone.replace(/[^\d+]/g, '')}`}>
            <IconPhone width={15} height={15} /> Text farmer
          </a>
          {f.email ? (
            <a className="btn btn-ghost grow" href={`mailto:${f.email}`}>
              <IconMail width={15} height={15} /> Email farmer
            </a>
          ) : (
            <span className="btn btn-ghost grow" style={{ opacity: 0.5, pointerEvents: 'none' }}>
              <IconMail width={15} height={15} /> No email on file
            </span>
          )}
        </div>

        {!online && (
          <div className="flex gap-sm mt-4" style={{ background: 'var(--amber-soft)', borderRadius: 10, padding: '10px 12px' }}>
            <IconSync width={16} height={16} style={{ color: 'var(--amber)' }} />
            <span style={{ fontSize: 13, color: 'var(--gold-ink)' }}>
              Changes are saved on this device and will sync to your account when you reconnect.
            </span>
          </div>
        )}
      </section>

      <div className="flex gap-md mt-5">
        <Link to={`/farmers/${f.id}/visit`} className="btn btn-primary grow">
          <IconPlus width={16} height={16} /> Log visit
        </Link>
        <button className="btn btn-ghost grow" onClick={() => setShowPlot((v) => !v)}>
          <IconLeaf width={16} height={16} /> Add plot
        </button>
      </div>

      {showPlot && (
        <form onSubmit={addPlot} className="card mt-4" style={{ borderColor: 'var(--brand)' }}>
          <h3 className="mb-3">New plot</h3>
          <div className="form-grid">
            <Field label="Plot name">
              <input className="input" value={plot.name} onChange={(e) => setPlot({ ...plot, name: e.target.value })} placeholder="e.g. Upper field" />
            </Field>
            <Field label="Area (ha)">
              <input className="input" type="number" min="0.1" step="0.1" value={plot.areaHa} onChange={(e) => setPlot({ ...plot, areaHa: e.target.value })} required />
            </Field>
            <Field label="Soil type">
              <select className="select" value={plot.soilType} onChange={(e) => setPlot({ ...plot, soilType: e.target.value })}>
                {['Sandy loam', 'Clay loam', 'Coastal sand', 'Loam'].map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Current rice season">
                <input className="input" value={activeSeason} readOnly />
            </Field>
            <Field label="Planted">
              <input className="input" type="date" value={plot.plantedDate} onChange={(e) => setPlot({ ...plot, plantedDate: e.target.value })} required />
            </Field>
            <Field label="Expected yield (t)">
              <input className="input" type="number" min="0" step="0.1" value={plot.expectedYieldT} onChange={(e) => setPlot({ ...plot, expectedYieldT: e.target.value })} required />
            </Field>
            <Field label="Crop health">
              <div className="pill-row">
                {(['good', 'fair', 'poor'] as const).map((h) => (
                  <button type="button" key={h} className={`pill${plot.health === h ? ' on' : ''}`} onClick={() => setPlot({ ...plot, health: h })}>
                    {h}
                  </button>
                ))}
              </div>
            </Field>
          </div>
          <div className="flex gap-md mt-4">
            <Button type="submit" block>Save plot</Button>
            <button type="button" className="btn btn-ghost" onClick={() => setShowPlot(false)}>Cancel</button>
          </div>
        </form>
      )}

      <Seg icon={<IconLeaf width={14} height={14} />}>Farm plots</Seg>
      <section className="card">
        {plots.length === 0 ? (
          <p className="text-sm text-mute">No plots recorded yet.</p>
        ) : (
          plots.map((p) => (
            <div className="row-link" key={p.id}>
              <span className="feed-icon"><IconLeaf width={16} height={16} /></span>
              <div className="row-main">
                <div className="row-title">{p.name}</div>
                <div className="row-sub">{p.crop} · {p.areaHa} ha · {p.soilType} · planted {fmtShortDate(p.plantedDate)} · yield est {p.expectedYieldT} t</div>
              </div>
              <Chip tone={HEALTH_TONE[p.health]}>{p.health}</Chip>
            </div>
          ))
        )}
      </section>

      <Seg>Field visits</Seg>
      <section className="card">
        {visits.length === 0 ? (
          <p className="text-sm text-mute">No visits logged yet — log the first one above.</p>
        ) : (
          visits.map((v) => (
            <div className="feed-item" key={v.id}>
              <span className="feed-icon"><IconPhone width={15} height={15} /></span>
              <div className="feed-body grow">
                <div className="feed-title">{v.purpose}</div>
                <div className="feed-sub">{fmtDate(v.date)} · {v.cropStage} · {v.health === 'good' ? 'Healthy' : v.health === 'fair' ? 'Fair' : 'At risk'}</div>
              </div>
              <span className="feed-time">{fmtRelative(v.date)}</span>
            </div>
          ))
        )}
      </section>

      <Seg icon={<IconWallet width={14} height={14} />}>Farm expenses</Seg>
      <section className="card">
        {expenses.length === 0 && !showExpense ? (
          <p className="text-sm text-mute">No expenses recorded yet — add the first one.</p>
        ) : (
          <>
            {expenses.map((e) => (
              <div className="feed-item" key={e.id}>
                <span className="feed-icon"><IconExpense width={15} height={15} /></span>
                <div className="feed-body grow">
                  <div className="feed-title">
                    <Chip tone={categoryTone(e.category)}>{categoryLabel(e.category)}</Chip>
                    {' '}{e.description ?? 'Farm expense'}
                  </div>
                  <div className="feed-sub">{fmtDate(e.date)}</div>
                </div>
                <span className="mono" style={{ fontWeight: 650, color: 'var(--ink)' }}>{fmtMoney(e.amount)}</span>
              </div>
            ))}
            {expenses.length > 0 && (
              <div className="flex between" style={{ marginTop: 12, borderTop: '1px dashed var(--line)', paddingTop: 12 }}>
                <span className="text-mute text-sm" style={{ fontWeight: 650 }}>TOTAL EXPENSES</span>
                <span className="mono" style={{ fontWeight: 750, color: 'var(--ink)', fontSize: 16 }}>{fmtMoney(expensesTotal)}</span>
              </div>
            )}
          </>
        )}

        {showExpense && (
          <form onSubmit={addExpense} className="mt-4" style={{ borderTop: '1px dashed var(--line)', paddingTop: 14 }}>
            <div className="flex gap-md between">
              <span className="card-title">Add farm expense</span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowExpense(false)}>Cancel</button>
            </div>
            <div className="form-grid mt-3">
              <Field label="Date">
                <input className="input" type="date" value={expense.date} onChange={(e) => setExpense({ ...expense, date: e.target.value })} required />
              </Field>
              <Field label="Category">
                <select
                  className="select"
                  value={expense.customCategoryMode ? '__custom__' : expense.category}
                  onChange={(e) => setExpense({ ...expense, customCategoryMode: e.target.value === '__custom__', ...(e.target.value === '__custom__' ? {} : { category: e.target.value }) })}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                  <option value="__custom__">Add category</option>
                </select>
              </Field>
              {expense.customCategoryMode && (
                <Field label="Category name">
                  <input
                    className="input"
                    value={expense.customCategory}
                    onChange={(e) => setExpense({ ...expense, customCategory: e.target.value })}
                    placeholder="Type a category (e.g. Labor)"
                    maxLength={60}
                    required
                  />
                </Field>
              )}
              <Field label="Amount (₱)">
                <input className="input mono" inputMode="decimal" placeholder="0" value={expense.amount} onChange={(e) => setExpense({ ...expense, amount: e.target.value })} required />
              </Field>
              <Field
                label="Description (optional)"
                hint="Add more details about this expense if needed."
                className="grow"
              >
                <textarea
                  className="textarea"
                  style={{ minHeight: 64 }}
                  placeholder="Add details about this expense"
                  value={expense.description}
                  onChange={(e) => setExpense({ ...expense, description: e.target.value })}
                />
              </Field>
            </div>
            <Button type="submit" block className="mt-3">
              <IconPlus width={15} height={15} /> Save expense
            </Button>
          </form>
        )}
      </section>

      <div className="flex gap-md mt-3" style={{ justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowExpense((v) => !v)}>
          <IconExpense width={15} height={15} /> {showExpense ? 'Hide expense form' : 'Add expense'}
        </button>
      </div>

      <Seg>Cash Advances</Seg>
      <section className="card">
        {cashAdvances.length === 0 ? (
          <p className="text-sm text-mute">No cash advances yet — open the Cash Advances tab to add one.</p>
        ) : (
          cashAdvances.map((inv) => {
            const pct = Math.min(100, Math.round((totalRepaid(inv) / Math.max(1, inv.principal)) * 100))
            const status = cashAdvanceStatus(inv)
            return (
              <Link to="/cash-advances" key={inv.id} className="row-link">
                <span className="avatar" style={{ background: 'linear-gradient(150deg,#d99a2b,#c78a1f)', width: 38, height: 38 }}>
                  <IconLeaf width={16} height={16} />
                </span>
                <div className="row-main">
                  <div className="row-title">{inv.label}</div>
<div className="row-sub">{fmtMoney(inv.principal)} · {pct}% repaid · due {fmtCashAdvanceDueDate(inv.dueDate, inv.dueAfterHarvest)}</div>
                <div className="progress mt-2" style={{ height: 5 }}>
                  <span style={{ width: `${pct}%`, background: status === 'overdue' ? 'var(--red)' : undefined }} />
                </div>
              </div>
              {inv.farmerMessages && inv.farmerMessages.length > 0 && (
                <Chip tone="tone-gold">
                  <IconBell width={12} height={12} /> {inv.farmerMessages.length}
                </Chip>
              )}
              <Chip tone={status === 'overdue' ? 'tone-red' : status === 'repaid' ? 'tone-green' : 'tone-blue'}>
                  {status}
                </Chip>
                <IconChevronRight width={16} height={16} style={{ color: 'var(--muted)' }} />
              </Link>
            )
          })
        )}
      </section>
    </>
  )
}
