import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";

async function fetchPrice(symbol, apiKey) {
    const res = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.c || null;
}

const fmt$ = (n) =>
    n == null || isNaN(n)
        ? "—"
        : n.toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
              minimumFractionDigits: 2,
          });

const fmtPct = (n) =>
    n == null || isNaN(n) ? "—" : `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;

function daysToExpiry(expiryStr) {
    return Math.max(
        0,
        Math.ceil((new Date(expiryStr) - new Date()) / 86400000),
    );
}

function daysBetween(a, b) {
    return Math.max(1, Math.round((new Date(b) - new Date(a)) / 86400000));
}

function fmtAnn(n) {
    if (n == null || isNaN(n)) return "—";
    return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

export default function MattCapital() {
    const apiKey = localStorage.getItem("bt_finnhub_key") || "";
    const [fundData, setFundData] = useState(null);
    const [prices, setPrices] = useState({});
    const [loading, setLoading] = useState(false);
    const [dataError, setDataError] = useState(null);

    // Load JSON data file
    useEffect(() => {
        fetch("/mattcapital.json")
            .then((r) => r.json())
            .then(setFundData)
            .catch(() => setDataError("Could not load mattcapital.json"));
    }, []);

    async function loadPrices(data) {
        const src = data || fundData;
        if (!src || !apiKey) return;
        setLoading(true);
        const tickers = [
            ...new Set([
                ...src.stockPositions.map((p) => p.ticker),
                ...src.wheelPositions.map((p) => p.ticker),
            ]),
        ];
        const result = {};
        for (const sym of tickers) {
            const price = await fetchPrice(sym, apiKey);
            if (price) result[sym] = price;
            await new Promise((r) => setTimeout(r, 150));
        }
        setPrices(result);
        setLoading(false);
    }

    useEffect(() => {
        if (fundData) loadPrices(fundData);
    }, [fundData]); // eslint-disable-line

    if (dataError)
        return (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-red-400 text-sm">
                {dataError}
            </div>
        );
    if (!fundData)
        return (
            <div className="text-center text-slate-500 py-16 text-sm animate-pulse">
                Loading fund data…
            </div>
        );

    const { wheelPositions, stockPositions, tradeLog, cash = 0 } = fundData;

    // ── Derived stats ──────────────────────────────────────────────
    const stockValue = stockPositions.reduce(
        (s, p) => s + (prices[p.ticker] ?? p.entryPrice) * p.shares,
        0,
    );
    const stockCost = stockPositions.reduce(
        (s, p) => s + p.entryPrice * p.shares,
        0,
    );
    const premiumCollected = wheelPositions.reduce(
        (s, p) => s + p.premium * p.contracts * 100,
        0,
    );
    const closedPnl = tradeLog.reduce((s, t) => s + t.pnl, 0);

    // Unrealized P&L for wheel positions — linear theta approximation
    // unrealized = premium × contracts × 100 × (days_elapsed / total_days)
    const wheelUnrealizedPnl = wheelPositions.reduce((s, p) => {
        if (!p.entry) return s + p.premium * p.contracts * 100; // no entry = assume full premium
        const total = Math.max(1, daysBetween(p.entry, p.expiry));
        const elapsed = Math.min(
            total,
            Math.max(
                0,
                daysBetween(p.entry, new Date().toISOString().split("T")[0]),
            ),
        );
        return s + p.premium * p.contracts * 100 * (elapsed / total);
    }, 0);

    const totalValue = stockValue + premiumCollected + cash;
    const totalPnl = stockValue - stockCost + premiumCollected + closedPnl;
    const totalPct = stockCost > 0 ? (totalPnl / stockCost) * 100 : 0;
    const wins = tradeLog.filter((t) => t.result === "win").length;
    const winRate = tradeLog.length > 0 ? (wins / tradeLog.length) * 100 : 0;

    // Annual return per closed trade
    const tradeAnnReturns = tradeLog
        .filter((t) => t.capital > 0)
        .map(
            (t) =>
                (t.pnl / t.capital) *
                (365 / daysBetween(t.entry, t.exit)) *
                100,
        );

    // Annual return per active wheel position — fixed to entry→expiry duration
    const wheelAnnReturns = wheelPositions
        .map((p) => {
            const duration = p.entry
                ? Math.max(1, daysBetween(p.entry, p.expiry))
                : null;
            return duration
                ? (p.premium / p.strike) * (365 / duration) * 100
                : null;
        })
        .filter(Boolean);

    // Portfolio annualised return — average across all positions with known capital
    const allAnnReturns = [...tradeAnnReturns, ...wheelAnnReturns];
    const portfolioAnnReturn =
        allAnnReturns.length > 0
            ? allAnnReturns.reduce((s, r) => s + r, 0) / allAnnReturns.length
            : null;

    return (
        <div className="space-y-6">
            {/* Fund Header */}
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
                        onClick={() => loadPrices()}
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
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-6">
                    {[
                        {
                            label: "Portfolio Value",
                            value: fmt$(totalValue),
                            color: "text-slate-100",
                        },
                        {
                            label: "Cash",
                            value: fmt$(cash),
                            color: "text-slate-300",
                        },
                        {
                            label: "Unrealized P&L",
                            value: fmt$(wheelUnrealizedPnl),
                            color:
                                wheelUnrealizedPnl >= 0
                                    ? "text-emerald-400"
                                    : "text-red-400",
                        },
                        {
                            label: "Realized P&L",
                            value: fmt$(closedPnl),
                            color:
                                closedPnl >= 0
                                    ? "text-emerald-400"
                                    : "text-red-400",
                        },
                        {
                            label: "AVG Ann. Return",
                            value: fmtAnn(portfolioAnnReturn),
                            color:
                                portfolioAnnReturn == null
                                    ? "text-slate-400"
                                    : portfolioAnnReturn >= 0
                                      ? "text-emerald-400"
                                      : "text-red-400",
                        },
                        {
                            label: "Wheel Win Rate",
                            value:
                                tradeLog.length > 0
                                    ? `${winRate.toFixed(0)}`
                                    : "—",
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
                        Active Wheel Positions
                    </p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/[0.05]">
                                {[
                                    "Ticker",
                                    "Type",
                                    "Stock Price",
                                    "Strike",
                                    "DTE",
                                    "Expiry",
                                    "Contracts",
                                    "Premium",
                                    "Value",
                                    "Unrealized P&L",
                                    "Ann. Return",
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
                            {wheelPositions.map((p, i) => {
                                const dte = daysToExpiry(p.expiry);
                                const value = p.premium * p.contracts * 100;
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
                                        <td
                                            className={`px-4 py-3 tabular-nums font-semibold ${
                                                prices[p.ticker] == null
                                                    ? "text-slate-400"
                                                    : p.type === "CSP"
                                                      ? prices[p.ticker] >=
                                                        p.strike
                                                          ? "text-emerald-400"
                                                          : "text-red-400"
                                                      : prices[p.ticker] <=
                                                          p.strike
                                                        ? "text-emerald-400"
                                                        : "text-red-400"
                                            }`}
                                        >
                                            {prices[p.ticker]
                                                ? fmt$(prices[p.ticker])
                                                : "—"}
                                        </td>
                                        <td className="px-4 py-3 tabular-nums text-slate-200">
                                            {fmt$(p.strike)}
                                        </td>
                                        <td
                                            className={`px-4 py-3 font-semibold tabular-nums ${dte <= 7 ? "text-red-400" : dte <= 21 ? "text-yellow-400" : "text-slate-300"}`}
                                        >
                                            {dte}d
                                        </td>
                                        <td className="px-4 py-3 text-slate-400 text-xs">
                                            {p.expiry}
                                        </td>
                                        <td className="px-4 py-3 tabular-nums text-slate-300">
                                            {p.contracts}
                                        </td>
                                        <td className="px-4 py-3 tabular-nums text-emerald-400">
                                            {fmt$(p.premium)}
                                        </td>
                                        <td className="px-4 py-3 tabular-nums font-semibold text-emerald-400">
                                            {fmt$(value)}
                                        </td>
                                        <td className="px-4 py-3 tabular-nums font-semibold text-emerald-400">
                                            {(() => {
                                                if (!p.entry)
                                                    return fmt$(value);
                                                const total = Math.max(
                                                    1,
                                                    daysBetween(
                                                        p.entry,
                                                        p.expiry,
                                                    ),
                                                );
                                                const elapsed = Math.min(
                                                    total,
                                                    Math.max(
                                                        0,
                                                        daysBetween(
                                                            p.entry,
                                                            new Date()
                                                                .toISOString()
                                                                .split("T")[0],
                                                        ),
                                                    ),
                                                );
                                                return fmt$(
                                                    value * (elapsed / total),
                                                );
                                            })()}
                                        </td>
                                        <td className="px-4 py-3 tabular-nums font-semibold text-blue-400">
                                            {(() => {
                                                const ann =
                                                    dte > 0
                                                        ? (p.premium /
                                                              p.strike) *
                                                          (365 / dte) *
                                                          100
                                                        : null;
                                                return fmtAnn(ann);
                                            })()}
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
                            {stockPositions.map((p, i) => {
                                const current = prices[p.ticker] ?? null;
                                const mktValue =
                                    current != null ? current * p.shares : null;
                                const pnlD =
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
                                    pnlD == null
                                        ? "text-slate-400"
                                        : pnlD >= 0
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
                                            {pnlD != null ? fmt$(pnlD) : "—"}
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
                            {tradeLog.length} trades ·{" "}
                            <span className="text-emerald-400">{wins}W</span>
                            {" / "}
                            <span className="text-red-400">
                                {
                                    tradeLog.filter((t) => t.result === "loss")
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
                                    "Ann. Return",
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
                            {[...tradeLog].reverse().map((t, i) => (
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
                                    <td
                                        className={`px-4 py-3 tabular-nums font-semibold ${(() => {
                                            const ann =
                                                t.capital > 0
                                                    ? (t.pnl / t.capital) *
                                                      (365 /
                                                          daysBetween(
                                                              t.entry,
                                                              t.exit,
                                                          )) *
                                                      100
                                                    : null;
                                            return ann == null
                                                ? "text-slate-500"
                                                : ann >= 0
                                                  ? "text-blue-400"
                                                  : "text-red-400";
                                        })()}`}
                                    >
                                        {(() => {
                                            const ann =
                                                t.capital > 0
                                                    ? (t.pnl / t.capital) *
                                                      (365 /
                                                          daysBetween(
                                                              t.entry,
                                                              t.exit,
                                                          )) *
                                                      100
                                                    : null;
                                            return fmtAnn(ann);
                                        })()}
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
