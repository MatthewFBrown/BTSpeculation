import { useState } from "react";
import { getStats, fmt, fmtFull } from "../utils/calculations";
import { TrendingUp, TrendingDown } from "lucide-react";

function Hero({ s }) {
    const pnlUp = s.totalPnL >= 0;
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-slate-700 rounded-xl overflow-hidden border border-slate-700 mb-4">
            {/* Net P&L */}
            <div className="bg-slate-800 p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
                    Net P&L
                </p>
                <p
                    className={`text-2xl sm:text-4xl font-bold tabular-nums tracking-tight ${pnlUp ? "text-green-400" : "text-red-400"}`}
                >
                    {fmtFull(s.totalPnL)}
                </p>
                <p className="text-xs text-slate-500 mt-2">
                    Gross {fmtFull(s.totalGross)} · Fees {fmtFull(s.totalFees)}
                </p>
            </div>
            {/* Win Rate */}
            <div className="bg-slate-800 p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
                    Win Rate
                </p>
                <p
                    className={`text-2xl sm:text-4xl font-bold tabular-nums tracking-tight ${s.winRate >= 50 ? "text-green-400" : "text-red-400"}`}
                >
                    {s.totalTrades > 0 ? `${s.winRate.toFixed(1)}%` : "—"}
                </p>
                <p className="text-xs text-slate-500 mt-2">
                    {s.wins}W · {s.losses}L · {s.totalTrades} closed
                </p>
            </div>
            {/* Profit Factor */}
            <div className="bg-slate-800 p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
                    Profit Factor
                </p>
                <p
                    className={`text-2xl sm:text-4xl font-bold tabular-nums tracking-tight ${s.profitFactor >= 1.5 ? "text-green-400" : s.profitFactor >= 1 ? "text-yellow-400" : "text-red-400"}`}
                >
                    {s.profitFactor > 0 ? s.profitFactor.toFixed(2) : "—"}
                </p>
                <p className="text-xs text-slate-500 mt-2">
                    {s.profitFactor >= 1.5
                        ? "Strong edge"
                        : s.profitFactor >= 1
                          ? "Marginal edge"
                          : s.profitFactor > 0
                            ? "No edge"
                            : "No closed trades"}
                </p>
            </div>
            {/* Expectancy */}
            <div className="bg-slate-800 p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
                    Expectancy
                </p>
                <p
                    className={`text-2xl sm:text-4xl font-bold tabular-nums tracking-tight ${s.expectancy >= 0 ? "text-green-400" : "text-red-400"}`}
                >
                    {s.totalTrades > 0 ? fmtFull(s.expectancy) : "—"}
                </p>
                <p className="text-xs text-slate-500 mt-2">
                    expected per trade
                </p>
            </div>
        </div>
    );
}

function MetricRow({ label, value, color = "text-slate-200", sub }) {
    return (
        <div className="flex items-center justify-between py-2.5 border-b border-slate-700/60 last:border-0">
            <span className="text-sm text-slate-400">{label}</span>
            <div className="text-right">
                <span className={`text-sm font-semibold tabular-nums ${color}`}>
                    {value}
                </span>
                {sub && (
                    <span className="text-xs text-slate-500 ml-2">{sub}</span>
                )}
            </div>
        </div>
    );
}

function MetricGroup({ title, accent, children, hidden = false }) {
    return (
        <div
            className={`bg-slate-800 rounded-xl border border-slate-700 border-t-2 ${accent} overflow-hidden ${hidden ? 'hidden md:block' : ''}`}
        >
            <div className="px-4 pt-4 pb-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">
                    {title}
                </p>
            </div>
            <div className="px-4 pb-3">{children}</div>
        </div>
    );
}

function StreakBadge({ value }) {
    if (value === 0)
        return <span className="text-sm font-semibold text-slate-500">—</span>;
    const isWin = value > 0;
    const Icon = isWin ? TrendingUp : TrendingDown;
    return (
        <span
            className={`inline-flex items-center gap-1 text-sm font-semibold ${isWin ? "text-green-400" : "text-red-400"}`}
        >
            <Icon size={13} />
            {Math.abs(value)}
            {isWin ? "W" : "L"} streak
        </span>
    );
}

const TABS = ['P&L Breakdown', 'Win / Loss', 'Activity']

