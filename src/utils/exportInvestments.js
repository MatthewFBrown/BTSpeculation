import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { calcInvestmentPnL } from './investmentCalcs'

// ── Helpers ───────────────────────────────────────────────────
const fmt$ = n =>
  n == null || isNaN(n)
    ? '—'
    : Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })

const fmtN   = n => n == null || n === '' ? '—' : Number(n).toFixed(2)
const fmtPct = n => n == null || isNaN(n) ? '—' : `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`
const fmtDate = s => s || '—'

function buildRow(inv) {
  const pnl = calcInvestmentPnL(inv)
  const shares = parseFloat(inv.shares) || 0
  const strike = parseFloat(inv.strike) || 0
  const isOption = inv.assetType === 'Option'
  const multiplier = isOption ? 100 : 1
  const price = inv.status === 'open'
    ? parseFloat(inv.currentPrice) || null
    : parseFloat(inv.sellPrice) || null
  const marketValue = price != null ? shares * price * multiplier : null
  const collateral  = isOption && strike ? shares * strike * 100 : null

  return {
    Symbol:           inv.symbol || '—',
    Name:             inv.name || '—',
    Sector:           inv.sector || '—',
    Shares:           fmtN(inv.shares),
    Contracts:        fmtN(inv.shares),
    Strike:           strike ? fmt$(strike) : '—',
    'Avg Cost':       fmt$(inv.avgCost),
    'Buy Date':       fmtDate(inv.buyDate),
    'Current Price':  fmt$(inv.currentPrice),
    'Sell Price':     fmt$(inv.sellPrice),
    'Sell Date':      fmtDate(inv.sellDate),
    'Market Value':   fmt$(marketValue),
    Collateral:       collateral != null ? fmt$(collateral) : '—',
    'Unrealized P&L': pnl.unrealized != null ? fmt$(pnl.unrealized) : '—',
    'Realized P&L':   pnl.realized   != null ? fmt$(pnl.realized)   : '—',
    'Return %':       fmtPct(pnl.returnPct),
    'Stop Loss':      (parseFloat(inv.stopLoss)  || 0) === 0 ? '—' : fmt$(inv.stopLoss),
    'Target Price':   (parseFloat(inv.targetPrice) || 0) === 0 ? '—' : fmt$(inv.targetPrice),
    Notes:            inv.notes || '—',
  }
}

const OPEN_COLS = [
  'Symbol', 'Name', 'Sector', 'Shares', 'Avg Cost', 'Buy Date',
  'Current Price', 'Market Value', 'Unrealized P&L', 'Return %',
  'Stop Loss', 'Target Price', 'Notes',
]
const OPEN_OPTION_COLS = [
  'Symbol', 'Name', 'Sector', 'Contracts', 'Strike', 'Avg Cost', 'Buy Date',
  'Current Price', 'Collateral', 'Notes',
]
const CLOSED_COLS = [
  'Symbol', 'Name', 'Sector', 'Shares', 'Avg Cost', 'Buy Date',
  'Sell Price', 'Sell Date', 'Market Value', 'Realized P&L', 'Return %',
  'Stop Loss', 'Target Price', 'Notes',
]

const COL_WIDTHS = {
  'Symbol': 8, 'Name': 20, 'Sector': 22, 'Shares': 8, 'Contracts': 9,
  'Strike': 10, 'Avg Cost': 10, 'Buy Date': 11, 'Current Price': 13,
  'Sell Price': 10, 'Sell Date': 10, 'Market Value': 13, 'Collateral': 13,
  'Unrealized P&L': 14, 'Realized P&L': 12, 'Return %': 9,
  'Stop Loss': 10, 'Target Price': 12, 'Notes': 30,
}

function groupByType(investments) {
  const order = ['Stock', 'ETF', 'Option', 'Crypto', 'Bond', 'Other']
  const groups = {}
  investments.forEach(inv => {
    const t = inv.assetType || 'Other'
    if (!groups[t]) groups[t] = []
    groups[t].push(inv)
  })
  return order.filter(t => groups[t]).map(t => ({ type: t, items: groups[t] }))
}

