import { useState, useEffect, useRef } from 'react'
import { supabase } from '../utils/supabase'

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
          setTrades((data || []).map(r => ({ id: r.id, createdAt: r.created_at, ...r.data })))
          setLoading(false)
        }
      })
  }, [accountId])

  async function addTrade(trade) {
    const { id: _id, createdAt: _c, ...payload } = trade
    const { data, error } = await supabase
      .from('trades')
      .insert({ account_id: accountId, user_id: userId, data: payload })
      .select()
      .single()
    if (error) { console.error('Failed to add trade:', error); return }
    if (data) setTrades(prev => [{ id: data.id, createdAt: data.created_at, ...data.data }, ...prev])
  }

  async function updateTrade(id, updates) {
    const existing = trades.find(t => t.id === id)
    if (!existing) return
    const { id: _id, createdAt: _c, ...rest } = existing
    const merged = { ...rest, ...updates }
    const { error } = await supabase.from('trades').update({ data: merged }).eq('id', id)
    if (!error) setTrades(prev => prev.map(t => t.id === id ? { id, createdAt: t.createdAt, ...merged } : t))
  }

  async function deleteTrade(id) {
    await supabase.from('trades').delete().eq('id', id)
    setTrades(prev => prev.filter(t => t.id !== id))
  }

  async function loadTrades(list) {
    // Bulk replace — wipe existing, insert all new rows
    await supabase.from('trades').delete().eq('account_id', accountId)
    if (list.length === 0) { setTrades([]); return }
    const rows = list.map(({ id: _id, createdAt: _c, ...data }) => ({ account_id: accountId, user_id: userId, data }))
    const { data } = await supabase.from('trades').insert(rows).select()
    if (data) setTrades(data.map(r => ({ id: r.id, createdAt: r.created_at, ...r.data })))
    else setTrades(list) // fallback: show in state even if insert failed
  }

  return { trades, addTrade, updateTrade, deleteTrade, loadTrades, loading }
}
