import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAppState } from '../data/store'
import { cashAdvanceStatus, dbForUser } from '../data/selectors'
import { addRepayment, createCashAdvance, totalRepaid } from '../data/repository'
import { fmtCashAdvanceDueDate, fmtDate, fmtMoney } from '../data/format'
import { Button, Chip, Field, Meta, Stat, toast } from '../components/kit'
import { IconCashAdvance, IconPlus } from '../components/icons'
import type { CashAdvance, DB, Repayment } from '../domain/types'

function statusTone(status: CashAdvance['status']): string {
  if (status === 'overdue' || status === 'defaulted') return 'tone-red'
  if (status === 'repaid') return 'tone-green'
  return 'tone-blue'
}

export default function CashAdvances() {
  const allDb = useAppState((state) => state.db)
  const user = useAppState((state) => state.auth.user)
  const db = dbForUser(allDb, user)
  const online = useAppState((state) => state.online)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(db.cashAdvances.length === 0)
  const advances = [...db.cashAdvances].sort((a, b) => b.disbursedDate.localeCompare(a.disbursedDate))
  const disbursed = advances.reduce((sum, advance) => sum + advance.principal, 0)
  const repaid = advances.reduce((sum, advance) => sum + totalRepaid(advance), 0)
  const outstanding = advances.reduce(
    (sum, advance) => sum + (advance.status === 'active' || advance.status === 'overdue'
      ? Math.max(0, advance.principal - totalRepaid(advance))
      : 0),
    0,
  )
  const active = advances.filter((advance) => {
    const status = cashAdvanceStatus(advance)
    return status === 'active' || status === 'overdue'
  }).length

  return (
    <>
      <div className="page-header">
        <div>
          <div className="crumb">Your farm records</div>
          <h1 className="mt-2">My Cash Advance Records</h1>
          <p className="text-sm mt-2">Record cash advances you receive and keep track of your balances.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm((value) => !value)}>
          <IconPlus width={16} height={16} /> {showForm ? 'Hide form' : 'Record cash advance'}
        </button>
      </div>

      {showForm && (
        <section className="card" style={{ marginBottom: 14 }}>
          <div className="card-row">
            <div>
              <span className="card-title">Record a cash advance</span>
              <p className="text-sm mt-2">Add an advance you have already received. This records it in your farm account.</p>
            </div>
          </div>
          {db.farmers.length === 0 ? (
            <div className="empty">
              <div style={{ fontWeight: 650, color: 'var(--ink)', fontSize: 14 }}>Add a farm profile first</div>
              <p className="text-sm mt-2">Cash advance records need to be linked to one of your farm profiles.</p>
              <Link to="/farmers/new" className="btn btn-primary btn-sm mt-4">
                <IconPlus width={15} height={15} /> Add farm profile
              </Link>
            </div>
          ) : (
            <CashAdvanceForm db={db} online={online} onSaved={() => setShowForm(false)} />
          )}
        </section>
      )}

      <div className="seg-title">Advance summary</div>
      <div className="stat-grid">
        <Stat label="Total received" value={fmtMoney(disbursed)} note={`${advances.length} record${advances.length === 1 ? '' : 's'}`} icon={<IconCashAdvance width={14} height={14} />} />
        <Stat label="Total repaid" value={fmtMoney(repaid)} note={`${Math.round((repaid / Math.max(1, disbursed)) * 100)}% paid`} />
        <Stat label="Remaining balance" value={fmtMoney(outstanding)} note={`${active} active advance${active === 1 ? '' : 's'}`} />
        <Stat label="Overdue" value={advances.filter((advance) => cashAdvanceStatus(advance) === 'overdue').length} note="Advances past due" />
      </div>

      <div className="seg-title">My cash advance records</div>
      <section className="card">
        {advances.length === 0 ? (
          <div className="empty">
            <div style={{ fontWeight: 650, color: 'var(--ink)', fontSize: 14 }}>No cash advances yet</div>
            <p className="text-sm mt-2">Use “Record cash advance” to add an advance you have received.</p>
          </div>
        ) : (
          advances.map((advance) => {
            const paid = totalRepaid(advance)
            const percent = Math.min(100, Math.round((paid / Math.max(1, advance.principal)) * 100))
            const isExpanded = expanded === advance.id
            const status = cashAdvanceStatus(advance)
            return (
              <div key={advance.id}>
                <button
                  type="button"
                  className="row-link advance-toggle"
                  aria-expanded={isExpanded}
                  onClick={() => setExpanded(isExpanded ? null : advance.id)}
                >
                  <span className="avatar quick-action-gold" style={{ width: 40, height: 40 }}>
                    <IconCashAdvance width={18} height={18} />
                  </span>
                  <span className="row-main">
                    <span className="row-title d-block">{advance.label}</span>
                    <span className="row-sub d-block">
                      Farmer: {db.farmers.find((farmer) => farmer.id === advance.farmerId)?.name ?? 'Unknown farmer'}
                    </span>
                    <span className="flex gap-md mt-2 wrap" style={{ fontSize: 12.5, color: 'var(--text)' }}>
                      <span>{fmtMoney(advance.principal)}</span>
                      <span>{percent}% repaid</span>
                      <span>Due {fmtCashAdvanceDueDate(advance.dueDate, advance.dueAfterHarvest)}</span>
                    </span>
                    <span className="progress mt-2" style={{ height: 6 }}>
                      <span style={{ width: `${percent}%`, background: status === 'overdue' ? 'var(--red)' : undefined }} />
                    </span>
                  </span>
                  <Chip tone={statusTone(status)}>{status}</Chip>
                </button>
                {isExpanded && (
                  <div className="card panel-in" style={{ margin: '4px 4px 12px', borderRadius: 12 }}>
                    <Meta rows={[
                      ['Received', fmtDate(advance.disbursedDate)],
                      ['Due date', fmtCashAdvanceDueDate(advance.dueDate, advance.dueAfterHarvest)],
                      ['Amount repaid', fmtMoney(paid)],
                    ]} />
                    {advance.repayments.length === 0 ? (
                      <p className="text-sm text-mute mt-3">No repayments recorded yet.</p>
                    ) : (
                      <div className="mt-3">
                        {advance.repayments.map((repayment) => (
                          <div className="flex between" key={repayment.id} style={{ fontSize: 13, padding: '6px 0', borderTop: '1px dashed var(--line)' }}>
                            <span className="text-mute">{fmtDate(repayment.date)}</span>
                            <span style={{ fontWeight: 650, color: 'var(--ink)' }}>{fmtMoney(repayment.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {status !== 'repaid' && paid < advance.principal && (
                      <RepaymentForm
                        advance={advance}
                        remaining={Math.max(0, advance.principal - paid)}
                      />
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </section>
    </>
  )
}

function RepaymentForm({ advance, remaining }: { advance: CashAdvance; remaining: number }) {
  const [date, setDate] = useState(todayInput())
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<Repayment['method']>('cash')

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const repaymentAmount = Number(amount)
    if (!Number.isFinite(repaymentAmount) || repaymentAmount <= 0 || repaymentAmount > remaining) {
      toast(`Enter an amount between ₱1 and ${fmtMoney(remaining)}.`, 'alert')
      return
    }
    if (!date || !Number.isFinite(new Date(`${date}T00:00:00`).getTime())) {
      toast('Choose a valid repayment date.', 'alert')
      return
    }
    try {
      addRepayment(advance.id, {
        date: new Date(`${date}T00:00:00`).toISOString(),
        amount: Math.round(repaymentAmount),
        method,
      })
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not record the repayment.', 'alert')
      return
    }
    toast('Repayment recorded.')
    setAmount('')
    setDate(todayInput())
  }

  return (
    <form className="mt-4" onSubmit={submit}>
      <div className="seg-title">Record a repayment</div>
      <div className="form-grid">
        <Field label="Date paid">
          <input className="input" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
        </Field>
        <Field label={`Amount (up to ${fmtMoney(remaining)})`}>
          <input
            className="input"
            type="number"
            min="1"
            max={remaining}
            step="1"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />
        </Field>
        <Field label="Payment method">
          <select className="select" value={method} onChange={(event) => setMethod(event.target.value as Repayment['method'])}>
            <option value="cash">Cash</option>
            <option value="mobile-money">Mobile money</option>
            <option value="auto-deduct">Auto-deduct</option>
            <option value="bank-transfer">Bank transfer</option>
          </select>
        </Field>
      </div>
      <Button type="submit" className="mt-3">Save repayment</Button>
    </form>
  )
}

function CashAdvanceForm({ db, online, onSaved }: { db: DB; online: boolean; onSaved: () => void }) {
  const farmers = [...db.farmers].sort((a, b) => a.name.localeCompare(b.name))
  const [farmerId, setFarmerId] = useState(farmers[0]?.id ?? '')
  const [kind, setKind] = useState<CashAdvance['kind']>('cash-advance')
  const [label, setLabel] = useState('')
  const [principal, setPrincipal] = useState('')
  const [disbursedDate, setDisbursedDate] = useState(todayInput())
  const [dueDate, setDueDate] = useState('')
  const [dueAfterHarvest, setDueAfterHarvest] = useState(false)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const amount = Number(principal)
    if (!farmers.some((farmer) => farmer.id === farmerId)) {
      toast('Choose a farm profile', 'alert')
      return
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      toast('Enter a valid advance amount', 'alert')
      return
    }
    if (!disbursedDate || (!dueAfterHarvest && (!dueDate || dueDate < disbursedDate))) {
      toast('Due date must be on or after the date received', 'alert')
      return
    }

    createCashAdvance({
      farmerId,
      kind,
      label: label.trim() || kindLabel(kind),
      principal: Math.round(amount),
      disbursedDate: new Date(`${disbursedDate}T00:00:00`).toISOString(),
      dueDate: dueAfterHarvest ? '' : new Date(`${dueDate}T00:00:00`).toISOString(),
      dueAfterHarvest,
    })
    toast('Cash advance saved on this device and added to the local queue.', online ? 'ok' : 'alert')
    setLabel('')
    setPrincipal('')
    setDueDate('')
    setDueAfterHarvest(false)
    setDisbursedDate(todayInput())
    onSaved()
  }

  return (
    <form onSubmit={submit}>
      <div className="expense-form-grid">
        <Field label="Farm profile">
          <select className="select" value={farmerId} onChange={(event) => setFarmerId(event.target.value)} required>
            {farmers.map((farmer) => (
              <option key={farmer.id} value={farmer.id}>{farmer.name} — {farmer.village}</option>
            ))}
          </select>
        </Field>
        <Field label="Advance type">
          <select className="select" value={kind} onChange={(event) => setKind(event.target.value as CashAdvance['kind'])}>
            <option value="cash-advance">Cash advance</option>
            <option value="equipment">Equipment</option>
            <option value="inputs-financing">Farm inputs</option>
            <option value="grant">Grant</option>
          </select>
        </Field>
        <Field label="Description (optional)">
          <input className="input" value={label} onChange={(event) => setLabel(event.target.value)} placeholder="e.g. Rice planting support" />
        </Field>
        <Field label="Amount received (₱)">
          <input
            className="input"
            type="number"
            inputMode="decimal"
            min="1"
            step="1"
            value={principal}
            onChange={(event) => setPrincipal(event.target.value)}
            placeholder="Enter amount"
            required
          />
        </Field>
        <Field label="Date received">
          <input className="input" type="date" value={disbursedDate} onChange={(event) => setDisbursedDate(event.target.value)} required />
        </Field>
        <Field label="Repayment due">
          <select
            className="select"
            value={dueAfterHarvest ? 'after-harvest' : 'date'}
            onChange={(event) => setDueAfterHarvest(event.target.value === 'after-harvest')}
          >
            <option value="date">Choose a date</option>
            <option value="after-harvest">After harvest</option>
          </select>
        </Field>
        {!dueAfterHarvest && (
          <Field label="Due date">
            <input className="input" type="date" value={dueDate} min={disbursedDate} onChange={(event) => setDueDate(event.target.value)} required />
          </Field>
        )}
      </div>
      <div className="flex gap-md mt-3" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-ghost" onClick={onSaved}>Cancel</button>
        <Button type="submit">
          <IconPlus width={15} height={15} /> Save record
        </Button>
      </div>
    </form>
  )
}

function kindLabel(kind: CashAdvance['kind']): string {
  const labels: Record<CashAdvance['kind'], string> = {
    'cash-advance': 'Cash advance',
    equipment: 'Equipment advance',
    'inputs-financing': 'Farm inputs',
    grant: 'Grant',
  }
  return labels[kind]
}

function todayInput(): string {
  const now = new Date()
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return localDate.toISOString().slice(0, 10)
}