// ── PDF Export ────────────────────────────────────────────────
export function exportPDF(investments, accountName, cash = 0) {
  const open   = investments.filter(i => i.status === 'open')
  const closed = investments.filter(i => i.status === 'closed')
  const doc    = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })

  const date   = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const BLUE   = [59, 130, 246]
  const GREEN  = [52, 211, 153]
  const AMBER  = [245, 158, 11]
  const PURPLE = [139, 92, 246]
  const GRAY   = [100, 116, 139]
  const DARK   = [15, 23, 42]
  const pw     = doc.internal.pageSize.width
  const ph     = doc.internal.pageSize.height

  // ── Derived totals ──
  const totalUnrealized = open.reduce((s, i) => s + (calcInvestmentPnL(i).unrealized ?? 0), 0)
  const totalRealized   = closed.reduce((s, i) => s + (calcInvestmentPnL(i).realized ?? 0), 0)
  const totalPnL        = totalUnrealized + totalRealized
  const totalMktValue   = open.reduce((s, i) => {
    const shares = parseFloat(i.shares) || 0
    const price  = parseFloat(i.currentPrice) || 0
    const mult   = i.assetType === 'Option' ? 100 : 1
    return s + shares * price * mult
  }, 0)
  const totalCost = open.reduce((s, i) => {
    const shares = parseFloat(i.shares) || 0
    const cost   = parseFloat(i.avgCost) || 0
    const mult   = i.assetType === 'Option' ? 100 : 1
    return s + shares * cost * mult
  }, 0)
  const openReturn = totalCost > 0 ? ((totalMktValue - totalCost) / totalCost) * 100 : null
  const cspCollateral = open.reduce((s, i) => {
    if (i.assetType !== 'Option' || i.optionType !== 'put' || i.optionDirection !== 'short') return s
    return s + (parseFloat(i.strike) || 0) * (parseFloat(i.shares) || 0) * 100
  }, 0)
  const openStockCost = open
    .filter(i => i.assetType !== 'Option')
    .reduce((s, i) => s + (parseFloat(i.shares) || 0) * (parseFloat(i.avgCost) || 0), 0)
  const availableCash  = (parseFloat(cash) || 0) - openStockCost - cspCollateral + totalRealized
  const totalPortfolio = totalMktValue + availableCash + cspCollateral

  const wins    = closed.filter(i => (calcInvestmentPnL(i).realized ?? 0) >= 0).length
  const winRate = closed.length > 0 ? (wins / closed.length) * 100 : null

  // ── Header bar ──
  doc.setFillColor(...DARK)
  doc.rect(0, 0, pw, 52, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.setTextColor(248, 250, 252)
  doc.text('Investment Portfolio', 36, 32)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...GRAY)
  doc.text(`Generated ${date}`, 36, 45)
  if (accountName) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8)
    doc.setTextColor(71, 85, 105)
    doc.text(accountName, pw - 36, 32, { align: 'right' })
  }

  // ── Summary card ──
  const cardX = 36, cardY = 62, cardW = pw - 72, cardH = 70
  doc.setFillColor(241, 245, 249)
  doc.roundedRect(cardX, cardY, cardW, cardH, 4, 4, 'F')
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.5)
  doc.roundedRect(cardX, cardY, cardW, cardH, 4, 4, 'S')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...GRAY)
  doc.text('PORTFOLIO SUMMARY', cardX + 12, cardY + 13)

  const metrics = [
    { label: 'Portfolio Value', value: fmt$(totalPortfolio) },
    { label: 'Available Cash',  value: fmt$(availableCash) },
    { label: 'Unrealized P&L', value: fmt$(totalUnrealized), color: totalUnrealized >= 0 ? [5, 150, 105] : [220, 38, 38] },
    { label: 'Realized P&L',   value: fmt$(totalRealized),   color: totalRealized   >= 0 ? [5, 150, 105] : [220, 38, 38] },
    { label: 'Total P&L',      value: fmt$(totalPnL),        color: totalPnL        >= 0 ? [5, 150, 105] : [220, 38, 38] },
    { label: 'Win Rate',        value: winRate != null ? `${winRate.toFixed(0)}%` : '—', color: [59, 130, 246] },
    { label: 'Open Return',     value: fmtPct(openReturn),   color: openReturn == null ? null : openReturn >= 0 ? [5, 150, 105] : [220, 38, 38] },
  ]

  const colW = cardW / metrics.length
  metrics.forEach(({ label, value, color }, i) => {
    const x = cardX + i * colW + 12
    if (i > 0) {
      doc.setDrawColor(226, 232, 240)
      doc.setLineWidth(0.5)
      doc.line(cardX + i * colW, cardY + 18, cardX + i * colW, cardY + cardH - 8)
    }
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...GRAY)
    doc.text(label, x, cardY + 28)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...(color ?? [30, 41, 59]))
    doc.text(value, x, cardY + 46)
  })

  let y = cardY + cardH + 14

  // ── Helpers ──
  function sectionHeader(label, color) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...color)
    doc.text(label.toUpperCase(), 36, y + 12)
    doc.setDrawColor(...color)
    doc.setLineWidth(1)
    doc.line(36, y + 15, pw - 36, y + 15)
    y += 22
  }

  function typeSubHeader(label, count) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(71, 85, 105)
    doc.text(`${label.toUpperCase()}  ·  ${count} position${count !== 1 ? 's' : ''}`, 40, y + 9)
    y += 14
  }

  function drawTable(rows, cols, headerColor) {
    if (!rows.length) return
    autoTable(doc, {
      startY: y,
      head: [cols],
      body: rows.map(r => cols.map(c => r[c])),
      margin: { left: 36, right: 36 },
      styles: { fontSize: 7, cellPadding: 3, textColor: [30, 41, 59], lineColor: [226, 232, 240], lineWidth: 0.3 },
      headStyles: { fillColor: headerColor, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 38 },
        1: { cellWidth: 58 },
        [cols.length - 1]: { cellWidth: 68 },
      },
      didParseCell(data) {
        if (data.section === 'body') {
          const val = data.cell.raw
          if (typeof val === 'string') {
            if (val.startsWith('+')) data.cell.styles.textColor = [5, 150, 105]
            if (val.startsWith('-') && (val.startsWith('-$') || val.includes('%'))) data.cell.styles.textColor = [220, 38, 38]
          }
        }
      },
    })
    y = doc.lastAutoTable.finalY + 14
  }

  function drawGrouped(invs, colsForType, headerColor) {
    const groups = groupByType(invs)
    if (groups.length === 0) {
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(8)
      doc.setTextColor(...GRAY)
      doc.text('No positions.', 40, y + 10)
      y += 20
      return
    }
    groups.forEach(({ type, items }) => {
      const cols = typeof colsForType === 'function' ? colsForType(type) : colsForType
      typeSubHeader(type, items.length)
      drawTable(items.map(buildRow), cols, headerColor)
    })
  }

  // ── Open section ──
  sectionHeader('Open Positions', BLUE)
  drawGrouped(open, type => type === 'Option' ? OPEN_OPTION_COLS : OPEN_COLS, [37, 99, 235])

  // ── Closed section ──
  sectionHeader('Closed Positions', GREEN)
  drawGrouped(closed, CLOSED_COLS, [4, 120, 87])

  // ══════════════════════════════════════════════════════════════
  // ── Page 2: Portfolio Analytics ──
  // ══════════════════════════════════════════════════════════════
  if (investments.length > 0) {
    doc.addPage()

    // Header
    doc.setFillColor(...DARK)
    doc.rect(0, 0, pw, 36, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(248, 250, 252)
    doc.text('Investment Portfolio — Analytics', 36, 24)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...GRAY)
    doc.text(date, pw - 36, 24, { align: 'right' })

    const COL_W = (pw - 72 - 20) / 2
    const COL1  = 36
    const COL2  = 36 + COL_W + 20

    // ── Sector exposure (open positions) ──
    const exposureMap = {}
    open.forEach(inv => {
      const sector = inv.sector || 'Unknown'
      const shares = parseFloat(inv.shares) || 0
      const isOption = inv.assetType === 'Option'
      const value = isOption
        ? shares * (parseFloat(inv.strike) || 0) * 100
        : shares * (parseFloat(inv.currentPrice) || 0)
      if (!exposureMap[sector]) exposureMap[sector] = { total: 0, tickers: new Set() }
      exposureMap[sector].total += value
      exposureMap[sector].tickers.add(inv.symbol)
    })

    const exposureItems = Object.entries(exposureMap)
      .map(([sector, v]) => ({ label: sector, total: v.total, tickers: [...v.tickers].join(', ') }))
      .sort((a, b) => b.total - a.total)
    const totalExposure = exposureItems.reduce((s, i) => s + i.total, 0)

    const SECTOR_PALETTE = [
      [59, 130, 246], [52, 211, 153], [245, 158, 11], [239, 68, 68],
      [139, 92, 246], [20, 184, 166], [251, 146, 60], [236, 72, 153],
      [34, 197, 94],  [161, 161, 170],[14, 165, 233], [234, 179, 8],
    ]

    // Section title (full-width)
    let ey = 46
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...BLUE)
    doc.text('OPEN POSITION SECTOR EXPOSURE', 36, ey + 10)
    doc.setDrawColor(...BLUE)
    doc.setLineWidth(0.7)
    doc.line(36, ey + 13, pw - 36, ey + 13)
    ey += 20

    if (exposureItems.length === 0) {
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(7)
      doc.setTextColor(...GRAY)
      doc.text('No open positions.', 36, ey + 10)
      ey += 20
    } else {
      const PIE_R  = 52
      const PIE_CX = 36 + PIE_R + 4
      const PIE_CY = ey + PIE_R + 6

      // Pie slices
      let angle = -Math.PI / 2
      exposureItems.forEach((item, idx) => {
        const pct = totalExposure > 0 ? item.total / totalExposure : 0
        if (pct <= 0) return
        const sliceAngle = pct * 2 * Math.PI
        const color = SECTOR_PALETTE[idx % SECTOR_PALETTE.length]
        const steps = Math.max(3, Math.ceil(72 * pct))
        const pts = [[PIE_CX, PIE_CY]]
        for (let i = 0; i <= steps; i++) {
          const a = angle + sliceAngle * (i / steps)
          pts.push([PIE_CX + PIE_R * Math.cos(a), PIE_CY + PIE_R * Math.sin(a)])
        }
        const lines = []
        for (let i = 1; i < pts.length; i++) {
          lines.push([pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]])
        }
        doc.setFillColor(...color)
        doc.setDrawColor(255, 255, 255)
        doc.setLineWidth(0.8)
        doc.lines(lines, pts[0][0], pts[0][1], [1, 1], 'FD', true)
        angle += sliceAngle
      })

      // Donut hole
      doc.setFillColor(255, 255, 255)
      doc.circle(PIE_CX, PIE_CY, PIE_R * 0.42, 'F')

      // Legend
      const LEG_X  = PIE_CX + PIE_R + 18
      const LEG_W  = pw - 36 - LEG_X
      const BAR_W  = LEG_W - 110 - 38 - 70 - 12
      const ITEM_H = 14
      let ly = ey + 4

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6)
      doc.setTextColor(...GRAY)
      doc.text('% of Exposure', LEG_X + 110 + BAR_W + 6, ly + 7)
      doc.text('Tickers',       LEG_X + 110 + BAR_W + 44, ly + 7)
      ly += 10

      exposureItems.forEach((item, idx) => {
        const pct      = totalExposure > 0 ? (item.total / totalExposure) * 100 : 0
        const color    = SECTOR_PALETTE[idx % SECTOR_PALETTE.length]
        const barFillW = Math.max(2, (pct / 100) * BAR_W)

        doc.setFillColor(...color)
        doc.roundedRect(LEG_X, ly + 3, 7, 7, 1, 1, 'F')

        const fs = item.label.length > 18 ? 5.5 : 6.5
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(fs)
        doc.setTextColor(71, 85, 105)
        doc.text(item.label, LEG_X + 10, ly + ITEM_H - 2)

        doc.setFillColor(226, 232, 240)
        doc.roundedRect(LEG_X + 110, ly + 3, BAR_W, ITEM_H - 7, 1, 1, 'F')
        doc.setFillColor(...color)
        doc.roundedRect(LEG_X + 110, ly + 3, barFillW, ITEM_H - 7, 1, 1, 'F')

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(6.5)
        doc.setTextColor(...color)
        doc.text(`${pct.toFixed(1)}%`, LEG_X + 110 + BAR_W + 6, ly + ITEM_H - 2)

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(6)
        doc.setTextColor(...GRAY)
        doc.text(item.tickers, LEG_X + 110 + BAR_W + 44, ly + ITEM_H - 2)

        ly += ITEM_H
      })

      // ── 2×2 Analytics grid ──
      const gridStartY = Math.max(PIE_CY + PIE_R + 16, ly + 16)

      // Group closed positions by a key
      function groupClosed(keyFn) {
        const map = {}
        closed.forEach(inv => {
          const k = keyFn(inv) || 'Other'
          const pnl = calcInvestmentPnL(inv).realized ?? 0
          if (!map[k]) map[k] = { count: 0, wins: 0, pnl: 0 }
          map[k].count++
          if (pnl >= 0) map[k].wins++
          map[k].pnl += pnl
        })
        return Object.entries(map)
          .map(([label, v]) => ({ label, count: v.count, wins: v.wins, pnl: v.pnl, winRate: v.count ? (v.wins / v.count) * 100 : 0 }))
          .sort((a, b) => b.pnl - a.pnl)
          .slice(0, 8)
      }

      // Group open positions unrealized P&L by sector
      function groupOpenSector() {
        const map = {}
        open.forEach(inv => {
          const k = inv.sector || 'Unknown'
          const pnl = calcInvestmentPnL(inv).unrealized ?? 0
          if (!map[k]) map[k] = { count: 0, wins: 0, pnl: 0 }
          map[k].count++
          if (pnl >= 0) map[k].wins++
          map[k].pnl += pnl
        })
        return Object.entries(map)
          .map(([label, v]) => ({ label, count: v.count, wins: v.wins, pnl: v.pnl, winRate: v.count ? (v.wins / v.count) * 100 : 0 }))
          .sort((a, b) => b.pnl - a.pnl)
          .slice(0, 8)
      }

      const sectorItems    = groupClosed(inv => inv.sector)
      const assetItems     = groupClosed(inv => inv.assetType)
      const tickerItems    = groupClosed(inv => inv.symbol)
      const openSectorItems = groupOpenSector()

      function drawAnalyticsSection(title, items, colX, startY, color) {
        let sy = startY
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7.5)
        doc.setTextColor(...color)
        doc.text(title.toUpperCase(), colX, sy + 10)
        doc.setDrawColor(...color)
        doc.setLineWidth(0.7)
        doc.line(colX, sy + 13, colX + COL_W, sy + 13)
        sy += 20

        if (!items.length) {
          doc.setFont('helvetica', 'italic')
          doc.setFontSize(7)
          doc.setTextColor(...GRAY)
          doc.text('No data.', colX, sy + 10)
          return startY + 50
        }

        const LABEL_W = 95
        const VALUE_W = 54
        const WIN_W   = 26
        const B_W     = COL_W - LABEL_W - VALUE_W - WIN_W - 6
        const ITEM_H  = 16
        const maxAbs  = Math.max(...items.map(i => Math.abs(i.pnl)), 0.001)

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(6)
        doc.setTextColor(...GRAY)
        doc.text('Win%', colX + LABEL_W + B_W + VALUE_W + 4, sy + 7)
        sy += 10

        items.forEach(item => {
          const barPct   = Math.abs(item.pnl) / maxAbs
          const barFillW = Math.max(2, barPct * B_W)
          const isNeg    = item.pnl < 0

          const fontSize = item.label.length > 16 ? 5.8 : 6.5
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(fontSize)
          doc.setTextColor(71, 85, 105)
          doc.text(item.label, colX, sy + ITEM_H - 3)

          doc.setFillColor(226, 232, 240)
          doc.roundedRect(colX + LABEL_W, sy + 3, B_W, ITEM_H - 7, 1, 1, 'F')
          doc.setFillColor(...(isNeg ? [220, 38, 38] : color))
          doc.roundedRect(colX + LABEL_W, sy + 3, barFillW, ITEM_H - 7, 1, 1, 'F')

          doc.setFont('helvetica', 'bold')
          doc.setFontSize(6.5)
          doc.setTextColor(...(isNeg ? [220, 38, 38] : [30, 41, 59]))
          doc.text(fmt$(item.pnl), colX + LABEL_W + B_W + 4, sy + ITEM_H - 3)

          doc.setFont('helvetica', 'normal')
          doc.setFontSize(6)
          doc.setTextColor(...(item.winRate >= 50 ? [5, 150, 105] : [220, 38, 38]))
          doc.text(`${item.winRate.toFixed(0)}%`, colX + LABEL_W + B_W + VALUE_W + 4, sy + ITEM_H - 3)

          sy += ITEM_H + 1
        })

        const totPnl   = items.reduce((s, i) => s + i.pnl, 0)
        const totCount = items.reduce((s, i) => s + i.count, 0)
        const totWins  = items.reduce((s, i) => s + i.wins, 0)
        doc.setFont('helvetica', 'italic')
        doc.setFontSize(6)
        doc.setTextColor(...GRAY)
        doc.text(
          `${totCount} position${totCount !== 1 ? 's' : ''} · ${totWins}W / ${totCount - totWins}L · ${fmt$(totPnl)} total`,
          colX, sy + 8,
        )
        return sy + 16
      }

      let leftY  = gridStartY
      let rightY = gridStartY

      leftY  = drawAnalyticsSection('Sector P&L (Closed)', sectorItems,     COL1, leftY,  GREEN)
      leftY += 12
      leftY  = drawAnalyticsSection('Asset Type Breakdown', assetItems,     COL1, leftY,  AMBER)

      rightY = drawAnalyticsSection('Ticker Breakdown (Closed)', tickerItems, COL2, rightY, BLUE)
      rightY += 12
      rightY = drawAnalyticsSection('Unrealized P&L by Sector', openSectorItems, COL2, rightY, PURPLE)
    }
  }

  // ── Footer (all pages) ──
  const pageCount = doc.internal.getNumberOfPages()
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...GRAY)
    doc.text('BT Speculation — Confidential', 36, ph - 12)
    doc.text(`Page ${p} of ${pageCount}`, pw - 72, ph - 12)
  }

  doc.save(`portfolio_${new Date().toISOString().slice(0, 10)}.pdf`)
}

