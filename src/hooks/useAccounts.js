import { useState } from 'react'

const ACCOUNTS_KEY   = 'bt_accounts'
const ACTIVE_KEY     = 'bt_active_account'
const DEFAULT_ACCOUNT = { id: 'default', name: 'Main Account' }

// Keys that are per-account (will be cleaned up on delete)
const PER_ACCOUNT_KEYS = [
  'bt_speculation_trades',
  'bt_speculation_investments',
  'bt_cash',
  'bt_watchlist',
  'bt_ef_params',
  'bt_ef_research_params',
]

function loadAccounts() {
  try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY)) || [DEFAULT_ACCOUNT] }
  catch { return [DEFAULT_ACCOUNT] }
}

// Maps a base key to its account-namespaced version.
// The 'default' account reuses existing key names so existing data is preserved.
export function accountKey(base, accountId) {
  return accountId === 'default' ? base : `${base}_${accountId}`
}

export function useAccounts() {
  const [accounts, setAccounts] = useState(loadAccounts)
  const [activeId, setActiveId] = useState(
    () => localStorage.getItem(ACTIVE_KEY) || 'default'
  )

  const activeAccount = accounts.find(a => a.id === activeId) || accounts[0]

  function persist(list) {
    setAccounts(list)
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list))
  }

  function createAccount(name) {
    const id = crypto.randomUUID()
    persist([...accounts, { id, name: name.trim() || 'New Account' }])
    switchTo(id)
    return id
  }

  function renameAccount(id, name) {
    persist(accounts.map(a => a.id === id ? { ...a, name: name.trim() || a.name } : a))
  }

  function deleteAccount(id) {
    if (accounts.length <= 1 || id === 'default') return
    // Wipe all per-account localStorage entries
    for (const base of PER_ACCOUNT_KEYS) {
      localStorage.removeItem(`${base}_${id}`)
    }
    const next = accounts.filter(a => a.id !== id)
    persist(next)
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
    createAccount,
    renameAccount,
    deleteAccount,
    switchTo,
  }
}
