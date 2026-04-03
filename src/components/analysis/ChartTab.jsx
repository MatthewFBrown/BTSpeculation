import { useState } from 'react'
import TradingViewChart from '../TradingViewChart'
import { Search } from 'lucide-react'

const INTERVALS = [
  { label: '1m',  value: '1'   },
  { label: '5m',  value: '5'   },
  { label: '15m', value: '15'  },
  { label: '1h',  value: '60'  },
  { label: '4h',  value: '240' },
  { label: '1D',  value: 'D'   },
  { label: '1W',  value: 'W'   },
  { label: '1M',  value: 'M'   },
]

const STYLES = [
  { label: 'Candles',  value: '1' },
  { label: 'Line',     value: '2' },
  { label: 'Area',     value: '3' },
  { label: 'Bars',     value: '0' },
  { label: 'Heikin',   value: '8' },
]

export default function ChartTab({ investments = [] }) {
  const open = investments.filter(i => i.status === 'open')
  const [symbol, setSymbol]     = useState(open[0]?.symbol || '')
  const [input, setInput]       = useState('')
  const [interval, setInterval] = useState('D')
  const [style, setStyle]       = useState('1')

  function submit(e) {
    e.preventDefault()
    const s = input.trim().toUpperCase()
    if (s) { setSymbol(s); setInput('') }
  }

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Search */}
        <form onSubmit={submit} className="flex gap-1.5">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={input}
              onChange={e => setInput(e.target.value.toUpperCase())}
              placeholder="Ticker…"
              className="bg-slate-800 border border-slate-700 rounded-lg pl-7 pr-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500 placeholder:text-slate-600 font-mono w-28"
            />
          </div>
          <button type="submit" disabled={!input.trim()}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
            Go
          </button>
        </form>

        {/* Portfolio position pills */}
        {open.map(i => (
          <button key={i.symbol} onClick={() => setSymbol(i.symbol)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors ${
              symbol === i.symbol
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 border border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
            }`}>
            {i.symbol}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          {/* Interval picker */}
          <div className="flex bg-slate-700 rounded-lg p-0.5 gap-0.5">
            {INTERVALS.map(({ label, value }) => (
              <button key={value} onClick={() => setInterval(value)}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                  interval === value ? 'bg-slate-600 text-slate-100' : 'text-slate-400 hover:text-slate-200'
                }`}>
                {label}
              </button>
            ))}
          </div>

          {/* Style picker */}
          <div className="flex bg-slate-700 rounded-lg p-0.5 gap-0.5">
            {STYLES.map(({ label, value }) => (
              <button key={value} onClick={() => setStyle(value)}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                  style === value ? 'bg-slate-600 text-slate-100' : 'text-slate-400 hover:text-slate-200'
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {symbol && (
        <div className="flex items-center gap-2">
          <span className="text-slate-300 font-mono font-bold text-sm">{symbol}</span>
          <span className="text-slate-600 text-xs">· TradingView</span>
        </div>
      )}

      <TradingViewChart symbol={symbol} height={720} interval={interval} style={style} />
    </div>
  )
}
