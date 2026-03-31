import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts'
import { getAllocationByType, getAllocationBySector, calcInvestmentPnL, fmtInv, fmtPct } from '../../utils/investmentCalcs'
import { getPortfolioRiskMetrics } from '../../utils/efficientFrontier'

const COLORS = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#06b6d4','#f97316','#84cc16']

const CustomPieLabel = ({ cx, cy, midAngle, outerRadius, name, percent }) => {
  if (percent < 0.05) return null
  const RADIAN = Math.PI / 180
  const r = outerRadius + 22
  const x = cx + r * Math.cos(-midAngle * RADIAN)
  const y = cy + r * Math.sin(-midAngle * RADIAN)
  return <text x={x} y={y} fill="#94a3b8" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={10}>{name} {(percent * 100).toFixed(0)}%</text>
}

export default function PortfolioAnalysis({ investments, cash = 0 }) {
  const m = getPortfolioRiskMetrics(investments)
  const open = investments.filter(i => i.status === 'open')

  if (open.length === 0 && cash === 0) return <div className="text-center text-slate-500 py-16 text-sm">No open positions to analyse.</div>

  // Positions by weight including cash
  const positions = open.map(i => {
    const mv = (parseFloat(i.shares) || 0) * (parseFloat(i.currentPrice) || parseFloat(i.avgCost) || 0)
    const { returnPct } = calcInvestmentPnL(i)
    return { symbol: i.symbol, mv, returnPct: returnPct ?? 0 }
  }).sort((a, b) => b.mv - a.mv)

  const equityMV = positions.reduce((a, b) => a + b.mv, 0)
  const totalPortfolio = equityMV + cash
  const posWithWeight = positions.map(p => ({ ...p, weight: totalPortfolio > 0 ? (p.mv / totalPortfolio) * 100 : 0 }))
  const cashWeight = totalPortfolio > 0 ? (cash / totalPortfolio) * 100 : 0

  // Asset type allocation — inject cash
  const byTypeRaw = getAllocationByType(investments)
  const byType = cash > 0 ? [...byTypeRaw, { name: 'Cash', value: cash }] : byTypeRaw

  // Sector allocation — inject cash
  const bySectorRaw = getAllocationBySector(investments)
  const bySector = cash > 0 ? [...bySectorRaw, { name: 'Cash', value: cash }] : bySectorRaw

  return (
    <div className="space-y-4">
      {/* Summary row */}
      {(m || cash > 0) && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-slate-700 rounded-xl overflow-hidden border border-slate-700">
          {[
            { label: 'Open Positions', value: open.length, color: 'text-blue-400' },
            { label: 'Total Portfolio', value: fmtInv(totalPortfolio), color: 'text-slate-100' },
            { label: 'Cash', value: fmtInv(cash), color: 'text-emerald-400' },
            { label: 'Cash Weight', value: `${cashWeight.toFixed(1)}%`, color: cashWeight > 30 ? 'text-yellow-400' : 'text-slate-300' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-slate-800 p-4">
              <p className="text-xs text-slate-500 mb-1">{label}</p>
              <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* By asset type donut */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">By Asset Type</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={byType} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" labelLine={false} label={CustomPieLabel}>
                {byType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={v => [fmtInv(v), 'Market Value']} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* By sector donut */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">By Sector</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={bySector} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" labelLine={false} label={CustomPieLabel}>
                {bySector.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={v => [fmtInv(v), 'Market Value']} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Position weights bar */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">Position Weights (% of total portfolio)</p>
        <ResponsiveContainer width="100%" height={Math.max(180, (posWithWeight.length + (cash > 0 ? 1 : 0)) * 32)}>
          <BarChart data={cash > 0 ? [...posWithWeight, { symbol: 'Cash', mv: cash, weight: cashWeight, returnPct: 0 }] : posWithWeight} layout="vertical" margin={{ left: 8, right: 32 }}>
            <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={v => `${v.toFixed(0)}%`} />
            <YAxis type="category" dataKey="symbol" tick={{ fill: '#cbd5e1', fontSize: 12, fontWeight: 600 }} width={55} />
            <Tooltip formatter={v => [`${v.toFixed(1)}%`, 'Weight']} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
            <Bar dataKey="weight" radius={[0, 4, 4, 0]}>
              {posWithWeight.map((p, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Position returns */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">Return by Position (%)</p>
        <ResponsiveContainer width="100%" height={Math.max(180, posWithWeight.length * 32)}>
          <BarChart data={posWithWeight} layout="vertical" margin={{ left: 8, right: 32 }}>
            <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={v => `${v.toFixed(0)}%`} />
            <YAxis type="category" dataKey="symbol" tick={{ fill: '#cbd5e1', fontSize: 12, fontWeight: 600 }} width={55} />
            <Tooltip formatter={v => [`${v.toFixed(2)}%`, 'Return']} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
            <Bar dataKey="returnPct" radius={[0, 4, 4, 0]}>
              {posWithWeight.map((p, i) => <Cell key={i} fill={p.returnPct >= 0 ? '#10b981' : '#ef4444'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
