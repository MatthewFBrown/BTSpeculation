import { useState } from 'react'
import { Plus, X, ExternalLink, TrendingUp, BarChart2, BookOpen } from 'lucide-react'

const STORAGE_KEY = 'bt_watchlist'

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}
function save(list) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)) } catch {}
}

// Suggested tickers the user might want to watch
const SUGGESTIONS = ['AAPL','GOOGL','AMZN','TSLA','NVDA','META','MSFT','AMD','NFLX','V','JPM','BRK.B','UNH','XOM','WMT']

export default function Watchlist({ onSendTo }) {
  const [items, setItems]   = useState(load)
  const [input, setInput]   = useState('')
  const [error, setError]   = useState('')

  function add(raw) {
    const sym = raw.trim().toUpperCase()
    if (!sym) return
    if (items.includes(sym)) { setError(`${sym} is already in your watchlist`); return }
    const next = [...items, sym]
    setItems(next)
    save(next)
    setInput('')
    setError('')
  }

  function remove(sym) {
    const next = items.filter(s => s !== sym)
    setItems(next)
    save(next)
  }

  function handleSubmit(e) {
    e.preventDefault()
    add(input)
  }

  // Suggestions not already in list
  const suggestions = SUGGESTIONS.filter(s => !items.includes(s)).slice(0, 8)

  return (
    <div className="space-y-5">
      {/* Add ticker */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Add to Watchlist</p>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            value={input}
            onChange={e => { setInput(e.target.value.toUpperCase()); setError('') }}
            placeholder="Ticker symbol e.g. AAPL"
            className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500 placeholder:text-slate-600 font-mono"
          />
          <button type="submit" disabled={!input.trim()}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus size={14} /> Add
          </button>
        </form>
        {error && <p className="text-xs text-red-400 mt-2">{error}</p>}

        {/* Quick-add suggestions */}
        {suggestions.length > 0 && (
          <div className="mt-3">
            <p className="text-[10px] text-slate-600 mb-2 uppercase tracking-wider">Quick add</p>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map(s => (
                <button key={s} onClick={() => add(s)}
                  className="px-2.5 py-1 rounded text-xs font-mono font-semibold bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-slate-200 transition-colors">
                  + {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Watchlist */}
      {items.length === 0 ? (
        <div className="text-center text-slate-600 py-12 text-sm">
          Your watchlist is empty.<br />Add a ticker above to get started.
        </div>
      ) : (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="px-4 pt-3 pb-2 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Watching {items.length} {items.length === 1 ? 'ticker' : 'tickers'}
            </p>
            <p className="text-[10px] text-slate-600">Click to open in a tab</p>
          </div>
          <div className="divide-y divide-slate-700/60">
            {items.map(sym => (
              <div key={sym}
                className="flex items-center gap-3 px-4 py-3 hover:bg-slate-700/30 transition-colors">
                {/* Symbol */}
                <span className="font-mono font-bold text-slate-100 w-20 shrink-0">{sym}</span>

                {/* Action buttons */}
                <div className="flex gap-1.5 flex-1 flex-wrap">
                  <button
                    onClick={() => onSendTo('research', sym)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-700 hover:bg-blue-600 text-slate-300 hover:text-white border border-slate-600 hover:border-blue-500 transition-colors">
                    <BookOpen size={11} /> Research
                  </button>
                  <button
                    onClick={() => onSendTo('financials', sym)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-700 hover:bg-emerald-600 text-slate-300 hover:text-white border border-slate-600 hover:border-emerald-500 transition-colors">
                    <BarChart2 size={11} /> Financials
                  </button>
                  <a
                    href={`https://finance.yahoo.com/quote/${sym}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-300 border border-slate-600 transition-colors">
                    <ExternalLink size={11} /> Yahoo
                  </a>
                </div>

                {/* Remove */}
                <button onClick={() => remove(sym)}
                  className="text-slate-600 hover:text-red-400 transition-colors shrink-0 ml-auto">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[11px] text-slate-600 text-center">
        Watchlist is saved locally in your browser.
      </p>
    </div>
  )
}
