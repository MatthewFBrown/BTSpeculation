import { useState, useEffect, useRef } from 'react'
import { accountKey } from './useAccounts'

const BASE_KEY = 'bt_speculation_investments'

export function useInvestments(accountId = 'default') {
  const storageKey = accountKey(BASE_KEY, accountId)

  const [investments, setInvestmentsRaw] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '[]') } catch { return [] }
  })

  const keyRef = useRef(storageKey)

  // When account switches, load from new key without saving the old data there
  useEffect(() => {
    if (keyRef.current === storageKey) return
    keyRef.current = storageKey
    try { setInvestmentsRaw(JSON.parse(localStorage.getItem(storageKey) || '[]')) }
    catch { setInvestmentsRaw([]) }
  }, [storageKey])

  // Save on every change (to whichever key is current)
  useEffect(() => {
    localStorage.setItem(keyRef.current, JSON.stringify(investments))
  }, [investments])

  function addInvestment(inv) {
    setInvestmentsRaw(prev => [{ ...inv, id: crypto.randomUUID(), createdAt: new Date().toISOString() }, ...prev])
  }

  function updateInvestment(id, updates) {
    setInvestmentsRaw(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i))
  }

  function deleteInvestment(id) {
    setInvestmentsRaw(prev => prev.filter(i => i.id !== id))
  }

  function loadInvestments(list) {
    setInvestmentsRaw(list)
  }

  return { investments, addInvestment, updateInvestment, deleteInvestment, loadInvestments }
}
