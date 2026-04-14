import { useState, useCallback, useEffect } from 'react'
import { fetchFinancials } from '../../utils/fetchFinancials'
import { getAllSharedCache, saveSharedCache } from '../../utils/financialsSharedCache'
import { MOCK_FINANCIALS } from '../../utils/mockFinancials'
import { RefreshCw, AlertTriangle, KeyRound, Search, X, ClipboardPaste, Info } from 'lucide-react'
import { KNOWN_ETFS, ETFCard } from './ETFCard'
import {
  BarChart, Bar, LineChart, Line, ComposedChart,
  XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts'

// ── Formatters ────────────────────────────────────────────────
const fmtB = (v) => {
  if (v == null || isNaN(v)) return '—'
  const abs  = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(2)}T`
  if (abs >= 1e9)  return `${sign}$${(abs / 1e9).toFixed(2)}B`
  if (abs >= 1e6)  return `${sign}$${(abs / 1e6).toFixed(2)}M`
  if (abs >= 1e3)  return `${sign}$${(abs / 1e3).toFixed(1)}K`
  return `${sign}$${abs.toFixed(2)}`
}
const fmtN = (v) => {
  if (v == null || isNaN(v)) return '—'
  const abs  = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (abs >= 1e9)  return `${sign}${(abs / 1e9).toFixed(2)}B`
  if (abs >= 1e6)  return `${sign}${(abs / 1e6).toFixed(2)}M`
  if (abs >= 1e3)  return `${sign}${(abs / 1e3).toFixed(1)}K`
  return `${sign}${abs.toFixed(0)}`
}
const fmt2 = (v) => v == null || isNaN(v) ? '—' : `$${Number(v).toFixed(2)}`

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const periodLabel = (r) => {
  const [year, month] = r.date.split('-')
  return r.isAnnual
    ? year
    : `${MONTHS[parseInt(month) - 1]} '${year.slice(-2)}`
}

const valColor = (v) =>
  v == null ? 'text-slate-500' : v < 0 ? 'text-red-400' : 'text-slate-200'

// ── Section definitions ───────────────────────────────────────
const SECTIONS = [
  {
    id: 'income', label: 'Income Statement',
    chartBars: [
      { key: 'revenue',    label: 'Revenue',      color: '#3b82f6' },
      { key: 'grossProfit',label: 'Gross Profit', color: '#10b981' },
      { key: 'netIncome',  label: 'Net Income',   color: '#8b5cf6' },
    ],
    rows: [
      { key: 'revenue',          label: 'Revenue' },
      { key: 'cogs',             label: 'Cost of Revenue' },
      { key: 'grossProfit',      label: 'Gross Profit' },
      { key: 'rd',               label: 'R&D Expense' },
      { key: 'sga',              label: 'SG&A Expense' },
      { key: 'operatingExpenses',label: 'Total Operating Expenses' },
      { key: 'ebitda',           label: 'EBITDA' },
      { key: 'operatingIncome',  label: 'Operating Income' },
      { key: 'otherIncome',      label: 'Other Income / (Expense)' },
      { key: 'pretaxIncome',     label: 'Pre-Tax Income' },
      { key: 'incomeTax',        label: 'Income Taxes' },
      { key: 'netIncome',        label: 'Net Income' },
      { key: 'epsBasic',         label: 'EPS (Basic)',                  fmt: fmt2 },
      { key: 'epsDiluted',       label: 'EPS (Diluted)',                fmt: fmt2 },
      { key: 'sharesBasic',      label: 'Shares Outstanding (Basic)',   fmt: fmtN },
      { key: 'sharesDiluted',    label: 'Shares Outstanding (Diluted)', fmt: fmtN },
    ],
  },
  {
    id: 'balance', label: 'Balance Sheet',
    chartBars: [
      { key: 'totalAssets',      label: 'Total Assets',      color: '#3b82f6' },
      { key: 'totalLiabilities', label: 'Total Liabilities', color: '#ef4444' },
      { key: 'equity',           label: 'Equity',            color: '#10b981' },
    ],
    rows: [
      // Current Assets
      { key: 'cash',                 label: 'Cash & Equivalents' },
      { key: 'cashAndShortTerm',     label: 'Short-Term Investments' },
      { key: 'accountsReceivable',   label: 'Accounts Receivable' },
      { key: 'inventory',            label: 'Inventory' },
      { key: 'otherCurrentAssets',   label: 'Other Current Assets' },
      { key: 'currentAssets',        label: 'Total Current Assets' },
      // Non-Current Assets
      { key: 'ppe',                  label: 'PP&E (Net)' },
      { key: 'longTermInvestments',  label: 'Long-Term Investments' },
      { key: 'goodwill',             label: 'Goodwill' },
      { key: 'intangibles',          label: 'Intangible Assets' },
      { key: 'otherNonCurrentAssets',label: 'Other Non-Current Assets' },
      { key: 'nonCurrentAssets',     label: 'Total Non-Current Assets' },
      { key: 'totalAssets',          label: 'Total Assets' },
      // Current Liabilities
      { key: 'shortTermDebt',            label: 'Short-Term Debt' },
      { key: 'accountsPayable',          label: 'Accounts Payable' },
      { key: 'deferredRevenue',          label: 'Deferred Revenue' },
      { key: 'otherCurrentLiabilities',  label: 'Other Current Liabilities' },
      { key: 'currentLiabilities',       label: 'Total Current Liabilities' },
      // Non-Current Liabilities
      { key: 'longTermDebt',              label: 'Long-Term Debt' },
      { key: 'otherNonCurrentLiabilities',label: 'Other Non-Current Liabilities' },
      { key: 'totalLiabilities',          label: 'Total Liabilities' },
      // Equity
      { key: 'commonStock',      label: 'Common Stock' },
      { key: 'retainedEarnings', label: 'Retained Earnings' },
      { key: 'aoci',             label: 'Accum. Other Comprehensive Income' },
      { key: 'equity',           label: "Total Stockholders' Equity" },
    ],
  },
  {
    id: 'cashflow', label: 'Cash Flow',
    chartBars: [
      { key: 'operatingCF', label: 'Operating CF', color: '#10b981' },
      { key: 'freeCF',      label: 'Free CF',      color: '#3b82f6' },
      { key: 'investingCF', label: 'Investing CF', color: '#f97316' },
    ],
    rows: [
      // Operating
      { key: 'netIncome',     label: 'Net Income' },
      { key: 'depreciation',  label: 'Depreciation & Amort.' },
      { key: 'stockComp',     label: 'Stock-Based Comp.' },
      { key: 'noncashAdj',    label: 'Other Noncash Adjustments' },
      { key: 'operatingCF',   label: 'Net Cash from Operations' },
      { key: 'interestPaid',  label: 'Cash Interest Paid' },
      { key: 'taxPaid',       label: 'Cash Income Tax Paid' },
      // Investing
      { key: 'capex',             label: 'Purchase of PP&E (CapEx)' },
      { key: 'freeCF',            label: 'Free Cash Flow' },
      { key: 'acquisitions',      label: 'Acquisitions' },
      { key: 'purchaseInvestment',label: 'Purchase of Investments' },
      { key: 'saleInvestment',    label: 'Sale of Investments' },
      { key: 'otherInvesting',    label: 'Other Investing' },
      { key: 'investingCF',       label: 'Net Cash from Investing' },
      // Financing
      { key: 'debtIssuance',   label: 'Issuance of Debt' },
      { key: 'debtRepayment',  label: 'Debt Repayment' },
      { key: 'buybacks',       label: 'Share Repurchases' },
      { key: 'dividendsPaid',  label: 'Dividends Paid' },
      { key: 'otherFinancing', label: 'Other Financing' },
      { key: 'financingCF',    label: 'Net Cash from Financing' },
      // Net
      { key: 'netChangeCash',  label: 'Net Change in Cash' },
    ],
  },
]

