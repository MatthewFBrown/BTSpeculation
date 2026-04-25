import { useState, useRef, useEffect } from 'react'
import { calcInvestmentPnL, fmtInv, fmtPct } from '../../utils/investmentCalcs'
import { exportPDF, exportExcel } from '../../utils/exportInvestments'
import { Pencil, Trash2, ImageIcon, RefreshCw, SlidersHorizontal, X, FileText, FileSpreadsheet, RotateCcw, Plus } from 'lucide-react'
import RollOptionModal from './RollOptionModal'
import CloseOrDeleteModal from './CloseOrDeleteModal'

const TYPE_OPTIONS = ['All Types', 'Stock', 'ETF', 'Crypto', 'Bond', 'Option', 'Other']
const TYPE_ORDER   = ['Stock', 'ETF', 'Option', 'Crypto', 'Bond', 'Other']
const TH = 'text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 whitespace-nowrap'
const TD = 'px-4 py-3'

export default function InvestmentTable({ investments, onDelete, onEdit, onRoll, onClosePosition, onAdd, onUpdatePrice, accountName, cash = 0 }) {
  const [typeFilter,  setTypeFilter]  = useState('All Types')
  const [showFilters, setShowFilters] = useState(false)
  const [rollingInv,  setRollingInv]  = useState(null)
  const [closingInv,  setClosingInv]  = useState(null)
  const dropRef = useRef(null)

  useEffect(() => {
    if (!showFilters) return
    function handle(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) setShowFilters(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [showFilters])

  const filtered        = typeFilter === 'All Types' ? investments : investments.filter(i => i.assetType === typeFilter)
  const openPositions   = filtered.filter(i => i.status === 'open')
  const closedPositions = filtered.filter(i => i.status === 'closed')

  function clearFilters() { setTypeFilter('All Types') }

  // ── Table headers ──
  function OpenHeader() {
    return (
      <thead>
        <tr className="border-b border-white/[0.05]">
          <th className={TH}>Symbol</th>
          <th className={`hidden md:table-cell ${TH}`}>Sector</th>
          <th className={TH}>Shares</th>
          <th className={TH}>Avg Cost</th>
          <th className={TH}>Price</th>
          <th className={`hidden md:table-cell ${TH}`}>Mkt Val</th>
          <th className={TH}>P&L</th>
          <th className={TH}>Return</th>
          <th className={`hidden md:table-cell ${TH}`}>Buy Date</th>
          <th className="px-2 py-2.5" />
        </tr>
      </thead>
    )
  }

  function OptionOpenHeader() {
    return (
      <thead>
        <tr className="border-b border-white/[0.05]">
          <th className={TH}>Symbol</th>
          <th className={`hidden md:table-cell ${TH}`}>Sector</th>
          <th className={TH}>Contracts</th>
          <th className={TH}>Strike</th>
          <th className={TH}>Premium</th>
          <th className={TH}>Price</th>
          <th className={TH}>DTE</th>
          <th className={TH}>Collateral</th>
          <th className={`hidden md:table-cell ${TH}`}>Buy Date</th>
          <th className="px-2 py-2.5" />
        </tr>
      </thead>
    )
  }

  function ClosedHeader() {
    return (
      <thead>
        <tr className="border-b border-white/[0.05]">
          <th className={TH}>Symbol</th>
          <th className={TH}>Type</th>
          <th className={TH}>Shares</th>
          <th className={TH}>Strike</th>
          <th className={TH}>Avg Cost</th>
          <th className={TH}>Sell Price</th>
          <th className={`hidden md:table-cell ${TH}`}>Sell Date</th>
          <th className={`hidden md:table-cell ${TH}`}>Mkt Val</th>
          <th className={TH}>P&L</th>
          <th className={TH}>Return</th>
          <th className={`hidden md:table-cell ${TH}`}>Ann. Return</th>
          <th className={`hidden md:table-cell ${TH}`}>Buy Date</th>
          <th className="px-2 py-2.5" />
        </tr>
      </thead>
    )
  }

  // ── Action buttons (hover-reveal) ──
  const actions = inv => (
    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
      {inv.chartLink && <a href={inv.chartLink} target="_blank" rel="noopener noreferrer" className="p-1 text-slate-500 hover:text-violet-400 rounded"><ImageIcon size={13} /></a>}
      <button onClick={() => onEdit(inv)} className="p-1 text-slate-500 hover:text-slate-200 rounded"><Pencil size={13} /></button>
      <button
        onClick={() => inv.status === 'open' ? setClosingInv(inv) : onDelete(inv.id)}
        className="p-1 text-slate-500 hover:text-red-400 rounded"
      ><Trash2 size={13} /></button>
    </div>
  )

  // ── Row renderers ──
  function OpenRow({ inv }) {
    const { total, returnPct } = calcInvestmentPnL(inv)
    const shares      = parseFloat(inv.shares) || 0
    const currentPrice = parseFloat(inv.currentPrice) || 0
    const marketValue  = shares * currentPrice

    return (
      <tr className="group border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
        <td className={TD}>
          <span className="font-mono font-bold text-slate-100 text-sm">{inv.symbol}</span>
          {inv.name && <p className="text-[11px] text-slate-500 truncate max-w-[120px]">{inv.name}</p>}
        </td>
        <td className={`hidden md:table-cell ${TD} text-xs text-slate-400`}>{inv.sector}</td>
        <td className={`${TD} font-mono text-slate-300 text-sm`}>{inv.shares}</td>
        <td className={`${TD} font-mono text-slate-300 text-sm`}>${parseFloat(inv.avgCost).toFixed(2)}</td>
        <td className={TD}>
          <div className="flex items-center gap-1 group/price">
            <span className="font-mono text-slate-200 text-sm">{inv.currentPrice ? `$${parseFloat(inv.currentPrice).toFixed(2)}` : '—'}</span>
            <button onClick={() => onUpdatePrice(inv)} className="opacity-0 group-hover/price:opacity-100 text-slate-500 hover:text-blue-400 transition-opacity"><RefreshCw size={11} /></button>
          </div>
        </td>
        <td className={`hidden md:table-cell ${TD} font-mono text-slate-300 text-sm`}>{marketValue > 0 ? fmtInv(marketValue) : '—'}</td>
        <td className={`${TD} font-mono font-semibold text-sm ${total === null ? 'text-slate-500' : total >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtInv(total)}</td>
        <td className={`${TD} font-mono text-sm font-semibold ${returnPct === null ? 'text-slate-500' : returnPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtPct(returnPct)}</td>
        <td className={`hidden md:table-cell ${TD} text-xs text-slate-500`}>{inv.buyDate}</td>
        <td className="px-2 py-3">{actions(inv)}</td>
      </tr>
    )
  }

  function OptionOpenRow({ inv }) {
    const contracts  = parseFloat(inv.shares) || 0
    const strike     = parseFloat(inv.strike) || 0
    const collateral = contracts * strike * 100
    const dte        = inv.expiry ? Math.max(0, Math.ceil((new Date(inv.expiry) - new Date()) / 86400000)) : null
    const dteColor   = dte === null ? 'text-slate-600' : dte <= 7 ? 'text-red-400' : dte <= 21 ? 'text-yellow-400' : 'text-slate-300'

    return (
      <tr className="group border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
        <td className={TD}>
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-bold text-slate-100 text-sm">{inv.symbol}</span>
            {inv.optionType && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-semibold uppercase">{inv.optionDirection} {inv.optionType}</span>}
          </div>
        </td>
        <td className={`hidden md:table-cell ${TD} text-xs text-slate-400`}>{inv.sector}</td>
        <td className={`${TD} font-mono text-slate-300 text-sm`}>{inv.shares}</td>
        <td className={`${TD} font-mono text-slate-200 text-sm`}>{strike ? `$${strike.toFixed(2)}` : '—'}</td>
        <td className={`${TD} font-mono text-emerald-400 text-sm font-semibold`}>${parseFloat(inv.avgCost).toFixed(2)}</td>
        <td className={TD}>
          <div className="flex items-center gap-1 group/price">
            <span className="font-mono text-slate-200 text-sm">{inv.currentPrice ? `$${parseFloat(inv.currentPrice).toFixed(2)}` : '—'}</span>
            <button onClick={() => onUpdatePrice(inv)} className="opacity-0 group-hover/price:opacity-100 text-slate-500 hover:text-blue-400 transition-opacity"><RefreshCw size={11} /></button>
          </div>
        </td>
        <td className={`${TD} font-semibold text-sm tabular-nums ${dteColor}`}>{dte !== null ? `${dte}d` : '—'}</td>
        <td className={`${TD} font-mono font-semibold text-slate-200 text-sm`}>{collateral > 0 ? fmtInv(collateral) : '—'}</td>
        <td className={`hidden md:table-cell ${TD} text-xs text-slate-500`}>{inv.buyDate}</td>
        <td className="px-2 py-3">
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {inv.chartLink && <a href={inv.chartLink} target="_blank" rel="noopener noreferrer" className="p-1 text-slate-500 hover:text-violet-400 rounded"><ImageIcon size={13} /></a>}
            <button onClick={() => setRollingInv(inv)} className="p-1 text-slate-500 hover:text-amber-400 rounded" title="Roll position"><RotateCcw size={13} /></button>
            <button onClick={() => onEdit(inv)} className="p-1 text-slate-500 hover:text-slate-200 rounded"><Pencil size={13} /></button>
            <button onClick={() => setClosingInv(inv)} className="p-1 text-slate-500 hover:text-red-400 rounded"><Trash2 size={13} /></button>
          </div>
        </td>
      </tr>
    )
  }

  function ClosedRow({ inv }) {
    const { total, returnPct } = calcInvestmentPnL(inv)
    const shares    = parseFloat(inv.shares) || 0
    const sellPrice = parseFloat(inv.sellPrice) || 0
    const isOption  = inv.assetType === 'Option'
    const marketValue = shares * sellPrice * (isOption ? 100 : 1)

    let annReturn = null
    if (isOption && inv.buyDate && inv.sellDate && total != null) {
      const dur = Math.round((new Date(inv.sellDate) - new Date(inv.buyDate)) / 86400000)
      const strike = parseFloat(inv.strike) || 0
      const collateral = shares * strike * 100
      if (dur > 0 && collateral > 0) annReturn = (total / collateral) * (365 / dur) * 100
    }

    return (
      <tr className="group border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
        <td className={TD}>
          <span className="font-mono font-bold text-slate-100 text-sm">{inv.symbol}</span>
          {inv.name && <p className="text-[11px] text-slate-500 truncate max-w-[120px]">{inv.name}</p>}
        </td>
        <td className={TD}><span className="text-[11px] px-1.5 py-0.5 rounded-full bg-slate-700/80 text-slate-400 font-medium">{inv.assetType}</span></td>
        <td className={`${TD} font-mono text-slate-300 text-sm`}>{inv.shares}</td>
        <td className={`${TD} font-mono text-slate-300 text-sm`}>{isOption && inv.strike ? `$${parseFloat(inv.strike).toFixed(2)}` : '—'}</td>
        <td className={`${TD} font-mono text-slate-300 text-sm`}>${parseFloat(inv.avgCost).toFixed(2)}</td>
        <td className={`${TD} font-mono text-slate-300 text-sm`}>{inv.sellPrice ? `$${parseFloat(inv.sellPrice).toFixed(2)}` : '—'}</td>
        <td className={`hidden md:table-cell ${TD} text-xs text-slate-500`}>{inv.sellDate || '—'}</td>
        <td className={`hidden md:table-cell ${TD} font-mono text-slate-300 text-sm`}>{marketValue > 0 ? fmtInv(marketValue) : '—'}</td>
        <td className={`${TD} font-mono font-semibold text-sm ${total === null ? 'text-slate-500' : total >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtInv(total)}</td>
        <td className={`${TD} font-mono text-sm font-semibold ${returnPct === null ? 'text-slate-500' : returnPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtPct(returnPct)}</td>
        <td className={`hidden md:table-cell ${TD} font-mono text-sm font-semibold ${annReturn === null ? 'text-slate-600' : annReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {annReturn !== null ? `${annReturn >= 0 ? '+' : ''}${annReturn.toFixed(1)}%` : '—'}
        </td>
        <td className={`hidden md:table-cell ${TD} text-xs text-slate-500`}>{inv.buyDate}</td>
        <td className="px-2 py-3">{actions(inv)}</td>
      </tr>
    )
  }

  // ── Mobile card ──
  function MobileCard({ inv }) {
    const { total, returnPct } = calcInvestmentPnL(inv)
    const shares       = parseFloat(inv.shares) || 0
    const isOption     = inv.assetType === 'Option'
    const multiplier   = isOption ? 100 : 1
    const displayPrice = inv.status === 'open' ? inv.currentPrice : inv.sellPrice
    const marketValue  = shares * (parseFloat(displayPrice) || 0) * multiplier

    return (
      <div className="bg-slate-800/70 rounded-xl ring-1 ring-white/[0.06] p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-mono font-bold text-slate-100">{inv.symbol}</span>
              {inv.status === 'closed' && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-700/80 text-slate-400 font-medium">{inv.assetType}</span>}
              {isOption && inv.optionType && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-semibold uppercase">{inv.optionDirection} {inv.optionType}</span>}
            </div>
            {inv.name && <p className="text-xs text-slate-500 mt-0.5 truncate">{inv.name}</p>}
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            {inv.chartLink && <a href={inv.chartLink} target="_blank" rel="noopener noreferrer" className="p-1 text-slate-500 hover:text-violet-400"><ImageIcon size={13} /></a>}
            {isOption && inv.status === 'open' && <button onClick={() => setRollingInv(inv)} className="p-1 text-slate-500 hover:text-amber-400"><RotateCcw size={13} /></button>}
            <button onClick={() => onEdit(inv)} className="p-1 text-slate-500 hover:text-slate-200"><Pencil size={13} /></button>
            <button
              onClick={() => inv.status === 'open' ? setClosingInv(inv) : onDelete(inv.id)}
              className="p-1 text-slate-500 hover:text-red-400"
            ><Trash2 size={13} /></button>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <div className="text-slate-500">
            {inv.status === 'open' ? 'Price' : 'Sell Price'}
            {inv.status === 'open' && <button onClick={() => onUpdatePrice(inv)} className="ml-1 text-slate-600 hover:text-blue-400"><RefreshCw size={10} className="inline" /></button>}
            <span className="ml-1 font-mono text-slate-300">{displayPrice ? `$${parseFloat(displayPrice).toFixed(2)}` : '—'}</span>
          </div>
          <div className="text-slate-500">{isOption ? 'Contracts' : 'Shares'} <span className="font-mono text-slate-300">{inv.shares}</span></div>
          <div className="text-slate-500">Avg <span className="font-mono text-slate-300">${parseFloat(inv.avgCost).toFixed(2)}</span></div>
          {isOption && inv.strike
            ? <div className="text-slate-500">Collateral <span className="font-mono text-slate-200 font-semibold">{fmtInv((parseFloat(inv.shares)||0)*(parseFloat(inv.strike)||0)*100)}</span></div>
            : marketValue > 0 && <div className="text-slate-500">Value <span className="font-mono text-slate-300">{fmtInv(marketValue)}</span></div>
          }
        </div>
        {!isOption && (
          <div className="flex items-center gap-3 mt-2 pt-2 border-t border-white/[0.04]">
            <span className={`text-sm font-semibold font-mono ${total === null ? 'text-slate-500' : total >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtInv(total)}</span>
            <span className={`text-xs font-semibold font-mono ${returnPct === null ? 'text-slate-500' : returnPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtPct(returnPct)}</span>
            {inv.buyDate && <span className="text-xs text-slate-600 ml-auto">{inv.buyDate}</span>}
          </div>
        )}
      </div>
    )
  }

  // ── Open section ──
  function OpenSection() {
    if (openPositions.length === 0) return (
      <div className="bg-slate-800/70 backdrop-blur-sm rounded-xl ring-1 ring-white/[0.06] overflow-hidden">
        <div className="px-5 py-3 border-b border-white/[0.05] flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Open Positions</p>
          <button onClick={onAdd} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors"><Plus size={11} /> Add</button>
        </div>
        <p className="text-slate-600 text-sm italic text-center py-10">No open positions</p>
      </div>
    )
    const groups = TYPE_ORDER
      .map(type => ({ type, items: openPositions.filter(i => (i.assetType || 'Other') === type) }))
      .filter(g => g.items.length > 0)

    return (
      <div className="space-y-4">
        {groups.map(({ type, items }) => {
          const isOpt = type === 'Option'
          return (
            <div key={type} className="bg-slate-800/70 backdrop-blur-sm rounded-xl ring-1 ring-white/[0.06] overflow-hidden">
              <div className="px-5 py-3 border-b border-white/[0.05] flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {type} Positions <span className="text-slate-700 font-normal normal-case tracking-normal">· {items.length}</span>
                </p>
                <button onClick={onAdd}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors">
                  <Plus size={11} /> Add
                </button>
              </div>

              {/* Mobile */}
              <div className="sm:hidden p-3 space-y-2">
                {items.map(inv => <MobileCard key={inv.id} inv={inv} />)}
              </div>

              {/* Desktop */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  {isOpt ? <OptionOpenHeader /> : <OpenHeader />}
                  <tbody>
                    {items.map(inv => isOpt
                      ? <OptionOpenRow key={inv.id} inv={inv} />
                      : <OpenRow key={inv.id} inv={inv} />
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // ── Closed section ──
  function ClosedSection() {
    if (closedPositions.length === 0) return null
    return (
      <div className="bg-slate-800/70 backdrop-blur-sm rounded-xl ring-1 ring-white/[0.06] overflow-hidden">
        <div className="px-5 py-3 border-b border-white/[0.05]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Closed Positions <span className="text-slate-700 font-normal normal-case tracking-normal">· {closedPositions.length}</span>
          </p>
        </div>

        {/* Mobile */}
        <div className="sm:hidden p-3 space-y-2">
          {closedPositions.map(inv => <MobileCard key={inv.id} inv={inv} />)}
        </div>

        {/* Desktop */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <ClosedHeader />
            <tbody>
              {closedPositions.map(inv => <ClosedRow key={inv.id} inv={inv} />)}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Filter / export bar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative" ref={dropRef}>
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              typeFilter !== 'All Types'
                ? 'bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/30'
                : 'bg-white/[0.05] text-slate-400 hover:text-slate-200 ring-1 ring-white/[0.08]'
            }`}
          >
            <SlidersHorizontal size={12} />
            Filter
            {typeFilter !== 'All Types' && (
              <span className="bg-blue-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">1</span>
            )}
          </button>

          {showFilters && (
            <div className="absolute left-0 top-full mt-2 z-30 bg-slate-800 ring-1 ring-white/[0.08] rounded-xl shadow-2xl p-4 w-56">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 mb-2">Type</p>
              <div className="flex flex-wrap gap-1.5">
                {TYPE_OPTIONS.map(t => (
                  <button key={t} onClick={() => setTypeFilter(t)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      typeFilter === t ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-slate-200'
                    }`}
                  >{t === 'All Types' ? 'All' : t}</button>
                ))}
              </div>
            </div>
          )}
        </div>

        {typeFilter !== 'All Types' && (
          <button onClick={clearFilters} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-white/[0.05] text-slate-300 hover:text-white ring-1 ring-white/[0.06] transition-colors">
            {typeFilter} <X size={10} />
          </button>
        )}

        <span className="text-xs text-slate-600">{filtered.length} position{filtered.length !== 1 ? 's' : ''}</span>

        <div className="ml-auto flex items-center gap-1.5">
          <button onClick={() => exportPDF(investments, accountName, cash)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.05] ring-1 ring-white/[0.08] text-slate-400 hover:text-red-300 hover:ring-red-500/30 transition-colors"
            title="Export PDF"><FileText size={12} /> PDF</button>
          <button onClick={() => exportExcel(investments)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.05] ring-1 ring-white/[0.08] text-slate-400 hover:text-emerald-300 hover:ring-emerald-500/30 transition-colors"
            title="Export Excel"><FileSpreadsheet size={12} /> Excel</button>
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="text-center text-slate-600 py-16 text-sm italic">No positions match the selected filters.</div>
      )}

      <div className="space-y-4">
        <OpenSection />
        <ClosedSection />
      </div>

      {rollingInv && (
        <RollOptionModal
          inv={rollingInv}
          onRoll={(inv, form) => { onRoll(inv, form); setRollingInv(null) }}
          onClose={() => setRollingInv(null)}
        />
      )}

      {closingInv && (
        <CloseOrDeleteModal
          inv={closingInv}
          onClose={() => setClosingInv(null)}
          onDelete={onDelete}
          onClosePosition={onClosePosition}
        />
      )}
    </div>
  )
}
