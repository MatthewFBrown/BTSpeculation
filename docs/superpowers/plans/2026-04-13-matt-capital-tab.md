# MATT Capital Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a gated "MATT Capital" top-level tab showing a public-facing fund view with live stock prices, hardcoded wheel/stock positions, and a trade log.

**Architecture:** A new `section === 'fund'` branch in App.jsx renders a self-contained `MattCapital` component. Hardcoded data lives in `src/utils/mattCapitalData.js`. Live prices are fetched via the existing Finnhub `fetchStock` pattern. Access is gated by a passcode stored in localStorage, entered via the existing API Keys modal.

**Tech Stack:** React, Tailwind CSS v3, Finnhub REST API, localStorage

---

## File Map

| File                                  | Action     | Purpose                                                         |
| ------------------------------------- | ---------- | --------------------------------------------------------------- |
| `src/utils/mattCapitalData.js`        | **Create** | Hardcoded positions, trade log, access code constant            |
| `src/components/fund/MattCapital.jsx` | **Create** | Full fund view component (header, wheel, stocks, log)           |
| `src/App.jsx`                         | **Modify** | Fund code state, API keys modal field, nav tabs, section render |

---

## Task 1: JSON data file in /public

Trade data lives in `public/mattcapital.json`. To add/edit trades, just update this file and refresh — no code changes or rebuild needed. The access code constant stays in a tiny JS file since it needs to be compared at runtime without being served publicly.

**Files:**

- Create: `public/mattcapital.json`
- Create: `src/utils/mattCapitalData.js` (access code only)

- [ ] **Step 1: Create the JSON data file**

```json
{
    "wheelPositions": [
        {
            "ticker": "AAPL",
            "type": "CSP",
            "strike": 170,
            "expiry": "2025-05-16",
            "premium": 2.5,
            "contracts": 1
        },
        {
            "ticker": "TSLA",
            "type": "CC",
            "strike": 250,
            "expiry": "2025-05-16",
            "premium": 3.8,
            "contracts": 2
        }
    ],
    "stockPositions": [
        { "ticker": "AAPL", "shares": 100, "entryPrice": 165.0 },
        { "ticker": "MSFT", "shares": 50, "entryPrice": 370.0 }
    ],
    "tradeLog": [
        {
            "ticker": "AAPL",
            "strategy": "CSP",
            "entry": "2025-01-10",
            "exit": "2025-01-24",
            "pnl": 250,
            "result": "win"
        },
        {
            "ticker": "MSFT",
            "strategy": "CSP",
            "entry": "2025-01-15",
            "exit": "2025-02-21",
            "pnl": 180,
            "result": "win"
        },
        {
            "ticker": "TSLA",
            "strategy": "CC",
            "entry": "2025-02-03",
            "exit": "2025-02-28",
            "pnl": -120,
            "result": "loss"
        },
        {
            "ticker": "AAPL",
            "strategy": "CC",
            "entry": "2025-02-10",
            "exit": "2025-03-07",
            "pnl": 340,
            "result": "win"
        }
    ]
}
```

- [ ] **Step 2: Create the access code file**

```js
// src/utils/mattCapitalData.js
// Change this before deploying — anyone who knows this code can view the fund
export const FUND_ACCESS_CODE = "MATTCAP";
```

- [ ] **Step 3: Commit**

```bash
git add public/mattcapital.json src/utils/mattCapitalData.js
git commit -m "feat: add MATT Capital JSON data file and access code"
```

---

## Task 2: MattCapital component

**Files:**

- Create: `src/components/fund/MattCapital.jsx`

- [ ] **Step 1: Create the component**