// ── Excel Export ──────────────────────────────────────────────
export function exportExcel(investments) {
  const open   = investments.filter(i => i.status === 'open')
  const closed = investments.filter(i => i.status === 'closed')
  const wb     = XLSX.utils.book_new()

  function makeSheet(rows, cols) {
    const data = rows.map(buildRow)
    const ws   = XLSX.utils.json_to_sheet(data, { header: cols })
    ws['!cols'] = cols.map(c => ({ wch: COL_WIDTHS[c] ?? 12 }))
    return ws
  }

  const totalUnrealized = open.reduce((s, i) => s + (calcInvestmentPnL(i).unrealized ?? 0), 0)
  const totalRealized   = closed.reduce((s, i) => s + (calcInvestmentPnL(i).realized ?? 0), 0)
  const summaryData = [
    ['Generated', new Date().toLocaleDateString()],
    [],
    ['Open Positions',   open.length],
    ['Closed Positions', closed.length],
    [],
    ['Unrealized P&L', fmt$(totalUnrealized)],
    ['Realized P&L',   fmt$(totalRealized)],
    ['Total P&L',      fmt$(totalUnrealized + totalRealized)],
  ]
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData)
  wsSummary['!cols'] = [{ wch: 20 }, { wch: 18 }]

  XLSX.utils.book_append_sheet(wb, wsSummary,                       'Summary')
  XLSX.utils.book_append_sheet(wb, makeSheet(open,   OPEN_COLS),   'Open Positions')
  XLSX.utils.book_append_sheet(wb, makeSheet(closed, CLOSED_COLS), 'Closed Positions')

  XLSX.writeFile(wb, `portfolio_${new Date().toISOString().slice(0, 10)}.xlsx`)
}
