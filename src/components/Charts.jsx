import { useState } from 'react'
import CalendarHeatmap from './CalendarHeatmap'
import {
  AreaChart, Area, BarChart, Bar, Cell, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, CartesianGrid, PieChart, Pie,
  ComposedChart, Line
} from 'recharts'
import {
  getEquityCurve, getDailyPnL, getPnLBySymbol, getPnLByDayOfWeek,
  getPnLByType, getPnLByDirection, getMonthlyPnL, getTradePnLDistribution, fmt
} from '../utils/calculations'

const CHART_TABS = ['Equity', 'Drawdown', 'Daily P&L', 'Monthly', 'By Symbol', 'By Day', 'Long vs Short', 'Type Split', 'Distribution']

function Tooltip2({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm shadow-xl">
      <p className="text-slate-400 text-xs mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color ?? (p.value >= 0 ? '#22c55e' : '#ef4444') }} className="font-medium">
          {p.name}: {typeof p.value === 'number' ? (p.name?.includes('%') ? `${p.value.toFixed(1)}%` : fmt(p.value)) : p.value}
        </p>
      ))}
    </div>
  )
}

function ChartCard({ title, children }) {
  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
      <h3 className="text-sm font-medium text-slate-300 mb-4">{title}</h3>
      {children}
    </div>
  )
}

function EmptyChart() {
  return <div className="flex items-center justify-center h-[200px] text-slate-500 text-sm">Not enough data yet.</div>
}

