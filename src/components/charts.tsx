import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const AXIS = { fontSize: 11.5, fill: '#8a948d', stroke: 'none' } as const
const GRID = '#e9e4d8'

export const COLORS = {
  brand: '#1d4e3b',
  brand2: '#2e6b4f',
  gold: '#d99a2b',
  amber: '#b98a2c',
  green: '#2f7d4f',
  red: '#bf4b33',
  blue: '#2f6b8f',
  pale: '#c9dfd2',
}

function tooltipStyle() {
  return {
    contentStyle: {
      borderRadius: 12,
      border: '1px solid #e6e1d5',
      boxShadow: '0 8px 24px rgba(32,55,43,.12)',
      fontSize: 12.5,
      fontFamily: 'inherit',
    },
  }
}

export function VisitBars({ data }: { data: { label: string; visits: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 6, right: 4, left: -22, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip {...tooltipStyle()} cursor={{ fill: 'rgba(46,107,79,.08)' }} />
        <Bar dataKey="visits" name="Visits" radius={[6, 6, 0, 0]} fill={COLORS.brand2} maxBarSize={30} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function TrendLine({
  data,
}: {
  data: { month: string; disbursed: number; repaid: number }[]
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 6, right: 8, left: -14, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="month" tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} domain={[0, 'dataMax']} />
        <Tooltip {...tooltipStyle()} />
        <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
        <Line type="monotone" dataKey="disbursed" name="Disbursed" stroke={COLORS.brand} strokeWidth={2.5} dot={{ r: 3 }} />
        <Line
          type="monotone"
          dataKey="repaid"
          name="Repaid"
          stroke={COLORS.gold}
          strokeWidth={2.5}
          strokeDasharray="5 4"
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function Donut({
  data,
  colors,
}: {
  data: { name: string; value: number }[]
  colors: string[]
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={46}
          outerRadius={72}
          paddingAngle={2}
          stroke="none"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} />
          ))}
        </Pie>
        <Tooltip {...tooltipStyle()} formatter={(v) => [v, 'Amount (PHP)']} />
        <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
      </PieChart>
    </ResponsiveContainer>
  )
}

export function DistributionBar({
  data,
  colors,
}: {
  data: { name: string; value: number }[]
  colors: string[]
}) {
  const total = data.reduce((s, d) => s + d.value, 0)
  return (
    <>
      <div
        className="progress"
        style={{ height: 12, display: 'flex', gap: 3, background: 'var(--surface-2)', borderRadius: 999 }}
      >
        {data.map((d, i) =>
          d.value === 0 ? null : (
            <span
              key={d.name}
              title={`${d.name}: ${d.value}`}
              style={{
                width: `${(d.value / Math.max(1, total)) * 100}%`,
                background: colors[i % colors.length],
                minWidth: 8,
              }}
            />
          ),
        )}
      </div>
      <div className="legend-row">
        {data.map((d, i) => (
          <span className="lg" key={d.name}>
            <span className="sw" style={{ background: colors[i % colors.length] }} />
            {d.name} · {d.value}
          </span>
        ))}
      </div>
    </>
  )
}

export function CropBar({
  data,
}: {
  data: { name: string; plots: number; totalT: number }[]
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 8, left: 10, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid stroke={GRID} horizontal={false} />
        <XAxis type="number" tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ ...AXIS, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={78}
        />
        <Tooltip {...tooltipStyle()} />
        <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
        <Bar dataKey="plots" name="Plots" fill={COLORS.brand2} radius={[0, 6, 6, 0]} maxBarSize={16} />
        <Bar dataKey="totalT" name="Expected yield (t)" fill={COLORS.gold} radius={[0, 6, 6, 0]} maxBarSize={16} />
        <ReferenceLine x={0} stroke="none" />
      </BarChart>
    </ResponsiveContainer>
  )
}