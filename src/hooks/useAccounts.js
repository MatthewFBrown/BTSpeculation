import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase'

const ACTIVE_KEY = 'bt_active_account'

// Keep for backward compat — used in App.jsx for cash key (localStorage)
export function accountKey(base, accountId) {
  return accountId && accountId !== 'default' ? `${base}_${accountId}` : base
}

export function useAccounts(userId) {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState(
    () => localStorage.getItem(ACTIVE_KEY) || null
  )

  useEffect(() => {
    if (!userId) return   // wait until auth resolves
    let cancelled = false
    async function load() {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .order('created_at', { ascending: true })

      if (cancelled) return
      if (error) {
        console.error('Failed to load accounts:', error)
        setLoading(false)
        return
      }

      if (!data || data.length === 0) {
        // Create default account on first login
        const { data: created, error: insErr } = await supabase
          .from('accounts')
          .insert({ name: 'Main Account', user_id: userId })
          .select()
          .single()
        if (cancelled) return
        if (insErr) { setLoading(false); return }
        setAccounts([created])
        setActiveId(created.id)
        localStorage.setItem(ACTIVE_KEY, created.id)
      } else {
        setAccounts(data)
        const stored = localStorage.getItem(ACTIVE_KEY)
        const valid = data.find(a => a.id === stored)
        const id = valid ? stored : data[0].id
        setActiveId(id)
        if (!valid) localStorage.setItem(ACTIVE_KEY, id)
      }
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [userId])

  const activeAccount = accounts.find(a => a.id === activeId) || accounts[0] || null

  async function createAccount(name) {
    const { data } = await supabase
      .from('accounts')
      .insert({ name: name.trim() || 'New Account', user_id: userId })
      .select()
      .single()
    if (data) {
      setAccounts(prev => [...prev, data])
      switchTo(data.id)
      return data.id
    }
  }

  async function renameAccount(id, name) {
    const trimmed = name.trim() || 'Account'
    const { error } = await supabase
      .from('accounts')
      .update({ name: trimmed })
      .eq('id', id)
    if (!error) setAccounts(prev => prev.map(a => a.id === id ? { ...a, name: trimmed } : a))
  }

  async function deleteAccount(id) {
    if (accounts.length <= 1) return
    await supabase.from('accounts').delete().eq('id', id)
    const next = accounts.filter(a => a.id !== id)
    setAccounts(next)
    if (activeId === id) switchTo(next[0].id)
  }

  function switchTo(id) {
    setActiveId(id)
    localStorage.setItem(ACTIVE_KEY, id)
  }

  return {
    accounts,
    activeAccount,
    activeId,
    loading,
    createAccount,
    renameAccount,
    deleteAccount,
    switchTo,
  }
}