export default function Charts({ trades }) {
  const [tab, setTab] = useState('Equity')
  const [dailyView, setDailyView] = useState('bar') // 'bar' | 'calendar'

  const equity = getEquityCurve(trades)
  const daily = getDailyPnL(trades)
  const bySymbol = getPnLBySymbol(trades)
  const byDay = getPnLByDayOfWeek(trades)
  const byType = getPnLByType(trades)
  const byDirection = getPnLByDirection(trades)
  const monthly = getMonthlyPnL(trades)
  const distribution = getTradePnLDistribution(trades)

  const PIE_COLORS = ['#3b82f6', '#a855f7', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4']

  return (
    <div>
      {/* Chart tab strip */}
      <div className="flex gap-1 mb-4 flex-wrap">
        {CHART_TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-colors ${tab === t ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Equity' && (
        <ChartCard title="Equity Curve — Cumulative Net P&L">
          {equity.length < 2 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={equity}>
                <defs>
                  <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => fmt(v)} width={85} />
                <Tooltip content={<Tooltip2 />} />
                <ReferenceLine y={0} stroke="#64748b" strokeDasharray="3 3" />
                <Area type="monotone" dataKey="equity" name="Equity" stroke="#3b82f6" fill="url(#equityGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      )}

      {tab === 'Drawdown' && (
        <ChartCard title="Drawdown — Loss from Peak Equity">
          {equity.length < 2 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={equity}>
                <defs>
                  <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => fmt(v)} width={85} />
                <Tooltip content={<Tooltip2 />} />
                <ReferenceLine y={0} stroke="#64748b" />
                <Area type="monotone" dataKey="drawdown" name="Drawdown" stroke="#ef4444" fill="url(#ddGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      )}

      {tab === 'Daily P&L' && (
        <ChartCard title={
          <div className="flex items-center justify-between">
            <span>Daily P&L</span>
            <div className="flex bg-slate-700 rounded p-0.5 gap-0.5">
              {['bar', 'calendar'].map(v => (
                <button key={v} onClick={() => setDailyView(v)}
                  className={`px-2.5 py-1 rounded text-xs font-medium capitalize transition-colors ${dailyView === v ? 'bg-slate-500 text-slate-100' : 'text-slate-400 hover:text-slate-200'}`}>
                  {v}
                </button>
              ))}
            </div>
          </div>
        }>
          {daily.length === 0 ? <EmptyChart /> : dailyView === 'bar' ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => fmt(v)} width={85} />
                <Tooltip content={<Tooltip2 />} />
                <ReferenceLine y={0} stroke="#64748b" />
                <Bar dataKey="pnl" name="P&L" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                  {daily.map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? '#22c55e' : '#ef4444'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <CalendarHeatmap dailyData={daily} />
          )}
        </ChartCard>
      )}

      {tab === 'Monthly' && (
        <ChartCard title="Monthly P&L">
          {monthly.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis yAxisId="pnl" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => fmt(v)} width={85} />
                <YAxis yAxisId="trades" orientation="right" tick={{ fontSize: 11, fill: '#64748b' }} width={35} />
                <Tooltip content={<Tooltip2 />} />
                <ReferenceLine yAxisId="pnl" y={0} stroke="#64748b" />
                <Bar yAxisId="pnl" dataKey="pnl" name="P&L" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                  {monthly.map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? '#22c55e' : '#ef4444'} />)}
                </Bar>
                <Line yAxisId="trades" type="monotone" dataKey="trades" name="Trades" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      )}

      {tab === 'By Symbol' && (
        <div className="space-y-4">
          <ChartCard title="P&L by Symbol">
            {bySymbol.length === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={Math.max(200, bySymbol.length * 45)}>
                <BarChart data={bySymbol} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => fmt(v)} />
                  <YAxis type="category" dataKey="symbol" tick={{ fontSize: 12, fill: '#94a3b8' }} width={55} />
                  <Tooltip content={<Tooltip2 />} />
                  <ReferenceLine x={0} stroke="#64748b" />
                  <Bar dataKey="pnl" name="P&L" radius={[0, 3, 3, 0]} isAnimationActive={false}>
                    {bySymbol.map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? '#22c55e' : '#ef4444'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
          <ChartCard title="Win Rate by Symbol">
            {bySymbol.length === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={Math.max(200, bySymbol.length * 45)}>
                <BarChart data={bySymbol} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `${v}%`} />
                  <YAxis type="category" dataKey="symbol" tick={{ fontSize: 12, fill: '#94a3b8' }} width={55} />
                  <Tooltip formatter={(v) => [`${v.toFixed(1)}%`, 'Win Rate']} contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '6px' }} labelStyle={{ color: '#94a3b8' }} />
                  <ReferenceLine x={50} stroke="#64748b" strokeDasharray="4 4" />
                  <Bar dataKey="winRate" name="Win Rate %" radius={[0, 3, 3, 0]} isAnimationActive={false}>
                    {bySymbol.map((e, i) => <Cell key={i} fill={e.winRate >= 50 ? '#22c55e' : '#ef4444'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
      )}

      {tab === 'By Day' && (
        <div className="space-y-4">
          <ChartCard title="P&L by Day of Week">
            {byDay.every(d => d.trades === 0) ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={byDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => fmt(v)} width={85} />
                  <Tooltip content={<Tooltip2 />} />
                  <ReferenceLine y={0} stroke="#64748b" />
                  <Bar dataKey="pnl" name="P&L" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                    {byDay.map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? '#22c55e' : '#ef4444'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
          <ChartCard title="Win Rate by Day of Week">
            {byDay.every(d => d.trades === 0) ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={byDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `${v}%`} width={45} />
                  <Tooltip formatter={(v) => [`${v.toFixed(1)}%`, 'Win Rate']} contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '6px' }} labelStyle={{ color: '#94a3b8' }} />
                  <ReferenceLine y={50} stroke="#64748b" strokeDasharray="4 4" />
                  <Bar dataKey="winRate" name="Win Rate %" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                    {byDay.map((e, i) => <Cell key={i} fill={e.winRate >= 50 ? '#22c55e' : '#ef4444'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
      )}

      {tab === 'Long vs Short' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ChartCard title="P&L by Direction">
            {byDirection.length === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={byDirection}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="direction" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => fmt(v)} width={85} />
                  <Tooltip content={<Tooltip2 />} />
                  <ReferenceLine y={0} stroke="#64748b" />
                  <Bar dataKey="pnl" name="P&L" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                    {byDirection.map((e, i) => <Cell key={i} fill={e.pnl >= 0 ? '#22c55e' : '#ef4444'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
          <ChartCard title="Win Rate by Direction">
            {byDirection.length === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={byDirection}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="direction" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `${v}%`} width={45} />
                  <Tooltip formatter={(v) => [`${v.toFixed(1)}%`, 'Win Rate']} contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '6px' }} labelStyle={{ color: '#94a3b8' }} />
                  <ReferenceLine y={50} stroke="#64748b" strokeDasharray="4 4" />
                  <Bar dataKey="winRate" name="Win Rate %" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                    {byDirection.map((e, i) => <Cell key={i} fill={e.winRate >= 50 ? '#22c55e' : '#ef4444'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
      )}

      {tab === 'Type Split' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ChartCard title="P&L by Instrument Type">
            {byType.length === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={byType.map(d => ({ ...d, absVal: Math.abs(d.pnl) }))}
                    dataKey="absVal"
                    nameKey="type"
                    cx="50%" cy="50%"
                    outerRadius={90}
                    label={({ type, pnl }) => `${type}: ${fmt(pnl)}`}
                    labelLine={{ stroke: '#64748b' }}
                  >
                    {byType.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(_v, _n, props) => [fmt(props.payload.pnl), props.payload.type]} contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '6px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
          <ChartCard title="Trade Count by Type">
            {byType.length === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={byType}
                    dataKey="trades"
                    nameKey="type"
                    cx="50%" cy="50%"
                    outerRadius={90}
                    label={({ type, trades, winRate }) => `${type}: ${trades} (${winRate.toFixed(0)}% WR)`}
                    labelLine={{ stroke: '#64748b' }}
                  >
                    {byType.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v, _n, props) => [`${v} trades`, props.payload.type]} contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '6px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
      )}

      {tab === 'Distribution' && (
        <ChartCard title="Trade P&L Distribution — Frequency of Outcomes">
          {distribution.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={distribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="range" tick={{ fontSize: 10, fill: '#94a3b8' }} angle={-30} textAnchor="end" height={50} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} width={35} />
                <Tooltip formatter={(v) => [v, 'Trades']} contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '6px' }} labelStyle={{ color: '#94a3b8' }} />
                <Bar dataKey="count" name="Trades" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                  {distribution.map((e, i) => <Cell key={i} fill={e.from >= 0 ? '#22c55e' : '#ef4444'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      )}
    </div>
  )
}