export default function Dashboard({ trades }) {
    const s = getStats(trades);
    const [activeTab, setActiveTab] = useState(0);

    return (
        <div className="mb-6 space-y-4">
            <Hero s={s} />

            {/* Mobile tab switcher */}
            <div className="flex md:hidden gap-2">
                {TABS.map((t, i) => (
                    <button key={t} onClick={() => setActiveTab(i)}
                        className={`flex-1 py-1.5 rounded text-xs font-medium ${activeTab === i ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                        {t}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* P&L Breakdown */}
                <MetricGroup title="P&L Breakdown" accent="border-t-blue-500" hidden={activeTab !== 0}>
                    <MetricRow
                        label="Gross P&L"
                        value={fmtFull(s.totalGross)}
                        color={
                            s.totalGross >= 0
                                ? "text-green-400"
                                : "text-red-400"
                        }
                    />
                    <MetricRow
                        label="Total Fees"
                        value={fmtFull(s.totalFees)}
                        color="text-yellow-400"
                    />
                    <MetricRow
                        label="Net P&L"
                        value={fmtFull(s.totalPnL)}
                        color={
                            s.totalPnL >= 0 ? "text-green-400" : "text-red-400"
                        }
                    />
                    <MetricRow
                        label="Max Drawdown"
                        value={s.maxDrawdown > 0 ? fmt(s.maxDrawdown) : "—"}
                        color="text-red-400"
                    />
                    <MetricRow
                        label="Expectancy"
                        value={s.totalTrades > 0 ? fmtFull(s.expectancy) : "—"}
                        color={
                            s.expectancy >= 0
                                ? "text-green-400"
                                : "text-red-400"
                        }
                        sub="per trade"
                    />
                    <MetricRow
                        label="Profit Factor"
                        value={
                            s.profitFactor > 0 ? s.profitFactor.toFixed(2) : "—"
                        }
                        color={
                            s.profitFactor >= 1.5
                                ? "text-green-400"
                                : s.profitFactor >= 1
                                  ? "text-yellow-400"
                                  : "text-red-400"
                        }
                    />
                </MetricGroup>

                {/* Win / Loss */}
                <MetricGroup title="Win / Loss" accent="border-t-emerald-500" hidden={activeTab !== 1}>
                    <MetricRow
                        label="Win Rate"
                        value={
                            s.totalTrades > 0 ? `${s.winRate.toFixed(1)}%` : "—"
                        }
                        color={
                            s.winRate >= 50 ? "text-green-400" : "text-red-400"
                        }
                        sub={
                            s.totalTrades > 0 ? `${s.wins}W / ${s.losses}L` : ""
                        }
                    />
                    <MetricRow
                        label="Req. Win Rate"
                        value={
                            s.requiredWinRate !== null
                                ? `${s.requiredWinRate.toFixed(1)}%`
                                : "—"
                        }
                        color={
                            s.requiredWinRate !== null &&
                            s.winRate >= s.requiredWinRate
                                ? "text-green-400"
                                : "text-yellow-400"
                        }
                        sub={s.requiredWinRate !== null ? "to break even" : ""}
                    />
                    <MetricRow
                        label="Avg Win"
                        value={s.wins > 0 ? fmtFull(s.avgWin) : "—"}
                        color="text-green-400"
                    />
                    <MetricRow
                        label="Avg Loss"
                        value={s.losses > 0 ? fmtFull(s.avgLoss) : "—"}
                        color="text-red-400"
                    />
                    <MetricRow
                        label="Avg R:R"
                        value={
                            s.rrRatio > 0 ? `${s.rrRatio.toFixed(2)} : 1` : "—"
                        }
                        color={
                            s.rrRatio >= 1.5
                                ? "text-green-400"
                                : "text-yellow-400"
                        }
                    />
                    <MetricRow
                        label="Best Trade"
                        value={s.bestTrade !== null ? fmt(s.bestTrade) : "—"}
                        color="text-green-400"
                    />
                    <MetricRow
                        label="Worst Trade"
                        value={s.worstTrade !== null ? fmt(s.worstTrade) : "—"}
                        color="text-red-400"
                    />
                </MetricGroup>

                {/* Activity */}
                <MetricGroup title="Activity" accent="border-t-violet-500" hidden={activeTab !== 2}>
                    <MetricRow
                        label="Total Trades"
                        value={s.totalTrades || "—"}
                    />
                    <MetricRow
                        label="Open Trades"
                        value={s.openTrades || "—"}
                        color={
                            s.openTrades > 0
                                ? "text-blue-400"
                                : "text-slate-200"
                        }
                    />
                    <MetricRow
                        label="Avg Hold"
                        value={
                            s.avgHoldingDays > 0
                                ? `${s.avgHoldingDays.toFixed(1)} days`
                                : "—"
                        }
                    />
                    <div className="flex items-center justify-between py-2.5 border-b border-slate-700/60">
                        <span className="text-sm text-slate-400">
                            Current Streak
                        </span>
                        <StreakBadge value={s.currentStreak} />
                    </div>
                    <MetricRow
                        label="Best Win Streak"
                        value={
                            s.maxWinStreak > 0 ? `${s.maxWinStreak} wins` : "—"
                        }
                        color="text-green-400"
                    />
                    <MetricRow
                        label="Worst Loss Streak"
                        value={
                            s.maxLossStreak > 0
                                ? `${s.maxLossStreak} losses`
                                : "—"
                        }
                        color="text-red-400"
                    />
                </MetricGroup>
            </div>
        </div>
    );
}
