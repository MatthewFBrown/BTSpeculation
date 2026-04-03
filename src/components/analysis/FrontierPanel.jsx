import { useMemo, useState, useCallback } from "react";
import {
    ComposedChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    ReferenceDot,
    CartesianGrid,
} from "recharts";
import {
    generateEfficientFrontierData,
    generateCombinedFrontierData,
    getAssetParams,
    getDefaultParams,
} from "../../utils/efficientFrontier";
import {
    Info,
    X,
    SlidersHorizontal,
    RotateCcw,
    ChevronDown,
    ChevronUp,
} from "lucide-react";

const RISK_FREE_DISPLAY = 4.5;
const COLORS_PALETTE = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#8b5cf6",
    "#ef4444",
    "#06b6d4",
    "#f97316",
    "#84cc16",
    "#ec4899",
    "#6366f1",
    "#14b8a6",
    "#a3e635",
];

const PORTFOLIO_COLORS = {
    current: {
        dot: "#f59e0b",
        accent: "border-t-yellow-500",
        label: "Your Portfolio",
        note: "Current allocation",
    },
    maxDiv: {
        dot: "#38bdf8",
        accent: "border-t-sky-500",
        label: "Max Diversification",
        note: "Best correlation spread",
    },
    maxSharpe: {
        dot: "#a78bfa",
        accent: "border-t-violet-500",
        label: "Max Sharpe",
        note: "Best risk-adjusted return",
    },
};

