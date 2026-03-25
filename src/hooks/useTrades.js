import { useState, useEffect } from 'react'

const STORAGE_KEY = 'bt_speculation_trades'

export function useTrades() {
  const [trades, setTrades] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trades))
  }, [trades])

  function addTrade(trade) {
    const record = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...trade }
    setTrades(prev => [record, ...prev])
  }

  function loadTrades(list) {
    setTrades(list)
  }

  function updateTrade(id, updates) {
    setTrades(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
  }

  function deleteTrade(id) {
    setTrades(prev => prev.filter(t => t.id !== id))
  }

  return { trades, addTrade, updateTrade, deleteTrade, loadTrades }
}
