import { useState, useEffect, useRef } from 'react'
import { supabase } from '../utils/supabase'

export function useInvestments(accountId, userId) {
  const [investments, setInvestments] = useState([])
  const [loading, setLoading] = useState(false)
  const accountIdRef = useRef(accountId)

  useEffect(() => {
    if (!accountId) return
    accountIdRef.current = accountId
    setLoading(true)

    supabase
      .from('investments')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) { console.error('Failed to load investments:', error); setLoading(false); return }
        if (accountIdRef.current === accountId) {
          setInvestments((data || []).map(r => ({ id: r.id, createdAt: r.created_at, ...r.data })))
          setLoading(false)
        }
      })
  }, [accountId])

  async function addInvestment(inv) {
    const { id: _id, createdAt: _c, ...payload } = inv
    const { data, error } = await supabase
      .from('investments')
      .insert({ account_id: accountId, user_id: userId, data: payload })
      .select()
      .single()
    if (error) { console.error('Failed to add investment:', error); return }
    if (data) setInvestments(prev => [{ id: data.id, createdAt: data.created_at, ...data.data }, ...prev])
  }

  async function updateInvestment(id, updates) {
    const existing = investments.find(i => i.id === id)
    if (!existing) return
    const { id: _id, createdAt: _c, ...rest } = existing
    const merged = { ...rest, ...updates }
    const { error } = await supabase.from('investments').update({ data: merged }).eq('id', id)
    if (!error) setInvestments(prev => prev.map(i => i.id === id ? { id, createdAt: i.createdAt, ...merged } : i))
  }

  async function deleteInvestment(id) {
    await supabase.from('investments').delete().eq('id', id)
    setInvestments(prev => prev.filter(i => i.id !== id))
  }

  async function loadInvestments(list) {
    // Bulk replace
    await supabase.from('investments').delete().eq('account_id', accountId)
    if (list.length === 0) { setInvestments([]); return }
    const rows = list.map(({ id: _id, createdAt: _c, ...data }) => ({ account_id: accountId, user_id: userId, data }))
    const { data } = await supabase.from('investments').insert(rows).select()
    if (data) setInvestments(data.map(r => ({ id: r.id, createdAt: r.created_at, ...r.data })))
    else setInvestments(list)
  }

  return { investments, addInvestment, updateInvestment, deleteInvestment, loadInvestments, loading }
}
