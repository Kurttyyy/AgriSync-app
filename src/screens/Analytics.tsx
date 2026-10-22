import { useState } from 'react'
import { useAppState } from '../data/store'
import { dbForUser } from '../data/selectors'
import { totalRepaid } from '../data/repository'
import { fmtFinanceMoney } from '../data/format'
import { riceSeasonsForDb } from '../data/util'
import { Stat } from '../components/kit'
import {
  healthCounts,
  cashAdvanceMix,
  plotYieldByCrop,
  portfolioTrend,
  riskCounts,
  visitsPerWeek,
} from '../data/selectors'
import { COLORS, CropBar, DistributionBar, Donut, TrendLine, VisitBars } from '../components/charts'
import { IconChart } from '../components/icons'

export default function Analytics() {
  const allDb = useAppState((s) => s.db)
  const user = useAppState((s) => s.auth.user)
  const db = dbForUser(allDb, user)
  const databaseSavedAt = useAppState((s) => s.databaseSavedAt)
  const databaseSaveStatus = useAppState((s) => s.databaseSaveStatus)
  const [seasonFilter, setSeasonFilter] = useState('')
  const seasons = riceSeasonsForDb(db)
  const seasonDb = seasonFilter
    ? {
        ...db,
        visits: db.visits.filter((visit) =>
          seasonFilter === '__unassigned__' ? !visit.season?.trim() : visit.season === seasonFilter,
        ),
        cashAdvances: db.cashAdvances.filter((advance) =>
          seasonFilter === '__unassigned__' ? !advance.season?.trim() : advance.season === seasonFilter,
        ),
      }
    : db

  const health = healthCounts(db)
  const risk = riskCounts(db)
  const weeks = visitsPerWeek(seasonDb)
  const portfolio = portfolioTrend(seasonDb)
  const mix = cashAdvanceMix(seasonDb)
  const crops = plotYieldByCrop(db)
  const selectedExpenses = seasonFilter
    ? db.expenses.filter((expense) => expense.season === seasonFilter)
    : db.expenses
  const selectedHarvests = seasonFilter
    ? db.harvests.filter((harvest) => harvest.season === seasonFilter)
    : db.harvests
  const selectedAdvances = seasonDb.cashAdvances
  const income = selectedHarvests.reduce((sum, harvest) => sum + harvest.quantityKg * harvest.pricePerKg, 0)
  const expenses = selectedExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  const advances = selectedAdvances.reduce((sum, advance) => sum + advance.principal, 0)
  const outstanding = selectedAdvances.reduce(
    (sum, advance) => sum + Math.max(0, advance.principal - totalRepaid(advance)),
    0,
  )
  const seasonLabel = seasonFilter === '__unassigned__' ? 'Unassigned season' : seasonFilter || 'All seasons'

  return (
    <>
      <div className="page-header">
        <div>
          <div className="crumb">Your farm records</div>
          <h1 className="mt-2">Analytics</h1>
          <p className="text-sm mt-2">A simple overview of your visits, advances, crops, and farm health.</p>
        </div>
      </div>

      <div className="flex between wrap gap-md">
        <div className="seg-title">Season analytics</div>
        <label className="text-sm flex gap-sm" style={{ alignItems: 'center' }}>
          Rice season
          <select className="select" value={seasonFilter} onChange={(event) => setSeasonFilter(event.target.value)}>
            <option value="">All seasons</option>
            {seasons.map((season) => <option key={season} value={season}>{season}</option>)}
            {(db.visits.some((visit) => !visit.season?.trim()) || db.cashAdvances.some((advance) => !advance.season?.trim())) && (
              <option value="__unassigned__">Unassigned season</option>
            )}
          </select>
        </label>
      </div>
      <div className="stat-grid">
        <Stat label="Harvest income" value={fmtFinanceMoney(income)} note={seasonLabel} />
        <Stat label="Expenses" value={fmtFinanceMoney(expenses)} note={seasonLabel} />
        <Stat label="Net profit / loss" value={fmtFinanceMoney(income - expenses)} note="Income minus expenses" />
        <Stat label="Advances outstanding" value={fmtFinanceMoney(outstanding)} note={`${fmtFinanceMoney(advances)} received`} />
      </div>

      <div className="card mt-4">
        <div className="card-row">
          <span className="card-title">Farm visits · last 8 weeks</span>
        </div>
        <div className="chart-box"><VisitBars data={weeks} /></div>
      </div>

      <div className="split-layout mt-4">
        <div className="card">
          <div className="card-row">
            <span className="card-title">Cash advance flow</span>
          </div>
          <div className="chart-box" style={{ height: 230 }}><TrendLine data={portfolio} /></div>
        </div>
        <div className="card">
          <div className="card-row">
            <span className="card-title">Cash advances by type</span>
          </div>
          <div className="chart-box"><Donut data={mix} colors={[COLORS.brand, COLORS.gold, COLORS.blue, COLORS.green]} /></div>
        </div>
      </div>

      <div className="split-layout mt-4">
        <div className="card">
          <div className="card-row">
            <span className="card-title">Plot health</span>
            <span className="text-mute text-sm">Current plots · all seasons</span>
          </div>
          <div className="mt-4">
            <DistributionBar
              data={[
                { name: 'Good', value: health.good },
                { name: 'Fair', value: health.fair },
                { name: 'At risk', value: health.poor },
              ]}
              colors={[COLORS.green, COLORS.amber, COLORS.red]}
            />
          </div>
          <div className="mt-5">
            <div className="card-row">
              <span className="card-title">Credit risk mix</span>
            </div>
            <DistributionBar
              data={[
                { name: 'Low', value: risk.low },
                { name: 'Medium', value: risk.medium },
                { name: 'High', value: risk.high },
              ]}
              colors={[COLORS.green, COLORS.amber, COLORS.red]}
            />
          </div>
        </div>
        <div className="card">
          <div className="card-row">
            <span className="card-title">Expected yield by crop</span>
            <span className="text-mute text-sm">Current plot plan</span>
          </div>
          <div className="chart-box" style={{ height: 270 }}><CropBar data={crops} /></div>
        </div>
      </div>

      <div className="seg-title mt-5">
        <IconChart width={14} height={14} /> About these summaries
      </div>
      <div className="card">
        <p className="text-sm text-mute">
          These figures are calculated from your account records and remain available offline.
          {' '}{databaseSaveStatus === 'saved' && databaseSavedAt
            ? `Last saved to Supabase ${databaseSavedAt.slice(0, 10)}.`
            : databaseSaveStatus === 'error'
              ? 'The latest database save failed; see Sync Status to retry.'
              : databaseSaveStatus === 'pending'
                ? 'Changes are waiting to sync to Supabase.'
                : 'Account save status: syncing.'}
        </p>
      </div>
    </>
  )
}