import { useState, useEffect, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Calendar,
  Zap,
  BarChart2,
  ChevronUp,
  ChevronDown,
  Activity,
  Bitcoin,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

// ─── DATE ENGINE ────────────────────────────────────────────────────────────
const EXPANSION_DAYS = 1064; // ATL → ATH
const COMPRESSION_DAYS = 364; // ATH → ATL

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function generateCycles(endYear = 2050) {
  // Anchored to the Nov 2022 FTX-crash ATL → predicts ATH ~Oct 2025
  // (2015-08-25 original origin is noted as the pattern start)
  const ATL_START = new Date("2022-11-21"); // FTX bottom ATL anchor
  const events = [];
  let current = ATL_START;
  let cycleNumber = 1;
  const endDate = new Date(`${endYear}-12-31`);

  events.push({
    id: 0,
    cycle: cycleNumber,
    type: "ATL",
    date: new Date(current),
    daysFromLast: 0,
    label: "Cycle Origin",
  });

  let isExpansion = true; // first phase: ATL → ATH

  while (current < endDate) {
    const days = isExpansion ? EXPANSION_DAYS : COMPRESSION_DAYS;
    current = addDays(current, days);
    if (current > endDate) break;

    const type = isExpansion ? "ATH" : "ATL";
    if (type === "ATH") cycleNumber++;

    events.push({
      id: events.length,
      cycle: type === "ATH" ? cycleNumber : cycleNumber,
      type,
      date: new Date(current),
      daysFromLast: days,
      label: type === "ATH" ? `Cycle ${cycleNumber} Peak` : `Cycle ${cycleNumber} Bottom`,
    });

    isExpansion = !isExpansion;
  }

  return events;
}

function formatDate(date) {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateShort(date) {
  return date.toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
  });
}

function getCountdown(targetDate) {
  const now = new Date();
  const diff = targetDate - now;
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, past: true };
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { days, hours, minutes, seconds, past: false };
}

// ─── CHART DATA ─────────────────────────────────────────────────────────────
function buildChartData(events) {
  return events.map((e, i) => ({
    timestamp: e.date.getTime(),
    dateLabel: formatDateShort(e.date),
    value: e.type === "ATH" ? 100 : 0,
    type: e.type,
    label: e.label,
    cycle: e.cycle,
  }));
}

// ─── CUSTOM TOOLTIP ─────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="tooltip-card">
      <div className={`tooltip-badge ${d.type === "ATH" ? "badge-ath" : "badge-atl"}`}>
        {d.type === "ATH" ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
        {d.type}
      </div>
      <p className="tooltip-label">{d.label}</p>
      <p className="tooltip-date">{d.dateLabel}</p>
    </div>
  );
};

// ─── CUSTOM DOT ─────────────────────────────────────────────────────────────
const CustomDot = (props) => {
  const { cx, cy, payload } = props;
  const isATH = payload.type === "ATH";
  const color = isATH ? "#FBBF24" : "#F43F5E";
  const now = new Date();
  const isPast = payload.timestamp < now.getTime();
  return (
    <g>
      {!isPast && (
        <>
          <circle cx={cx} cy={cy} r={10} fill={color} fillOpacity={0.15} />
          <circle cx={cx} cy={cy} r={7} fill={color} fillOpacity={0.25} />
        </>
      )}
      <circle cx={cx} cy={cy} r={isPast ? 3 : 5} fill={color} stroke="#0f172a" strokeWidth={2} />
    </g>
  );
};

// ─── COUNTDOWN UNIT ─────────────────────────────────────────────────────────
const CountdownUnit = ({ value, label }) => (
  <div className="countdown-unit">
    <div className="countdown-value">{String(value).padStart(2, "0")}</div>
    <div className="countdown-label">{label}</div>
  </div>
);

