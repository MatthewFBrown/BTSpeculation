// SEC EDGAR — no API key required. US-listed stocks only.
const SEC_TICKERS_URL = 'https://www.sec.gov/files/company_tickers.json'
const SEC_FACTS_BASE  = 'https://data.sec.gov/api/xbrl/companyfacts'
const CIK_CACHE_KEY   = 'bt_sec_cik_map'
const CIK_CACHE_TTL   = 7 * 24 * 60 * 60 * 1000   // 7 days

// ── CIK lookup ────────────────────────────────────────────────
async function lookupCIK(ticker) {
  const sym = ticker.toUpperCase()
  try {
    const cached = JSON.parse(localStorage.getItem(CIK_CACHE_KEY) || 'null')
    if (cached && Date.now() - cached.ts < CIK_CACHE_TTL && cached.map[sym])
      return cached.map[sym]
  } catch {}

  const res = await fetch(SEC_TICKERS_URL)
  if (!res.ok) throw new Error('Could not load SEC ticker list')
  const data = await res.json()

  const map = {}
  for (const e of Object.values(data))
    map[e.ticker.toUpperCase()] = String(e.cik_str).padStart(10, '0')

  try { localStorage.setItem(CIK_CACHE_KEY, JSON.stringify({ ts: Date.now(), map })) } catch {}

  if (!map[sym]) throw new Error(`${sym} not found in SEC database — US-listed stocks only`)
  return map[sym]
}

// ── Concept helpers ───────────────────────────────────────────
// Return the raw USD entries array for the first matching concept name
function getEntries(gaap, ...names) {
  for (const name of names) {
    const u = gaap[name]?.units
    if (u?.USD?.length) return u.USD
  }
  return []
}

// Period duration in days (uses start/end when available)
function periodDays(e) {
  if (!e.start) return null
  return (new Date(e.end) - new Date(e.start)) / 86_400_000
}

const isAnnual    = e => { const d = periodDays(e); return d != null ? d > 330 && d < 400 : e.fp === 'FY' }
const isQuarterly = e => { const d = periodDays(e); return d != null ? d > 70  && d < 110 : ['Q1','Q2','Q3','Q4'].includes(e.fp) }

// Deduplicate by end date — keep the most recently filed entry
function dedupeByEnd(entries) {
  const map = {}
  for (const e of entries) {
    if (!map[e.end] || (e.filed || '') > (map[e.end].filed || ''))
      map[e.end] = e
  }
  return map
}

// Get the best value for a specific end date, respecting period filter
function valAt(gaap, endDate, periodFilter, ...names) {
  for (const name of names) {
    const entries = getEntries(gaap, name).filter(periodFilter)
    const matches = entries.filter(e => e.end === endDate)
    if (!matches.length) continue
    matches.sort((a, b) => (b.filed || '').localeCompare(a.filed || ''))
    const v = matches[0].val
    if (v != null) return v
  }
  return null
}

// Find the set of period end-dates to use (up to 8, newest last)
function findDates(gaap, periodFilter) {
  const anchors = getEntries(gaap,
    'RevenueFromContractWithCustomerExcludingAssessedTax',
    'Revenues', 'SalesRevenueNet', 'SalesRevenueGoodsNet',
    'Assets'
  ).filter(periodFilter)
  return Object.keys(dedupeByEnd(anchors)).sort().slice(-8)
}

// ── Parse one period ──────────────────────────────────────────
function parsePeriod(gaap, date, pf, isAnn) {
  const v = (...names) => valAt(gaap, date, pf, ...names)

  const operatingCF = v('NetCashProvidedByUsedInOperatingActivities')
  const rawCapex    = v('PaymentsToAcquirePropertyPlantAndEquipment',
                        'CapitalExpenditureDiscontinuedOperations')
  const depreciation = v('DepreciationDepletionAndAmortization', 'Depreciation',
                         'DepreciationAndAmortization')
  const operatingIncome = v('OperatingIncomeLoss')
  const freeCF = operatingCF != null && rawCapex != null
    ? operatingCF - Math.abs(rawCapex) : null
  const ebitda = operatingIncome != null && depreciation != null
    ? operatingIncome + depreciation : operatingIncome

  return {
    date, isAnnual: isAnn,
    // Income statement
    revenue:         v('RevenueFromContractWithCustomerExcludingAssessedTax',
                       'Revenues', 'SalesRevenueNet', 'SalesRevenueGoodsNet'),
    cogs:            v('CostOfGoodsAndServicesSold', 'CostOfRevenue', 'CostOfGoodsSold'),
    grossProfit:     v('GrossProfit'),
    rd:              v('ResearchAndDevelopmentExpense'),
    sga:             v('SellingGeneralAndAdministrativeExpense'),
    ebitda,
    operatingIncome,
    netIncome:       v('NetIncomeLoss', 'NetIncomeLossAvailableToCommonStockholdersBasic'),
    // Balance sheet
    cash:               v('CashAndCashEquivalentsAtCarryingValue'),
    cashAndShortTerm:   (() => {
      const c = v('CashAndCashEquivalentsAtCarryingValue')
      const s = v('ShortTermInvestments', 'AvailableForSaleSecuritiesCurrent',
                  'MarketableSecuritiesCurrent')
      return c != null && s != null ? c + s : c
    })(),
    currentAssets:      v('AssetsCurrent'),
    totalAssets:        v('Assets'),
    currentLiabilities: v('LiabilitiesCurrent'),
    longTermDebt:       v('LongTermDebt', 'LongTermDebtNoncurrent',
                          'LongTermNotesPayable'),
    totalLiabilities:   v('Liabilities'),
    equity:             v('StockholdersEquity',
                          'StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest'),
    retainedEarnings:   v('RetainedEarningsAccumulatedDeficit'),
    // Cash flow
    operatingCF,
    capex:        rawCapex != null ? -Math.abs(rawCapex) : null,
    freeCF,
    depreciation,
    dividendsPaid: v('PaymentsOfDividends', 'PaymentsOfDividendsCommonStock'),
    investingCF:   v('NetCashProvidedByUsedInInvestingActivities'),
    financingCF:   v('NetCashProvidedByUsedInFinancingActivities'),
  }
}

// ── Main export ───────────────────────────────────────────────
export async function fetchFinancials(symbol) {
  const cik   = await lookupCIK(symbol)
  const res   = await fetch(`${SEC_FACTS_BASE}/CIK${cik}.json`)
  if (!res.ok) throw new Error(`SEC EDGAR request failed (${res.status})`)
  const facts = await res.json()
  const gaap  = facts.facts?.['us-gaap'] || {}

  const annualDates    = findDates(gaap, isAnnual)
  const quarterlyDates = findDates(gaap, isQuarterly)

  return {
    entityName: facts.entityName,
    annual:    annualDates.map(d    => parsePeriod(gaap, d, isAnnual,    true)),
    quarterly: quarterlyDates.map(d => parsePeriod(gaap, d, isQuarterly, false)),
  }
}
