import { Link } from 'react-router-dom'
import { useAppState } from '../data/store'
import { dashboardMetrics, dbForUser, outboxForUser } from '../data/selectors'
import { fmtMoney, fmtNum, fmtRelative } from '../data/format'
import { Chip, Stat } from '../components/kit'
import {
  IconArrowRight,
  IconBell,
  IconCashAdvance,
  IconCheck,
  IconExpense,
  IconFarmers,
  IconSync,
} from '../components/icons'

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function Dashboard() {
  const allDb = useAppState((state) => state.db)
  const allOutbox = useAppState((state) => state.outbox)
  const online = useAppState((state) => state.online)
  const syncing = useAppState((state) => state.syncing)
  const user = useAppState((state) => state.auth.user)
  const db = dbForUser(allDb, user)
  const outbox = outboxForUser(allOutbox, db)
  const databaseSaveStatus = useAppState((state) => state.databaseSaveStatus)
  const databaseSavedAt = useAppState((state) => state.databaseSavedAt)
  const metrics = dashboardMetrics(db, outbox)
  const firstName = user?.name.split(' ')[0] ?? 'there'
  const totalFarmSize = db.farmers.reduce((sum, farmer) => sum + farmer.farmSizeHa, 0)

  const recentVisits = [...db.visits]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)
    .map((visit) => ({
      ...visit,
      farmerName: db.farmers.find((farmer) => farmer.id === visit.farmerId)?.name ?? 'Unknown farmer',
    }))

  return (
    <div className="dashboard-page">
      <header className="page-header dashboard-header">
        <div>
          <div className="crumb">Dashboard</div>
          <h1 className="mt-2">{greeting()}, {firstName}</h1>
          <p className="text-sm mt-2">A clear overview of your farm records and recent activity.</p>
        </div>
        <Link to="/farmers" className="btn btn-primary btn-sm">
          View farm profiles
        </Link>
      </header>

      <section className="card dashboard-status" aria-live="polite" aria-label="Account connection status">
        <div className="dashboard-status-copy">
          <div className="card-title">Account sync</div>
          <p className="text-sm">
            {online
              ? databaseSaveStatus === 'saving'
                ? 'Saving your account records to Supabase…'
                : databaseSaveStatus === 'pending'
                  ? 'Your latest changes are waiting to sync.'
                  : databaseSaveStatus === 'error'
                    ? 'The last database save failed. Open Sync Status to retry.'
                    : databaseSavedAt ? `Account records last saved ${fmtRelative(databaseSavedAt)}.` : 'Account records are ready to sync.'
              : 'Changes are saved on this device and will sync when you reconnect.'}
          </p>
        </div>
        <Chip tone={!online ? 'tone-amber' : databaseSaveStatus === 'error' ? 'tone-red' : 'tone-green'} dot>
          {!online ? 'Offline' : databaseSaveStatus === 'error' ? 'Save failed' : 'Connected'}
        </Chip>
        {syncing && <span className="chip tone-blue"><IconSync className="spin" width={14} height={14} /> Processing…</span>}
      </section>

      {metrics.overdueFollowUps > 0 && (
        <section className="card dashboard-alert" aria-label="Overdue follow-ups">
          <div className="flex between wrap gap-md">
            <div className="flex gap-md">
              <IconBell width={20} height={20} />
              <div>
                <div className="card-title">
                  {metrics.overdueFollowUps} follow-up{metrics.overdueFollowUps === 1 ? '' : 's'} overdue
                </div>
                <p className="text-sm mt-2">A farm visit is due. Review your farm records.</p>
              </div>
            </div>
            <Link to="/farmers" className="btn btn-sm btn-danger-ghost">
              View profiles <IconArrowRight width={15} height={15} />
            </Link>
          </div>
        </section>
      )}

      <section className="dashboard-section" aria-labelledby="dashboard-summary-title">
        <div className="dashboard-section-head">
          <div>
            <h2 className="seg-title" id="dashboard-summary-title">Farm summary</h2>
            <p className="dashboard-section-note">Your key farm activity at a glance.</p>
          </div>
        </div>
        <div className="stat-grid dashboard-stat-grid">
          <Stat
            label="Farm profiles"
            value={metrics.farmers}
            note={`${fmtNum(totalFarmSize)} hectares total`}
            icon={<IconFarmers width={14} height={14} />}
          />
          <Stat label="Visits this week" value={metrics.visitsThisWeek} note="Farm visits recorded" icon={<IconCheck width={14} height={14} />} />
          <Stat
            label="Outstanding"
            value={fmtMoney(metrics.outstanding)}
            note={`${metrics.activeCashAdvances} active advances`}
            icon={<IconCashAdvance width={14} height={14} />}
          />
        </div>
      </section>

      <section className="dashboard-section" aria-labelledby="dashboard-actions-title">
        <div className="dashboard-section-head">
          <div>
            <h2 className="seg-title" id="dashboard-actions-title">Quick actions</h2>
            <p className="dashboard-section-note">Go straight to the records you manage most.</p>
          </div>
        </div>
        <div className="quick-grid dashboard-quick-grid">
          <Link to="/farmers" className="card quick-action">
            <span className="avatar"><IconFarmers width={19} height={19} /></span>
            <span className="grow">
              <span className="row-title">Farm profiles</span>
              <span className="row-sub d-block">{db.farmers.length} profile{db.farmers.length === 1 ? '' : 's'} in your account</span>
            </span>
            <IconArrowRight width={17} height={17} />
          </Link>
          <Link to="/cash-advances" className="card quick-action">
            <span className="avatar quick-action-gold"><IconCashAdvance width={19} height={19} /></span>
            <span className="grow">
              <span className="row-title">Cash advances</span>
              <span className="row-sub d-block">Review balances and repayments</span>
            </span>
            <IconArrowRight width={17} height={17} />
          </Link>
          <Link to="/expenses" className="card quick-action">
            <span className="avatar"><IconExpense width={19} height={19} /></span>
            <span className="grow">
              <span className="row-title">Farm expenses</span>
              <span className="row-sub d-block">Record and review farm costs</span>
            </span>
            <IconArrowRight width={17} height={17} />
          </Link>
          <Link to="/finance" className="card quick-action">
            <span className="avatar quick-action-gold"><IconExpense width={19} height={19} /></span>
            <span className="grow">
              <span className="row-title">Rice farm finance</span>
              <span className="row-sub d-block">Track harvest income, budgets, and profit</span>
            </span>
            <IconArrowRight width={17} height={17} />
          </Link>
        </div>
      </section>

      <section className="dashboard-section" aria-labelledby="dashboard-visits-title">
        <div className="dashboard-section-head">
          <div>
            <h2 className="seg-title" id="dashboard-visits-title">Recent visits</h2>
            <p className="dashboard-section-note">The latest field visits in your records.</p>
          </div>
          <Link to="/farmers" className="btn btn-ghost btn-sm">View farm profiles</Link>
        </div>
        <section className="card dashboard-visits">
          {recentVisits.length === 0 ? (
            <div className="dashboard-empty">
              <p className="text-sm text-mute">No visits recorded yet.</p>
              <Link to="/farmers" className="btn btn-primary btn-sm">Open farm profiles</Link>
            </div>
          ) : (
            <div className="feed">
              {recentVisits.map((visit) => (
                <div className="feed-item" key={visit.id}>
                  <span className="feed-icon"><IconCheck width={17} height={17} /></span>
                  <div className="feed-body grow">
                    <div className="feed-title">{visit.farmerName}</div>
                    <div className="feed-sub">{visit.purpose}</div>
                  </div>
                  <span className="feed-time">{fmtRelative(visit.date)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>
    </div>
  )
}