```jsx
// src/components/fund/MattCapital.jsx
import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import {
    WHEEL_POSITIONS,
    STOCK_POSITIONS,
    TRADE_LOG,
} from "../../utils/mattCapitalData";

async function fetchPrice(symbol, apiKey) {
    const res = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.c || null;
}

function fmt$(n) {
    if (n == null || isNaN(n)) return "—";
    return n.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
    });
}

function fmtPct(n) {
    if (n == null || isNaN(n)) return "—";
    return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function daysToExpiry(expiryStr) {
    const diff = new Date(expiryStr) - new Date();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default function MattCapital() {
    const apiKey = localStorage.getItem("bt_finnhub_key") || "";
    const [prices, setPrices] = useState({}); // { AAPL: 182.50, ... }
    const [loading, setLoading] = useState(false);

    // Collect all unique tickers that need live prices
    const tickers = [
        ...new Set([
            ...STOCK_POSITIONS.map((p) => p.ticker),
            ...WHEEL_POSITIONS.map((p) => p.ticker),
        ]),
    ];

    async function loadPrices() {
        if (!apiKey) return;
        setLoading(true);
        const result = {};
        for (const sym of tickers) {
            const price = await fetchPrice(sym, apiKey);
            if (price) result[sym] = price;
            await new Promise((r) => setTimeout(r, 150)); // rate limit
        }
        setPrices(result);
        setLoading(false);
    }

    useEffect(() => {
        loadPrices();
    }, []); // eslint-disable-line

    // ── Derived fund stats ──────────────────────────────────────────
    const stockValue = STOCK_POSITIONS.reduce((sum, p) => {
        const price = prices[p.ticker] ?? p.entryPrice;
        return sum + price * p.shares;
    }, 0);

    const stockCost = STOCK_POSITIONS.reduce(
        (sum, p) => sum + p.entryPrice * p.shares,
        0,
    );

    const premiumCollected = WHEEL_POSITIONS.reduce(
        (sum, p) => sum + p.premium * p.contracts * 100,
        0,
    );

    const closedPnl = TRADE_LOG.reduce((sum, t) => sum + t.pnl, 0);

    const totalValue = stockValue + premiumCollected;
    const totalCost = stockCost;
    const totalPnl = stockValue - stockCost + premiumCollected + closedPnl;
    const totalPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

    const wins = TRADE_LOG.filter((t) => t.result === "win").length;
    const winRate = TRADE_LOG.length > 0 ? (wins / TRADE_LOG.length) * 100 : 0;

    // ── Render ──────────────────────────────────────────────────────
    return (
        <div className="space-y-6">
            {/* Fund Header Card */}
            <div className="bg-slate-800/70 backdrop-blur-sm rounded-xl ring-1 ring-white/[0.06] p-6">
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
                            MATT Capital
                        </h1>
                        <p className="text-sm text-slate-400 mt-1">
                            Wheel strategy · Options · Equities
                        </p>
                    </div>
                    <button
                        onClick={loadPrices}
                        disabled={loading || !apiKey}
                        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-700 border border-slate-600 px-3 py-1.5 rounded-lg disabled:opacity-40 transition-colors"
                    >
                        <RefreshCw
                            size={12}
                            className={loading ? "animate-spin" : ""}
                        />
                        {loading ? "Refreshing…" : "Refresh"}
                    </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                    {[
                        {
                            label: "Portfolio Value",
                            value: fmt$(totalValue),
                            color: "text-slate-100",
                        },
                        {
                            label: "Total P&L",
                            value: fmt$(totalPnl),
                            color:
                                totalPnl >= 0
                                    ? "text-emerald-400"
                                    : "text-red-400",
                        },
                        {
                            label: "Total Return",
                            value: fmtPct(totalPct),
                            color:
                                totalPct >= 0
                                    ? "text-emerald-400"
                                    : "text-red-400",
                        },
                        {
                            label: "Wheel Win Rate",
                            value: `${winRate.toFixed(0)}%`,
                            color: "text-blue-400",
                        },
                    ].map(({ label, value, color }) => (
                        <div key={label}>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 mb-1">
                                {label}
                            </p>
                            <p
                                className={`text-xl font-bold tabular-nums ${color}`}
                            >
                                {value}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Wheel Positions */}
            <div className="bg-slate-800/70 backdrop-blur-sm rounded-xl ring-1 ring-white/[0.06] overflow-hidden">
                <div className="px-5 py-4 border-b border-white/[0.05]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Active Option Positions
                    </p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/[0.05]">
                                {[
                                    "Ticker",
                                    "Type",
                                    "Strike",
                                    "Expiry",
                                    "DTE",
                                    "Contracts",
                                    "Premium",
                                    "Stock Price",
                                    "Value",
                                ].map((h) => (
                                    <th
                                        key={h}
                                        className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 whitespace-nowrap"
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {WHEEL_POSITIONS.map((p, i) => {
                                const dte = daysToExpiry(p.expiry);
                                const currentPrice = prices[p.ticker];
                                const posValue = p.premium * p.contracts * 100;
                                return (
                                    <tr
                                        key={i}
                                        className="border-b border-white/[0.03] hover:bg-white/[0.02]"
                                    >
                                        <td className="px-4 py-3 font-bold text-slate-100">
                                            {p.ticker}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.type === "CSP" ? "bg-blue-500/20 text-blue-400" : "bg-purple-500/20 text-purple-400"}`}
                                            >
                                                {p.type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 tabular-nums text-slate-200">
                                            {fmt$(p.strike)}
                                        </td>
                                        <td className="px-4 py-3 text-slate-400 text-xs">
                                            {p.expiry}
                                        </td>
                                        <td
                                            className={`px-4 py-3 font-semibold tabular-nums ${dte <= 7 ? "text-red-400" : dte <= 21 ? "text-yellow-400" : "text-slate-300"}`}
                                        >
                                            {dte}d
                                        </td>
                                        <td className="px-4 py-3 tabular-nums text-slate-300">
                                            {p.contracts}
                                        </td>
                                        <td className="px-4 py-3 tabular-nums text-emerald-400">
                                            {fmt$(p.premium)}
                                        </td>
                                        <td className="px-4 py-3 tabular-nums text-slate-200">
                                            {currentPrice
                                                ? fmt$(currentPrice)
                                                : "—"}
                                        </td>
                                        <td className="px-4 py-3 tabular-nums font-semibold text-emerald-400">
                                            {fmt$(posValue)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Stock Positions */}
            <div className="bg-slate-800/70 backdrop-blur-sm rounded-xl ring-1 ring-white/[0.06] overflow-hidden">
                <div className="px-5 py-4 border-b border-white/[0.05]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Stock Positions
                    </p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/[0.05]">
                                {[
                                    "Ticker",
                                    "Shares",
                                    "Entry Price",
                                    "Current Price",
                                    "Market Value",
                                    "P&L $",
                                    "P&L %",
                                ].map((h) => (
                                    <th
                                        key={h}
                                        className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 whitespace-nowrap"
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {STOCK_POSITIONS.map((p, i) => {
                                const current = prices[p.ticker] ?? null;
                                const mktValue =
                                    current != null ? current * p.shares : null;
                                const pnlDollar =
                                    current != null
                                        ? (current - p.entryPrice) * p.shares
                                        : null;
                                const pnlPct =
                                    current != null
                                        ? ((current - p.entryPrice) /
                                              p.entryPrice) *
                                          100
                                        : null;
                                const color =
                                    pnlDollar == null
                                        ? "text-slate-400"
                                        : pnlDollar >= 0
                                          ? "text-emerald-400"
                                          : "text-red-400";
                                return (
                                    <tr
                                        key={i}
                                        className="border-b border-white/[0.03] hover:bg-white/[0.02]"
                                    >
                                        <td className="px-4 py-3 font-bold text-slate-100">
                                            {p.ticker}
                                        </td>
                                        <td className="px-4 py-3 tabular-nums text-slate-300">
                                            {p.shares.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 tabular-nums text-slate-400">
                                            {fmt$(p.entryPrice)}
                                        </td>
                                        <td className="px-4 py-3 tabular-nums text-slate-200">
                                            {current ? fmt$(current) : "—"}
                                        </td>
                                        <td className="px-4 py-3 tabular-nums text-slate-200">
                                            {mktValue != null
                                                ? fmt$(mktValue)
                                                : "—"}
                                        </td>
                                        <td
                                            className={`px-4 py-3 tabular-nums font-semibold ${color}`}
                                        >
                                            {pnlDollar != null
                                                ? fmt$(pnlDollar)
                                                : "—"}
                                        </td>
                                        <td
                                            className={`px-4 py-3 tabular-nums font-semibold ${color}`}
                                        >
                                            {pnlPct != null
                                                ? fmtPct(pnlPct)
                                                : "—"}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Trade Log */}
            <div className="bg-slate-800/70 backdrop-blur-sm rounded-xl ring-1 ring-white/[0.06] overflow-hidden">
                <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Trade Log
                    </p>
                    <div className="flex gap-3 text-xs">
                        <span className="text-slate-400">
                            {TRADE_LOG.length} trades ·{" "}
                            <span className="text-emerald-400">
                                {
                                    TRADE_LOG.filter((t) => t.result === "win")
                                        .length
                                }
                                W
                            </span>
                            {" / "}
                            <span className="text-red-400">
                                {
                                    TRADE_LOG.filter((t) => t.result === "loss")
                                        .length
                                }
                                L
                            </span>
                        </span>
                        <span
                            className={`font-semibold ${closedPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}
                        >
                            {fmt$(closedPnl)}
                        </span>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/[0.05]">
                                {[
                                    "Ticker",
                                    "Strategy",
                                    "Entry",
                                    "Exit",
                                    "P&L",
                                    "Result",
                                ].map((h) => (
                                    <th
                                        key={h}
                                        className="text-left px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500"
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {[...TRADE_LOG].reverse().map((t, i) => (
                                <tr
                                    key={i}
                                    className="border-b border-white/[0.03] hover:bg-white/[0.02]"
                                >
                                    <td className="px-4 py-3 font-bold text-slate-100">
                                        {t.ticker}
                                    </td>
                                    <td className="px-4 py-3 text-slate-400">
                                        {t.strategy}
                                    </td>
                                    <td className="px-4 py-3 text-slate-400 text-xs">
                                        {t.entry}
                                    </td>
                                    <td className="px-4 py-3 text-slate-400 text-xs">
                                        {t.exit}
                                    </td>
                                    <td
                                        className={`px-4 py-3 tabular-nums font-semibold ${t.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}
                                    >
                                        {fmt$(t.pnl)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span
                                            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                                t.result === "win"
                                                    ? "bg-emerald-500/20 text-emerald-400"
                                                    : t.result === "loss"
                                                      ? "bg-red-500/20 text-red-400"
                                                      : "bg-slate-600/40 text-slate-400"
                                            }`}
                                        >
                                            {t.result.charAt(0).toUpperCase() +
                                                t.result.slice(1)}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/fund/MattCapital.jsx
git commit -m "feat: add MattCapital fund view component"
```

---

## Task 3: Wire up App.jsx — fund code state + API keys modal field

**Files:**

- Modify: `src/App.jsx`

- [ ] **Step 1: Add import at the top of App.jsx** (after existing imports)

```js
import MattCapital from "./components/fund/MattCapital";
import { FUND_ACCESS_CODE } from "./utils/mattCapitalData";
```

- [ ] **Step 2: Add fund code state** (after the existing `cash` state, around line 70)

```js
const [fundCode, setFundCode] = useState(
    () => localStorage.getItem("bt_fund_code") || "",
);
const fundUnlocked = fundCode === FUND_ACCESS_CODE;
```

- [ ] **Step 3: Add the fund code field inside the API Keys modal**

Find the closing `</div>` that ends the Alpha Vantage section (after the `avKey` clear button), just before the final `</div></div>` that closes the modal content. Add after the existing `<div className="border-t border-slate-700" />` divider:

```jsx
<div className="border-t border-slate-700" />
<div>
  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
    Fund Access Code
  </p>
  <p className="text-xs text-slate-500 mb-2">
    Unlocks the MATT Capital tab
  </p>
  <form
    onSubmit={(e) => {
      e.preventDefault()
      const val = e.target.code.value.trim()
      setFundCode(val)
      localStorage.setItem('bt_fund_code', val)
    }}
    className="flex gap-2"
  >
    <input
      name="code"
      type="password"
      defaultValue={fundCode}
      placeholder="Enter access code…"
      className={`flex-1 ${inputCls} font-mono text-sm`}
    />
    <button
      type="submit"
      className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded text-sm font-medium"
    >
      Save
    </button>
  </form>
  {fundCode && (
    <button
      onClick={() => {
        setFundCode('')
        localStorage.removeItem('bt_fund_code')
      }}
      className="mt-1 text-xs text-red-400 hover:text-red-300"
    >
      Clear
    </button>
  )}
</div>
```

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx
git commit -m "feat: add fund access code field to API keys modal"
```

---

## Task 4: Wire up App.jsx — nav tabs + section render

**Files:**

- Modify: `src/App.jsx`

- [ ] **Step 1: Add the MATT Capital button to the desktop pill nav**

Find the existing desktop nav block (the `<div className="hidden sm:flex bg-slate-700/60 ...">` around line 484). After the `Day Trading` button, add:

```jsx
{
    fundUnlocked && (
        <button
            onClick={() => setSection("fund")}
            className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${section === "fund" ? "bg-slate-600 text-slate-100" : "text-slate-400 hover:text-slate-200"}`}
        >
            MATT Capital
        </button>
    );
}
```

- [ ] **Step 2: Add the MATT Capital button to the mobile bottom tabs**

Find the mobile tabs block (the `<div className="sm:hidden flex -mx-4">` around line 633). After the `Day Trading` button, add:

```jsx
{
    fundUnlocked && (
        <button
            onClick={() => setSection("fund")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium border-b-2 transition-colors ${
                section === "fund"
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600"
            }`}
        >
            MATT Capital
        </button>
    );
}
```

- [ ] **Step 3: Add the section render in `<main>`**

After the `{section === 'analysis' && ...}` block (around line 714), add:

```jsx
{
    section === "fund" && <MattCapital />;
}
```

- [ ] **Step 4: Build and verify**

```bash
npm run build
```

Expected: `✓ built in X.XXs` with no errors.

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx
git commit -m "feat: add MATT Capital tab to nav and section routing"
```

---

## Task 5: Smoke test

- [ ] **Step 1: Start dev server and open in Chrome**

```bash
npm run dev
start chrome http://localhost:5173/
```

- [ ] **Step 2: Verify access gate works**
    - MATT Capital tab should NOT be visible on load
    - Click the key icon → API Keys modal → enter `MATTCAP` in Fund Access Code → Save
    - MATT Capital tab should NOW appear in the nav

- [ ] **Step 3: Verify fund content renders**
    - Click MATT Capital tab
    - Fund header card shows Portfolio Value, Total P&L, Total Return, Wheel Win Rate
    - Wheel Positions table shows placeholder rows with CSP/CC badges and DTE
    - Stock Positions table shows placeholder rows (prices show `—` if no Finnhub key, or live if key set)
    - Trade Log shows closed trades with Win/Loss badges

- [ ] **Step 4: Verify live prices load**
    - Ensure Finnhub key is set
    - Click Refresh button in the fund header
    - Stock Positions table current price and P&L columns populate with live data
    - Wheel Positions table stock price column populates
