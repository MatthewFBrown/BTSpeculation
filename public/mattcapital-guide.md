# MATT Capital — Trade Data Guide

All fund data is stored in `public/mattcapital.json`. To update the fund, edit that file and refresh the browser. No coding required.

---

## File Structure

The file has three sections:

```json
{
  "wheelPositions": [ ... ],
  "stockPositions": [ ... ],
  "tradeLog":       [ ... ]
}
```

---

## Wheel Positions

Active wheel strategy trades (CSPs and Covered Calls).

### Fields

| Field | Type | Description |
|---|---|---|
| `ticker` | string | Stock symbol e.g. `"AAPL"` |
| `type` | string | `"CSP"` (cash-secured put) or `"CC"` (covered call) |
| `strike` | number | Strike price e.g. `170` |
| `expiry` | string | Expiration date in `YYYY-MM-DD` format |
| `premium` | number | Premium received **per share** e.g. `2.50` |
| `contracts` | number | Number of contracts (1 contract = 100 shares) |

### Example

```json
"wheelPositions": [
  { "ticker": "AAPL", "type": "CSP", "strike": 170, "expiry": "2025-06-20", "premium": 2.50, "contracts": 1 },
  { "ticker": "TSLA", "type": "CC",  "strike": 250, "expiry": "2025-06-20", "premium": 3.80, "contracts": 2 }
]
```

> **Note:** Premium is per share. Total value shown in the app = `premium × contracts × 100`.

---

## Stock Positions

Long stock holdings.

### Fields

| Field | Type | Description |
|---|---|---|
| `ticker` | string | Stock symbol e.g. `"MSFT"` |
| `shares` | number | Number of shares held |
| `entryPrice` | number | Average cost per share |

### Example

```json
"stockPositions": [
  { "ticker": "AAPL", "shares": 100, "entryPrice": 165.00 },
  { "ticker": "MSFT", "shares": 50,  "entryPrice": 370.00 }
]
```

---

## Trade Log

Closed/completed trades. These appear in the Trade Log table and count toward win rate and total P&L.

### Fields

| Field | Type | Description |
|---|---|---|
| `ticker` | string | Stock symbol |
| `strategy` | string | e.g. `"CSP"`, `"CC"`, `"Stock"` |
| `entry` | string | Date opened in `YYYY-MM-DD` format |
| `exit` | string | Date closed in `YYYY-MM-DD` format |
| `pnl` | number | Profit or loss in dollars (negative = loss) |
| `capital` | number | Capital at risk in dollars — used to calculate annualized return |
| `result` | string | `"win"`, `"loss"`, or `"neutral"` |

> **Capital for wheel trades:**
> - **CSP:** `strike × contracts × 100` e.g. strike $14.50, 4 contracts → `14.50 × 4 × 100 = 5800`
> - **CC:** cost basis of the shares e.g. 100 shares at $15 avg → `1500`

### Example

```json
"tradeLog": [
  { "ticker": "AAPL", "strategy": "CSP", "entry": "2025-01-10", "exit": "2025-01-24", "pnl": 250,  "capital": 17000, "result": "win"  },
  { "ticker": "TSLA", "strategy": "CC",  "entry": "2025-02-03", "exit": "2025-02-28", "pnl": -120, "capital": 25000, "result": "loss" },
  { "ticker": "MSFT", "strategy": "Stock", "entry": "2025-03-01", "exit": "2025-03-15", "pnl": 0,  "capital": 18500, "result": "neutral" }
]
```

---

## Common Tasks

### Add a new wheel trade
Add a new object to `wheelPositions`:
```json
{ "ticker": "NVDA", "type": "CSP", "strike": 800, "expiry": "2025-07-18", "premium": 5.00, "contracts": 1 }
```

### Close a wheel trade
1. Remove it from `wheelPositions`
2. Add it to `tradeLog` with the P&L and result

### Add a stock position
Add a new object to `stockPositions`:
```json
{ "ticker": "GOOGL", "shares": 10, "entryPrice": 170.00 }
```

### Log a closed trade
Add a new object to `tradeLog`:
```json
{ "ticker": "AAPL", "strategy": "CSP", "entry": "2025-05-01", "exit": "2025-05-16", "pnl": 310, "result": "win" }
```

---

## Tips

- **Dates** must be in `YYYY-MM-DD` format e.g. `"2025-06-20"` — not `"June 20"` or `"6/20/25"`
- **Negative P&L** is a loss — use a minus sign e.g. `"pnl": -150`
- **Commas** — every object in a list needs a comma after it except the last one
- After saving the file, just **refresh the browser** — no rebuild needed
- If the page shows an error, open the browser console (F12) to find the JSON syntax mistake
