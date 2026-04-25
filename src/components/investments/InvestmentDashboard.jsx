import { useState } from 'react'
import { getInvestmentStats, calcInvestmentPnL, fmtInv, fmtPct } from '../../utils/investmentCalcs'
import { Pencil, Check } from 'lucide-react'

function Hero({ s, availableCash, cspCollateral, totalPortfolio }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      <div className="bg-slate-800/50 hover:bg-slate-800/70 backdrop-blur-md p-4 sm:p-6 rounded-lg ring-1 ring-white/[0.08] border-t-2 border-blue-500 transition-all duration-200">
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400 mb-2">Total Portfolio</p>
        <p className="text-2xl sm:text-4xl font-bold tabular-nums tracking-tight text-slate-100">{fmtInv(totalPortfolio)}</p>
        <p className="text-xs text-slate-500 mt-3">
          Equities {fmtInv(s.totalCurrentValue)} · Cash {fmtInv(availableCash)}
          {cspCollateral > 0 && <> · CSP Collateral {fmtInv(cspCollateral)}</>}
        </p>
      </div>
      <div className={`bg-slate-800/50 hover:bg-slate-800/70 backdrop-blur-md p-4 sm:p-6 rounded-lg ring-1 ring-white/[0.08] border-t-2 transition-all duration-200 ${s.totalUnrealized >= 0 ? 'border-emerald-500' : 'border-red-500'}`}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400 mb-2">Unrealized P&L</p>
        <p className={`text-2xl sm:text-4xl font-bold tabular-nums tracking-tight ${s.totalUnrealized >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {fmtInv(s.totalUnrealized)}
        </p>
        <p className={`text-xs mt-3 ${s.totalReturn >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
          {fmtPct(s.totalReturn)} on open positions
        </p>
      </div>
      <div className={`bg-slate-800/50 hover:bg-slate-800/70 backdrop-blur-md p-4 sm:p-6 rounded-lg ring-1 ring-white/[0.08] border-t-2 transition-all duration-200 ${s.totalRealized >= 0 ? 'border-emerald-500' : 'border-red-500'}`}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400 mb-2">Realized P&L</p>
        <p className={`text-2xl sm:text-4xl font-bold tabular-nums tracking-tight ${s.totalRealized >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {fmtInv(s.totalRealized)}
        </p>
        <p className="text-xs text-slate-500 mt-3">{s.closedCount} closed position{s.closedCount !== 1 ? 's' : ''}</p>
      </div>
      <div className={`bg-slate-800/50 hover:bg-slate-800/70 backdrop-blur-md p-4 sm:p-6 rounded-lg ring-1 ring-white/[0.08] border-t-2 transition-all duration-200 ${s.totalPnL >= 0 ? 'border-emerald-500' : 'border-red-500'}`}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400 mb-2">Total P&L</p>
        <p className={`text-2xl sm:text-4xl font-bold tabular-nums tracking-tight ${s.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {fmtInv(s.totalPnL)}
        </p>
        <p className="text-xs text-slate-500 mt-3">unrealized + realized</p>
      </div>
    </div>
  )
}

function MetricRow({ label, value, color = 'text-slate-200', sub }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/[0.05] last:border-0">
      <span className="text-sm text-slate-400 font-medium">{label}</span>
      <div className="text-right">
        <span className={`text-sm font-bold tabular-nums ${color}`}>{value}</span>
        {sub && <span className="text-xs text-slate-500 ml-2">{sub}</span>}
      </div>
    </div>
  )
}

function MetricGroup({ title, accent, children, hidden = false }) {
  return (
    <div className={`bg-slate-800/50 backdrop-blur-md rounded-lg ring-1 ring-white/[0.08] border-t-2 ${accent} overflow-hidden ${hidden ? 'hidden md:block' : ''} hover:bg-slate-800/60 transition-colors duration-200`}>
      <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">{title}</p>
      </div>
      <div className="px-4 sm:px-5 pb-4">{children}</div>
    </div>
  )
}

const INV_TABS = ['Portfolio', 'Closed Positions']

export default function InvestmentDashboard({ investments, cash = 0, onCashUpdate }) {
  const s = getInvestmentStats(investments)
  const [activeTab, setActiveTab] = useState(0)
  const [editingCash, setEditingCash] = useState(false)
  const [cashInput, setCashInput] = useState('')

  const cspCollateral = s.cspCollateral
  const openStockCost = investments
    .filter(i => i.status === 'open' && i.assetType !== 'Option')
    .reduce((sum, i) => sum + (parseFloat(i.shares) || 0) * (parseFloat(i.avgCost) || 0), 0)
  const availableCash  = cash - openStockCost - cspCollateral + s.totalRealized
  const totalPortfolio = s.totalCurrentValue + availableCash + cspCollateral

  const actualReturn = cash > 0 ? (s.totalPnL / cash) * 100 : null

  const avgAnnReturn = (() => {
    const rates = investments
      .filter(i => i.status === 'closed' && i.assetType === 'Option' && i.buyDate && i.sellDate)
      .map(i => {
        const dur = Math.round((new Date(i.sellDate) - new Date(i.buyDate)) / 86400000)
        const strike = parseFloat(i.strike) || 0
        const shares = parseFloat(i.shares) || 0
        const collateral = shares * strike * 100
        const pnl = calcInvestmentPnL(i).realized
        if (dur > 0 && collateral > 0 && pnl != null) return (pnl / collateral) * (365 / dur) * 100
        return null
      })
      .filter(r => r !== null)
    return rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : null
  })()
  const cashPct = totalPortfolio > 0 ? (availableCash / totalPortfolio) * 100 : 0

  function startEdit() { setCashInput(String(cash)); setEditingCash(true) }
  function commitEdit() { onCashUpdate?.(cashInput); setEditingCash(false) }

  return (
    <div className="mb-6 space-y-4">
      <Hero s={s} availableCash={availableCash} cspCollateral={cspCollateral} totalPortfolio={totalPortfolio} />

      {/* Mobile tab switcher */}
      <div className="flex md:hidden gap-1.5">
        {INV_TABS.map((t, i) => (
          <button key={t} onClick={() => setActiveTab(i)}
            className={`flex-1 py-2 rounded text-[11px] font-medium leading-tight ${activeTab === i ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MetricGroup title="Portfolio" accent="border-t-blue-500" hidden={activeTab !== 0}>
          <MetricRow label="Open Positions"   value={s.openCount || '—'} color="text-blue-400" />
          <MetricRow label="Equities Value"   value={fmtInv(s.totalCurrentValue)} />
          <MetricRow label="Unrealized P&L"   value={fmtInv(s.totalUnrealized)} color={s.totalUnrealized >= 0 ? 'text-green-400' : 'text-red-400'} />
          <MetricRow label="Return"           value={fmtPct(s.totalReturn)} color={s.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'} sub="open positions" />
          <MetricRow label="Actual Return"    value={actualReturn !== null ? `${actualReturn >= 0 ? '+' : ''}${actualReturn.toFixed(1)}%` : '—'} color={actualReturn === null ? 'text-slate-500' : actualReturn >= 0 ? 'text-green-400' : 'text-red-400'} sub="total P&L / cost basis" />
          {/* Cash row */}
          <div className="flex items-center justify-between py-2.5 border-b border-slate-700/60">
            <span className="text-sm text-slate-400">Available Cash ({cashPct.toFixed(1)}%)</span>
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
                <span className="text-sm font-semibold text-slate-200 tabular-nums">{fmtInv(availableCash)}</span>
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
          <MetricRow label="Avg Ann. Return"  value={avgAnnReturn !== null ? `${avgAnnReturn >= 0 ? '+' : ''}${avgAnnReturn.toFixed(1)}%` : '—'} color={avgAnnReturn === null ? 'text-slate-500' : avgAnnReturn >= 0 ? 'text-green-400' : 'text-red-400'} sub="options only" />
        </MetricGroup>
      </div>
    </div>
  )
}
