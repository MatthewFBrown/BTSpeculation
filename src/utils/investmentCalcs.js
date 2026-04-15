export const SECTORS = [
  'Technology', 'Healthcare', 'Financials', 'Consumer Discretionary',
  'Consumer Staples', 'Energy', 'Industrials', 'Materials',
  'Real Estate', 'Utilities', 'Communication Services', 'Crypto', 'ETF / Index', 'Other',
]

export const ASSET_TYPES = ['Stock', 'ETF', 'Crypto', 'Bond', 'Option', 'Other']

export function calcInvestmentPnL(inv) {
  const shares = parseFloat(inv.shares)
  const cost = parseFloat(inv.avgCost)
  if (isNaN(shares) || isNaN(cost)) return { unrealized: null, realized: null, total: null, returnPct: null }

  const isOption = inv.assetType === 'Option'
  const isShort = isOption && inv.optionDirection === 'short'
  // Options are priced per share — multiply by 100 per contract
  const multiplier = isOption ? 100 : 1

  if (inv.status === 'closed') {
    const sell = parseFloat(inv.sellPrice)
    if (isNaN(sell)) return { unrealized: null, realized: null, total: null, returnPct: null }
    const realized = isShort
      ? (cost - sell) * shares * multiplier
      : (sell - cost) * shares * multiplier
    const returnPct = isShort ? ((cost - sell) / cost) * 100 : ((sell - cost) / cost) * 100
    return { unrealized: null, realized, total: realized, returnPct }
  }

  const current = parseFloat(inv.currentPrice)
  if (isNaN(current)) return { unrealized: null, realized: null, total: null, returnPct: null }
  const unrealized = isShort
    ? (cost - current) * shares * multiplier
    : (current - cost) * shares * multiplier
  const returnPct = isShort ? ((cost - current) / cost) * 100 : ((current - cost) / cost) * 100
  return { unrealized, realized: null, total: unrealized, returnPct }
}

export function getInvestmentStats(investments) {
  const open = investments.filter(i => i.status === 'open')
  const closed = investments.filter(i => i.status === 'closed')

  let totalInvested = 0, totalCurrentValue = 0, totalUnrealized = 0, cspCollateral = 0
  open.forEach(i => {
    const shares = parseFloat(i.shares) || 0
    const cost = parseFloat(i.avgCost) || 0
    const current = parseFloat(i.currentPrice) || 0
    const isOption = i.assetType === 'Option'
    const isShort = isOption && i.optionDirection === 'short'
    const isCSP = isShort && i.optionType === 'put'
    const multiplier = isOption ? 100 : 1
    totalInvested += shares * cost * multiplier
    totalCurrentValue += shares * current * multiplier
    totalUnrealized += isShort
      ? (cost - current) * shares * multiplier
      : (current - cost) * shares * multiplier
    // CSP collateral = strike × contracts × 100 (cash locked as margin)
    if (isCSP && i.strike) cspCollateral += (parseFloat(i.strike) || 0) * shares * 100
  })

  let totalRealized = 0
  const closedWins = [], closedLosses = []
  closed.forEach(i => {
    const { realized } = calcInvestmentPnL(i)
    if (realized !== null) {
      totalRealized += realized
      if (realized > 0) closedWins.push(realized)
      else closedLosses.push(realized)
    }
  })

  const totalPnL = totalUnrealized + totalRealized
  const totalReturn = totalInvested > 0 ? (totalUnrealized / totalInvested) * 100 : 0
  const winRate = closed.length > 0 ? (closedWins.length / closed.length) * 100 : 0

  return {
    openCount: open.length,
    closedCount: closed.length,
    totalInvested,
    totalCurrentValue,
    cspCollateral,
    totalUnrealized,
    totalRealized,
    totalPnL,
    totalReturn,
    winRate,
    avgWin: closedWins.length > 0 ? closedWins.reduce((a, b) => a + b, 0) / closedWins.length : 0,
    avgLoss: closedLosses.length > 0 ? closedLosses.reduce((a, b) => a + b, 0) / closedLosses.length : 0,
    bestPosition: closedWins.length > 0 ? Math.max(...closedWins) : null,
    worstPosition: closedLosses.length > 0 ? Math.min(...closedLosses) : null,
  }
}

export function getAllocationByType(investments) {
  const open = investments.filter(i => i.status === 'open')
  const map = {}
  open.forEach(i => {
    const key = i.assetType || 'Other'
    const value = (parseFloat(i.shares) || 0) * (parseFloat(i.currentPrice) || parseFloat(i.avgCost) || 0)
    map[key] = (map[key] || 0) + value
  })
  return Object.entries(map).map(([name, value]) => ({ name, value })).filter(d => d.value > 0)
}

export function getAllocationBySector(investments) {
  const open = investments.filter(i => i.status === 'open')
  const map = {}
  open.forEach(i => {
    const key = i.sector || 'Other'
    const value = (parseFloat(i.shares) || 0) * (parseFloat(i.currentPrice) || parseFloat(i.avgCost) || 0)
    map[key] = (map[key] || 0) + value
  })
  return Object.entries(map).map(([name, value]) => ({ name, value })).filter(d => d.value > 0)
}

export function getPositionPerformance(investments) {
  return investments
    .filter(i => i.status === 'open')
    .map(i => {
      const { returnPct, unrealized } = calcInvestmentPnL(i)
      return { symbol: i.symbol, returnPct: returnPct ?? 0, unrealized: unrealized ?? 0 }
    })
    .sort((a, b) => b.returnPct - a.returnPct)
}

export function fmtInv(n) {
  if (n === null || n === undefined) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export function fmtPct(n) {
  if (n === null || n === undefined) return '—'
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`
}
