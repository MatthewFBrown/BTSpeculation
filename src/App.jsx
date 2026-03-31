import { useState } from 'react'
import { useTrades } from './hooks/useTrades'
import { useInvestments } from './hooks/useInvestments'
import Dashboard from './components/Dashboard'
import TradeForm from './components/TradeForm'
import TradeTable from './components/TradeTable'
import Charts from './components/Charts'
import InvestmentDashboard from './components/investments/InvestmentDashboard'
import InvestmentTable from './components/investments/InvestmentTable'
import InvestmentCharts from './components/investments/InvestmentCharts'
import InvestmentForm from './components/investments/InvestmentForm'
import AnalysisDashboard from './components/analysis/AnalysisDashboard'
import { Plus, BarChart2, List, FlaskConical, TrendingUp, LineChart, RefreshCw, KeyRound, X, Eye } from 'lucide-react'
import TickerTape, { openWatchlistModal } from './components/TickerTape'
import { SEED_TRADES } from './utils/seedData'
import { SEED_INVESTMENTS } from './utils/seedInvestments'
import { fetchAllPrices } from './utils/fetchPrices'

export default function App() {
  const { trades, addTrade, updateTrade, deleteTrade, loadTrades } = useTrades()
  const { investments, addInvestment, updateInvestment, deleteInvestment, loadInvestments } = useInvestments()

  const [section, setSection] = useState('trading')   // 'trading' | 'investments' | 'analysis'
  const [watchlistNav, setWatchlistNav] = useState(null)  // { dest, sym }
  const [view, setView] = useState('trades')           // 'trades' | 'charts'
  const [invView, setInvView] = useState('positions')  // 'positions' | 'charts'

  const [showForm, setShowForm] = useState(false)
  const [editTrade, setEditTrade] = useState(null)

  const [showInvForm, setShowInvForm] = useState(false)
  const [editInv, setEditInv] = useState(null)
  const [updatePriceInv, setUpdatePriceInv] = useState(null)
  const [newPrice, setNewPrice] = useState('')

  // Cash balance
  const [cash, setCash] = useState(() => parseFloat(localStorage.getItem('bt_cash') || '0'))
  function handleCashUpdate(val) {
    const n = Math.max(0, parseFloat(val) || 0)
    setCash(n)
    localStorage.setItem('bt_cash', String(n))
  }

  // Price refresh
  const [refreshing, setRefreshing] = useState(false)
  const [refreshResult, setRefreshResult] = useState(null)  // { updated, errors }
  const [showApiKey, setShowApiKey] = useState(false)
  const [finnhubKey, setFinnhubKey] = useState(() => localStorage.getItem('bt_finnhub_key') || '')
  const [avKey, setAvKey]           = useState(() => localStorage.getItem('bt_av_key') || '')

  // ── Trading handlers ───────────────────────────────────
  function handleEditTrade(trade) { setEditTrade(trade); setShowForm(true) }

  function handleSaveTrade(form) {
    if (editTrade) { updateTrade(editTrade.id, form); setEditTrade(null) }
    else addTrade(form)
  }

  function handleCloseTradeForm() { setShowForm(false); setEditTrade(null) }

  function loadDemoData() {
    if (trades.length > 0 && !confirm('This will replace your current trades with demo data. Continue?')) return
    loadTrades(SEED_TRADES)
  }

  // ── Investment handlers ────────────────────────────────
  function handleEditInv(inv) { setEditInv(inv); setShowInvForm(true) }

  function handleSaveInv(form) {
    if (editInv) {
      const prev = editInv
      updateInvestment(prev.id, form)
      setEditInv(null)

      const prevShares = parseFloat(prev.shares) || 0
      const prevCost   = parseFloat(prev.avgCost) || 0
      const newShares  = parseFloat(form.shares) || 0
      const newCost    = parseFloat(form.avgCost) || 0

      // Closing an open position → cash increases by sell proceeds
      if (prev.status === 'open' && form.status === 'closed') {
        const sellPrice = parseFloat(form.sellPrice) || 0
        handleCashUpdate(cash + prevShares * sellPrice)
      }
      // Changing share count or cost on an open position → adjust for the difference
      else if (prev.status === 'open' && form.status === 'open') {
        const prevCostBasis = prevShares * prevCost
        const newCostBasis  = newShares * newCost
        handleCashUpdate(cash - (newCostBasis - prevCostBasis))
      }
    } else {
      addInvestment(form)
      // New open position → deduct cost basis from cash
      if (form.status === 'open') {
        const shares = parseFloat(form.shares) || 0
        const cost   = parseFloat(form.avgCost) || 0
        handleCashUpdate(cash - shares * cost)
      }
      // New closed position entered directly → net proceeds added
      if (form.status === 'closed') {
        const shares    = parseFloat(form.shares) || 0
        const cost      = parseFloat(form.avgCost) || 0
        const sellPrice = parseFloat(form.sellPrice) || 0
        handleCashUpdate(cash + shares * (sellPrice - cost))
      }
    }
  }

  function handleCloseInvForm() { setShowInvForm(false); setEditInv(null) }

  function handleDeleteInv(id) {
    const inv = investments.find(i => i.id === id)
    if (inv) {
      const shares       = parseFloat(inv.shares) || 0
      const currentPrice = parseFloat(inv.currentPrice) || parseFloat(inv.avgCost) || 0
      // Deleting an open position → return current market value to cash
      if (inv.status === 'open') handleCashUpdate(cash + shares * currentPrice)
    }
    deleteInvestment(id)
  }

  function loadDemoInvestments() {
    if (investments.length > 0 && !confirm('This will replace your current positions with demo data. Continue?')) return
    loadInvestments(SEED_INVESTMENTS)
  }

  function handleUpdatePrice(inv) { setUpdatePriceInv(inv); setNewPrice(inv.currentPrice || '') }

  async function handleRefreshPrices() {
    setRefreshing(true)
    setRefreshResult(null)
    const open = investments.filter(i => i.status === 'open')
    const isCrypto = sym => ['BTC','ETH','SOL','BNB','XRP','ADA','DOGE','AVAX','DOT','MATIC'].includes(sym?.toUpperCase())
    const needsKey = open.some(i => !isCrypto(i.symbol))
    if (needsKey && !finnhubKey) { setShowApiKey(true); setRefreshing(false); return }
    try {
      const { prices, errors } = await fetchAllPrices(investments, finnhubKey)
      let updated = 0
      Object.entries(prices).forEach(([sym, price]) => {
        const inv = investments.find(i => i.symbol.toUpperCase() === sym && i.status === 'open')
        if (inv) { updateInvestment(inv.id, { currentPrice: String(price) }); updated++ }
      })
      setRefreshResult({ updated, errors })
    } catch (e) {
      setRefreshResult({ updated: 0, errors: [e.message] })
    }
    setRefreshing(false)
  }

  function saveApiKey(key) {
    setFinnhubKey(key)
    localStorage.setItem('bt_finnhub_key', key)
  }

  function saveAvKey(key) {
    setAvKey(key)
    localStorage.setItem('bt_av_key', key)
  }

  function submitPriceUpdate(e) {
    e.preventDefault()
    if (updatePriceInv) updateInvestment(updatePriceInv.id, { currentPrice: newPrice })
    setUpdatePriceInv(null)
    setNewPrice('')
  }

  const inputCls = 'bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500'

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-800/60 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center gap-2 min-h-14">
          <div className="flex items-center gap-2 mr-auto">
            <span className="text-blue-400 font-bold text-lg tracking-tight">BT Speculation</span>
            <button onClick={openWatchlistModal} title="Watchlist"
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 transition-colors">
              <Eye size={14} />
            </button>
            {/* Section tabs */}
            <div className="flex bg-slate-700/60 rounded-lg p-0.5 gap-0.5 ml-1">
              <button onClick={() => setSection('trading')}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${section === 'trading' ? 'bg-slate-600 text-slate-100' : 'text-slate-400 hover:text-slate-200'}`}>
                Day Trading
              </button>
              <button onClick={() => setSection('investments')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${section === 'investments' ? 'bg-slate-600 text-slate-100' : 'text-slate-400 hover:text-slate-200'}`}>
                <TrendingUp size={12} /> Investments
              </button>
              <button onClick={() => setSection('analysis')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${section === 'analysis' ? 'bg-slate-600 text-slate-100' : 'text-slate-400 hover:text-slate-200'}`}>
                <LineChart size={12} /> Analyse
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {section === 'trading' && (
              <>
                <div className="flex bg-slate-700 rounded-lg p-0.5 gap-0.5">
                  <button onClick={() => setView('trades')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${view === 'trades' ? 'bg-slate-600 text-slate-100' : 'text-slate-400 hover:text-slate-200'}`}>
                    <List size={13} /> Trades
                  </button>
                  <button onClick={() => setView('charts')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${view === 'charts' ? 'bg-slate-600 text-slate-100' : 'text-slate-400 hover:text-slate-200'}`}>
                    <BarChart2 size={13} /> Charts
                  </button>
                </div>
                {trades.length === 0 && (
                  <button onClick={loadDemoData}
                    className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
                    <FlaskConical size={15} /> Demo Data
                  </button>
                )}
                <button onClick={() => setShowForm(true)}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
                  <Plus size={15} /> Add Trade
                </button>
              </>
            )}

            {section === 'analysis' && (
              <button onClick={() => setShowApiKey(true)} title="API Keys"
                className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors">
                <KeyRound size={14} />
              </button>
            )}

            {section === 'investments' && (
              <>
                <div className="flex bg-slate-700 rounded-lg p-0.5 gap-0.5">
                  <button onClick={() => setInvView('positions')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${invView === 'positions' ? 'bg-slate-600 text-slate-100' : 'text-slate-400 hover:text-slate-200'}`}>
                    <List size={13} /> Positions
                  </button>
                  <button onClick={() => setInvView('charts')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${invView === 'charts' ? 'bg-slate-600 text-slate-100' : 'text-slate-400 hover:text-slate-200'}`}>
                    <BarChart2 size={13} /> Charts
                  </button>
                </div>
                {investments.length === 0 && (
                  <button onClick={loadDemoInvestments}
                    className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
                    <FlaskConical size={15} /> Demo Data
                  </button>
                )}
                <button onClick={() => setShowApiKey(true)} title="Finnhub API key"
                  className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors">
                  <KeyRound size={14} />
                </button>
                <button onClick={handleRefreshPrices} disabled={refreshing}
                  className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-300 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
                  <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                  {refreshing ? 'Refreshing…' : 'Refresh Prices'}
                </button>
                <button onClick={() => setShowInvForm(true)}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
                  <Plus size={15} /> Add Position
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Ticker tape */}
      <TickerTape onSendTo={(dest, sym) => {
        setSection('analysis')
        setWatchlistNav({ dest, sym })
      }} />

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {section === 'trading' && (
          <>
            <Dashboard trades={trades} />
            {view === 'trades'
              ? <TradeTable trades={trades} onDelete={deleteTrade} onEdit={handleEditTrade} />
              : <Charts trades={trades} />
            }
          </>
        )}

        {section === 'investments' && (
          <>
            <InvestmentDashboard investments={investments} cash={cash} onCashUpdate={handleCashUpdate} />
            {invView === 'positions'
              ? <InvestmentTable investments={investments} onDelete={handleDeleteInv} onEdit={handleEditInv} onUpdatePrice={handleUpdatePrice} />
              : <InvestmentCharts investments={investments} />
            }
          </>
        )}

        {section === 'analysis' && (
          <AnalysisDashboard
            investments={investments}
            cash={cash}
            watchlistNav={watchlistNav}
            onWatchlistNavConsumed={() => setWatchlistNav(null)}
          />
        )}
      </main>

      {/* Trade Form Modal */}
      {showForm && (
        <TradeForm onAdd={handleSaveTrade} onClose={handleCloseTradeForm} initialTrade={editTrade} />
      )}

      {/* Investment Form Modal */}
      {showInvForm && (
        <InvestmentForm onAdd={handleSaveInv} onClose={handleCloseInvForm} initialInv={editInv} />
      )}

      {/* API Keys Modal */}
      {showApiKey && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-100">API Keys</h3>
              <button onClick={() => setShowApiKey(false)} className="text-slate-500 hover:text-slate-200"><X size={16} /></button>
            </div>

            <div className="space-y-5">
              {/* Finnhub */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Finnhub</p>
                <p className="text-xs text-slate-500 mb-2">
                  Price refresh · Fundamentals · Research — free at <span className="text-blue-400">finnhub.io</span>
                </p>
                <form onSubmit={e => { e.preventDefault(); saveApiKey(e.target.key.value.trim()) }} className="flex gap-2">
                  <input name="key" type="text" defaultValue={finnhubKey} autoFocus
                    placeholder="Finnhub API key…"
                    className={`flex-1 ${inputCls} font-mono text-sm`} />
                  <button type="submit"
                    className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded text-sm font-medium">Save</button>
                </form>
                {finnhubKey && (
                  <button onClick={() => { setFinnhubKey(''); localStorage.removeItem('bt_finnhub_key') }}
                    className="mt-1 text-xs text-red-400 hover:text-red-300">Clear</button>
                )}
              </div>

              <div className="border-t border-slate-700" />

              {/* Alpha Vantage */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Alpha Vantage</p>
                <p className="text-xs text-slate-500 mb-2">
                  Financial Statements tab — free at <span className="text-blue-400">alphavantage.co</span> · 25 req/day
                </p>
                <form onSubmit={e => { e.preventDefault(); saveAvKey(e.target.key.value.trim()) }} className="flex gap-2">
                  <input name="key" type="text" defaultValue={avKey}
                    placeholder="Alpha Vantage API key…"
                    className={`flex-1 ${inputCls} font-mono text-sm`} />
                  <button type="submit"
                    className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded text-sm font-medium">Save</button>
                </form>
                {avKey && (
                  <button onClick={() => { setAvKey(''); localStorage.removeItem('bt_av_key') }}
                    className="mt-1 text-xs text-red-400 hover:text-red-300">Clear</button>
                )}
              </div>
            </div>

            <button onClick={() => setShowApiKey(false)}
              className="mt-5 w-full bg-slate-700 hover:bg-slate-600 text-slate-300 py-2 rounded text-sm font-medium">
              Done
            </button>
          </div>
        </div>
      )}

      {/* Refresh result toast */}
      {refreshResult && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-800 border border-slate-600 rounded-xl shadow-xl px-4 py-3 flex items-start gap-3 max-w-sm">
          <div className="flex-1">
            {refreshResult.updated > 0 && (
              <p className="text-sm font-medium text-green-400">✓ Updated {refreshResult.updated} price{refreshResult.updated !== 1 ? 's' : ''}</p>
            )}
            {refreshResult.errors.length > 0 && (
              <div className="mt-1 space-y-0.5">
                {refreshResult.errors.map((e, i) => (
                  <p key={i} className="text-xs text-red-400">{e}</p>
                ))}
              </div>
            )}
            {refreshResult.updated === 0 && refreshResult.errors.length === 0 && (
              <p className="text-sm text-slate-400">No prices updated</p>
            )}
          </div>
          <button onClick={() => setRefreshResult(null)} className="text-slate-500 hover:text-slate-300 shrink-0"><X size={14} /></button>
        </div>
      )}

      {/* Quick Price Update Modal */}
      {updatePriceInv && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-sm p-5">
            <h3 className="text-base font-semibold text-slate-100 mb-1">Update Price</h3>
            <p className="text-sm text-slate-400 mb-4">{updatePriceInv.symbol} — {updatePriceInv.name}</p>
            <form onSubmit={submitPriceUpdate} className="space-y-3">
              <input type="number" step="0.0001" min="0" autoFocus className={`w-full ${inputCls}`}
                placeholder="Current price" value={newPrice} onChange={e => setNewPrice(e.target.value)} required />
              <div className="flex gap-2">
                <button type="button" onClick={() => setUpdatePriceInv(null)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 py-2 rounded text-sm font-medium">Cancel</button>
                <button type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded text-sm font-medium">Update</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
