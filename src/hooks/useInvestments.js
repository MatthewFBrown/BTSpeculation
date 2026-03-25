import { useState, useEffect } from 'react'

const STORAGE_KEY = 'bt_speculation_investments'

export function useInvestments() {
  const [investments, setInvestments] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(investments))
  }, [investments])

  function addInvestment(inv) {
    setInvestments(prev => [{ ...inv, id: crypto.randomUUID(), createdAt: new Date().toISOString() }, ...prev])
  }

  function updateInvestment(id, updates) {
    setInvestments(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i))
  }

  function deleteInvestment(id) {
    setInvestments(prev => prev.filter(i => i.id !== id))
  }

  function loadInvestments(list) {
    setInvestments(list)
  }

  return { investments, addInvestment, updateInvestment, deleteInvestment, loadInvestments }
}