// ─── MAIN APP ────────────────────────────────────────────────────────────────
export default function App() {
  const [tick, setTick] = useState(0);
  const [tableFilter, setTableFilter] = useState("ALL");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const events = useMemo(() => generateCycles(2050), []);
  const chartData = useMemo(() => buildChartData(events), [events]);

  const now = new Date();

  const nextEvent = useMemo(
    () => events.find((e) => e.date > now),
    [events, tick]
  );

  const prevEvent = useMemo(
    () => [...events].reverse().find((e) => e.date <= now),
    [events, tick]
  );

  const countdown = useMemo(
    () => (nextEvent ? getCountdown(nextEvent.date) : null),
    [nextEvent, tick]
  );

  const filteredEvents = useMemo(() => {
    const base = tableFilter === "ALL" ? events : events.filter((e) => e.type === tableFilter);
    return showAll ? base : base.slice(0, 20);
  }, [events, tableFilter, showAll]);

  const visibleChartData = useMemo(() => {
    // Show from 2015 to 2032 for cleaner chart
    const start = new Date("2015-01-01").getTime();
    const end = new Date("2032-12-31").getTime();
    return chartData.filter((d) => d.timestamp >= start && d.timestamp <= end);
  }, [chartData]);

  const nowLineX = now.getTime();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg-base: #020617;
          --bg-surface: #0f172a;
          --bg-elevated: #1e293b;
          --bg-border: #334155;
          --text-primary: #f1f5f9;
          --text-secondary: #94a3b8;
          --text-muted: #475569;
          --ath: #FBBF24;
          --ath-dim: rgba(251,191,36,0.12);
          --atl: #F43F5E;
          --atl-dim: rgba(244,63,94,0.12);
          --accent: #38BDF8;
          --accent-dim: rgba(56,189,248,0.1);
          --mono: 'Space Mono', monospace;
          --sans: 'DM Sans', sans-serif;
        }

        body {
          background: var(--bg-base);
          color: var(--text-primary);
          font-family: var(--sans);
          min-height: 100vh;
          overflow-x: hidden;
        }

        /* Grid bg */
        body::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image:
            linear-gradient(rgba(56,189,248,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(56,189,248,0.03) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none;
          z-index: 0;
        }

        .app { position: relative; z-index: 1; max-width: 1280px; margin: 0 auto; padding: 0 24px 80px; }

        /* NAV */
        .nav {
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 0; border-bottom: 1px solid var(--bg-border);
          margin-bottom: 48px;
        }
        .nav-brand {
          display: flex; align-items: center; gap: 10px;
          font-family: var(--mono); font-size: 16px; font-weight: 700;
          color: var(--text-primary); text-transform: uppercase; letter-spacing: 2px;
        }
        .nav-brand-icon {
          width: 36px; height: 36px; border-radius: 8px;
          background: linear-gradient(135deg, var(--ath) 0%, #f59e0b 100%);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 20px rgba(251,191,36,0.35);
        }
        .nav-pill {
          font-family: var(--mono); font-size: 10px; letter-spacing: 1.5px;
          padding: 4px 10px; border-radius: 20px;
          border: 1px solid var(--bg-border); color: var(--text-muted);
          background: var(--bg-surface);
        }

        /* HERO */
        .hero { text-align: center; margin-bottom: 56px; }
        .hero-eyebrow {
          font-family: var(--mono); font-size: 11px; letter-spacing: 3px;
          color: var(--accent); text-transform: uppercase; margin-bottom: 16px;
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .hero-eyebrow::before, .hero-eyebrow::after {
          content: ''; flex: 1; max-width: 60px; height: 1px; background: var(--accent-dim);
        }
        .hero-title {
          font-family: var(--mono); font-size: clamp(28px, 5vw, 52px);
          font-weight: 700; line-height: 1.1; margin-bottom: 12px;
          background: linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .hero-sub { color: var(--text-secondary); font-size: 15px; max-width: 500px; margin: 0 auto; }

        /* STAT CARDS */
        .stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 40px; }
        .stat-card {
          background: var(--bg-surface); border: 1px solid var(--bg-border);
          border-radius: 12px; padding: 20px 24px;
          transition: border-color 0.2s;
        }
        .stat-card:hover { border-color: var(--bg-elevated); }
        .stat-card-label { font-size: 11px; font-family: var(--mono); letter-spacing: 1.5px; color: var(--text-muted); text-transform: uppercase; margin-bottom: 8px; }
        .stat-card-value { font-family: var(--mono); font-size: 22px; font-weight: 700; }
        .stat-card-sub { font-size: 12px; color: var(--text-secondary); margin-top: 4px; }
        .stat-ath { color: var(--ath); }
        .stat-atl { color: var(--atl); }
        .stat-accent { color: var(--accent); }

        /* COUNTDOWN SECTION */
        .countdown-section {
          background: var(--bg-surface);
          border: 1px solid var(--bg-border);
          border-radius: 16px; padding: 36px 32px; margin-bottom: 40px;
          position: relative; overflow: hidden;
        }
        .countdown-section::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, transparent, var(--ath), transparent);
        }
        .countdown-section.atl-next::before {
          background: linear-gradient(90deg, transparent, var(--atl), transparent);
        }
        .countdown-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; flex-wrap: wrap; gap: 12px; }
        .countdown-title { font-family: var(--mono); font-size: 13px; letter-spacing: 2px; color: var(--text-secondary); text-transform: uppercase; }
        .countdown-event-badge {
          display: flex; align-items: center; gap: 8px;
          padding: 6px 16px; border-radius: 20px;
          font-family: var(--mono); font-size: 13px; font-weight: 700; letter-spacing: 1px;
        }
        .badge-ath-full { background: var(--ath-dim); color: var(--ath); border: 1px solid rgba(251,191,36,0.3); }
        .badge-atl-full { background: var(--atl-dim); color: var(--atl); border: 1px solid rgba(244,63,94,0.3); }

        .countdown-grid { display: flex; align-items: center; justify-content: center; gap: 8px; flex-wrap: wrap; }
        .countdown-unit { text-align: center; }
        .countdown-value {
          font-family: var(--mono); font-size: clamp(36px, 6vw, 64px); font-weight: 700;
          background: linear-gradient(180deg, var(--text-primary) 0%, var(--text-secondary) 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          line-height: 1; display: block;
          background-clip: text;
        }
        .countdown-label { font-family: var(--mono); font-size: 10px; letter-spacing: 2px; color: var(--text-muted); text-transform: uppercase; margin-top: 6px; }
        .countdown-sep { font-family: var(--mono); font-size: clamp(28px, 4vw, 48px); color: var(--text-muted); line-height: 1; padding-bottom: 18px; }
        .countdown-date { text-align: center; margin-top: 20px; font-size: 14px; color: var(--text-secondary); }
        .countdown-date strong { color: var(--text-primary); font-family: var(--mono); }

        /* CHART SECTION */
        .section { margin-bottom: 48px; }
        .section-header { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 24px; gap: 16px; flex-wrap: wrap; }
        .section-title { font-family: var(--mono); font-size: 16px; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 10px; }
        .section-title-icon { color: var(--accent); }
        .section-desc { font-size: 13px; color: var(--text-muted); margin-top: 4px; }

        .chart-card {
          background: var(--bg-surface); border: 1px solid var(--bg-border);
          border-radius: 16px; padding: 24px 16px 16px;
          overflow: hidden;
        }
        .chart-legend { display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 20px; padding: 0 8px; }
        .legend-item { display: flex; align-items: center; gap: 8px; font-family: var(--mono); font-size: 11px; letter-spacing: 1px; color: var(--text-secondary); text-transform: uppercase; }
        .legend-dot { width: 10px; height: 10px; border-radius: 50%; }

        /* TOOLTIP */
        .tooltip-card {
          background: #1e293b; border: 1px solid #334155;
          border-radius: 10px; padding: 12px 16px;
          font-family: var(--sans); box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        }
        .tooltip-badge {
          display: inline-flex; align-items: center; gap: 4px;
          font-family: var(--mono); font-size: 10px; font-weight: 700; letter-spacing: 1px;
          padding: 2px 8px; border-radius: 4px; margin-bottom: 6px;
        }
        .badge-ath { background: var(--ath-dim); color: var(--ath); }
        .badge-atl { background: var(--atl-dim); color: var(--atl); }
        .tooltip-label { font-size: 13px; color: var(--text-primary); margin-bottom: 4px; }
        .tooltip-date { font-family: var(--mono); font-size: 11px; color: var(--text-secondary); }

        /* TABLE */
        .table-controls { display: flex; gap: 8px; flex-wrap: wrap; }
        .filter-btn {
          font-family: var(--mono); font-size: 11px; letter-spacing: 1px; text-transform: uppercase;
          padding: 6px 14px; border-radius: 6px; border: 1px solid var(--bg-border);
          background: transparent; color: var(--text-muted); cursor: pointer; transition: all 0.15s;
        }
        .filter-btn:hover { border-color: var(--accent); color: var(--accent); }
        .filter-btn.active-all { background: var(--accent-dim); border-color: var(--accent); color: var(--accent); }
        .filter-btn.active-ath { background: var(--ath-dim); border-color: var(--ath); color: var(--ath); }
        .filter-btn.active-atl { background: var(--atl-dim); border-color: var(--atl); color: var(--atl); }

        .table-card {
          background: var(--bg-surface); border: 1px solid var(--bg-border);
          border-radius: 16px; overflow: hidden;
        }
        .table-wrap { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; }
        thead th {
          font-family: var(--mono); font-size: 10px; letter-spacing: 2px; text-transform: uppercase;
          color: var(--text-muted); padding: 14px 20px; text-align: left;
          border-bottom: 1px solid var(--bg-border); background: var(--bg-base);
          white-space: nowrap;
        }
        tbody tr {
          border-bottom: 1px solid rgba(51,65,85,0.5);
          transition: background 0.15s;
        }
        tbody tr:hover { background: rgba(255,255,255,0.02); }
        tbody tr.is-past { opacity: 0.45; }
        tbody tr.is-next td { background: rgba(56,189,248,0.04); }
        tbody tr:last-child { border-bottom: none; }
        td {
          padding: 14px 20px; font-size: 14px; color: var(--text-secondary);
          white-space: nowrap;
        }
        td .cycle-num { font-family: var(--mono); font-size: 13px; color: var(--text-muted); }
        td .date-mono { font-family: var(--mono); font-size: 13px; color: var(--text-primary); }
        td .days-mono { font-family: var(--mono); font-size: 13px; }
        .type-pill {
          display: inline-flex; align-items: center; gap: 5px;
          font-family: var(--mono); font-size: 11px; font-weight: 700; letter-spacing: 1px;
          padding: 3px 10px; border-radius: 4px;
        }
        .type-ath { background: var(--ath-dim); color: var(--ath); }
        .type-atl { background: var(--atl-dim); color: var(--atl); }

        .show-more-btn {
          width: 100%; padding: 16px; background: transparent;
          border: none; border-top: 1px solid var(--bg-border);
          color: var(--text-muted); font-family: var(--mono); font-size: 11px;
          letter-spacing: 2px; text-transform: uppercase; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: color 0.15s;
        }
        .show-more-btn:hover { color: var(--accent); }

        /* FOOTER */
        .footer {
          text-align: center; padding-top: 32px; border-top: 1px solid var(--bg-border);
          font-family: var(--mono); font-size: 11px; letter-spacing: 1px;
          color: var(--text-muted);
        }
        .footer span { color: var(--text-secondary); }

        /* NOW INDICATOR */
        .now-label {
          font-family: 'Space Mono', monospace; font-size: 10px;
          fill: #38BDF8;
        }

        @media (max-width: 640px) {
          .app { padding: 0 16px 60px; }
          .nav { margin-bottom: 32px; }
          .countdown-section { padding: 24px 20px; }
          thead th, td { padding: 12px 14px; }
          .stat-card { padding: 16px; }
        }
      `}</style>

      <div className="app">
        {/* NAV */}
        <nav className="nav">
          <div className="nav-brand">
            <div className="nav-brand-icon">
              <Bitcoin size={20} color="#0f172a" strokeWidth={2.5} />
            </div>
            <span>CyclePulse</span>
          </div>
          <div className="nav-pill">BTC · 1064/364 MODEL</div>
        </nav>

        {/* HERO */}
        <div className="hero">
          <div className="hero-eyebrow">
            <Activity size={12} />
            Bitcoin Market Cycle Prediction Engine
          </div>
          <h1 className="hero-title">The Pulse of<br />Bitcoin Markets</h1>
          <p className="hero-sub">
            Algorithmically generated cycle predictions based on the 1064-day expansion and 364-day compression model, anchored to the November 2022 FTX bottom ATL — predicting ATH around October 2025.
          </p>
        </div>

        {/* STAT CARDS */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-card-label">Expansion Phase</div>
            <div className="stat-card-value stat-ath">1,064</div>
            <div className="stat-card-sub">days · ATL → ATH</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Compression Phase</div>
            <div className="stat-card-value stat-atl">364</div>
            <div className="stat-card-sub">days · ATH → ATL</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Full Cycle Length</div>
            <div className="stat-card-value stat-accent">1,428</div>
            <div className="stat-card-sub">days · ~3.91 years</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Prev Event</div>
            {prevEvent && (
              <>
                <div className={`stat-card-value ${prevEvent.type === "ATH" ? "stat-ath" : "stat-atl"}`}>
                  {prevEvent.type}
                </div>
                <div className="stat-card-sub">{formatDate(prevEvent.date)}</div>
              </>
            )}
          </div>
        </div>

        {/* COUNTDOWN */}
        {nextEvent && countdown && (
          <div className={`countdown-section ${nextEvent.type === "ATL" ? "atl-next" : ""}`}>
            <div className="countdown-header">
              <div>
                <div className="countdown-title">
                  <Clock size={14} style={{ display: "inline", marginRight: 6 }} />
                  Next Predicted Event
                </div>
              </div>
              <div className={`countdown-event-badge ${nextEvent.type === "ATH" ? "badge-ath-full" : "badge-atl-full"}`}>
                {nextEvent.type === "ATH"
                  ? <ArrowUpRight size={14} />
                  : <ArrowDownRight size={14} />}
                {nextEvent.type} · {nextEvent.label}
              </div>
            </div>

            <div className="countdown-grid">
              <CountdownUnit value={countdown.days} label="Days" />
              <div className="countdown-sep">:</div>
              <CountdownUnit value={countdown.hours} label="Hours" />
              <div className="countdown-sep">:</div>
              <CountdownUnit value={countdown.minutes} label="Min" />
              <div className="countdown-sep">:</div>
              <CountdownUnit value={countdown.seconds} label="Sec" />
            </div>

            <div className="countdown-date">
              Predicted for <strong>{formatDate(nextEvent.date)}</strong>
              <span style={{ margin: "0 8px", color: "var(--text-muted)" }}>·</span>
              Cycle <strong>{nextEvent.cycle}</strong>
            </div>
          </div>
        )}

        {/* CHART */}
        <div className="section">
          <div className="section-header">
            <div>
              <div className="section-title">
                <BarChart2 size={18} className="section-title-icon" />
                Cycle Pulse Chart
              </div>
              <div className="section-desc">2015 – 2032 · Idealized expansion / compression wave</div>
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-legend">
              <div className="legend-item">
                <div className="legend-dot" style={{ background: "#FBBF24" }} />
                All-Time High (ATH)
              </div>
              <div className="legend-item">
                <div className="legend-dot" style={{ background: "#F43F5E" }} />
                All-Time Low (ATL)
              </div>
              <div className="legend-item">
                <div className="legend-dot" style={{ background: "#38BDF8", borderRadius: 2 }} />
                Today
              </div>
            </div>

            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={visibleChartData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="waveGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FBBF24" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#F43F5E" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.4)" />
                <XAxis
                  dataKey="timestamp"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  scale="time"
                  tickFormatter={(t) => new Date(t).getFullYear()}
                  tick={{ fill: "#475569", fontSize: 11, fontFamily: "Space Mono" }}
                  axisLine={{ stroke: "#334155" }}
                  tickLine={false}
                />
                <YAxis
                  domain={[-10, 110]}
                  ticks={[0, 50, 100]}
                  tickFormatter={(v) => v === 100 ? "ATH" : v === 0 ? "ATL" : ""}
                  tick={{ fill: "#475569", fontSize: 10, fontFamily: "Space Mono" }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine
                  x={nowLineX}
                  stroke="#38BDF8"
                  strokeDasharray="4 3"
                  strokeWidth={1.5}
                  label={{ value: "NOW", position: "top", fill: "#38BDF8", fontSize: 10, fontFamily: "Space Mono" }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="url(#lineGrad)"
                  strokeWidth={2.5}
                  fill="url(#waveGrad)"
                  dot={<CustomDot />}
                  activeDot={{ r: 7, fill: "#f1f5f9", stroke: "#0f172a", strokeWidth: 2 }}
                />
                <defs>
                  <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#F43F5E" />
                    <stop offset="50%" stopColor="#FBBF24" />
                    <stop offset="100%" stopColor="#F43F5E" />
                  </linearGradient>
                </defs>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* TABLE */}
        <div className="section">
          <div className="section-header">
            <div>
              <div className="section-title">
                <Calendar size={18} className="section-title-icon" />
                Predicted Cycle Dates
              </div>
              <div className="section-desc">All events from 2015 ATL anchor to 2050</div>
            </div>
            <div className="table-controls">
              {["ALL", "ATH", "ATL"].map((f) => (
                <button
                  key={f}
                  className={`filter-btn ${tableFilter === f ? `active-${f.toLowerCase()}` : ""}`}
                  onClick={() => setTableFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="table-card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Cycle</th>
                    <th>Event</th>
                    <th>Predicted Date</th>
                    <th>Duration</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.map((e, i) => {
                    const isPast = e.date <= now;
                    const isNext = nextEvent && e.id === nextEvent.id;
                    return (
                      <tr key={e.id} className={isPast ? "is-past" : isNext ? "is-next" : ""}>
                        <td><span className="cycle-num">{String(i + 1).padStart(2, "0")}</span></td>
                        <td><span className="cycle-num">{e.cycle}</span></td>
                        <td>
                          <span className={`type-pill ${e.type === "ATH" ? "type-ath" : "type-atl"}`}>
                            {e.type === "ATH" ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                            {e.type}
                          </span>
                        </td>
                        <td><span className="date-mono">{formatDate(e.date)}</span></td>
                        <td>
                          <span className={`days-mono ${e.daysFromLast === EXPANSION_DAYS ? "stat-ath" : e.daysFromLast === COMPRESSION_DAYS ? "stat-atl" : "stat-accent"}`}>
                            {e.daysFromLast === 0 ? "Origin" : `${e.daysFromLast.toLocaleString()} days`}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: 11, fontFamily: "var(--mono)", letterSpacing: "1px" }}
                            className={isPast ? "" : isNext ? "stat-accent" : ""}>
                            {isPast ? "✓ PAST" : isNext ? "⬡ NEXT" : "○ FUTURE"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <button className="show-more-btn" onClick={() => setShowAll((s) => !s)}>
              {showAll ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {showAll ? "Show Less" : `Show All ${tableFilter === "ALL" ? events.length : events.filter(e=>e.type===tableFilter).length} Events`}
            </button>
          </div>
        </div>

        {/* FOOTER */}
        <footer className="footer">
          <p>
            CyclePulse · <span>1064/364 Expansion–Compression Model</span>
            <span style={{ margin: "0 10px", color: "var(--text-muted)" }}>·</span>
            Anchored to <span>21 Nov 2022 FTX ATL</span>
            <span style={{ margin: "0 10px", color: "var(--text-muted)" }}>·</span>
            Predictions are not financial advice.
          </p>
        </footer>
      </div>
    </>
  );
}
