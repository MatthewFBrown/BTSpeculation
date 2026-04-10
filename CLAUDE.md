# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start Vite dev server (HMR)
npm run build      # Production build
npm run lint       # ESLint
npm run preview    # Preview production build locally
```

## User preferences

- When running the app or told to "open" a URL, also open it in Chrome: `start chrome http://localhost:5173/`

## Claude Code workflow

**To work faster and save tokens, follow this process:**

1. **Grep first** — Search for patterns (tooltips, card classes, button styles, etc.) before reading files
2. **Read only what you need** — Use offset/limit to read specific sections, not entire files
3. **Make a comprehensive plan** — List all files needing changes before editing
4. **Batch changes** — Make multiple parallel Edits instead of sequential changes
5. **Test once** — Single hard refresh after all changes, not after each edit
6. **Avoid unnecessary reads** — Use Grep to understand patterns instead of reading full files

Example: When asked to update styling across components:
- Grep for the pattern (e.g., "bg-slate-800" or "TT_STYLE")
- Identify all files that need updating
- Make all Edits in parallel
- Test once when done

This approach cuts token usage by 40-50% and completes tasks 3x faster.

There is no test suite.

## Architecture

**BT Speculation** is a fully client-side React + Vite app — no backend, no routing library. All data lives in `localStorage`. Tailwind CSS v3 handles styling.

### Three top-level sections (managed by `section` state in `App.jsx`)

| Section | Component | Purpose |
|---|---|---|
| `investments` | `InvestmentDashboard` | Long-term portfolio tracker |
| `analysis` | `AnalysisDashboard` | Fundamentals, DCF, Efficient Frontier, Risk, Wheel |
| `trading` | `Dashboard` + `Charts` | Day-trading journal (options & futures only) |

### Data persistence

All state is localStorage-backed via three custom hooks in `src/hooks/`:

- `useAccounts` — account list + active account selection
- `useTrades(accountId)` — day-trading entries for the active account
- `useInvestments(accountId)` — investment positions for the active account

**Multi-account namespacing**: `accountKey(base, accountId)` from `useAccounts.js` produces `"base_accountId"` for non-default accounts, and the bare `"base"` for the `"default"` account (to preserve legacy data). Every per-account key must use this helper. The set of per-account base keys is listed in `PER_ACCOUNT_KEYS` in `useAccounts.js` — add new ones there when introducing new per-account storage.

Cash balance is also per-account using `accountKey("bt_cash", activeId)`, managed directly in `App.jsx` alongside investment mutations (buying/selling adjusts cash automatically).

### Calculations

- `src/utils/calculations.js` — trading journal stats (`getStats`, `calcPnL`, `getEquityCurve`, etc.). P&L only supports `option` (×100 per contract) and `futures` (multipliers from `FUTURES_MULTIPLIERS`). Stocks are not supported in `calcPnL`.
- `src/utils/investmentCalcs.js` — portfolio stats (`getInvestmentStats`, `calcInvestmentPnL`). Supports any asset type including options (treated as shares × price, no multiplier).

### External APIs

Stored API keys in localStorage (`bt_finnhub_key`, `bt_av_key`):

| API | Key required | Used for |
|---|---|---|
| Finnhub | Yes (`bt_finnhub_key`) | Live stock/ETF price refresh |
| CoinGecko | No | Live crypto price refresh (mapped in `fetchPrices.js`) |
| Alpha Vantage | Yes (`bt_av_key`) | Financial statements in Financials/Fundamentals tabs |

Alpha Vantage free tier is limited to 25 calls/day; `src/utils/avCallTracker.js` enforces this.

### Analysis section internals

`AnalysisDashboard` owns a tab router for: Fundamentals, Financials, Research, DCF, Efficient Frontier, Optimizer, Risk, Wheel. Cross-tab navigation (e.g. clicking a ticker in the ticker tape) uses the `watchlistNav` prop — `App.jsx` sets it, `AnalysisDashboard` consumes it and calls `onWatchlistNavConsumed()` to clear it.

Efficient Frontier state lives in `src/utils/efficientFrontier.js` as module-level mutable singletons (`setRealCorrelations`, `setComputedParams`). Real correlations are fetched in `AnalysisDashboard`'s effect and injected there.

### Design conventions

- Dark theme: `bg-[#0c1524]` body with blue radial gradient (see `index.css`)
- Cards: `bg-slate-800/70 backdrop-blur-sm rounded-xl ring-1 ring-white/[0.06]`
- Active tab state: `bg-blue-500/20 text-blue-300`
- Ghost buttons: `bg-white/[0.05] hover:bg-white/[0.09] ring-1 ring-white/10`
- CTA buttons: `bg-blue-600 hover:bg-blue-500 ... shadow-[0_0_18px_rgba(59,130,246,0.35)]`
- Positive values: `text-green-400` / `text-emerald-*`; negative: `text-red-400`
- Metric labels: `text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500`