// ── Param Editor ──────────────────────────────────────────────
function ParamEditor({
    allSymbols,
    portSymbols,
    overrides,
    onChange,
    onReset,
}) {
    const defaults = useMemo(
        () => getDefaultParams(allSymbols),
        [allSymbols.join(",")],
    ); // eslint-disable-line

    function getVal(sym, field) {
        return (
            overrides[sym]?.[field] ??
            defaults.find((d) => d.symbol === sym)?.[field] ??
            (field === "r" ? 0.12 : 0.25)
        );
    }
    function handleChange(sym, field, raw) {
        const val = Math.max(
            0,
            Math.min(field === "r" ? 2 : 3, parseFloat(raw) / 100 || 0),
        );
        onChange(sym, field, val);
    }

    return (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <div className="px-4 pt-3 pb-2 border-b border-slate-700 flex items-center justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Asset Parameters
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">
                        Return &amp; volatility from <span className="text-slate-500">2 yrs of weekly price history</span> (Yahoo Finance). Click to override.
                    </p>
                </div>
                <button
                    onClick={onReset}
                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-400 bg-slate-700/50 hover:bg-red-500/10 px-2.5 py-1.5 rounded-lg shrink-0 ml-4 transition-colors"
                >
                    <RotateCcw size={11} /> Reset all
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="border-b border-slate-700/60">
                            <th className="text-left px-4 py-2.5 text-slate-500 font-semibold uppercase tracking-wider">
                                Symbol
                            </th>
                            <th
                                className="px-4 py-2.5 text-slate-500 font-semibold uppercase tracking-wider text-center"
                                colSpan={2}
                            >
                                Expected Annual Return
                            </th>
                            <th
                                className="px-4 py-2.5 text-slate-500 font-semibold uppercase tracking-wider text-center"
                                colSpan={2}
                            >
                                Annual Volatility
                            </th>
                            <th className="px-4 py-2.5 text-slate-500 font-semibold uppercase tracking-wider text-right">
                                Implied Sharpe
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {allSymbols.map((sym) => {
                            const r = getVal(sym, "r");
                            const s = getVal(sym, "s");
                            const sharpe =
                                s > 0
                                    ? (
                                          (r - RISK_FREE_DISPLAY / 100) /
                                          s
                                      ).toFixed(2)
                                    : "—";
                            const sharpeColor =
                                parseFloat(sharpe) >= 1
                                    ? "text-green-400"
                                    : parseFloat(sharpe) >= 0.5
                                      ? "text-yellow-400"
                                      : "text-red-400";
                            const def = defaults.find((d) => d.symbol === sym);
                            const modified = overrides[sym] !== undefined;
                            const isNew = !portSymbols.includes(sym);

                            return (
                                <tr
                                    key={sym}
                                    className={`border-b border-slate-700/40 hover:bg-slate-700/20 ${modified ? "bg-blue-500/5" : ""}`}
                                >
                                    <td className="px-4 py-2.5">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`font-bold ${isNew ? "text-violet-400" : "text-slate-200"}`}
                                            >
                                                {sym}
                                            </span>
                                            {isNew && (
                                                <span className="text-[9px] bg-violet-500/20 text-violet-400 px-1.5 py-0.5 rounded font-medium">
                                                    new
                                                </span>
                                            )}
                                            {modified && (
                                                <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-medium">
                                                    custom
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-slate-600 text-[10px]">
                                            default:{" "}
                                            {((def?.r ?? 0.12) * 100).toFixed(
                                                0,
                                            )}
                                            % /{" "}
                                            {((def?.s ?? 0.25) * 100).toFixed(
                                                0,
                                            )}
                                            %
                                        </div>
                                    </td>
                                    <td className="px-2 py-2.5 w-32">
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            step="1"
                                            value={Math.round(r * 100)}
                                            onChange={(e) =>
                                                handleChange(
                                                    sym,
                                                    "r",
                                                    e.target.value,
                                                )
                                            }
                                            className="w-full h-1.5 accent-green-500 cursor-pointer"
                                        />
                                    </td>
                                    <td className="px-2 py-2.5 w-20">
                                        <div className="flex items-center gap-1">
                                            <input
                                                type="number"
                                                min="0"
                                                max="200"
                                                step="1"
                                                value={Math.round(r * 100)}
                                                onChange={(e) =>
                                                    handleChange(
                                                        sym,
                                                        "r",
                                                        e.target.value,
                                                    )
                                                }
                                                className="w-14 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-slate-100 text-right focus:outline-none focus:border-green-500"
                                            />
                                            <span className="text-slate-500">
                                                %
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-2 py-2.5 w-32">
                                        <input
                                            type="range"
                                            min="1"
                                            max="150"
                                            step="1"
                                            value={Math.round(s * 100)}
                                            onChange={(e) =>
                                                handleChange(
                                                    sym,
                                                    "s",
                                                    e.target.value,
                                                )
                                            }
                                            className="w-full h-1.5 accent-yellow-500 cursor-pointer"
                                        />
                                    </td>
                                    <td className="px-2 py-2.5 w-20">
                                        <div className="flex items-center gap-1">
                                            <input
                                                type="number"
                                                min="1"
                                                max="300"
                                                step="1"
                                                value={Math.round(s * 100)}
                                                onChange={(e) =>
                                                    handleChange(
                                                        sym,
                                                        "s",
                                                        e.target.value,
                                                    )
                                                }
                                                className="w-14 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-slate-100 text-right focus:outline-none focus:border-yellow-500"
                                            />
                                            <span className="text-slate-500">
                                                %
                                            </span>
                                        </div>
                                    </td>
                                    <td
                                        className={`px-4 py-2.5 text-right font-bold tabular-nums ${sharpeColor}`}
                                    >
                                        {sharpe}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <p className="text-xs text-slate-600 px-4 py-2 border-t border-slate-700">
                Risk-free rate: {RISK_FREE_DISPLAY}%. Sharpe = (Return −{" "}
                {RISK_FREE_DISPLAY}%) ÷ Volatility.{" "}
                <span className="text-violet-400">Violet</span> = researched
                stock not yet in portfolio.
            </p>
        </div>
    );
}

// ── Allocation Table ──────────────────────────────────────────
function AllocationTable({ allocation, portSymbols }) {
    if (!allocation?.length) return null;
    return (
        <div className="mt-4 border-t border-slate-700 pt-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Suggested Allocation
            </p>
            <div className="space-y-1.5">
                {allocation.map(({ symbol, weight }, i) => {
                    const isNew = portSymbols && !portSymbols.includes(symbol);
                    return (
                        <div key={symbol} className="flex items-center gap-2">
                            <span
                                className={`text-xs font-semibold w-14 shrink-0 ${isNew ? "text-violet-400" : "text-slate-200"}`}
                            >
                                {symbol}
                            </span>
                            <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full"
                                    style={{
                                        width: `${weight}%`,
                                        background:
                                            COLORS_PALETTE[
                                                i % COLORS_PALETTE.length
                                            ],
                                    }}
                                />
                            </div>
                            <span className="text-xs font-semibold tabular-nums text-slate-300 w-10 text-right">
                                {weight.toFixed(1)}%
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ── Tooltip ───────────────────────────────────────────────────
function FrontierTooltip({
    active,
    payload,
    portSymbols,
    investments = [],
    priceMap = {},
    cash = 0,
}) {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    if (!d) return null;

    const open = investments.filter((i) => i.status === "open");
    const totalMV =
        open.reduce(
            (s, i) =>
                s +
                (parseFloat(i.shares) || 0) *
                    (parseFloat(i.currentPrice) || parseFloat(i.avgCost) || 0),
            0,
        ) + (parseFloat(cash) || 0);

    function invFor(sym) {
        return open.find((i) => i.symbol === sym);
    }
    function price(sym) {
        const inv = invFor(sym);
        return (
            parseFloat(inv?.currentPrice) ||
            parseFloat(inv?.avgCost) ||
            priceMap[sym] ||
            0
        );
    }
    function currentShares(sym) {
        return parseFloat(invFor(sym)?.shares) || 0;
    }

    const fmtShares = (n) => {
        const abs = Math.abs(n);
        if (abs < 0.005) return null;
        return abs < 1
            ? abs.toFixed(3)
            : abs < 10
              ? abs.toFixed(2)
              : abs.toFixed(1);
    };

    return (
        <div className="bg-slate-900 border border-slate-600 rounded-xl shadow-xl p-3 text-xs min-w-[240px]">
            <div className="flex gap-3 mb-2.5 pb-2.5 border-b border-slate-700">
                <div>
                    <p className="text-slate-500 text-[10px]">Return</p>
                    <p className="font-bold text-green-400 text-sm">
                        {d.ret?.toFixed(1)}%
                    </p>
                </div>
                <div>
                    <p className="text-slate-500 text-[10px]">Volatility</p>
                    <p className="font-bold text-yellow-400 text-sm">
                        {d.vol?.toFixed(1)}%
                    </p>
                </div>
                <div>
                    <p className="text-slate-500 text-[10px]">Sharpe</p>
                    <p className="font-bold text-blue-400 text-sm">
                        {d.sharpe?.toFixed(2)}
                    </p>
                </div>
            </div>
            {d.allocation?.length > 0 && (
                <div className="space-y-1.5">
                    <div className="flex text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-1 pr-1">
                        <span className="w-10 shrink-0">Sym</span>
                        <span className="flex-1 ml-2">Weight</span>
                        <span className="w-9 text-right">%</span>
                        <span className="w-20 text-right">Action</span>
                    </div>
                    {d.allocation.map(({ symbol, weight }, i) => {
                        const isNew =
                            portSymbols && !portSymbols.includes(symbol);
                        const p = price(symbol);
                        let actionLabel = "hold";
                        let actionColor = "text-slate-600";
                        if (symbol === "CASH") {
                            const cashDollar =
                                totalMV > 0
                                    ? (weight / 100) * totalMV -
                                      (parseFloat(cash) || 0)
                                    : 0;
                            if (Math.abs(cashDollar) >= 1) {
                                const abs = Math.abs(cashDollar);
                                const fmt =
                                    abs >= 1e3
                                        ? `$${(abs / 1e3).toFixed(1)}K`
                                        : `$${abs.toFixed(0)}`;
                                actionLabel =
                                    cashDollar > 0 ? `▲ ${fmt}` : `▼ ${fmt}`;
                                actionColor =
                                    cashDollar > 0
                                        ? "text-green-400"
                                        : "text-red-400";
                            }
                        } else {
                            const diff =
                                totalMV > 0 && p > 0
                                    ? ((weight / 100) * totalMV) / p -
                                      currentShares(symbol)
                                    : null;
                            const shares =
                                diff != null ? fmtShares(diff) : null;
                            if (shares) {
                                actionLabel = `${diff > 0 ? "▲" : "▼"} ${shares}`;
                                actionColor =
                                    diff > 0
                                        ? "text-green-400"
                                        : "text-red-400";
                            }
                        }
                        return (
                            <div
                                key={symbol}
                                className="flex items-center gap-2"
                            >
                                <span
                                    className={`font-semibold w-10 shrink-0 ${isNew ? "text-violet-400" : "text-slate-300"}`}
                                >
                                    {symbol}
                                </span>
                                <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full"
                                        style={{
                                            width: `${weight}%`,
                                            background:
                                                COLORS_PALETTE[
                                                    i % COLORS_PALETTE.length
                                                ],
                                        }}
                                    />
                                </div>
                                <span className="text-slate-400 tabular-nums w-9 text-right">
                                    {weight.toFixed(1)}%
                                </span>
                                <span
                                    className={`tabular-nums w-20 text-right font-medium ${actionColor}`}
                                >
                                    {actionLabel}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ── Comparison / Rebalancing Table ────────────────────────────
function ComparisonTable({
    current,
    maxDiv,
    maxSharpe,
    investments,
    portSymbols,
    priceMap = {},
    cash = 0,
}) {
    if (!current?.allocation) return null;

    const symbols = current.allocation.map((a) => a.symbol);
    const open = investments.filter((i) => i.status === "open");
    const totalMV =
        open.reduce(
            (s, i) =>
                s +
                (parseFloat(i.shares) || 0) *
                    (parseFloat(i.currentPrice) || parseFloat(i.avgCost) || 0),
            0,
        ) + (parseFloat(cash) || 0);

    function invFor(sym) {
        return open.find((i) => i.symbol === sym);
    }
    function price(sym) {
        const inv = invFor(sym);
        return (
            parseFloat(inv?.currentPrice) ||
            parseFloat(inv?.avgCost) ||
            priceMap[sym] ||
            0
        );
    }
    function currentShares(sym) {
        return parseFloat(invFor(sym)?.shares) || 0;
    }
    function getWeight(pt, sym) {
        return pt?.allocation?.find((a) => a.symbol === sym)?.weight ?? 0;
    }

    function changes(opt, sym) {
        const pctDiff = getWeight(opt, sym) - getWeight(current, sym);
        const dollarDiff = (pctDiff / 100) * totalMV;
        if (sym === "CASH") {
            return {
                pctDiff,
                shareDiff: dollarDiff,
                action: dollarDiff > 0 ? "buy" : "sell",
            };
        }
        if (Math.abs(pctDiff) < 0.1)
            return { pctDiff: 0, shareDiff: 0, action: "hold" };
        const p = price(sym);
        const shareDiff = p > 0 ? dollarDiff / p : 0;
        return { pctDiff, shareDiff, action: shareDiff > 0 ? "buy" : "sell" };
    }

    const fmtShares = (n) => {
        const abs = Math.abs(n);
        if (abs < 0.01) return "—";
        return abs < 1
            ? abs.toFixed(3)
            : abs < 10
              ? abs.toFixed(2)
              : abs.toFixed(1);
    };

    const fmtMV = (v) =>
        v >= 1e6
            ? `$${(v / 1e6).toFixed(2)}M`
            : v >= 1e3
              ? `$${(v / 1e3).toFixed(1)}K`
              : `$${v.toFixed(0)}`;

    const actionCell = (ch, sym) => {
        const isNew = portSymbols && !portSymbols.includes(sym);
        if (
            !ch ||
            (sym !== "CASH" && Math.abs(ch.shareDiff) < 0.005) ||
            (sym === "CASH" && Math.abs(ch.shareDiff) < 1)
        )
            return <span className="text-slate-600">hold</span>;
        const isBuy = ch.action === "buy";
        if (sym === "CASH") {
            return (
                <div
                    className={`inline-flex flex-col items-end ${isBuy ? "text-green-400" : "text-red-400"}`}
                >
                    <span className="font-bold">
                        {isBuy ? "▲" : "▼"} {fmtMV(Math.abs(ch.shareDiff))}
                    </span>
                    <span className="text-[10px] opacity-70">
                        {ch.pctDiff > 0 ? "+" : ""}
                        {ch.pctDiff.toFixed(1)}%
                    </span>
                </div>
            );
        }
        return (
            <div
                className={`inline-flex flex-col items-end ${isBuy ? "text-green-400" : "text-red-400"}`}
            >
                <span className="font-bold">
                    {isBuy ? "▲ Buy" : "▼ Sell"} {fmtShares(ch.shareDiff)}
                    {isNew && isBuy && (
                        <span className="ml-1 text-[9px] text-violet-400">
                            (new)
                        </span>
                    )}
                </span>
                <span className="text-[10px] opacity-70">
                    {ch.pctDiff > 0 ? "+" : ""}
                    {ch.pctDiff.toFixed(1)}%
                </span>
            </div>
        );
    };

    return (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-x-auto">
            <div className="px-4 pt-4 pb-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Rebalancing Plan
                </p>
                <p className="text-xs text-slate-600 mt-0.5">
                    Based on total portfolio value of{" "}
                    <span className="text-slate-400 font-medium">
                        {fmtMV(totalMV)}
                    </span>
                    .
                    {portSymbols && (
                        <span className="ml-1">
                            <span className="text-violet-400">Violet</span> =
                            new position to open.
                        </span>
                    )}
                </p>
            </div>
            <table className="w-full text-xs mt-2">
                <thead>
                    <tr className="border-b border-slate-700">
                        <th className="text-left px-4 py-2.5 text-slate-500 font-semibold uppercase tracking-wider">
                            Symbol
                        </th>
                        <th className="text-right px-3 py-2.5 text-yellow-500 font-semibold uppercase tracking-wider">
                            Current %
                        </th>
                        <th className="text-right px-3 py-2.5 text-yellow-500/60 font-semibold uppercase tracking-wider">
                            Shares
                        </th>
                        {maxDiv && (
                            <>
                                <th className="text-right px-3 py-2.5 text-sky-400 font-semibold uppercase tracking-wider">
                                    Max Div %
                                </th>
                                <th className="text-right px-3 py-2.5 text-sky-400/60 font-semibold uppercase tracking-wider">
                                    Action
                                </th>
                            </>
                        )}
                        {maxSharpe && (
                            <>
                                <th className="text-right px-3 py-2.5 text-violet-400 font-semibold uppercase tracking-wider">
                                    Max Sharpe %
                                </th>
                                <th className="text-right px-3 py-2.5 text-violet-400/60 font-semibold uppercase tracking-wider">
                                    Action
                                </th>
                            </>
                        )}
                    </tr>
                </thead>
                <tbody>
                    {symbols.map((sym, i) => {
                        const isNew = portSymbols && !portSymbols.includes(sym);
                        const mv = maxDiv ? changes(maxDiv, sym) : null;
                        const ms = maxSharpe ? changes(maxSharpe, sym) : null;
                        return (
                            <tr
                                key={sym}
                                className={`border-b border-slate-700/40 hover:bg-slate-700/20 ${isNew ? "bg-violet-500/5" : ""}`}
                            >
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <span
                                            className="w-2.5 h-2.5 rounded-full shrink-0"
                                            style={{
                                                background:
                                                    COLORS_PALETTE[
                                                        i %
                                                            COLORS_PALETTE.length
                                                    ],
                                            }}
                                        />
                                        <span
                                            className={`font-bold ${isNew ? "text-violet-400" : "text-slate-200"}`}
                                        >
                                            {sym}
                                        </span>
                                        {isNew && (
                                            <span className="text-[9px] bg-violet-500/20 text-violet-400 px-1.5 py-0.5 rounded">
                                                new
                                            </span>
                                        )}
                                    </div>
                                    {price(sym) > 0 && (
                                        <div className="text-[10px] text-slate-600 pl-4 mt-0.5">
                                            ${price(sym).toFixed(2)}/share
                                        </div>
                                    )}
                                </td>
                                <td className="px-3 py-3 text-right tabular-nums text-yellow-400 font-medium">
                                    {getWeight(current, sym).toFixed(1)}%
                                </td>
                                <td className="px-3 py-3 text-right tabular-nums text-yellow-400/60 font-medium">
                                    {sym === "CASH" ? (
                                        fmtMV(cash)
                                    ) : isNew ? (
                                        <span className="text-slate-600">
                                            —
                                        </span>
                                    ) : currentShares(sym) > 0 ? (
                                        currentShares(sym).toLocaleString(
                                            undefined,
                                            { maximumFractionDigits: 3 },
                                        )
                                    ) : (
                                        "—"
                                    )}
                                </td>
                                {maxDiv && (
                                    <>
                                        <td className="px-3 py-3 text-right tabular-nums text-sky-400 font-medium">
                                            {getWeight(maxDiv, sym).toFixed(1)}%
                                        </td>
                                        <td className="px-3 py-3 text-right">
                                            {actionCell(mv, sym)}
                                        </td>
                                    </>
                                )}
                                {maxSharpe && (
                                    <>
                                        <td className="px-3 py-3 text-right tabular-nums text-violet-400 font-medium">
                                            {getWeight(maxSharpe, sym).toFixed(
                                                1,
                                            )}
                                            %
                                        </td>
                                        <td className="px-3 py-3 text-right">
                                            {actionCell(ms, sym)}
                                        </td>
                                    </>
                                )}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            <p className="text-[10px] text-slate-600 px-4 py-2.5 border-t border-slate-700">
                Share counts are approximate. Does not account for transaction
                costs, taxes, or fractional share availability.
            </p>
        </div>
    );
}

// ── Main FrontierPanel ────────────────────────────────────────
// extraSymbols: if provided, runs combined mode (portfolio + researched stocks)
// storageKey: unique localStorage key so each usage has its own param overrides
export default function FrontierPanel({
    investments,
    extraSymbols = [],
    storageKey = "bt_ef_params",
    priceMap = {},
    cash = 0,
}) {
    const [showInfo, setShowInfo] = useState(false);
    const [showParams, setShowParams] = useState(false);
    const [overrides, setOverrides] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem(storageKey) || "{}");
        } catch {
            return {};
        }
    });
    const [cashRate, setCashRate] = useState(() => {
        const v = parseFloat(localStorage.getItem(`${storageKey}_cash_rate`));
        return isNaN(v) ? 3.0 : v;
    });

    const handleParamChange = useCallback(
        (sym, field, val) => {
            setOverrides((prev) => {
                const next = {
                    ...prev,
                    [sym]: { ...(prev[sym] || {}), [field]: val },
                };
                localStorage.setItem(storageKey, JSON.stringify(next));
                return next;
            });
        },
        [storageKey],
    );

    const handleReset = useCallback(() => {
        setOverrides({});
        localStorage.removeItem(storageKey);
    }, [storageKey]);

    const isCombined = extraSymbols.length > 0;
    const cashAmount = parseFloat(cash) || 0;
    const cashOptions = useMemo(
        () => ({ amount: cashAmount, rate: cashRate / 100 }),
        [cashAmount, cashRate],
    ); // eslint-disable-line

    const { frontier, current, maxDiv, maxSharpe, portSymbols, newSymbols } =
        useMemo(() => {
            if (isCombined)
                return generateCombinedFrontierData(
                    investments,
                    extraSymbols,
                    overrides,
                    cashOptions,
                );
            const result = generateEfficientFrontierData(
                investments,
                overrides,
                cashOptions,
            );
            const open = investments.filter((i) => i.status === "open");
            const ps = [
                ...open.map((i) => i.symbol),
                ...(cashAmount > 0 ? ["CASH"] : []),
            ];
            return { ...result, portSymbols: ps, newSymbols: [] };
        }, [investments, extraSymbols, overrides, isCombined, cashOptions]); // eslint-disable-line

    const open = investments.filter((i) => i.status === "open");
    // Exclude CASH from the param editor — it has its own rate UI
    const allSymbols = (
        isCombined
            ? [...(portSymbols || []), ...(newSymbols || [])]
            : open.map((i) => i.symbol)
    ).filter((s) => s !== "CASH");

    if (open.length < 2 && !isCombined) {
        return (
            <div className="text-center text-slate-500 py-12 text-sm">
                Need at least 2 open positions to generate the efficient
                frontier.
            </div>
        );
    }

    const lineColor = isCombined ? "#8b5cf6" : "#3b82f6";

    return (
        <div className="space-y-4">
            {/* Info modal */}
            {showInfo && (
                <div
                    className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
                    onClick={() => setShowInfo(false)}
                >
                    <div
                        className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-700 sticky top-0 bg-slate-800 z-10">
                            <h2 className="text-base font-semibold text-slate-100">
                                How the Efficient Frontier Works
                            </h2>
                            <button
                                onClick={() => setShowInfo(false)}
                                className="text-slate-500 hover:text-slate-200"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="px-6 py-5 space-y-5 text-sm text-slate-300 leading-relaxed">
                            <p>
                                The Efficient Frontier shows the set of
                                portfolios with the{" "}
                                <span className="text-white font-medium">
                                    highest expected return for a given level of
                                    risk
                                </span>
                                . Built using 10,000 Monte Carlo simulations
                                with Dirichlet-distributed random weights.
                            </p>
                            <div className="bg-slate-900 rounded-lg p-3 font-mono text-xs space-y-1">
                                <p>Return = Σ (wᵢ × rᵢ)</p>
                                <p>Variance = Σ Σ (wᵢ × wⱼ × σᵢ × σⱼ × ρᵢⱼ)</p>
                                <p>Sharpe = (Return − 4.5%) ÷ √Variance</p>
                            </div>
                            {isCombined && (
                                <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-4 text-xs">
                                    <p className="text-violet-300 font-semibold mb-1">
                                        Combined Mode
                                    </p>
                                    <p className="text-violet-200/80">
                                        This frontier includes both your
                                        portfolio holdings and the researched
                                        stocks. Your current portfolio sits at
                                        the yellow dot — if the frontier shifts
                                        up/left when adding researched stocks,
                                        it means better risk-adjusted returns
                                        are achievable by including them.
                                    </p>
                                </div>
                            )}
                            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-xs text-yellow-200/80">
                                <p className="font-semibold text-yellow-400 mb-1">
                                    Limitations
                                </p>
                                <p>
                                    Expected returns and correlations are
                                    estimated assumptions. This is not financial
                                    advice.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Cash position card */}
            {cashAmount > 0 && (
                <div className="bg-slate-800 rounded-xl border border-slate-700 px-4 py-3 flex items-center gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                            Cash Position
                        </p>
                        <p className="text-xs text-slate-600 mt-0.5">
                            $
                            {cashAmount >= 1e6
                                ? `${(cashAmount / 1e6).toFixed(2)}M`
                                : cashAmount >= 1e3
                                  ? `${(cashAmount / 1e3).toFixed(1)}K`
                                  : cashAmount.toFixed(0)}{" "}
                            included as a risk-free asset — zero correlation
                            with all holdings
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <label className="text-xs text-slate-400">
                            Annual Return
                        </label>
                        <input
                            type="number"
                            min="0"
                            max="20"
                            step="0.1"
                            value={cashRate}
                            onChange={(e) => {
                                const v = Math.max(
                                    0,
                                    Math.min(
                                        20,
                                        parseFloat(e.target.value) || 0,
                                    ),
                                );
                                setCashRate(v);
                                localStorage.setItem(
                                    `${storageKey}_cash_rate`,
                                    String(v),
                                );
                            }}
                            className="w-16 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-slate-100 text-right text-xs focus:outline-none focus:border-blue-500"
                        />
                        <span className="text-slate-500 text-xs">%</span>
                    </div>
                </div>
            )}

            {/* Chart */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
                <div className="flex items-start justify-between mb-1">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Efficient Frontier{isCombined ? " — Combined" : ""}
                        </p>
                        {isCombined && newSymbols?.length > 0 && (
                            <p className="text-xs text-slate-600 mt-0.5">
                                Including{" "}
                                {newSymbols.map((s, i) => (
                                    <span key={s}>
                                        <span className="text-violet-400 font-mono font-semibold">
                                            {s}
                                        </span>
                                        {i < newSymbols.length - 1 ? ", " : ""}
                                    </span>
                                ))}{" "}
                                added to your portfolio
                            </p>
                        )}
                    </div>
                    <button
                        onClick={() => setShowInfo(true)}
                        className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-2.5 py-1 rounded-lg transition-colors"
                    >
                        <Info size={13} /> How this works
                    </button>
                </div>

                <ResponsiveContainer width="100%" height={360}>
                    <ComposedChart
                        data={frontier}
                        margin={{ top: 10, right: 20, bottom: 24, left: 10 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis
                            dataKey="vol"
                            type="number"
                            domain={["auto", "auto"]}
                            tick={{ fill: "#94a3b8", fontSize: 11 }}
                            unit="%"
                            label={{
                                value: "Annualized Volatility (%)",
                                position: "insideBottom",
                                offset: -10,
                                fill: "#64748b",
                                fontSize: 11,
                            }}
                        />
                        <YAxis
                            dataKey="ret"
                            type="number"
                            domain={["auto", "auto"]}
                            tick={{ fill: "#94a3b8", fontSize: 11 }}
                            unit="%"
                            label={{
                                value: "Expected Return (%)",
                                angle: -90,
                                position: "insideLeft",
                                offset: 10,
                                fill: "#64748b",
                                fontSize: 11,
                            }}
                        />
                        <Tooltip
                            content={
                                <FrontierTooltip
                                    portSymbols={portSymbols}
                                    investments={investments}
                                    priceMap={priceMap}
                                    cash={cash}
                                />
                            }
                        />
                        <Line
                            type="monotone"
                            dataKey="ret"
                            stroke={lineColor}
                            strokeWidth={2.5}
                            dot={{
                                r: 3,
                                fill: lineColor,
                                stroke: "#1e293b",
                                strokeWidth: 1,
                            }}
                            activeDot={{ r: 5 }}
                        />
                        {maxDiv && (
                            <ReferenceDot
                                x={maxDiv.vol}
                                y={maxDiv.ret}
                                r={9}
                                fill="#38bdf8"
                                stroke="#1e293b"
                                strokeWidth={2}
                                label={{
                                    value: "Max Div",
                                    position: "top",
                                    fill: "#38bdf8",
                                    fontSize: 10,
                                }}
                            />
                        )}
                        {maxSharpe && (
                            <ReferenceDot
                                x={maxSharpe.vol}
                                y={maxSharpe.ret}
                                r={9}
                                fill="#a78bfa"
                                stroke="#1e293b"
                                strokeWidth={2}
                                label={{
                                    value: "Max Sharpe",
                                    position: "top",
                                    fill: "#a78bfa",
                                    fontSize: 10,
                                }}
                            />
                        )}
                        {current && (
                            <ReferenceDot
                                x={current.vol}
                                y={current.ret}
                                r={11}
                                fill="#f59e0b"
                                stroke="#1e293b"
                                strokeWidth={2}
                                label={{
                                    value: "You",
                                    position: "top",
                                    fill: "#f59e0b",
                                    fontSize: 10,
                                    fontWeight: 600,
                                }}
                            />
                        )}
                    </ComposedChart>
                </ResponsiveContainer>

                <div className="flex flex-wrap gap-x-5 gap-y-2 mt-2 pt-3 border-t border-slate-700">
                    <div className="flex items-center gap-1.5">
                        <div
                            className="w-8 h-0.5 rounded"
                            style={{ background: lineColor }}
                        />
                        <span className="text-xs text-slate-400">
                            Efficient Frontier
                        </span>
                    </div>
                    {[
                        ["#f59e0b", "Your Portfolio"],
                        ["#38bdf8", "Max Diversification"],
                        ["#a78bfa", "Max Sharpe"],
                    ].map(([c, l]) => (
                        <div key={l} className="flex items-center gap-1.5">
                            <div
                                className="w-3.5 h-3.5 rounded-full border-2 border-slate-800"
                                style={{ background: c }}
                            />
                            <span className="text-xs text-slate-300 font-medium">
                                {l}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Param editor toggle */}
            <div>
                <button
                    onClick={() => setShowParams((p) => !p)}
                    className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-slate-100 bg-slate-800 border border-slate-700 hover:border-slate-600 px-4 py-2.5 rounded-xl transition-colors w-full"
                >
                    <SlidersHorizontal size={15} className="text-blue-400" />
                    Adjust Expected Returns &amp; Volatility
                    {Object.keys(overrides).length > 0 && (
                        <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded font-medium">
                            {Object.keys(overrides).length} custom
                        </span>
                    )}
                    <span className="ml-auto">
                        {showParams ? (
                            <ChevronUp size={14} />
                        ) : (
                            <ChevronDown size={14} />
                        )}
                    </span>
                </button>
                {showParams && (
                    <div className="mt-2">
                        <ParamEditor
                            allSymbols={allSymbols}
                            portSymbols={portSymbols || allSymbols}
                            overrides={overrides}
                            onChange={handleParamChange}
                            onReset={handleReset}
                        />
                    </div>
                )}
            </div>

            {/* Three portfolio cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {["current", "maxDiv", "maxSharpe"].map((key) => {
                    const pt = { current, maxDiv, maxSharpe }[key];
                    if (!pt) return null;
                    const { dot, accent, label, note } = PORTFOLIO_COLORS[key];
                    return (
                        <div
                            key={key}
                            className={`bg-slate-800 rounded-xl border border-slate-700 border-t-2 ${accent} p-4`}
                        >
                            <div className="flex items-center gap-2 mb-0.5">
                                <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ background: dot }}
                                />
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                    {label}
                                </p>
                            </div>
                            <p className="text-xs text-slate-600 mb-3">
                                {note}
                            </p>
                            <div className="space-y-1.5 border-b border-slate-700 pb-3 mb-1">
                                <div className="flex justify-between">
                                    <span className="text-xs text-slate-400">
                                        Exp. Annual Return
                                    </span>
                                    <span className="text-sm font-bold text-green-400">
                                        {pt.ret.toFixed(1)}%
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-xs text-slate-400">
                                        Annualized Volatility
                                    </span>
                                    <span className="text-sm font-bold text-yellow-400">
                                        {pt.vol.toFixed(1)}%
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-xs text-slate-400">
                                        Sharpe Ratio
                                    </span>
                                    <span className="text-sm font-bold text-blue-400">
                                        {pt.sharpe.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                            <AllocationTable
                                allocation={pt.allocation}
                                portSymbols={portSymbols}
                            />
                        </div>
                    );
                })}
            </div>

            {/* Rebalancing table */}
            <ComparisonTable
                current={current}
                maxDiv={maxDiv}
                maxSharpe={maxSharpe}
                investments={investments}
                portSymbols={portSymbols}
                priceMap={priceMap}
                cash={cash}
            />

            <p className="text-xs text-slate-600 text-center">
                Monte Carlo simulation · estimated historical parameters · not
                financial advice
            </p>
        </div>
    );
}
