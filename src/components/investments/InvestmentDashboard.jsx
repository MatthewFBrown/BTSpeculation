import { useState } from 'react'
import { getInvestmentStats, fmtInv, fmtPct } from '../../utils/investmentCalcs'
import { Pencil, Check } from 'lucide-react'

function Hero({ s, cash, totalPortfolio }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-slate-700 rounded-xl overflow-hidden border border-slate-700 mb-4">
      <div className="bg-slate-800 p-3 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">Total Portfolio</p>
        <p className="text-xl sm:text-3xl font-bold tabular-nums tracking-tight text-slate-100">{fmtInv(totalPortfolio)}</p>
        <p className="text-xs text-slate-500 mt-2">
          Equities {fmtInv(s.totalCurrentValue)} · Cash {fmtInv(cash)}
        </p>
      </div>
      <div className="bg-slate-800 p-3 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">Unrealized P&L</p>
        <p className={`text-xl sm:text-3xl font-bold tabular-nums tracking-tight ${s.totalUnrealized >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {fmtInv(s.totalUnrealized)}
        </p>
        <p className={`text-xs mt-2 ${s.totalReturn >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          {fmtPct(s.totalReturn)} on open positions
        </p>
      </div>
      <div className="bg-slate-800 p-3 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">Realized P&L</p>
        <p className={`text-xl sm:text-3xl font-bold tabular-nums tracking-tight ${s.totalRealized >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {fmtInv(s.totalRealized)}
        </p>
        <p className="text-xs text-slate-500 mt-2">{s.closedCount} closed position{s.closedCount !== 1 ? 's' : ''}</p>
      </div>
      <div className="bg-slate-800 p-3 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">Total P&L</p>
        <p className={`text-xl sm:text-3xl font-bold tabular-nums tracking-tight ${s.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {fmtInv(s.totalPnL)}
        </p>
        <p className="text-xs text-slate-500 mt-2">unrealized + realized</p>
      </div>
    </div>
  )
}

function MetricRow({ label, value, color = 'text-slate-200', sub }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-700/60 last:border-0">
      <span className="text-sm text-slate-400">{label}</span>
      <div className="text-right">
        <span className={`text-sm font-semibold tabular-nums ${color}`}>{value}</span>
        {sub && <span className="text-xs text-slate-500 ml-2">{sub}</span>}
      </div>
    </div>
  )
}

function MetricGroup({ title, accent, children, hidden = false }) {
  return (
    <div className={`bg-slate-800 rounded-xl border border-slate-700 border-t-2 ${accent} overflow-hidden ${hidden ? 'hidden md:block' : ''}`}>
      <div className="px-3 sm:px-4 pt-3 sm:pt-4 pb-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">{title}</p>
      </div>
      <div className="px-3 sm:px-4 pb-3">{children}</div>
    </div>
  )
}

const INV_TABS = ['Portfolio', 'Closed Positions', 'Best / Worst']

export default function InvestmentDashboard({ investments, cash = 0, onCashUpdate }) {
  const s = getInvestmentStats(investments)
  const [activeTab, setActiveTab] = useState(0)
  const [editingCash, setEditingCash] = useState(false)
  const [cashInput, setCashInput] = useState('')
  const totalPortfolio = s.totalCurrentValue + cash
  const cashPct = totalPortfolio > 0 ? (cash / totalPortfolio) * 100 : 0

  function startEdit() { setCashInput(String(cash)); setEditingCash(true) }
  function commitEdit() { onCashUpdate?.(cashInput); setEditingCash(false) }

  return (
    <div className="mb-6 space-y-4">
      <Hero s={s} cash={cash} totalPortfolio={totalPortfolio} />

      {/* Mobile tab switcher */}
      <div className="flex md:hidden gap-1.5">
        {INV_TABS.map((t, i) => (
          <button key={t} onClick={() => setActiveTab(i)}
            className={`flex-1 py-2 rounded text-[11px] font-medium leading-tight ${activeTab === i ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricGroup title="Portfolio" accent="border-t-blue-500" hidden={activeTab !== 0}>
          <MetricRow label="Open Positions"   value={s.openCount || '—'} color="text-blue-400" />
          <MetricRow label="Equities Value"   value={fmtInv(s.totalCurrentValue)} />
          <MetricRow label="Unrealized P&L"   value={fmtInv(s.totalUnrealized)} color={s.totalUnrealized >= 0 ? 'text-green-400' : 'text-red-400'} />
          <MetricRow label="Return"           value={fmtPct(s.totalReturn)} color={s.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'} sub="open positions" />
          {/* Cash row */}
          <div className="flex items-center justify-between py-2.5 border-b border-slate-700/60">
            <span className="text-sm text-slate-400">Cash ({cashPct.toFixed(1)}%)</span>
            {editingCash ? (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 text-sm">$</span>
                <input
                  autoFocus type="number" min="0" step="100"
                  value={cashInput}
                  onChange={e => setCashInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingCash(false) }}
                  className="w-28 bg-slate-700 border border-blue-500 rounded px-2 py-0.5 text-sm text-slate-100 text-right focus:outline-none tabular-nums"
                />
                <button onClick={commitEdit} className="text-green-400 hover:text-green-300"><Check size={14} /></button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-200 tabular-nums">{fmtInv(cash)}</span>
                <button onClick={startEdit} className="text-slate-600 hover:text-slate-300 transition-colors"><Pencil size={12} /></button>
              </div>
            )}
          </div>
          <MetricRow label="Total Portfolio"  value={fmtInv(totalPortfolio)} color="text-blue-300" />
        </MetricGroup>

        <MetricGroup title="Closed Positions" accent="border-t-emerald-500" hidden={activeTab !== 1}>
          <MetricRow label="Closed Positions" value={s.closedCount || '—'} />
          <MetricRow label="Realized P&L"     value={fmtInv(s.totalRealized)} color={s.totalRealized >= 0 ? 'text-green-400' : 'text-red-400'} />
          <MetricRow label="Win Rate"         value={s.closedCount > 0 ? `${s.winRate.toFixed(1)}%` : '—'} color={s.winRate >= 50 ? 'text-green-400' : 'text-red-400'} />
          <MetricRow label="Avg Win"          value={s.avgWin !== 0 ? fmtInv(s.avgWin) : '—'} color="text-green-400" />
          <MetricRow label="Avg Loss"         value={s.avgLoss !== 0 ? fmtInv(s.avgLoss) : '—'} color="text-red-400" />
        </MetricGroup>

        <MetricGroup title="Best / Worst" accent="border-t-violet-500" hidden={activeTab !== 2}>
          <MetricRow label="Best Close"  value={s.bestPosition !== null ? fmtInv(s.bestPosition) : '—'} color="text-green-400" />
          <MetricRow label="Worst Close" value={s.worstPosition !== null ? fmtInv(s.worstPosition) : '—'} color="text-red-400" />
          <MetricRow label="Combined P&L" value={fmtInv(s.totalPnL)} color={s.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'} />
        </MetricGroup>
      </div>
    </div>
  )
}
