import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../utils/supabase'
import BullBearSection from './BullBearSection'

const fmtPrice = n => n == null ? '—' : `$${n.toFixed(2)}`

async function fetchPrice(symbol, key) {
  try {
    const res  = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${key}`)
    const data = await res.json()
    return { price: data?.c ?? null, change: data?.dp ?? null }
  } catch {
    return { price: null, change: null }
  }
}

export default function DebateBoard({ userId, displayName }) {
  const [args,     setArgs]     = useState([])
  const [votes,    setVotes]    = useState([])
  const [prices,   setPrices]   = useState({})
  const [expanded, setExpanded] = useState(new Set())
  const fetched = useRef(new Set())

  useEffect(() => {
    Promise.all([
      supabase.from('fund_bull_bear_args').select('*').order('created_at'),
      supabase.from('fund_bull_bear_votes').select('*'),
    ]).then(([a, v]) => {
      setArgs(a.data || [])
      setVotes(v.data || [])
    })

    const argsChannel = supabase.channel('bba_board')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fund_bull_bear_args' },
        ({ eventType, new: n, old: o }) => {
          if (eventType === 'INSERT') setArgs(prev => [...prev, n])
          if (eventType === 'UPDATE') setArgs(prev => prev.map(a => a.id === n.id ? n : a))
          if (eventType === 'DELETE') setArgs(prev => prev.filter(a => a.id !== o.id))
        }
      ).subscribe()

    const votesChannel = supabase.channel('bbv_board')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fund_bull_bear_votes' },
        ({ eventType, new: n, old: o }) => {
          if (eventType === 'INSERT') setVotes(prev => [...prev, n])
          if (eventType === 'UPDATE') setVotes(prev => prev.map(v => v.id === n.id ? n : v))
          if (eventType === 'DELETE') setVotes(prev => prev.filter(v => v.id !== o.id))
        }
      ).subscribe()

    return () => {
      supabase.removeChannel(argsChannel)
      supabase.removeChannel(votesChannel)
    }
  }, [])

  // Fetch prices for all debated symbols
  useEffect(() => {
    const key = localStorage.getItem('bt_finnhub_key')
    if (!key || args.length === 0) return
    const symbols = [...new Set(args.map(a => a.symbol))]
    symbols.forEach(async sym => {
      if (fetched.current.has(sym)) return
      fetched.current.add(sym)
      const data = await fetchPrice(sym, key)
      setPrices(prev => ({ ...prev, [sym]: data }))
    })
  }, [args])

  function toggleExpanded(symbol) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(symbol) ? next.delete(symbol) : next.add(symbol)
      return next
    })
  }

  // Group by symbol, sort by most recent activity
  const symbols = [...new Set(args.map(a => a.symbol))]
  const grouped = symbols.map(symbol => {
    const symArgs  = args.filter(a => a.symbol === symbol)
    const symVotes = votes.filter(v => v.symbol === symbol)
    const latest   = symArgs.reduce((max, a) => a.created_at > max ? a.created_at : max, '')
    return { symbol, args: symArgs, votes: symVotes, latest }
  }).sort((a, b) => b.latest.localeCompare(a.latest))

  if (grouped.length === 0) return (
    <div className="text-center py-20 text-slate-600 text-sm italic">
      No debates yet — expand a stock in the Watchlist and add a bull or bear case.
    </div>
  )

  return (
    <div className="space-y-3">
      {grouped.map(({ symbol, args: symArgs, votes: symVotes }) => {
        const isExpanded = expanded.has(symbol)
        const topLevel   = symArgs.filter(a => !a.parent_id)
        const bullArgs   = topLevel.filter(a => a.stance === 'bull')
        const bearArgs   = topLevel.filter(a => a.stance === 'bear')
        const bullVotes  = symVotes.filter(v => v.vote === 'bull')
        const bearVotes  = symVotes.filter(v => v.vote === 'bear')
        const price      = prices[symbol]
        const chgColor   = price?.change == null ? '' : price.change >= 0 ? 'text-emerald-400' : 'text-red-400'

        const consensus  = bullVotes.length > bearVotes.length ? 'bull'
          : bearVotes.length > bullVotes.length ? 'bear'
          : 'tied'
        const cardBorder = consensus === 'bull' ? 'border-emerald-500/25'
          : consensus === 'bear' ? 'border-red-500/25'
          : symVotes.length > 0 ? 'border-amber-500/25'
          : 'border-white/[0.06]'

        return (
          <div key={symbol} className={`bg-slate-800/70 backdrop-blur-sm rounded-xl ring-1 ring-white/[0.06] border-t-2 ${cardBorder} overflow-hidden`}>
            {/* Card header */}
            <div className="px-5 py-3 flex items-center gap-3 border-b border-white/[0.04]">
              <span className="font-mono font-bold text-slate-100">{symbol}</span>
              {price && (
                <span className="text-sm tabular-nums text-slate-400">{fmtPrice(price.price)}</span>
              )}
              {price?.change != null && (
                <span className={`text-xs tabular-nums font-medium ${chgColor}`}>
                  {price.change >= 0 ? '+' : ''}{price.change.toFixed(2)}%
                </span>
              )}
              <div className="ml-auto flex items-center gap-3">
                {(bullVotes.length > 0 || bearVotes.length > 0) && (
                  <div className="flex items-center gap-1.5 text-xs">
                    {bullVotes.length > 0 && <span className="text-emerald-400 font-semibold">🟢 {bullVotes.length}</span>}
                    {bullVotes.length > 0 && bearVotes.length > 0 && <span className="text-slate-700">·</span>}
                    {bearVotes.length > 0 && <span className="text-red-400 font-semibold">🔴 {bearVotes.length}</span>}
                  </div>
                )}
                <span className="text-[10px] text-slate-600">
                  {topLevel.length} arg{topLevel.length !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={() => toggleExpanded(symbol)}
                  className="text-xs text-slate-500 hover:text-slate-200 transition-colors"
                >
                  {isExpanded ? 'Collapse ▲' : 'Expand ▼'}
                </button>
              </div>
            </div>

            {/* Condensed preview */}
            {!isExpanded && (
              <div className="px-5 py-3 space-y-1.5">
                {bullArgs.slice(0, 1).map(a => (
                  <p key={a.id} className="text-xs">
                    <span className="text-emerald-500 font-semibold">🟢 {a.display_name}:</span>{' '}
                    <span className="text-slate-500 italic">"{a.body.slice(0, 90)}{a.body.length > 90 ? '…' : ''}"</span>
                  </p>
                ))}
                {bearArgs.slice(0, 1).map(a => (
                  <p key={a.id} className="text-xs">
                    <span className="text-red-500 font-semibold">🔴 {a.display_name}:</span>{' '}
                    <span className="text-slate-500 italic">"{a.body.slice(0, 90)}{a.body.length > 90 ? '…' : ''}"</span>
                  </p>
                ))}
                {topLevel.length === 0 && (
                  <p className="text-xs text-slate-700 italic">No arguments posted yet</p>
                )}
              </div>
            )}

            {/* Expanded full debate */}
            {isExpanded && (
              <div className="px-5 pb-4">
                <BullBearSection symbol={symbol} userId={userId} displayName={displayName} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
