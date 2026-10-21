import { useAppState } from '../data/store'
import { dbForUser } from '../data/selectors'
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
  const lastSync = useAppState((s) => s.lastSyncAt)

  const health = healthCounts(db)
  const risk = riskCounts(db)
  const weeks = visitsPerWeek(db)
  const portfolio = portfolioTrend(db)
  const mix = cashAdvanceMix(db)
  const crops = plotYieldByCrop(db)

  return (
    <>
      <div className="page-header">
        <div>
          <div className="crumb">Your farm records</div>
          <h1 className="mt-2">Analytics</h1>
          <p className="text-sm mt-2">A simple overview of your visits, advances, crops, and farm health.</p>
        </div>
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
            <span className="text-mute text-sm">All fields</span>
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
            <span className="text-mute text-sm">Season plan</span>
          </div>
          <div className="chart-box" style={{ height: 270 }}><CropBar data={crops} /></div>
        </div>
      </div>

      <div className="seg-title mt-5">
        <IconChart width={14} height={14} /> About these summaries
      </div>
      <div className="card">
        <p className="text-sm text-mute">
          These figures are calculated from records saved on this device
          ({lastSync ? `last processed by the simulator ${lastSync.slice(0, 10)}` : 'no sync-simulator run yet'}). Summaries remain available offline.
        </p>
      </div>
    </>
  )
}