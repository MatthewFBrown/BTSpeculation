import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../utils/supabase'
import { ChevronDown, ChevronUp } from 'lucide-react'

const fmtPrice   = n => n == null ? '—' : `$${n.toFixed(2)}`
const RANK_COLOR = i => i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-slate-600'

async function fetchPrice(symbol, key) {
  try {
    const res  = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${key}`)
    const data = await res.json()
    return { price: data?.c ?? null, change: data?.dp ?? null }
  } catch {
    return { price: null, change: null }
  }
}

function groupEntries(entries) {
  const grouped = {}
  entries.forEach(e => {
    if (!grouped[e.user_id]) grouped[e.user_id] = []
    grouped[e.user_id].push(e)
  })
  Object.keys(grouped).forEach(uid => {
    grouped[uid] = grouped[uid].sort((a, b) => a.rank - b.rank)
  })
  return grouped
}

export default function WatchlistSummary({ userId }) {
  const [entries, setEntries] = useState([])
  const [prices,  setPrices]  = useState({})
  const [open,    setOpen]    = useState(true)
  const fetched = useRef(new Set())

  useEffect(() => {
    supabase.from('fund_watchlist').select('*').order('rank', { ascending: true })
      .then(({ data }) => setEntries(data || []))
  }, [])

  useEffect(() => {
    const key = localStorage.getItem('bt_finnhub_key')
    if (!key || entries.length === 0) return
    const grouped = groupEntries(entries)
    const symbols = new Set(Object.values(grouped).flatMap(list => list.slice(0, 5).map(e => e.symbol)))
    symbols.forEach(async sym => {
      if (fetched.current.has(sym)) return
      fetched.current.add(sym)
      const data = await fetchPrice(sym, key)
      setPrices(prev => ({ ...prev, [sym]: data }))
    })
  }, [entries])

  if (entries.length === 0) return null

  const grouped    = groupEntries(entries)
  const allUserIds = Object.keys(grouped)
  const otherIds   = allUserIds.filter(id => id !== userId)
  const columns    = [userId, ...otherIds].filter(id => grouped[id])

  const avgEntries = (() => {
    if (allUserIds.length < 2) return []
    const common = [...new Set(entries.map(e => e.symbol))].filter(sym =>
      allUserIds.every(uid => (grouped[uid] || []).some(e => e.symbol === sym))
    )
    return common.map(sym => {
      const avgPos = allUserIds.reduce((sum, uid) => {
        return sum + ((grouped[uid] || []).findIndex(e => e.symbol === sym) + 1)
      }, 0) / allUserIds.length
      return { symbol: sym, avgPos }
    }).sort((a, b) => a.avgPos - b.avgPos).slice(0, 5)
  })()

  function ColHeader({ label, color = 'text-slate-300', sub }) {
    return (
      <div className="mb-2">
        <p className={`text-xs font-bold ${color}`}>{label}</p>
        {sub && <p className="text-[10px] text-slate-600">{sub}</p>}
      </div>
    )
  }

  function PickRow({ symbol, idx }) {
    const data     = prices[symbol]
    const chgColor = data?.change == null ? '' : data.change >= 0 ? 'text-emerald-400' : 'text-red-400'
    return (
      <div className="flex items-center gap-1.5 py-1 border-b border-white/[0.03] last:border-0">
        <span className={`text-[10px] font-bold w-3.5 text-center shrink-0 ${RANK_COLOR(idx)}`}>{idx + 1}</span>
        <span className="text-xs font-bold text-slate-100 flex-1">{symbol}</span>
        {data ? (
          <div className="text-right shrink-0">
            <span className="text-xs tabular-nums text-slate-300">{fmtPrice(data.price)}</span>
            {data.change != null && (
              <span className={`ml-1 text-[10px] tabular-nums ${chgColor}`}>
                {data.change >= 0 ? '+' : ''}{data.change.toFixed(1)}%
              </span>
            )}
          </div>
        ) : (
          <span className="text-[10px] text-slate-600 animate-pulse">…</span>
        )}
      </div>
    )
  }

  return (
    <div className="bg-slate-800/70 backdrop-blur-sm rounded-xl ring-1 ring-white/[0.06] overflow-hidden mb-4">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3 border-b border-white/[0.05] hover:bg-white/[0.02] transition-colors"
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Watchlist Snapshot</p>
        {open ? <ChevronUp size={13} className="text-slate-600" /> : <ChevronDown size={13} className="text-slate-600" />}
      </button>

      {open && (
        <div className="px-5 py-4">
          <div className="flex gap-6 overflow-x-auto no-scrollbar">
            {columns.map(uid => {
              const list = (grouped[uid] || []).slice(0, 5)
              const isMe = uid === userId
              const name = list[0]?.display_name || 'Anonymous'
              return (
                <div key={uid} className="min-w-[140px] flex-1">
                  <ColHeader
                    label={isMe ? `${name} (You)` : name}
                    color={isMe ? 'text-blue-300' : 'text-slate-300'}
                    sub={`top ${Math.min(list.length, 5)} picks`}
                  />
                  {list.map((entry, idx) => (
                    <PickRow key={entry.id} symbol={entry.symbol} idx={idx} />
                  ))}
                </div>
              )
            })}

            {avgEntries.length > 0 && (
              <div className="min-w-[140px] flex-1">
                <ColHeader label="Fund Average" color="text-emerald-400" sub="shared picks" />
                {avgEntries.map(({ symbol }, idx) => (
                  <PickRow key={symbol} symbol={symbol} idx={idx} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
