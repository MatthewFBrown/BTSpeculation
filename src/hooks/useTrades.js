import { useState, useEffect, useRef } from 'react'
import { accountKey } from './useAccounts'

const BASE_KEY = 'bt_speculation_trades'

export function useTrades(accountId = 'default') {
  const storageKey = accountKey(BASE_KEY, accountId)

  const [trades, setTradesRaw] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '[]') } catch { return [] }
  })

  const keyRef = useRef(storageKey)

  // When account switches, load from new key
  useEffect(() => {
    if (keyRef.current === storageKey) return
    keyRef.current = storageKey
    try { setTradesRaw(JSON.parse(localStorage.getItem(storageKey) || '[]')) }
    catch { setTradesRaw([]) }
  }, [storageKey])

  // Save on every change
  useEffect(() => {
    localStorage.setItem(keyRef.current, JSON.stringify(trades))
  }, [trades])

  function addTrade(trade) {
    setTradesRaw(prev => [{ id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...trade }, ...prev])
  }

  function updateTrade(id, updates) {
    setTradesRaw(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
  }

  function deleteTrade(id) {
    setTradesRaw(prev => prev.filter(t => t.id !== id))
  }

  function loadTrades(list) {
    setTradesRaw(list)
  }

  return { trades, addTrade, updateTrade, deleteTrade, loadTrades }
}
