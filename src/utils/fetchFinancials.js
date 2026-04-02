import { trackAVCalls } from './avCallTracker'

const AV_BASE = 'https://www.alphavantage.co/query'

async function get(func, symbol, apiKey) {
  const res = await fetch(`${AV_BASE}?function=${func}&symbol=${symbol}&apikey=${apiKey}`)
  if (!res.ok) throw new Error(`Alpha Vantage ${func} failed (${res.status})`)
  const data = await res.json()
  if (data['Error Message']) throw new Error(data['Error Message'])
  if (data['Note'] || data['Information'])
    throw new Error('Alpha Vantage rate limit reached (25 req/day on free tier). Try again tomorrow.')
  return data
}

// AV returns all values as strings; "None" means missing
const num = (v) => (v === 'None' || v == null) ? null : (parseFloat(v) || null)

function parseReports(income, balance, cash, isAnnual) {
  const incArr = isAnnual ? (income.annualReports    ?? []) : (income.quarterlyReports    ?? [])
  const balArr = isAnnual ? (balance.annualReports   ?? []) : (balance.quarterlyReports   ?? [])
  const cfArr  = isAnnual ? (cash.annualReports      ?? []) : (cash.quarterlyReports      ?? [])

  // Merge the three statements by date
  const incMap = Object.fromEntries(incArr.map(r => [r.fiscalDateEnding, r]))
  const balMap = Object.fromEntries(balArr.map(r => [r.fiscalDateEnding, r]))
  const cfMap  = Object.fromEntries(cfArr.map(r => [r.fiscalDateEnding, r]))

  const dates = [...new Set([
    ...Object.keys(incMap),
    ...Object.keys(balMap),
    ...Object.keys(cfMap),
  ])].sort().slice(-8)   // oldest → newest, max 8 periods

  return dates.map(date => {
    const ic = incMap[date] || {}
    const bs = balMap[date] || {}
    const cf = cfMap[date]  || {}

    const operatingCF = num(cf.operatingCashflow)
    const rawCapex    = num(cf.capitalExpenditures) // AV reports as positive outflow
    const freeCF      = operatingCF != null && rawCapex != null
      ? operatingCF - Math.abs(rawCapex)
      : null

    return {
      date,
      isAnnual,
      // Income Statement
      revenue:         num(ic.totalRevenue),
      cogs:            num(ic.costOfRevenue),
      grossProfit:     num(ic.grossProfit),
      rd:              num(ic.researchAndDevelopment),
      sga:             num(ic.sellingGeneralAndAdministrative),
      ebitda:          num(ic.ebitda),
      operatingIncome: num(ic.operatingIncome),
      netIncome:       num(ic.netIncome),
      // Balance Sheet
      cash:               num(bs.cashAndCashEquivalentsAtCarryingValue),
      cashAndShortTerm:   num(bs.cashAndShortTermInvestments),
      currentAssets:      num(bs.totalCurrentAssets),
      totalAssets:        num(bs.totalAssets),
      currentLiabilities: num(bs.totalCurrentLiabilities),
      longTermDebt:       num(bs.longTermDebt),
      totalLiabilities:   num(bs.totalLiabilities),
      equity:             num(bs.totalShareholderEquity),
      retainedEarnings:   num(bs.retainedEarnings),
      // Cash Flow
      operatingCF,
      capex:        rawCapex != null ? -Math.abs(rawCapex) : null,
      freeCF,
      depreciation: num(cf.depreciationDepletionAndAmortization),
      dividendsPaid: num(cf.dividendPayout),
      investingCF:  num(cf.cashflowFromInvestment),
      financingCF:  num(cf.cashflowFromFinancing),
    }
  })
}

export async function fetchFinancials(symbol, apiKey) {
  const sym = symbol.toUpperCase()
  // 3 parallel calls — well within AV's 5 req/min free limit
  trackAVCalls(3)
  const [income, balance, cash] = await Promise.all([
    get('INCOME_STATEMENT', sym, apiKey),
    get('BALANCE_SHEET',    sym, apiKey),
    get('CASH_FLOW',        sym, apiKey),
  ])
  return {
    annual:    parseReports(income, balance, cash, true),
    quarterly: parseReports(income, balance, cash, false),
  }
}
