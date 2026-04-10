import { useState } from "react";
import { getStats, fmt, fmtFull } from "../utils/calculations";
import { TrendingUp, TrendingDown } from "lucide-react";

function Hero({ s }) {
    const pnlUp = s.totalPnL >= 0;
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {/* Net P&L */}
            <div className={`bg-slate-800/50 hover:bg-slate-800/70 backdrop-blur-md rounded-lg p-4 sm:p-6 ring-1 ring-white/[0.08] border-t-2 transition-all duration-200 ${pnlUp ? "border-emerald-500" : "border-red-500"}`}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400 mb-2">
                    Net P&L
                </p>
                <p
                    className={`text-2xl sm:text-4xl font-bold tabular-nums tracking-tight ${pnlUp ? "text-emerald-400" : "text-red-400"}`}
                >
                    {fmtFull(s.totalPnL)}
                </p>
                <p className="text-xs text-slate-500 mt-3 space-y-0.5">
                    <div>Gross {fmtFull(s.totalGross)}</div>
                    <div>Fees {fmtFull(s.totalFees)}</div>
                </p>
            </div>
            {/* Win Rate */}
            <div className={`bg-slate-800/50 hover:bg-slate-800/70 backdrop-blur-md rounded-lg p-4 sm:p-6 ring-1 ring-white/[0.08] border-t-2 transition-all duration-200 ${s.totalTrades > 0 && s.winRate >= 50 ? "border-emerald-500" : s.totalTrades > 0 ? "border-red-500" : "border-slate-600"}`}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400 mb-2">
                    Win Rate
                </p>
                <p
                    className={`text-2xl sm:text-4xl font-bold tabular-nums tracking-tight ${s.winRate >= 50 ? "text-emerald-400" : "text-red-400"}`}
                >
                    {s.totalTrades > 0 ? `${s.winRate.toFixed(1)}%` : "—"}
                </p>
                <p className="text-xs text-slate-500 mt-3">
                    {s.wins}W · {s.losses}L · {s.totalTrades} closed
                </p>
            </div>
            {/* Profit Factor */}
            <div className="bg-slate-800/50 hover:bg-slate-800/70 backdrop-blur-md rounded-lg p-4 sm:p-6 ring-1 ring-white/[0.08] border-t-2 border-amber-500 transition-all duration-200">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400 mb-2">
                    Profit Factor
                </p>
                <p
                    className={`text-2xl sm:text-4xl font-bold tabular-nums tracking-tight ${s.profitFactor >= 1.5 ? "text-emerald-400" : s.profitFactor >= 1 ? "text-amber-400" : "text-red-400"}`}
                >
                    {s.profitFactor > 0 ? s.profitFactor.toFixed(2) : "—"}
                </p>
                <p className="text-xs text-slate-500 mt-3">
                    {s.profitFactor >= 1.5
                        ? "Strong edge"
                        : s.profitFactor >= 1
                          ? "Marginal edge"
                          : s.profitFactor > 0
                            ? "No edge"
                            : "No data"}
                </p>
            </div>
            {/* Expectancy */}
            <div className="bg-slate-800/50 hover:bg-slate-800/70 backdrop-blur-md rounded-lg p-4 sm:p-6 ring-1 ring-white/[0.08] border-t-2 border-blue-500 transition-all duration-200">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400 mb-2">
                    Expectancy
                </p>
                <p
                    className={`text-2xl sm:text-4xl font-bold tabular-nums tracking-tight ${s.expectancy >= 0 ? "text-emerald-400" : "text-red-400"}`}
                >
                    {s.totalTrades > 0 ? fmtFull(s.expectancy) : "—"}
                </p>
                <p className="text-xs text-slate-500 mt-3">
                    expected per trade
                </p>
            </div>
        </div>
    );
}

function MetricRow({ label, value, color = "text-slate-200", sub }) {
    return (
        <div className="flex items-center justify-between py-3 border-b border-white/[0.05] last:border-0">
            <span className="text-sm text-slate-400 font-medium">{label}</span>
            <div className="text-right">
                <span className={`text-sm font-bold tabular-nums ${color}`}>
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
            className={`bg-slate-800/50 backdrop-blur-md rounded-lg ring-1 ring-white/[0.08] border-t-2 ${accent} overflow-hidden ${hidden ? 'hidden md:block' : ''} hover:bg-slate-800/60 transition-colors duration-200`}
        >
            <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">
                    {title}
                </p>
            </div>
            <div className="px-4 sm:px-5 pb-4">{children}</div>
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
            <div className="flex md:hidden gap-1.5">
                {TABS.map((t, i) => (
                    <button key={t} onClick={() => setActiveTab(i)}
                        className={`flex-1 py-2 rounded text-[11px] font-medium leading-tight ${activeTab === i ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
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