// ── Sub-components ────────────────────────────────────────────
function FinChart({ data, bars }) {
  const chartData = [...data].reverse().map(r => ({
    label: periodLabel(r),
    ...Object.fromEntries(bars.map(b => [b.key, r[b.key]])),
  }))

  return (
    <ResponsiveContainer width="100%" height={210}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        barGap={2} barCategoryGap="22%">
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={fmtB} tick={{ fontSize: 10, fill: '#64748b' }}
          axisLine={false} tickLine={false} width={62} />
        <ReferenceLine y={0} stroke="#475569" strokeWidth={1} />
        <Tooltip
          contentStyle={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(148, 163, 184, 0.2)', borderRadius: 6, fontSize: 11, backdropFilter: 'blur(4px)' }}
          labelStyle={{ color: '#94a3b8', marginBottom: 3, fontSize: 10 }}
          formatter={(v, name) => [fmtB(v), name]}
          itemStyle={{ color: '#cbd5e1' }}
          cursor={false}
        />
        {bars.map(b => (
          <Bar key={b.key} dataKey={b.key} name={b.label}
            fill={b.color} fillOpacity={0.85} radius={[2, 2, 0, 0]} maxBarSize={36} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

function pctChange(current, prior) {
  if (current == null || prior == null || prior === 0) return null
  return ((current - prior) / Math.abs(prior)) * 100
}

function ChangeBadge({ pct }) {
  if (pct == null) return null
  const pos = pct >= 0
  return (
    <span className={`ml-1 text-[9px] font-bold tabular-nums ${pos ? 'text-green-400' : 'text-red-400'}`}>
      {pos ? '▲' : '▼'}{Math.abs(pct).toFixed(1)}%
    </span>
  )
}

function FinTable({ data, rows, extraRows = [] }) {
  // Most recent first for the table
  const reversed = [...data].reverse()

  function renderRow(row, dimLabel = false) {
    return (
      <tr key={row.key} className="border-b border-slate-700/40 hover:bg-slate-700/20">
        <td className={`px-3 py-2.5 font-medium sticky left-0 bg-slate-800 z-10 ${dimLabel ? 'text-slate-500' : 'text-slate-400'}`}>
          {row.label}
        </td>
        {reversed.map((r, i) => {
          const v     = r[row.key]
          const prior = reversed[i + 1]?.[row.key]
          const pct   = row.fmt ? null : pctChange(v, prior)
          const display = row.fmt ? (v != null ? row.fmt(v) : '—') : fmtB(v)
          return (
            <td key={r.date} className={`px-3 py-2.5 text-right tabular-nums font-semibold ${valColor(v)}`}>
              {v == null
                ? <span className="text-slate-600">—</span>
                : <>{display}<ChangeBadge pct={pct} /></>
              }
            </td>
          )
        })}
      </tr>
    )
  }

  return (
    <div className="overflow-x-auto mt-4">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b border-slate-700">
            <th className="text-left px-3 py-2 text-slate-500 font-semibold sticky left-0 bg-slate-800 w-44 z-10">
              Metric
            </th>
            {reversed.map(r => (
              <th key={r.date} className="px-3 py-2 text-right text-slate-400 font-semibold tabular-nums whitespace-nowrap">
                {periodLabel(r)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => renderRow(row))}
          {extraRows.length > 0 && (
            <tr className="border-b border-slate-600/60">
              <td colSpan={reversed.length + 1} className="px-3 py-1 text-[10px] text-slate-600 uppercase tracking-wider">
                Additional fields
              </td>
            </tr>
          )}
          {extraRows.map(row => renderRow(row, true))}
        </tbody>
      </table>
    </div>
  )
}

// ── Paste parser ─────────────────────────────────────────────
const LABEL_MAP = {
  // ── Income Statement ──────────────────────────────────────
  'revenue': 'revenue', 'total revenue': 'revenue', 'net revenue': 'revenue',
  'sales': 'revenue', 'net sales': 'revenue',
  'cogs': 'cogs', 'cost of goods sold': 'cogs', 'cost of revenue': 'cogs', 'cost of goods': 'cogs',
  'gross profit': 'grossProfit',
  'r&d': 'rd', 'r&d expense': 'rd', 'r&d expenses': 'rd',
  'research and development': 'rd', 'research & development': 'rd', 'research development': 'rd',
  'research and development expenses': 'rd', 'research & development expenses': 'rd',
  'sg&a': 'sga', 'sg&a expense': 'sga', 'sg&a expenses': 'sga',
  'selling general and administrative': 'sga', 'selling general & administrative': 'sga',
  'selling general and administrative expenses': 'sga',
  'operating expenses': 'operatingExpenses', 'total operating expenses': 'operatingExpenses',
  'ebitda': 'ebitda',
  'operating income': 'operatingIncome', 'operating profit': 'operatingIncome',
  'income from operations': 'operatingIncome',
  'other income': 'otherIncome', 'other income expense': 'otherIncome',
  'other income (expense)': 'otherIncome', 'non-operating income': 'otherIncome',
  'pre-tax income': 'pretaxIncome', 'pretax income': 'pretaxIncome',
  'income before tax': 'pretaxIncome', 'pretax income (loss)': 'pretaxIncome',
  'income taxes': 'incomeTax', 'income tax': 'incomeTax',
  'income tax expense': 'incomeTax', 'provision for income taxes': 'incomeTax',
  'net income': 'netIncome', 'net profit': 'netIncome', 'net earnings': 'netIncome',
  'income from continuous operations': 'netIncome', 'income after taxes': 'netIncome',
  'net income (loss)': 'netIncome',
  'eps basic': 'epsBasic', 'eps (basic)': 'epsBasic', 'basic eps': 'epsBasic',
  'eps diluted': 'epsDiluted', 'eps (diluted)': 'epsDiluted', 'diluted eps': 'epsDiluted',
  'shares outstanding (basic)': 'sharesBasic', 'shares outstanding basic': 'sharesBasic',
  'basic shares outstanding': 'sharesBasic',
  'shares outstanding (diluted)': 'sharesDiluted', 'shares outstanding diluted': 'sharesDiluted',
  'diluted shares outstanding': 'sharesDiluted',
  // ── Balance Sheet — Assets ────────────────────────────────
  'assets': 'totalAssets', 'total assets': 'totalAssets',
  'current assets': 'currentAssets', 'total current assets': 'currentAssets',
  'cash': 'cash', 'cash and equivalents': 'cash', 'cash & equivalents': 'cash',
  'cash and cash equivalents': 'cash', 'cash & equivalents at carrying value': 'cash',
  'short term investments': 'cashAndShortTerm', 'short-term investments': 'cashAndShortTerm',
  'cash and short term investments': 'cashAndShortTerm',
  'accounts receivable': 'accountsReceivable', 'net receivables': 'accountsReceivable',
  'trade receivables': 'accountsReceivable',
  'inventory': 'inventory', 'inventories': 'inventory',
  'other current assets': 'otherCurrentAssets',
  'noncurrent assets': 'nonCurrentAssets', 'non-current assets': 'nonCurrentAssets',
  'total noncurrent assets': 'nonCurrentAssets', 'total non-current assets': 'nonCurrentAssets',
  'pp&e': 'ppe', 'property plant and equipment': 'ppe', 'property plant & equipment': 'ppe',
  'property plant equipment net': 'ppe', 'net ppe': 'ppe',
  'long term investments': 'longTermInvestments', 'long-term investments': 'longTermInvestments',
  'other noncrnt assets': 'otherNonCurrentAssets', 'other noncurrent assets': 'otherNonCurrentAssets',
  'goodwill': 'goodwill', 'intangible assets': 'intangibles', 'intangibles': 'intangibles',
  // ── Balance Sheet — Liabilities ──────────────────────────
  'liabilities': 'totalLiabilities', 'total liabilities': 'totalLiabilities',
  'current liabilities': 'currentLiabilities', 'total current liabilities': 'currentLiabilities',
  'short term debt': 'shortTermDebt', 'short-term debt': 'shortTermDebt',
  'current portion of long term debt': 'shortTermDebt',
  'accounts payable': 'accountsPayable',
  'current deferred revenue': 'deferredRevenue', 'deferred revenue': 'deferredRevenue',
  'deferred revenues': 'deferredRevenue',
  'other current liabilities': 'otherCurrentLiabilities',
  'long term debt': 'longTermDebt', 'long-term debt': 'longTermDebt',
  'total long term debt': 'longTermDebt',
  'other noncurrent liabilities': 'otherNonCurrentLiabilities',
  'other noncrnt liabilities': 'otherNonCurrentLiabilities',
  // ── Balance Sheet — Equity ────────────────────────────────
  'equity and non ctrl. intrs.': 'equity', 'common equity': 'equity',
  'shareholders equity': 'equity', 'stockholders equity': 'equity', 'total equity': 'equity',
  "shareholders' equity": 'equity', "stockholders' equity": 'equity',
  'preferred and common equity': 'equity', 'liabilities and equity': null, // skip — same as total assets
  'commitments and contingencies': null, // skip — always 0
  'common stock': 'commonStock',
  'retained earnings': 'retainedEarnings',
  'accumulated other comprehensive income loss': 'aoci',
  'accumulated other comprehensive income': 'aoci',
  // ── Cash Flow — Operating ────────────────────────────────
  'net cash from operations': 'operatingCF',
  'net cash from continuing operating activities': 'operatingCF',
  'operating cash flow': 'operatingCF', 'cash from operations': 'operatingCF',
  'net cash provided by operating activities': 'operatingCF',
  'depreciation expense': 'depreciation', 'depreciation': 'depreciation',
  'depreciation & amortization': 'depreciation', 'depreciation and amortization': 'depreciation',
  'depreciation depletion and amortization': 'depreciation',
  'noncash adjustments': 'noncashAdj', 'other noncash items': 'noncashAdj',
  'stock based compensation': 'stockComp', 'stock-based compensation': 'stockComp',
  'share based compensation': 'stockComp', 'share-based compensation': 'stockComp',
  'cash interest paid': 'interestPaid', 'interest paid': 'interestPaid',
  'cash income tax paid': 'taxPaid', 'income taxes paid': 'taxPaid',
  // ── Cash Flow — Investing ────────────────────────────────
  'capital expenditures': 'capex', 'capex': 'capex', 'capital expenditure': 'capex',
  'purchase of pp&e': 'capex', 'purchases of property plant and equipment': 'capex',
  'free cash flow': 'freeCF',
  'acquisitions': 'acquisitions', 'acquisitions net of cash': 'acquisitions',
  'purchase of investment': 'purchaseInvestment', 'purchases of investments': 'purchaseInvestment',
  'sale of investment': 'saleInvestment', 'sales of investments': 'saleInvestment',
  'maturities of investments': 'saleInvestment',
  'other investing': 'otherInvesting', 'other investing activities': 'otherInvesting',
  'net cash from investing': 'investingCF',
  'net cash from continuing investing activities': 'investingCF',
  'net cash from investing activities': 'investingCF',
  'investing cash flow': 'investingCF', 'cash from investing': 'investingCF',
  // ── Cash Flow — Financing ────────────────────────────────
  'net cash from financing activities': 'financingCF',
  'net cash from continuing financing activities': 'financingCF',
  'financing cash flow': 'financingCF', 'cash from financing': 'financingCF',
  'issuance of debt': 'debtIssuance', 'proceeds from issuance of debt': 'debtIssuance',
  'debt repayment': 'debtRepayment', 'repayment of debt': 'debtRepayment',
  'repayments of debt': 'debtRepayment',
  'repurchase comn stock': 'buybacks', 'repurchase common stock': 'buybacks',
  'common stock repurchased': 'buybacks', 'share repurchases': 'buybacks',
  'payment of dividends': 'dividendsPaid', 'dividends paid': 'dividendsPaid',
  'cash dividends paid': 'dividendsPaid',
  'financing activities': 'otherFinancing', 'other financing activities': 'otherFinancing',
  'net change in cash': 'netChangeCash', 'change in cash': 'netChangeCash',
  'net change in cash and equivalents': 'netChangeCash',
}

function parseNum(str) {
  if (!str) return null
  const s = str.trim()
  if (!s || s === '-' || s.toLowerCase() === 'n/a' || s === '—') return null
  if (s.includes('%')) return null  // skip ratio rows
  const neg = s.startsWith('(') && s.endsWith(')')
  const n = parseFloat(s.replace(/[^0-9.-]/g, ''))
  if (isNaN(n)) return null
  return neg ? -n : n
}

const FY_RE = /^FY\s*(\d{4})$/i
const Q_RE  = /^Q([1-4])\s*(\d{4})$/i
const QE    = { '1': '03-31', '2': '06-30', '3': '09-30', '4': '12-31' }

function parsePasteSection(rows, unitMult) {
  if (rows.length < 2) return null

  // ── Detect header format ────────────────────────────────────
  let dates, isAnnual, dataRows
  const cell0 = (rows[0][0] || '').trim()

  if (FY_RE.test(cell0)) {
    // Row 0 is all "FY XXXX" labels — no label column
    dates    = rows[0].map(c => { const m = FY_RE.exec(c.trim()); return m ? `${m[1]}-12-31` : null }).filter(Boolean)
    isAnnual = true
    dataRows = rows.slice(1)
  } else if (Q_RE.test(cell0)) {
    // Row 0 is all "QX XXXX" labels — no label column
    dates    = rows[0].map(c => { const m = Q_RE.exec(c.trim()); return m ? `${m[2]}-${QE[m[1]]}` : null }).filter(Boolean)
    isAnnual = false
    dataRows = rows.slice(1)
  } else {
    // Fallback: label in col 0, year integers in cols 1+
    const firstCells = rows[0].slice(1).map(v => parseInt(v.replace(/,/g, '').trim()))
    if (firstCells.length > 0 && firstCells.every(y => !isNaN(y) && y > 1990 && y < 2100)) {
      dates    = firstCells.map(y => `${y}-12-31`)
      isAnnual = true
      dataRows = rows.slice(1)
    } else {
      // No header — sequential years
      const numCols = Math.max(...rows.map(r => r.length - 1))
      const cur = new Date().getFullYear()
      dates    = Array.from({ length: numCols }, (_, i) => `${cur - numCols + 1 + i}-12-31`)
      isAnnual = true
      dataRows = rows
    }
  }

  if (!dates.length) return null

  // ── Parse data rows ─────────────────────────────────────────
  const fields = {}, extraFields = {}, extraRows = []
  const seenSlugs = new Set()

  for (const row of dataRows) {
    const rawLabel = (row[0] || '').trim()
    if (!rawLabel) continue
    const labelLow = rawLabel.toLowerCase().replace(/\s+/g, ' ')
    const key = LABEL_MAP[labelLow]
    const EPS_KEYS = new Set(['epsBasic', 'epsDiluted', 'sharesBasic', 'sharesDiluted'])
    const vals = row.slice(1, dates.length + 1).map(v => {
      const n = parseNum(v)
      if (n == null) return null
      if (EPS_KEYS.has(key)) return n
      if (key === 'capex') return n > 0 ? -Math.abs(n) * unitMult : n * unitMult
      return n * unitMult
    })

    if (key === null) continue  // explicitly skipped row
    if (key) {
      fields[key] = vals
    } else {
      if (vals.every(v => v == null)) continue
      const slug = 'x_' + labelLow.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
      if (!seenSlugs.has(slug)) {
        seenSlugs.add(slug)
        extraRows.push({ key: slug, label: rawLabel })
        extraFields[slug] = vals
      }
    }
  }

  if (!Object.keys(fields).length && !extraRows.length) return null

  const periods = dates.map((date, i) => {
    const p = { date, isAnnual }
    for (const [k, vals] of Object.entries(fields))      p[k] = vals[i] ?? null
    for (const [k, vals] of Object.entries(extraFields)) p[k] = vals[i] ?? null
    if (p.freeCF == null && p.operatingCF != null && p.capex != null)
      p.freeCF = p.operatingCF + p.capex
    return p
  })

  return { periods, isAnnual, extraRows }
}

function parseFinancialsPaste(text, unitMult) {
  // Split on blank lines to separate annual / quarterly sections
  const sections = text.trim().split(/\n[ \t]*\n+/)

  const annual = [], quarterly = []
  const seenExtra = new Set(), allExtraRows = []

  for (const sec of sections) {
    const lines = sec.trim().split('\n').map(l => l.trimEnd()).filter(Boolean)
    if (lines.length < 2) continue
    const rows = lines.map(l => l.split('\t'))
    const result = parsePasteSection(rows, unitMult)
    if (!result) continue

    if (result.isAnnual) annual.push(...result.periods)
    else               quarterly.push(...result.periods)

    for (const er of result.extraRows) {
      if (!seenExtra.has(er.key)) { seenExtra.add(er.key); allExtraRows.push(er) }
    }
  }

  if (!annual.length && !quarterly.length) return null
  return { annual, quarterly, extraRows: allExtraRows }
}

function PasteModal({ onImport, onClose, initialSym = '' }) {
  const [sym, setSym]   = useState(initialSym)
  const [text, setText] = useState('')
  const [unit, setUnit] = useState('millions')
  const [preview, setPreview] = useState(null)
  const [err, setErr]   = useState('')

  const UNITS = { thousands: 1e3, millions: 1e6, billions: 1e9, actual: 1 }

  function handleParse() {
    const result = parseFinancialsPaste(text, UNITS[unit])
    if (!result) { setErr('Could not parse — make sure values are tab-separated with row labels in the first column.'); return }
    setErr('')
    setPreview(result)
  }

  function handleImport() {
    if (!sym.trim()) { setErr('Enter a ticker symbol'); return }
    onImport(sym.trim().toUpperCase(), preview)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <p className="text-sm font-bold text-slate-200">Paste Financial Data</p>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300"><X size={16} /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          <p className="text-xs text-slate-500">
            Copy a tab-separated financial table (e.g. from Macrotrends). Row labels go in the first column; years optionally in the first row.
          </p>

          <div className="flex gap-3 flex-wrap">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-slate-500 uppercase tracking-wider">Ticker</label>
              <input value={sym} onChange={e => setSym(e.target.value.toUpperCase())}
                placeholder="AAPL"
                className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-100 font-mono focus:outline-none focus:border-blue-500 w-28"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-slate-500 uppercase tracking-wider">Values are in</label>
              <div className="flex bg-slate-700 rounded-lg p-0.5 gap-0.5">
                {['thousands','millions','billions','actual'].map(u => (
                  <button key={u} onClick={() => setUnit(u)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors capitalize ${
                      unit === u ? 'bg-slate-600 text-slate-100' : 'text-slate-400 hover:text-slate-200'
                    }`}>
                    {u}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <textarea
            value={text}
            onChange={e => { setText(e.target.value); setPreview(null) }}
            placeholder={"Revenue\t24,578\t37,491\t42,905\nCOGS\t16,426\t24,294\t25,683\nGross Profit\t8,152\t13,197\t17,222\n..."}
            className="w-full h-48 bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-slate-300 font-mono focus:outline-none focus:border-blue-500 resize-none placeholder:text-slate-700"
          />

          {err && <p className="text-xs text-red-400">{err}</p>}

          {preview && (
            <div className="bg-slate-900 rounded-lg p-3 border border-slate-700 space-y-1">
              <p className="text-xs text-green-400 font-semibold">
                ✓ {[
                  preview.annual.length    ? `${preview.annual.length} annual`            : '',
                  preview.quarterly.length ? `${preview.quarterly.length} quarterly` : '',
                ].filter(Boolean).join(' + ')} periods
              </p>
              {preview.annual.length > 0 && (
                <p className="text-[10px] text-slate-500">Annual: {preview.annual.map(p => p.date.slice(0,4)).join(', ')}</p>
              )}
              {preview.quarterly.length > 0 && (
                <p className="text-[10px] text-slate-500">Quarterly: {preview.quarterly[0].date} → {preview.quarterly.at(-1).date}</p>
              )}
              <p className="text-[10px] text-slate-500">
                Known fields: {[...new Set([...preview.annual, ...preview.quarterly].flatMap(p =>
                  Object.keys(p).filter(k => k !== 'date' && k !== 'isAnnual' && !k.startsWith('x_') && p[k] != null)
                ))].join(', ')}
              </p>
              {preview.extraRows?.length > 0 && (
                <p className="text-[10px] text-slate-500">Additional rows: {preview.extraRows.map(r => r.label).join(', ')}</p>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-700">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">Cancel</button>
          {!preview
            ? <button onClick={handleParse} disabled={!text.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors">
                Parse
              </button>
            : <button onClick={handleImport}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg transition-colors">
                Import as {sym.trim().toUpperCase() || '…'}
              </button>
          }
        </div>
      </div>
    </div>
  )
}

// ── Charts Tab ───────────────────────────────────────────────
const TT_STYLE = {
  contentStyle: { background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(148, 163, 184, 0.2)', borderRadius: 6, fontSize: 10, backdropFilter: 'blur(4px)' },
  labelStyle:   { color: '#94a3b8', marginBottom: 2, fontSize: 10 },
  itemStyle:    { color: '#cbd5e1' },
  cursor: false,
}
const AXIS_STYLE = { tick: { fontSize: 10, fill: '#64748b' }, axisLine: false, tickLine: false }
const Y_$ = { ...AXIS_STYLE, tickFormatter: fmtB, width: 66 }
const Y_PCT = { ...AXIS_STYLE, tickFormatter: v => `${v.toFixed(0)}%`, width: 42 }
const Y_X   = { ...AXIS_STYLE, tickFormatter: v => v.toFixed(1), width: 34 }

const CHART_INFO = {
  'Revenue & Profit':              'Shows top-line revenue alongside gross profit and net income over time. Look for consistent revenue growth and widening gap between revenue and net income — a sign of improving efficiency. Shrinking net income despite rising revenue signals rising costs.',
  'Margin Trends':                 'Tracks gross, operating, net, and FCF margins as a % of revenue. Stable or expanding margins indicate pricing power and cost discipline. Gross margin shows production efficiency; operating margin shows overhead control; net margin is the bottom line; FCF margin shows how much cash the business actually generates.',
  'YoY Growth %':                  'Year-over-year percentage growth in revenue and net income. Green = positive growth, red = decline. Consistent double-digit revenue growth with matching or better earnings growth is a strong signal. Watch for revenue growing faster than earnings — it may mean rising costs.',
  'Earnings Per Share':            'EPS (Basic and Diluted) shows how much profit is attributed to each share. Rising EPS over time is key for equity value. The gap between basic and diluted EPS reflects dilution from options/convertibles — a wide and growing gap is a warning sign.',
  'Cash Flow Statement':           'Compares operating cash flow, free cash flow, and CapEx. Strong businesses generate operating CF consistently above net income. Free CF = Operating CF minus CapEx. High CapEx relative to operating CF can signal heavy reinvestment needs. Look for sustained FCF growth.',
  'Free Cash Flow vs Net Income':  'A critical earnings quality check. FCF consistently above net income indicates high-quality earnings — the company is converting profits to real cash. FCF below net income may signal aggressive accounting, heavy receivables, or high working capital needs.',
  'Cash & Short-Term Investments': 'Total liquid reserves. A large and growing cash pile provides a safety buffer and optionality for buybacks, acquisitions, or dividends. Declining cash alongside rising debt is a warning signal.',
  'Balance Sheet Composition':     'Shows total assets financed by liabilities vs. equity. A healthy company grows assets while keeping equity growing faster than liabilities. Equity shrinking toward zero or negative is a red flag unless driven by buybacks.',
  'Liquidity & Leverage Ratios':   'Current Ratio = Current Assets / Current Liabilities. A ratio above 1.0 means the company can cover short-term obligations. Debt-to-Equity (D/E) measures financial leverage — higher D/E means more risk. Compare to industry peers; capital-intensive industries naturally carry more debt.',
  'Return on Equity & Assets':     'ROE = Net Income / Equity. ROA = Net Income / Total Assets. High and stable ROE (>15%) signals efficient use of shareholder capital. ROA measures how well assets are deployed. Diverging ROE and ROA can signal heavy leverage boosting returns artificially.',
  'Long-Term Debt vs Free Cash Flow': 'Shows the company\'s debt burden relative to its ability to repay it via free cash flow. If FCF consistently covers a large portion of LTD, the debt is manageable. A debt pile growing much faster than FCF is a leverage risk. Rough guide: LTD / annual FCF gives years to pay off debt.',
  'R&D & SG&A Spending':           'R&D spend as bars with % of revenue as dashed lines. Rising R&D % indicates increased investment in future growth — good for tech/pharma. Rising SG&A % without a revenue payoff suggests bloating overhead. Stable or declining SG&A % as revenue grows signals improving operating leverage.',
  'FCF Growth YoY %':              'Year-over-year growth in free cash flow. FCF is harder to manipulate than earnings, making it a purer signal of business health. Volatile FCF growth is common in CapEx-heavy industries. Consistent positive FCF growth over 5+ years is a hallmark of a quality compounder.',
  'EBITDA':                        'EBITDA (bars) vs Operating Income (line). EBITDA strips out depreciation/amortization, giving a cleaner view of operating cash generation before financing costs. The gap between EBITDA and Operating Income is D&A — growing D&A relative to EBITDA may signal aging assets needing reinvestment.',
}

function ChartCard({ title, legend = [], children, wide = false }) {
  const [showInfo, setShowInfo] = useState(false)
  const info = CHART_INFO[title]
  return (
    <div className={`bg-slate-800/50 backdrop-blur-md rounded-lg ring-1 ring-white/[0.08] p-4 relative ${wide ? 'lg:col-span-2' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">{title}</p>
        {info && (
          <button onClick={() => setShowInfo(v => !v)}
            className={`transition-colors ${showInfo ? 'text-blue-400' : 'text-slate-600 hover:text-slate-400'}`}>
            <Info size={13} />
          </button>
        )}
      </div>
      {showInfo && info && (
        <div className="mb-3 bg-slate-900/50 border border-slate-700/50 rounded-lg p-3 text-[11px] text-slate-400 leading-relaxed">
          {info}
        </div>
      )}
      {legend.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
          {legend.map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              {l.dash
                ? <svg width="18" height="8"><line x1="0" y1="4" x2="18" y2="4" stroke={l.color} strokeWidth="2" strokeDasharray="4 2"/></svg>
                : l.line
                  ? <svg width="18" height="8"><line x1="0" y1="4" x2="18" y2="4" stroke={l.color} strokeWidth="2"/></svg>
                  : <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: l.color }} />
              }
              <span className="text-[10px] text-slate-400">{l.label}</span>
            </div>
          ))}
        </div>
      )}
      {children}
    </div>
  )
}

function ChartsTab({ periods }) {
  if (!periods.length) return <div className="text-center py-16 text-slate-500 text-sm">No data to display.</div>

  const rat = (a, b) => (a != null && b != null && b !== 0) ? a / b : null

  const cd = [...periods].reverse().map((r, i, arr) => {
    const prev = arr[i - 1]
    const yoy  = (v, p) => (v != null && p != null && p !== 0) ? (v - p) / Math.abs(p) * 100 : null
    return {
      label:          periodLabel(r),
      revenue:        r.revenue,
      grossProfit:    r.grossProfit,
      operatingIncome:r.operatingIncome,
      netIncome:      r.netIncome,
      ebitda:         r.ebitda,
      rd:             r.rd,
      sga:            r.sga,
      epsBasic:       r.epsBasic,
      epsDiluted:     r.epsDiluted,
      operatingCF:    r.operatingCF,
      freeCF:         r.freeCF,
      capex:          r.capex != null ? Math.abs(r.capex) : null,
      cash:           r.cash,
      cashST:         r.cashAndShortTerm,
      totalAssets:    r.totalAssets,
      totalLiab:      r.totalLiabilities,
      equity:         r.equity,
      longTermDebt:   r.longTermDebt,
      // Margins
      grossMargin:    rat(r.grossProfit, r.revenue)     != null ? rat(r.grossProfit, r.revenue) * 100     : null,
      opMargin:       rat(r.operatingIncome, r.revenue) != null ? rat(r.operatingIncome, r.revenue) * 100 : null,
      netMargin:      rat(r.netIncome, r.revenue)       != null ? rat(r.netIncome, r.revenue) * 100       : null,
      fcfMargin:      rat(r.freeCF, r.revenue)          != null ? rat(r.freeCF, r.revenue) * 100          : null,
      rdPct:          rat(r.rd, r.revenue)              != null ? rat(r.rd, r.revenue) * 100              : null,
      sgaPct:         rat(r.sga, r.revenue)             != null ? rat(r.sga, r.revenue) * 100             : null,
      // Ratios
      currentRatio:   rat(r.currentAssets, r.currentLiabilities),
      debtToEquity:   rat(r.longTermDebt, r.equity),
      roe:            rat(r.netIncome, r.equity)      != null ? rat(r.netIncome, r.equity) * 100      : null,
      roa:            rat(r.netIncome, r.totalAssets) != null ? rat(r.netIncome, r.totalAssets) * 100 : null,
      // YoY Growth
      revGrowth: prev ? yoy(r.revenue,   prev.revenue)   : null,
      niGrowth:  prev ? yoy(r.netIncome, prev.netIncome) : null,
      epsGrowth: prev ? yoy(r.epsBasic,  prev.epsBasic)  : null,
      fcfGrowth: prev ? yoy(r.freeCF,    prev.freeCF)    : null,
    }
  })

  const has = key => cd.some(d => d[key] != null)

  const ttFmt = (v, name) => {
    if (v == null) return ['—', name]
    if (name.includes('%') || name.includes('Margin') || name.includes('ROE') ||
        name.includes('ROA') || name.includes('Growth') || name.includes('Ratio'))
      return [`${v.toFixed(1)}%`, name]
    if (name.includes('EPS')) return [`$${v.toFixed(2)}`, name]
    if (name === 'Current Ratio' || name === 'D/E') return [v.toFixed(2), name]
    return [fmtB(v), name]
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

      {/* 1. Revenue, Gross Profit, Net Income */}
      {has('revenue') && (
        <ChartCard title="Revenue & Profit" legend={[{color:'#3b82f6',label:'Revenue'},{color:'#10b981',label:'Gross Profit'},{color:'#8b5cf6',label:'Net Income'}]}>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={cd} barCategoryGap="22%" barGap={2}>
              <XAxis dataKey="label" {...AXIS_STYLE} />
              <YAxis {...Y_$} />
              <ReferenceLine y={0} stroke="#475569" />
              <Tooltip {...TT_STYLE} formatter={ttFmt} />
              <Bar dataKey="revenue"         name="Revenue"          fill="#3b82f6" fillOpacity={0.85} maxBarSize={24} radius={[2,2,0,0]} />
              <Bar dataKey="grossProfit"     name="Gross Profit"     fill="#10b981" fillOpacity={0.85} maxBarSize={24} radius={[2,2,0,0]} />
              <Bar dataKey="netIncome"       name="Net Income"       fill="#8b5cf6" fillOpacity={0.85} maxBarSize={24} radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* 2. Margin Trends */}
      {has('grossMargin') && (
        <ChartCard title="Margin Trends" legend={[{color:'#10b981',label:'Gross Margin %',line:true},{color:'#3b82f6',label:'Operating Margin %',line:true},{color:'#8b5cf6',label:'Net Margin %',line:true},{color:'#14b8a6',label:'FCF Margin %',dash:true}]}>
          <ResponsiveContainer width="100%" height={210}>
            <LineChart data={cd}>
              <XAxis dataKey="label" {...AXIS_STYLE} />
              <YAxis {...Y_PCT} />
              <ReferenceLine y={0} stroke="#475569" />
              <Tooltip {...TT_STYLE} formatter={ttFmt} />
              <Line type="monotone" dataKey="grossMargin" name="Gross Margin %"     stroke="#10b981" dot={false} strokeWidth={2} connectNulls />
              <Line type="monotone" dataKey="opMargin"    name="Operating Margin %"  stroke="#3b82f6" dot={false} strokeWidth={2} connectNulls />
              <Line type="monotone" dataKey="netMargin"   name="Net Margin %"        stroke="#8b5cf6" dot={false} strokeWidth={2} connectNulls />
              {has('fcfMargin') && <Line type="monotone" dataKey="fcfMargin" name="FCF Margin %" stroke="#14b8a6" dot={false} strokeWidth={2} strokeDasharray="4 2" connectNulls />}
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* 3. YoY Growth */}
      {has('revGrowth') && (
        <ChartCard title="YoY Growth %" legend={[{color:'#10b981',label:'Revenue Growth (pos)'},{color:'#ef4444',label:'Revenue Growth (neg)'},{color:'#8b5cf6',label:'Net Income Growth (pos)'},{color:'#f97316',label:'Net Income Growth (neg)'}]}>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={cd} barCategoryGap="22%" barGap={2}>
              <XAxis dataKey="label" {...AXIS_STYLE} />
              <YAxis {...Y_PCT} />
              <ReferenceLine y={0} stroke="#475569" />
              <Tooltip {...TT_STYLE} formatter={ttFmt} />
              <Bar dataKey="revGrowth" name="Revenue Growth %" maxBarSize={24} radius={[2,2,0,0]}>
                {cd.map((d, i) => <Cell key={i} fill={(d.revGrowth ?? 0) >= 0 ? '#10b981' : '#ef4444'} fillOpacity={0.85} />)}
              </Bar>
              <Bar dataKey="niGrowth" name="Net Income Growth %" maxBarSize={24} radius={[2,2,0,0]}>
                {cd.map((d, i) => <Cell key={i} fill={(d.niGrowth ?? 0) >= 0 ? '#8b5cf6' : '#f97316'} fillOpacity={0.75} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* 4. EPS Trend */}
      {has('epsBasic') && (
        <ChartCard title="Earnings Per Share" legend={[{color:'#3b82f6',label:'EPS Basic'},{color:'#8b5cf6',label:'EPS Diluted',line:true}]}>
          <ResponsiveContainer width="100%" height={210}>
            <ComposedChart data={cd}>
              <XAxis dataKey="label" {...AXIS_STYLE} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v.toFixed(2)}`} width={52} />
              <ReferenceLine y={0} stroke="#475569" />
              <Tooltip {...TT_STYLE} formatter={ttFmt} />
              <Bar dataKey="epsBasic"   name="EPS (Basic)"   fill="#3b82f6" fillOpacity={0.85} maxBarSize={28} radius={[2,2,0,0]} />
              <Line type="monotone" dataKey="epsDiluted" name="EPS (Diluted)" stroke="#8b5cf6" dot={false} strokeWidth={2} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* 5. Cash Flow */}
      {has('operatingCF') && (
        <ChartCard title="Cash Flow Statement" legend={[{color:'#10b981',label:'Operating CF'},{color:'#3b82f6',label:'Free CF'},{color:'#f97316',label:'CapEx (abs)'}]}>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={cd} barCategoryGap="22%" barGap={2}>
              <XAxis dataKey="label" {...AXIS_STYLE} />
              <YAxis {...Y_$} />
              <ReferenceLine y={0} stroke="#475569" />
              <Tooltip {...TT_STYLE} formatter={ttFmt} />
              <Bar dataKey="operatingCF" name="Operating CF"  fill="#10b981" fillOpacity={0.85} maxBarSize={24} radius={[2,2,0,0]} />
              <Bar dataKey="freeCF"      name="Free CF"       fill="#3b82f6" fillOpacity={0.85} maxBarSize={24} radius={[2,2,0,0]} />
              <Bar dataKey="capex"       name="CapEx (abs)"   fill="#f97316" fillOpacity={0.70} maxBarSize={24} radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* 6. FCF vs Net Income — earnings quality */}
      {has('freeCF') && has('netIncome') && (
        <ChartCard title="Free Cash Flow vs Net Income" legend={[{color:'#8b5cf6',label:'Net Income'},{color:'#14b8a6',label:'Free Cash Flow'}]}>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={cd} barCategoryGap="22%" barGap={2}>
              <XAxis dataKey="label" {...AXIS_STYLE} />
              <YAxis {...Y_$} />
              <ReferenceLine y={0} stroke="#475569" />
              <Tooltip {...TT_STYLE} formatter={ttFmt} />
              <Bar dataKey="netIncome" name="Net Income"     fill="#8b5cf6" fillOpacity={0.85} maxBarSize={28} radius={[2,2,0,0]} />
              <Bar dataKey="freeCF"    name="Free Cash Flow" fill="#14b8a6" fillOpacity={0.85} maxBarSize={28} radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* 7. Cash & Investments */}
      {has('cash') && (
        <ChartCard title="Cash & Short-Term Investments" legend={[{color:'#3b82f6',label:'Cash & Equivalents'},{color:'#10b981',label:'Short-Term Investments'}]}>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={cd} barCategoryGap="28%">
              <XAxis dataKey="label" {...AXIS_STYLE} />
              <YAxis {...Y_$} />
              <Tooltip {...TT_STYLE} formatter={ttFmt} />
              <Bar dataKey="cash"   name="Cash & Equiv."         fill="#3b82f6" fillOpacity={0.85} maxBarSize={36} radius={[2,2,0,0]} />
              <Bar dataKey="cashST" name="+ Short-Term Invest."  fill="#10b981" fillOpacity={0.70} maxBarSize={36} radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* 8. Assets / Liabilities / Equity */}
      {has('totalAssets') && (
        <ChartCard title="Balance Sheet Composition" legend={[{color:'#3b82f6',label:'Total Assets'},{color:'#ef4444',label:'Total Liabilities'},{color:'#10b981',label:'Equity'}]}>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={cd} barCategoryGap="22%" barGap={2}>
              <XAxis dataKey="label" {...AXIS_STYLE} />
              <YAxis {...Y_$} />
              <Tooltip {...TT_STYLE} formatter={ttFmt} />
              <Bar dataKey="totalAssets" name="Total Assets"      fill="#3b82f6" fillOpacity={0.85} maxBarSize={24} radius={[2,2,0,0]} />
              <Bar dataKey="totalLiab"   name="Total Liabilities" fill="#ef4444" fillOpacity={0.75} maxBarSize={24} radius={[2,2,0,0]} />
              <Bar dataKey="equity"      name="Equity"            fill="#10b981" fillOpacity={0.85} maxBarSize={24} radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* 9. Liquidity & Leverage */}
      {(has('currentRatio') || has('debtToEquity')) && (
        <ChartCard title="Liquidity & Leverage Ratios" legend={[{color:'#10b981',label:'Current Ratio',line:true},{color:'#ef4444',label:'Debt / Equity',line:true}]}>
          <ResponsiveContainer width="100%" height={210}>
            <LineChart data={cd}>
              <XAxis dataKey="label" {...AXIS_STYLE} />
              <YAxis {...Y_X} />
              <ReferenceLine y={1} stroke="#475569" strokeDasharray="3 3" />
              <Tooltip {...TT_STYLE} formatter={(v, n) => [v?.toFixed(2), n]} />
              <Line type="monotone" dataKey="currentRatio" name="Current Ratio" stroke="#10b981" dot={false} strokeWidth={2} connectNulls />
              <Line type="monotone" dataKey="debtToEquity" name="D/E"           stroke="#ef4444" dot={false} strokeWidth={2} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* 10. ROE & ROA */}
      {(has('roe') || has('roa')) && (
        <ChartCard title="Return on Equity & Assets" legend={[{color:'#ec4899',label:'ROE %',line:true},{color:'#eab308',label:'ROA %',line:true}]}>
          <ResponsiveContainer width="100%" height={210}>
            <LineChart data={cd}>
              <XAxis dataKey="label" {...AXIS_STYLE} />
              <YAxis {...Y_PCT} />
              <ReferenceLine y={0} stroke="#475569" />
              <Tooltip {...TT_STYLE} formatter={ttFmt} />
              <Line type="monotone" dataKey="roe" name="ROE %" stroke="#ec4899" dot={false} strokeWidth={2} connectNulls />
              <Line type="monotone" dataKey="roa" name="ROA %" stroke="#eab308" dot={false} strokeWidth={2} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* 11. Long-Term Debt vs Free Cash Flow */}
      {has('longTermDebt') && (
        <ChartCard title="Long-Term Debt vs Free Cash Flow" legend={[{color:'#ef4444',label:'Long-Term Debt'},{color:'#14b8a6',label:'Free Cash Flow'}]}>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={cd} barCategoryGap="22%" barGap={2}>
              <XAxis dataKey="label" {...AXIS_STYLE} />
              <YAxis {...Y_$} />
              <ReferenceLine y={0} stroke="#475569" />
              <Tooltip {...TT_STYLE} formatter={ttFmt} />
              <Bar dataKey="longTermDebt" name="Long-Term Debt"  fill="#ef4444" fillOpacity={0.75} maxBarSize={28} radius={[2,2,0,0]} />
              {has('freeCF') && <Bar dataKey="freeCF" name="Free Cash Flow" fill="#14b8a6" fillOpacity={0.75} maxBarSize={28} radius={[2,2,0,0]} />}
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* 12. R&D & SG&A with % of Revenue overlay */}
      {has('rd') && (
        <ChartCard title="R&D & SG&A Spending" legend={[{color:'#8b5cf6',label:'R&D'},{color:'#f97316',label:'SG&A'},{color:'#8b5cf6',label:'R&D % Rev',dash:true},{color:'#f97316',label:'SG&A % Rev',dash:true}]}>
          <ResponsiveContainer width="100%" height={210}>
            <ComposedChart data={cd}>
              <XAxis dataKey="label" {...AXIS_STYLE} />
              <YAxis yAxisId="abs" {...Y_$} />
              <YAxis yAxisId="pct" orientation="right" {...Y_PCT} />
              <ReferenceLine y={0} stroke="#475569" yAxisId="abs" />
              <Tooltip {...TT_STYLE} formatter={ttFmt} />
              <Bar yAxisId="abs" dataKey="rd"    name="R&D"      fill="#8b5cf6" fillOpacity={0.85} maxBarSize={24} radius={[2,2,0,0]} />
              <Bar yAxisId="abs" dataKey="sga"   name="SG&A"     fill="#f97316" fillOpacity={0.70} maxBarSize={24} radius={[2,2,0,0]} />
              <Line yAxisId="pct" type="monotone" dataKey="rdPct"  name="R&D % Rev"  stroke="#8b5cf6" dot={false} strokeWidth={1.5} strokeDasharray="3 2" connectNulls />
              <Line yAxisId="pct" type="monotone" dataKey="sgaPct" name="SG&A % Rev" stroke="#f97316" dot={false} strokeWidth={1.5} strokeDasharray="3 2" connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* 13. FCF Growth */}
      {has('fcfGrowth') && (
        <ChartCard title="FCF Growth YoY %" legend={[{color:'#14b8a6',label:'FCF Growth (pos)'},{color:'#ef4444',label:'FCF Growth (neg)'}]}>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={cd} barCategoryGap="28%">
              <XAxis dataKey="label" {...AXIS_STYLE} />
              <YAxis {...Y_PCT} />
              <ReferenceLine y={0} stroke="#475569" />
              <Tooltip {...TT_STYLE} formatter={ttFmt} />
              <Bar dataKey="fcfGrowth" name="FCF Growth %" maxBarSize={36} radius={[2,2,0,0]}>
                {cd.map((d, i) => <Cell key={i} fill={(d.fcfGrowth ?? 0) >= 0 ? '#14b8a6' : '#ef4444'} fillOpacity={0.85} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* 14. EBITDA trend */}
      {has('ebitda') && (
        <ChartCard title="EBITDA" legend={[{color:'#eab308',label:'EBITDA'},{color:'#3b82f6',label:'Operating Income',line:true}]}>
          <ResponsiveContainer width="100%" height={210}>
            <ComposedChart data={cd}>
              <XAxis dataKey="label" {...AXIS_STYLE} />
              <YAxis {...Y_$} />
              <ReferenceLine y={0} stroke="#475569" />
              <Tooltip {...TT_STYLE} formatter={ttFmt} />
              <Bar dataKey="ebitda"          name="EBITDA"      fill="#eab308" fillOpacity={0.80} maxBarSize={28} radius={[2,2,0,0]} />
              <Line type="monotone" dataKey="operatingIncome" name="Operating Income" stroke="#3b82f6" dot={false} strokeWidth={2} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

    </div>
  )
}

// ── Main Component ────────────────────────────────────────────
export default function Financials({ investments, preloadSymbol }) {
  const open = investments.filter(i => i.status === 'open')
  const [selected, setSelected]     = useState(preloadSymbol || open[0]?.symbol || '')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)
  const [freq, setFreq]             = useState('annual')
  const [section, setSection]       = useState('income')
  const [input, setInput]           = useState('')
  const [extraSymbols, setExtraSymbols] = useState([])
  const [showPaste, setShowPaste]   = useState(false)

  const apiKey = localStorage.getItem('bt_av_key') || ''

  // Persist fetched data in localStorage so page refreshes don't cost API calls
  const CACHE_KEY = 'bt_financials_cache'
  const TS_KEY    = 'bt_financials_ts'
  const [cache, setCache] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}')
      // Pre-seed MSFT mock data so the tab is usable without an API key
      if (!stored['MSFT']) stored['MSFT'] = MOCK_FINANCIALS
      return stored
    } catch { return { MSFT: MOCK_FINANCIALS } }
  })
  const [timestamps, setTimestamps] = useState(() => {
    try { return JSON.parse(localStorage.getItem(TS_KEY) || '{}') } catch { return {} }
  })

  function updateCache(sym, result) {
    const next = { ...cache, [sym]: result }
    setCache(next)
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(next)) } catch {}
    const ts = { ...timestamps, [sym]: Date.now() }
    setTimestamps(ts)
    try { localStorage.setItem(TS_KEY, JSON.stringify(ts)) } catch {}
    saveSharedCache(sym, result)
  }

  // Merge shared Supabase cache into local state on mount (fills gaps for tickers fetched by other users)
  useEffect(() => {
    getAllSharedCache().then(shared => {
      if (!shared || Object.keys(shared).length === 0) return
      setCache(prev => {
        const merged = { ...shared, ...prev } // local wins if both exist
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(merged)) } catch {}
        return merged
      })
    })
  }, []) // eslint-disable-line

  // Merge pasted data into existing cache entry by date — never wipes previously pasted fields
  function mergePasteCache(sym, pasted) {
    const existing = cache[sym]
    if (!existing) { updateCache(sym, pasted); return }

    function mergePeriods(existArr, newArr) {
      const byDate = {}
      for (const p of (existArr || [])) byDate[p.date] = { ...p }
      for (const p of (newArr   || [])) {
        if (byDate[p.date]) {
          // merge: new fields overwrite only if non-null
          for (const [k, v] of Object.entries(p))
            if (v != null) byDate[p.date][k] = v
        } else {
          byDate[p.date] = { ...p }
        }
      }
      // after merge, re-derive freeCF for any period that now has both operatingCF and capex
      return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date)).map(p => {
        if (p.freeCF == null && p.operatingCF != null && p.capex != null)
          p.freeCF = p.operatingCF + p.capex
        return p
      })
    }

    const merged = {
      annual:    mergePeriods(existing.annual,    pasted.annual),
      quarterly: mergePeriods(existing.quarterly, pasted.quarterly),
      extraRows: [...(existing.extraRows || []), ...(pasted.extraRows || [])
        .filter(r => !(existing.extraRows || []).some(e => e.key === r.key))],
    }
    updateCache(sym, merged)
  }

  function fmtAge(sym) {
    const ts = timestamps[sym]
    if (!ts) return null
    const mins = Math.floor((Date.now() - ts) / 60000)
    if (mins < 1)   return 'just now'
    if (mins < 60)  return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24)   return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  const load = useCallback(async (sym) => {
    if (!apiKey) { setError('no_key'); return }
    if (cache[sym]) return
    setLoading(true)
    setError(null)
    try {
      const result = await fetchFinancials(sym, apiKey)
      updateCache(sym, result)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }, [apiKey, cache])  // eslint-disable-line

  const reload = useCallback(async (sym) => {
    if (!apiKey) return
    setLoading(true)
    setError(null)
    try {
      const result = await fetchFinancials(sym, apiKey)
      updateCache(sym, result)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }, [apiKey])  // eslint-disable-line

  function select(sym) { setSelected(sym) }

  // When a ticker tape click arrives, switch to that symbol
  useEffect(() => {
    if (preloadSymbol) setSelected(preloadSymbol)
  }, [preloadSymbol])


  if (!apiKey || error === 'no_key') {
    return (
      <div className="space-y-4">
        {showPaste && <PasteModal onImport={(sym, data) => { mergePasteCache(sym, data); if (!extraSymbols.includes(sym) && !open.find(i => i.symbol === sym)) setExtraSymbols(prev => [...prev, sym]); select(sym) }} onClose={() => setShowPaste(false)} />}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 text-center space-y-3">
          <KeyRound size={28} className="text-slate-500 mx-auto" />
          <p className="text-slate-300 font-medium">Alpha Vantage API Key Required</p>
          <p className="text-sm text-slate-500">
            Enter your free Alpha Vantage key using the key icon in the header.
            Get one free at <span className="text-blue-400">alphavantage.co</span> — 25 requests/day.
          </p>
          <button onClick={() => setShowPaste(true)}
            className="inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors mx-auto">
            <ClipboardPaste size={14} /> Paste Data Instead
          </button>
        </div>
      </div>
    )
  }

  const d       = cache[selected]
  const periods = d ? (freq === 'annual' ? d.annual : d.quarterly) : []
  const sec     = SECTIONS.find(s => s.id === section)

  return (
    <div className="space-y-4">
      {showPaste && <PasteModal initialSym={selected} onImport={(sym, data) => { updateCache(sym, data); if (!open.find(i => i.symbol === sym) && !extraSymbols.includes(sym)) setExtraSymbols(prev => [...prev, sym]); select(sym) }} onClose={() => setShowPaste(false)} />}
      {/* Search + symbol selector */}
      <div className="flex flex-wrap gap-2 items-center">
        <form onSubmit={e => {
          e.preventDefault()
          const sym = input.trim().toUpperCase()
          if (!sym) return
          if (!open.find(i => i.symbol === sym) && !extraSymbols.includes(sym))
            setExtraSymbols(prev => [...prev, sym])
          select(sym)
          setInput('')
        }} className="flex gap-1.5">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={input}
              onChange={e => setInput(e.target.value.toUpperCase())}
              placeholder="Search ticker…"
              className="bg-slate-800 border border-slate-700 rounded-lg pl-7 pr-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500 placeholder:text-slate-600 font-mono w-32"
            />
          </div>
          <button type="submit" disabled={!input.trim()}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
            Go
          </button>
        </form>

        {open.map(i => (
          <button key={i.symbol} onClick={() => select(i.symbol)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              selected === i.symbol
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 border border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
            }`}>
            {i.symbol}
          </button>
        ))}

        {extraSymbols.map(sym => (
          <div key={sym} className={`flex items-center gap-1 pl-3 pr-1.5 py-1.5 rounded-lg border text-sm font-semibold transition-colors ${
            selected === sym
              ? 'bg-blue-600 border-blue-500 text-white'
              : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
          }`}>
            <button onClick={() => select(sym)}>{sym}</button>
            <button onClick={() => {
              setExtraSymbols(prev => prev.filter(s => s !== sym))
              if (selected === sym) select(open[0]?.symbol || extraSymbols.find(s => s !== sym) || '')
            }} className="ml-0.5 opacity-50 hover:opacity-100">
              <X size={11} />
            </button>
          </div>
        ))}

        {selected && (
          <div className="ml-auto flex items-center gap-2">
            {fmtAge(selected) && (
              <span className="text-[10px] text-slate-600">fetched {fmtAge(selected)}</span>
            )}
            <button onClick={() => setShowPaste(true)}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg">
              <ClipboardPaste size={12} /> Paste
            </button>
            <button onClick={() => reload(selected)} disabled={loading}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg disabled:opacity-50">
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Loading…' : 'Refresh'}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">
          <AlertTriangle size={14} className="shrink-0" /> {error}
        </div>
      )}

      {loading && !d && (
        <div className="text-center py-16 text-slate-500 text-sm animate-pulse">
          Loading financials for {selected}…
        </div>
      )}

      {!loading && selected && !d && KNOWN_ETFS[selected] && (
        <ETFCard sym={selected} />
      )}

      {!loading && selected && !d && !KNOWN_ETFS[selected] && (
        <div className="text-center py-16 space-y-3">
          <p className="text-slate-500 text-sm">No data loaded for <span className="font-mono text-slate-300">{selected}</span>.</p>
          <button onClick={() => reload(selected)}
            className="flex items-center gap-1.5 mx-auto text-xs text-slate-300 bg-slate-700 hover:bg-slate-600 border border-slate-600 px-4 py-2 rounded-lg">
            <RefreshCw size={12} /> Load Financials
          </button>
        </div>
      )}

      {d && !KNOWN_ETFS[selected] && d.annual.length === 0 && d.quarterly.length === 0 && (
        <ETFCard sym={selected} />
      )}

      {d && !(d.annual.length === 0 && d.quarterly.length === 0) && (
        <>
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex bg-slate-700 rounded-lg p-0.5 gap-0.5">
              {[['annual', 'Annual'], ['quarterly', 'Quarterly']].map(([val, label]) => (
                <button key={val} onClick={() => setFreq(val)}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                    freq === val ? 'bg-slate-600 text-slate-100' : 'text-slate-400 hover:text-slate-200'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
            <div className="flex gap-1 flex-wrap">
              {[...SECTIONS, { id: 'charts', label: 'Charts' }].map(s => (
                <button key={s.id} onClick={() => setSection(s.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    section === s.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 border border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                  }`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {section === 'charts' && <ChartsTab periods={periods} />}

          {sec && (
            <div className="bg-slate-800/50 backdrop-blur-md rounded-lg ring-1 ring-white/[0.08] p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">{sec.label}</p>
                {selected === 'MSFT' && !apiKey
                  ? <span className="text-[10px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-1.5 py-0.5 rounded font-semibold">Demo Data</span>
                  : <p className="text-[10px] text-slate-600">Alpha Vantage · 3 calls/symbol</p>
                }
              </div>

              {periods.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <p className="text-slate-400 text-sm">No {freq} data available for {selected}.</p>
                  <p className="text-slate-600 text-xs">
                    Alpha Vantage may not have financial statement data for ETFs or crypto.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-4 mb-3">
                    {sec.chartBars.map(b => (
                      <div key={b.key} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ background: b.color }} />
                        <span className="text-xs text-slate-400">{b.label}</span>
                      </div>
                    ))}
                  </div>
                  <FinChart data={periods} bars={sec.chartBars} />
                  <FinTable data={periods} rows={sec.rows} extraRows={d.extraRows ?? []} />
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
