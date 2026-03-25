import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts'
import { getAllocationByType, getAllocationBySector, getPositionPerformance, fmtInv, fmtPct } from '../../utils/investmentCalcs'

const COLORS = ['#3b82f6', '#a855f7', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#8b5cf6']

function ChartCard({ title, children }) {
  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
      <h3 className="text-sm font-medium text-slate-300 mb-4">{title}</h3>
      {children}
    </div>
  )
}

function EmptyChart({ msg = 'No open positions to display.' }) {
  return <div className="flex items-center justify-center h-[200px] text-slate-500 text-sm">{msg}</div>
}

function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm shadow-xl">
      <p className="text-slate-200 font-medium">{d.name}</p>
      <p className="text-slate-400">{fmtInv(d.value)}</p>
    </div>
  )
}

export default function InvestmentCharts({ investments }) {
  const byType = getAllocationByType(investments)
  const bySector = getAllocationBySector(investments)
  const performance = getPositionPerformance(investments)

  const total = byType.reduce((a, b) => a + b.value, 0)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Allocation by Type */}
        <ChartCard title="Allocation by Asset Type">
          {byType.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={byType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} innerRadius={40}
                  label={({ name, value }) => `${name} ${((value / total) * 100).toFixed(0)}%`}
                  labelLine={{ stroke: '#64748b' }}>
                  {byType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Allocation by Sector */}
        <ChartCard title="Allocation by Sector">
          {bySector.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={bySector} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} innerRadius={40}
                  label={({ name, value }) => `${name.split(' ')[0]} ${((value / total) * 100).toFixed(0)}%`}
                  labelLine={{ stroke: '#64748b' }}>
                  {bySector.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Position Performance */}
      <ChartCard title="Open Position Returns (%)">
        {performance.length === 0 ? <EmptyChart /> : (
          <ResponsiveContainer width="100%" height={Math.max(200, performance.length * 44)}>
            <BarChart data={performance} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `${v.toFixed(0)}%`} />
              <YAxis type="category" dataKey="symbol" tick={{ fontSize: 12, fill: '#94a3b8' }} width={55} />
              <Tooltip
                formatter={(v) => [`${v.toFixed(2)}%`, 'Return']}
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '6px' }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <ReferenceLine x={0} stroke="#64748b" />
              <Bar dataKey="returnPct" name="Return %" radius={[0, 3, 3, 0]} isAnimationActive={false}>
                {performance.map((e, i) => (
                  <Cell key={i} fill={e.returnPct >= 0 ? '#22c55e' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Unrealized P&L by Position */}
      <ChartCard title="Open Position Unrealized P&L ($)">
        {performance.length === 0 ? <EmptyChart /> : (
          <ResponsiveContainer width="100%" height={Math.max(200, performance.length * 44)}>
            <BarChart data={performance} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => fmtInv(v)} />
              <YAxis type="category" dataKey="symbol" tick={{ fontSize: 12, fill: '#94a3b8' }} width={55} />
              <Tooltip
                formatter={(v) => [fmtInv(v), 'Unrealized P&L']}
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '6px' }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <ReferenceLine x={0} stroke="#64748b" />
              <Bar dataKey="unrealized" name="P&L" radius={[0, 3, 3, 0]} isAnimationActive={false}>
                {performance.map((e, i) => (
                  <Cell key={i} fill={e.unrealized >= 0 ? '#22c55e' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  )
}
