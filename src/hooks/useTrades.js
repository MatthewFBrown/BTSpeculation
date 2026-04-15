import { useState, useEffect, useRef } from 'react'
import { supabase } from '../utils/supabase'

function fromRow(r) {
  return {
    id: r.id,
    createdAt: r.created_at,
    type: r.type || 'option',
    symbol: r.symbol || '',
    optionType: r.option_type || 'call',
    strike: r.strike != null ? String(r.strike) : '',
    expiry: r.expiry || '',
    direction: r.direction || 'long',
    quantity: r.quantity != null ? String(r.quantity) : '',
    entryPrice: r.entry_price != null ? String(r.entry_price) : '',
    exitPrice: r.exit_price != null ? String(r.exit_price) : '',
    entryDate: r.entry_date || '',
    exitDate: r.exit_date || '',
    status: r.status || 'closed',
    fees: r.fees != null ? String(r.fees) : '',
    notes: r.notes || '',
    chartLink: r.chart_link || '',
  }
}

function toRow(trade) {
  return {
    type:        trade.type || null,
    symbol:      trade.symbol || null,
    option_type: trade.optionType || null,
    strike:      trade.strike !== '' ? parseFloat(trade.strike) : null,
    expiry:      trade.expiry || null,
    direction:   trade.direction || null,
    quantity:    trade.quantity !== '' ? parseFloat(trade.quantity) : null,
    entry_price: trade.entryPrice !== '' ? parseFloat(trade.entryPrice) : null,
    exit_price:  trade.exitPrice !== '' ? parseFloat(trade.exitPrice) : null,
    entry_date:  trade.entryDate || null,
    exit_date:   trade.exitDate || null,
    status:      trade.status || null,
    fees:        trade.fees !== '' ? parseFloat(trade.fees) : null,
    notes:       trade.notes || null,
    chart_link:  trade.chartLink || null,
  }
}

export function useTrades(accountId, userId) {
  const [trades, setTrades] = useState([])
  const [loading, setLoading] = useState(false)
  const accountIdRef = useRef(accountId)

  useEffect(() => {
    if (!accountId) return
    accountIdRef.current = accountId
    setLoading(true)

    supabase
      .from('trades')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) { console.error('Failed to load trades:', error); setLoading(false); return }
        if (accountIdRef.current === accountId) {
          setTrades((data || []).map(fromRow))
          setLoading(false)
        }
      })
  }, [accountId])

  async function addTrade(trade) {
    const { id: _id, createdAt: _c, ...rest } = trade
    const { data, error } = await supabase
      .from('trades')
      .insert({ account_id: accountId, user_id: userId, ...toRow(rest) })
      .select()
      .single()
    if (error) { console.error('Failed to add trade:', error); return }
    if (data) setTrades(prev => [fromRow(data), ...prev])
  }

  async function updateTrade(id, updates) {
    const existing = trades.find(t => t.id === id)
    if (!existing) return
    const { id: _id, createdAt: _c, ...rest } = existing
    const merged = { ...rest, ...updates }
    const { error } = await supabase.from('trades').update(toRow(merged)).eq('id', id)
    if (!error) setTrades(prev => prev.map(t => t.id === id ? { id, createdAt: t.createdAt, ...merged } : t))
  }

  async function deleteTrade(id) {
    await supabase.from('trades').delete().eq('id', id)
    setTrades(prev => prev.filter(t => t.id !== id))
  }

  async function loadTrades(list) {
    await supabase.from('trades').delete().eq('account_id', accountId)
    if (list.length === 0) { setTrades([]); return }
    const rows = list.map(({ id: _id, createdAt: _c, ...rest }) => ({
      account_id: accountId,
      user_id: userId,
      ...toRow(rest),
    }))
    const { data } = await supabase.from('trades').insert(rows).select()
    if (data) setTrades(data.map(fromRow))
    else setTrades(list)
  }

  return { trades, addTrade, updateTrade, deleteTrade, loadTrades, loading }
}
