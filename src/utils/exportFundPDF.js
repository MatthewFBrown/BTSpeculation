import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ── Helpers ───────────────────────────────────────────────────
const fmt$ = (n) =>
    n == null || isNaN(n)
        ? "—"
        : n.toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
              minimumFractionDigits: 2,
          });

const fmtN = (n) => (n == null || isNaN(n) ? "—" : Number(n).toFixed(2));
const fmtPct = (n) =>
    n == null || isNaN(n) ? "—" : `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
const fmtDate = (s) => s || "—";

function daysBetween(a, b) {
    const d = Math.round((new Date(b) - new Date(a)) / 86400000);
    return d > 0 ? d : null;
}

function tradeCapital(t) {
    if (t.capital > 0) return t.capital;
    if (t.strike > 0 && t.contracts > 0) return t.strike * t.contracts * 100;
    return null;
}

function annReturn(pnl, capital, entry, exit) {
    const dur = daysBetween(entry, exit);
    if (!dur || !capital) return null;
    return (pnl / capital) * (365 / dur) * 100;
}

// ── Main export ───────────────────────────────────────────────
export function exportFundPDF({
    wheelPositions,
    stockPositions,
    tradeLog,
    cash,
    prices,
    sectorMap = {},
}) {
    const doc = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: "a4",
    });
    const pw = doc.internal.pageSize.width;
    const ph = doc.internal.pageSize.height;
    const date = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    const BLUE   = [59, 130, 246];
    const GREEN  = [52, 211, 153];
    const AMBER  = [245, 158, 11];
    const GRAY   = [100, 116, 139];
    const DARK   = [15, 23, 42];
    const PURPLE = [139, 92, 246];

    // ── Derived stats ──
    const stockValue = stockPositions.reduce(
        (s, p) => s + (prices[p.ticker] ?? p.entryPrice) * p.shares,
        0,
    );
    const premiumCollected = wheelPositions.reduce(
        (s, p) => s + p.premium * p.contracts * 100,
        0,
    );
    const closedPnl = tradeLog.reduce((s, t) => s + (t.pnl ?? 0), 0);
    const stockUnrealizedPnl = stockPositions.reduce(
        (s, p) =>
            s + ((prices[p.ticker] ?? p.entryPrice) - p.entryPrice) * p.shares,
        0,
    );
    const unrealizedPnl = premiumCollected + stockUnrealizedPnl;
    const totalValue = stockValue + premiumCollected + (cash ?? 0) + closedPnl;

    const wins = tradeLog.filter((t) => t.result === "win").length;
    const winRate = tradeLog.length > 0 ? (wins / tradeLog.length) * 100 : null;

    const allAnnReturns = [
        ...tradeLog
            .filter((t) => tradeCapital(t) > 0)
            .map((t) => annReturn(t.pnl, tradeCapital(t), t.entry, t.exit))
            .filter((v) => v != null),
        ...wheelPositions
            .map((p) => {
                const dur = p.entry
                    ? Math.max(1, daysBetween(p.entry, p.expiry))
                    : null;
                return dur ? (p.premium / p.strike) * (365 / dur) * 100 : null;
            })
            .filter(Boolean),
    ];
    const avgAnnReturn =
        allAnnReturns.length > 0
            ? allAnnReturns.reduce((s, r) => s + r, 0) / allAnnReturns.length
            : null;

    const stockCostBasis = stockPositions.reduce(
        (s, p) => s + p.shares * p.entryPrice,
        0,
    );
    const startingCapital = (cash ?? 0) + stockCostBasis;
    const totalGains = closedPnl + unrealizedPnl;
    const actualReturnPct =
        startingCapital > 0 ? (totalGains / startingCapital) * 100 : null;

    // ── Header bar ──
    doc.setFillColor(...DARK);
    doc.rect(0, 0, pw, 52, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    doc.setTextColor(248, 250, 252);
    doc.text("MATT Capital", 36, 32);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...GRAY);
    doc.text(`Generated ${date}`, 36, 45);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text("Wheel strategy · Options · Equities", pw - 36, 32, { align: "right" });

    // ── Summary card ──
    const cardX = 36, cardY = 62, cardW = pw - 72, cardH = 70;
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(cardX, cardY, cardW, cardH, 4, 4, "F");
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.roundedRect(cardX, cardY, cardW, cardH, 4, 4, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text("FUND SUMMARY", cardX + 12, cardY + 13);

    const metrics = [
        { label: "Portfolio Value", value: fmt$(totalValue) },
        { label: "Cash", value: fmt$(cash) },
        { label: "Unrealized P&L", value: fmt$(unrealizedPnl), color: unrealizedPnl >= 0 ? [5, 150, 105] : [220, 38, 38] },
        { label: "Realized P&L",   value: fmt$(closedPnl),     color: closedPnl     >= 0 ? [5, 150, 105] : [220, 38, 38] },
        { label: "Actual Return",  value: fmtPct(actualReturnPct), color: actualReturnPct == null ? null : actualReturnPct >= 0 ? [5, 150, 105] : [220, 38, 38] },
        { label: "Avg Ann. Return",value: fmtPct(avgAnnReturn), color: avgAnnReturn == null ? null : avgAnnReturn >= 0 ? [5, 150, 105] : [220, 38, 38] },
        { label: "Win Rate",       value: winRate != null ? `${winRate.toFixed(0)}%` : "—", color: [59, 130, 246] },
    ];

    const colW = cardW / metrics.length;
    metrics.forEach(({ label, value, color }, i) => {
        const x = cardX + i * colW + 12;
        if (i > 0) {
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.5);
            doc.line(cardX + i * colW, cardY + 18, cardX + i * colW, cardY + cardH - 8);
        }
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(...GRAY);
        doc.text(label, x, cardY + 28);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(...(color ?? [30, 41, 59]));
        doc.text(value, x, cardY + 46);
    });

    let y = cardY + cardH + 14;

    // ── Section header ──
    function sectionHeader(label, color) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(...color);
        doc.text(label.toUpperCase(), 36, y + 12);
        doc.setDrawColor(...color);
        doc.setLineWidth(1);
        doc.line(36, y + 15, pw - 36, y + 15);
        y += 22;
    }

    function drawTable(head, body, headerColor) {
        if (!body.length) {
            doc.setFont("helvetica", "italic");
            doc.setFontSize(8);
            doc.setTextColor(...GRAY);
            doc.text("No records.", 40, y + 10);
            y += 20;
            return;
        }
        autoTable(doc, {
            startY: y,
            head: [head],
            body,
            margin: { left: 36, right: 36 },
            styles: { fontSize: 7, cellPadding: 3, textColor: [30, 41, 59], lineColor: [226, 232, 240], lineWidth: 0.3 },
            headStyles: { fillColor: headerColor, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7 },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            columnStyles: { 0: { fontStyle: "bold", cellWidth: 42 } },
            didParseCell(data) {
                if (data.section === "body") {
                    const v = data.cell.raw;
                    if (typeof v === "string") {
                        if (v.startsWith("+")) data.cell.styles.textColor = [5, 150, 105];
                        if (v.startsWith("-") && (v.includes("%") || v.startsWith("-$"))) data.cell.styles.textColor = [220, 38, 38];
                        if (v === "win")  data.cell.styles.textColor = [5, 150, 105];
                        if (v === "loss") data.cell.styles.textColor = [220, 38, 38];
                    }
                }
            },
        });
        y = doc.lastAutoTable.finalY + 14;
    }

    // ── Active Wheel Positions ──
    sectionHeader("Active Option Positions", BLUE);
    const wheelHead = ["Ticker", "Type", "Strike", "Contracts", "Premium", "Entry", "Expiry", "DTE", "Value", "Ann. Return"];
    const wheelBody = wheelPositions.map((p) => {
        const dte = p.expiry ? Math.max(0, Math.ceil((new Date(p.expiry) - new Date()) / 86400000)) : "—";
        const value = p.premium * p.contracts * 100;
        const dur = p.entry ? Math.max(1, daysBetween(p.entry, p.expiry)) : null;
        const ann = dur && p.strike ? fmtPct((p.premium / p.strike) * (365 / dur) * 100) : "—";
        return [p.ticker, p.type || "—", fmt$(p.strike), String(p.contracts ?? "—"), fmt$(p.premium), fmtDate(p.entry), fmtDate(p.expiry), typeof dte === "number" ? `${dte}d` : "—", fmt$(value), ann];
    });
    drawTable(wheelHead, wheelBody, [37, 99, 235]);

    // ── Stock Holdings ──
    sectionHeader("Stock Holdings", AMBER);
    const stockHead = ["Ticker", "Shares", "Entry Price", "Current Price", "Market Value", "P&L", "Return"];
    const stockBody = stockPositions.map((p) => {
        const current = prices[p.ticker] ?? p.entryPrice;
        const mktVal = current * p.shares;
        const pnl = (current - p.entryPrice) * p.shares;
        const ret = p.entryPrice > 0 ? ((current - p.entryPrice) / p.entryPrice) * 100 : null;
        return [p.ticker, fmtN(p.shares), fmt$(p.entryPrice), fmt$(current), fmt$(mktVal), fmt$(pnl), fmtPct(ret)];
    });
    drawTable(stockHead, stockBody, [180, 120, 30]);

    // ── Trade Log ──
    sectionHeader("Trade Log", GREEN);
    const tradeHead = ["Ticker", "Strategy", "Strike", "Contracts", "Avg Price", "Close Price", "Entry", "Exit", "P&L"];
    const tradeBody = tradeLog.map((t) => [
        t.ticker, t.strategy || "—",
        t.strike ? fmt$(t.strike) : "—",
        t.contracts ? String(t.contracts) : "—",
        t.avgPrice   ? fmt$(t.avgPrice)   : "—",
        t.closePrice ? fmt$(t.closePrice) : "—",
        fmtDate(t.entry), fmtDate(t.exit),
        fmt$(t.pnl),
    ]);
    drawTable(tradeHead, tradeBody, [4, 120, 87]);

    // ══════════════════════════════════════════════════════════════
    // ── Page 2: Trade Analytics ──
    // ══════════════════════════════════════════════════════════════
    if (tradeLog.length > 0) {
        doc.addPage();

        // Header
        doc.setFillColor(...DARK);
        doc.rect(0, 0, pw, 36, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.setTextColor(248, 250, 252);
        doc.text("MATT Capital — Trade Analytics", 36, 24);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(...GRAY);
        doc.text(date, pw - 36, 24, { align: "right" });

        const COL_W = (pw - 72 - 20) / 2;
        const COL1  = 36;
        const COL2  = 36 + COL_W + 20;

        // ── Compute breakdowns ──
        const closed = tradeLog.filter((t) => t.exit);

        function groupBy(arr, keyFn) {
            const map = {};
            arr.forEach((t) => {
                const k = keyFn(t) || "Other";
                if (!map[k]) map[k] = { count: 0, wins: 0, pnl: 0 };
                map[k].count++;
                if (t.result === "win") map[k].wins++;
                map[k].pnl += t.pnl ?? 0;
            });
            return Object.entries(map)
                .map(([label, v]) => ({ label, count: v.count, wins: v.wins, pnl: v.pnl, winRate: v.count ? (v.wins / v.count) * 100 : 0 }))
                .sort((a, b) => b.pnl - a.pnl)
                .slice(0, 8);
        }

        const stratItems  = groupBy(closed, (t) => t.strategy);
        const tickerItems = groupBy(closed, (t) => t.ticker);
        const sectorItems = groupBy(closed, (t) => sectorMap[t.ticker] || "Unknown");

        const DTE_BUCKETS = [
            { label: "0–7 DTE",  min: 0,  max: 7 },
            { label: "8–14 DTE", min: 8,  max: 14 },
            { label: "15–21 DTE",min: 15, max: 21 },
            { label: "22+ DTE",  min: 22, max: Infinity },
        ];
        const dteItems = DTE_BUCKETS.map((b) => {
            const group = closed.filter((t) => {
                const dur = daysBetween(t.entry, t.exit);
                return dur != null && dur >= b.min && dur <= b.max;
            });
            const w = group.filter((t) => t.result === "win").length;
            const pnl = group.reduce((s, t) => s + (t.pnl ?? 0), 0);
            return { label: b.label, count: group.length, wins: w, pnl, winRate: group.length ? (w / group.length) * 100 : 0 };
        }).filter((b) => b.count > 0);

        // ── Bar chart section helper ──
        function drawAnalyticsSection(title, items, colX, startY, color) {
            let sy = startY;

            // Title + rule
            doc.setFont("helvetica", "bold");
            doc.setFontSize(7.5);
            doc.setTextColor(...color);
            doc.text(title.toUpperCase(), colX, sy + 10);
            doc.setDrawColor(...color);
            doc.setLineWidth(0.7);
            doc.line(colX, sy + 13, colX + COL_W, sy + 13);
            sy += 20;

            if (!items.length) {
                doc.setFont("helvetica", "italic");
                doc.setFontSize(7);
                doc.setTextColor(...GRAY);
                doc.text("No data.", colX, sy + 10);
                return startY + 50;
            }

            const LABEL_W = 95;
            const VALUE_W = 54;
            const WIN_W   = 26;
            const BAR_W   = COL_W - LABEL_W - VALUE_W - WIN_W - 6;
            const ITEM_H  = 16;
            const maxAbs  = Math.max(...items.map((i) => Math.abs(i.pnl)), 0.001);

            // Column headers
            doc.setFont("helvetica", "normal");
            doc.setFontSize(6);
            doc.setTextColor(...GRAY);
            doc.text("Win%", colX + LABEL_W + BAR_W + VALUE_W + 4, sy + 7);
            sy += 10;

            items.forEach((item) => {
                const barPct   = Math.abs(item.pnl) / maxAbs;
                const barFillW = Math.max(2, barPct * BAR_W);
                const isNeg    = item.pnl < 0;

                // Label — shrink font for longer labels instead of cutting them off
                const fontSize = item.label.length > 16 ? 5.8 : 6.5;
                doc.setFont("helvetica", "normal");
                doc.setFontSize(fontSize);
                doc.setTextColor(71, 85, 105);
                doc.text(item.label, colX, sy + ITEM_H - 3);

                // Bar background
                doc.setFillColor(226, 232, 240);
                doc.roundedRect(colX + LABEL_W, sy + 3, BAR_W, ITEM_H - 7, 1, 1, "F");

                // Bar fill
                doc.setFillColor(...(isNeg ? [220, 38, 38] : color));
                doc.roundedRect(colX + LABEL_W, sy + 3, barFillW, ITEM_H - 7, 1, 1, "F");

                // P&L value
                doc.setFont("helvetica", "bold");
                doc.setFontSize(6.5);
                doc.setTextColor(...(isNeg ? [220, 38, 38] : [30, 41, 59]));
                doc.text(fmt$(item.pnl), colX + LABEL_W + BAR_W + 4, sy + ITEM_H - 3);

                // Win rate
                doc.setFont("helvetica", "normal");
                doc.setFontSize(6);
                const wrColor = item.winRate >= 50 ? [5, 150, 105] : [220, 38, 38];
                doc.setTextColor(...wrColor);
                doc.text(`${item.winRate.toFixed(0)}%`, colX + LABEL_W + BAR_W + VALUE_W + 4, sy + ITEM_H - 3);

                sy += ITEM_H + 1;
            });

            // Summary footer
            const totPnl   = items.reduce((s, i) => s + i.pnl, 0);
            const totCount = items.reduce((s, i) => s + i.count, 0);
            const totWins  = items.reduce((s, i) => s + i.wins, 0);
            doc.setFont("helvetica", "italic");
            doc.setFontSize(6);
            doc.setTextColor(...GRAY);
            doc.text(
                `${totCount} trades · ${totWins}W / ${totCount - totWins}L · ${fmt$(totPnl)} total`,
                colX, sy + 8,
            );

            return sy + 16;
        }

        // ── Open Position Sector Exposure (full-width, first) ──
        // Compute exposure: stocks = market value, wheel = collateral
        const exposureMap = {};
        stockPositions.forEach((p) => {
            const sector = sectorMap[p.ticker] || "Unknown";
            const mktVal = (prices[p.ticker] ?? p.entryPrice) * p.shares;
            if (!exposureMap[sector]) exposureMap[sector] = { total: 0, tickers: new Set() };
            exposureMap[sector].total += mktVal;
            exposureMap[sector].tickers.add(p.ticker);
        });
        wheelPositions.forEach((p) => {
            const sector = sectorMap[p.ticker] || "Unknown";
            const collateral = p.strike * p.contracts * 100;
            if (!exposureMap[sector]) exposureMap[sector] = { total: 0, tickers: new Set() };
            exposureMap[sector].total += collateral;
            exposureMap[sector].tickers.add(p.ticker);
        });

        const exposureItems = Object.entries(exposureMap)
            .map(([sector, v]) => ({ label: sector, total: v.total, tickers: [...v.tickers].join(", ") }))
            .sort((a, b) => b.total - a.total);

        const totalExposure = exposureItems.reduce((s, i) => s + i.total, 0);

        // Distinct palette for sectors
        const SECTOR_PALETTE = [
            [59, 130, 246], [52, 211, 153], [245, 158, 11], [239, 68, 68],
            [139, 92, 246], [20, 184, 166], [251, 146, 60], [236, 72, 153],
            [34, 197, 94],  [161, 161, 170],[14, 165, 233], [234, 179, 8],
        ];

        // Section title
        let ey = 46;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(...BLUE);
        doc.text("OPEN POSITION SECTOR EXPOSURE", 36, ey + 10);
        doc.setDrawColor(...BLUE);
        doc.setLineWidth(0.7);
        doc.line(36, ey + 13, pw - 36, ey + 13);
        ey += 20;

        if (exposureItems.length === 0) {
            doc.setFont("helvetica", "italic");
            doc.setFontSize(7);
            doc.setTextColor(...GRAY);
            doc.text("No open positions.", 36, ey + 10);
        } else {
            // ── Pie chart ──
            const PIE_R  = 52;
            const PIE_CX = 36 + PIE_R + 4;
            const PIE_CY = ey + PIE_R + 6;

            // Draw slices using polygon approximation
            let angle = -Math.PI / 2;
            exposureItems.forEach((item, idx) => {
                const pct = totalExposure > 0 ? item.total / totalExposure : 0;
                if (pct <= 0) return;
                const sliceAngle = pct * 2 * Math.PI;
                const color = SECTOR_PALETTE[idx % SECTOR_PALETTE.length];
                const steps = Math.max(3, Math.ceil(72 * pct));
                const pts = [[PIE_CX, PIE_CY]];
                for (let i = 0; i <= steps; i++) {
                    const a = angle + sliceAngle * (i / steps);
                    pts.push([PIE_CX + PIE_R * Math.cos(a), PIE_CY + PIE_R * Math.sin(a)]);
                }
                const lines = [];
                for (let i = 1; i < pts.length; i++) {
                    lines.push([pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]]);
                }
                doc.setFillColor(...color);
                doc.setDrawColor(255, 255, 255);
                doc.setLineWidth(0.8);
                doc.lines(lines, pts[0][0], pts[0][1], [1, 1], "FD", true);
                angle += sliceAngle;
            });

            // Donut hole
            doc.setFillColor(255, 255, 255);
            doc.circle(PIE_CX, PIE_CY, PIE_R * 0.42, "F");

            // ── Legend (right of pie) ──
            const LEG_X    = PIE_CX + PIE_R + 18;
            const LEG_W    = pw - 36 - LEG_X;
            const BAR_W    = LEG_W - 110 - 38 - 70 - 12; // label + % + tickers + gaps
            const ITEM_H   = 14;
            let ly = ey + 4;

            // Column headers
            doc.setFont("helvetica", "normal");
            doc.setFontSize(6);
            doc.setTextColor(...GRAY);
            doc.text("% of Portfolio", LEG_X + 110 + BAR_W + 6, ly + 7);
            doc.text("Tickers",        LEG_X + 110 + BAR_W + 44, ly + 7);
            ly += 10;

            exposureItems.forEach((item, idx) => {
                const pct   = totalExposure > 0 ? (item.total / totalExposure) * 100 : 0;
                const color = SECTOR_PALETTE[idx % SECTOR_PALETTE.length];
                const barFillW = Math.max(2, (pct / 100) * BAR_W);

                // Color swatch
                doc.setFillColor(...color);
                doc.roundedRect(LEG_X, ly + 3, 7, 7, 1, 1, "F");

                // Label
                const fs = item.label.length > 18 ? 5.5 : 6.5;
                doc.setFont("helvetica", "normal");
                doc.setFontSize(fs);
                doc.setTextColor(71, 85, 105);
                doc.text(item.label, LEG_X + 10, ly + ITEM_H - 2);

                // Bar
                doc.setFillColor(226, 232, 240);
                doc.roundedRect(LEG_X + 110, ly + 3, BAR_W, ITEM_H - 7, 1, 1, "F");
                doc.setFillColor(...color);
                doc.roundedRect(LEG_X + 110, ly + 3, barFillW, ITEM_H - 7, 1, 1, "F");

                // Percent
                doc.setFont("helvetica", "bold");
                doc.setFontSize(6.5);
                doc.setTextColor(...color);
                doc.text(`${pct.toFixed(1)}%`, LEG_X + 110 + BAR_W + 6, ly + ITEM_H - 2);

                // Tickers
                doc.setFont("helvetica", "normal");
                doc.setFontSize(6);
                doc.setTextColor(...GRAY);
                doc.text(item.tickers, LEG_X + 110 + BAR_W + 44, ly + ITEM_H - 2);

                ly += ITEM_H;
            });

            // ── 2×2 Trade Analytics grid below exposure ──
            const gridStartY = Math.max(PIE_CY + PIE_R + 16, ly + 16);
            let leftY  = gridStartY;
            let rightY = gridStartY;

            leftY  = drawAnalyticsSection("Strategy Breakdown", stratItems,  COL1, leftY,  BLUE);
            leftY += 12;
            leftY  = drawAnalyticsSection("DTE Breakdown",      dteItems,    COL1, leftY,  AMBER);

            rightY = drawAnalyticsSection("Ticker Breakdown",   tickerItems, COL2, rightY, GREEN);
            rightY += 12;
            rightY = drawAnalyticsSection("Sector P&L (closed trades)", sectorItems, COL2, rightY, PURPLE);
        }
    }

    // ── Footer (all pages) ──
    const pageCount = doc.internal.getNumberOfPages();
    for (let p = 1; p <= pageCount; p++) {
        doc.setPage(p);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(...GRAY);
        doc.text("MATT Capital — Confidential", 36, ph - 12);
        doc.text(`Page ${p} of ${pageCount}`, pw - 72, ph - 12);
    }

    doc.save(`matt_capital_${new Date().toISOString().slice(0, 10)}.pdf`);
}
