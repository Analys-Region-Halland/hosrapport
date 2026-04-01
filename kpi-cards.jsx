import { useState, useRef, useCallback } from "react";

// Shared mono style with tabular numbers
const mono = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontFeatureSettings: "'tnum'",
  fontVariantNumeric: "tabular-nums",
};

// --- SPARKLINE WITH CROSSHAIR ---
const Sparkline = ({ data, color = "#2563eb", height = 48, labels = [], unit = "", decimals = 0 }) => {
  if (!data || data.length < 2) return null;
  const containerRef = useRef(null);
  const [hover, setHover] = useState(null);

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 3;
  const h = height - pad * 2;
  const w = 120;

  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * w,
    y: pad + h - ((v - min) / range) * h,
    value: v,
  }));
  const pts = points.map(p => `${p.x},${p.y}`);
  const area = `0,${height} 0,${points[0].y} ${pts.join(" ")} ${w},${points[points.length - 1].y} ${w},${height}`;

  const handleMove = useCallback((e) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const relX = (e.clientX - rect.left) / rect.width;
    const idx = Math.max(0, Math.min(data.length - 1, Math.round(relX * (data.length - 1))));
    const pt = points[idx];
    if (pt) setHover({ svgX: pt.x, svgY: pt.y, idx, value: pt.value });
  }, [data, points]);

  const fmtVal = (v) => v.toLocaleString("sv-SE", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

  return (
    <div ref={containerRef} onMouseMove={handleMove} onMouseLeave={() => setHover(null)}
      style={{ position: "relative", cursor: hover ? "crosshair" : "default", height: "100%" }}>
      <svg viewBox={`0 0 ${w} ${height}`} style={{ width: "100%", height: "100%", display: "block" }} preserveAspectRatio="none">
        <polygon points={area} fill={color} opacity="0.06" />
        <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        {!hover && <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="2.5" fill={color} />}
        {hover && <>
          <line x1={hover.svgX} y1={0} x2={hover.svgX} y2={height} stroke={color} strokeWidth="0.8" strokeDasharray="2,2" opacity="0.45" />
          <circle cx={hover.svgX} cy={hover.svgY} r="3" fill="#fff" stroke={color} strokeWidth="1.5" />
        </>}
      </svg>
      {hover && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 5px)",
          left: `${(hover.svgX / w) * 100}%`, transform: "translateX(-50%)",
          background: "#1a1a1a", color: "#f5f5f5",
          ...mono, fontSize: 11.5, fontWeight: 500,
          padding: "4px 8px", borderRadius: 4, whiteSpace: "nowrap", pointerEvents: "none", zIndex: 10,
          boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
        }}>
          {labels[hover.idx] && <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 400, marginRight: 5, opacity: 0.85 }}>{labels[hover.idx]}</span>}
          {fmtVal(hover.value)}{unit}
        </div>
      )}
    </div>
  );
};

// --- STATUS ---
const STATUS_CONFIG = {
  on_track:  { color: "#16a34a", label: "I fas" },
  watch:     { color: "#ea980c", label: "Bevaka" },
  off_track: { color: "#dc2626", label: "Avvikelse" },
  neutral:   { color: "#a3a3a3", label: "Ej bedömt" },
};

const StatusDot = ({ status }) => {
  if (!status) return null;
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.neutral;
  const [show, setShow] = useState(false);
  return (
    <span onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}
      style={{ position: "relative", display: "inline-flex", alignItems: "center", marginRight: 7, cursor: "default", flexShrink: 0 }}>
      <span style={{
        width: 9, height: 9, borderRadius: "50%", background: cfg.color, display: "inline-block",
        boxShadow: status === "off_track" ? `0 0 0 3px ${cfg.color}18` : "none",
      }} />
      {show && (
        <span style={{
          position: "absolute", left: "calc(100% + 5px)", top: "50%", transform: "translateY(-50%)",
          background: "#1a1a1a", color: "#f5f5f5",
          fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 11.5, fontWeight: 500,
          padding: "3px 8px", borderRadius: 4, whiteSpace: "nowrap", pointerEvents: "none", zIndex: 20,
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        }}>{cfg.label}</span>
      )}
    </span>
  );
};

// --- TITLE TOOLTIP ---
const TitleWithTooltip = ({ title, description }) => {
  const [show, setShow] = useState(false);
  const titleStyle = { fontSize: 14, fontWeight: 600, color: "#111", lineHeight: 1.3, letterSpacing: "-0.01em" };
  if (!description) return <span style={titleStyle}>{title}</span>;
  return (
    <span onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)} style={{ position: "relative" }}>
      <span style={{ ...titleStyle, cursor: "help", borderBottom: "1px dashed #999", paddingBottom: 1 }}>{title}</span>
      {show && (
        <div style={{
          position: "absolute", top: "calc(100% + 7px)", left: 0,
          background: "#1a1a1a", color: "#e8e8e8",
          fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, fontWeight: 400, lineHeight: 1.5,
          padding: "9px 11px", borderRadius: 5, maxWidth: 290, zIndex: 20,
          pointerEvents: "none", boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
        }}>{description}</div>
      )}
    </span>
  );
};

// --- CHANGE TAG ---
const ChangeTag = ({ label, value, unit = "", inverse = false }) => {
  if (value == null) return null;
  const isPos = inverse ? value < 0 : value > 0;
  const isNeg = inverse ? value > 0 : value < 0;
  const color = isPos ? "#15803d" : isNeg ? "#b91c1c" : "#525252";
  const bg = isPos ? "#f0fdf4" : isNeg ? "#fef2f2" : "#f5f5f5";
  const arrow = value > 0 ? "↑" : value < 0 ? "↓" : "→";
  return (
    <span style={{
      display: "inline-flex", alignItems: "baseline", gap: 4,
      background: bg, padding: "2px 6px", borderRadius: 3, marginRight: 5, marginTop: 1,
    }}>
      <span style={{ ...mono, fontSize: 12, fontWeight: 600, color, lineHeight: 1.2 }}>
        {arrow}{Math.abs(value).toLocaleString("sv-SE", { maximumFractionDigits: 1 })}{unit}
      </span>
      <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 11, fontWeight: 500, color: "#555", lineHeight: 1.2 }}>{label}</span>
    </span>
  );
};

// --- KPI CARD ---
const KpiCard = ({
  title, description, subtitle,
  value, valuePrefix = "", valueSuffix = "", decimals = 0,
  showSparkline = true, sparkData = [], sparkLabels = [], sparkUnit = "", sparkDecimals = 0, sparkColor,
  changes = [],
  status = null,
  showStatus = true,
  accentColor = "#2563eb",
}) => {
  const fmt = typeof value === "number"
    ? value.toLocaleString("sv-SE", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : value;
  const sc = sparkColor || accentColor;

  return (
    <div style={{
      width: 288,
      background: "#fff",
      border: "1px solid #d9d9d9",
      borderLeft: `3px solid ${accentColor}`,
      borderRadius: 5,
      padding: "12px 14px 12px 13px",
      fontFamily: "'IBM Plex Sans', sans-serif",
      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    }}>
      {/* Title */}
      <div style={{ display: "flex", alignItems: "center", lineHeight: 1.3, marginBottom: 2 }}>
        {showStatus && status && <StatusDot status={status} />}
        <TitleWithTooltip title={title} description={description} />
      </div>
      {subtitle && (
        <div style={{ fontSize: 12, color: "#4a4a4a", lineHeight: 1.35, marginBottom: 5, fontWeight: 400 }}>{subtitle}</div>
      )}

      {/* HERO */}
      <div style={{ display: "flex", gap: 10, alignItems: "stretch", minHeight: 52 }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", flexShrink: 0 }}>
          <div style={{
            ...mono,
            fontSize: 22, fontWeight: 600, color: "#0a0a0a",
            lineHeight: 1.1, letterSpacing: "-0.025em",
          }}>
            {valuePrefix}{fmt}
            <span style={{ fontSize: 13, fontWeight: 500, color: "#4a4a4a", marginLeft: 2, letterSpacing: 0 }}>{valueSuffix}</span>
          </div>
          {changes.length > 0 && (
            <div style={{ marginTop: 5, display: "flex", flexWrap: "wrap", gap: 2 }}>
              {changes.map((c, i) => (
                <ChangeTag key={i} label={c.label} value={c.value} unit={c.unit} inverse={c.inverse} />
              ))}
            </div>
          )}
        </div>

        {showSparkline && sparkData.length > 1 && (
          <div style={{ flex: 1, minWidth: 55, display: "flex", alignItems: "stretch", overflow: "visible" }}>
            <div style={{ width: "100%", position: "relative" }}>
              <Sparkline data={sparkData} color={sc} height={52} labels={sparkLabels} unit={sparkUnit} decimals={sparkDecimals} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- TOGGLE ---
const Toggle = ({ label, checked, onChange }) => (
  <label style={{
    display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
    fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: "#333", userSelect: "none", fontWeight: 450,
  }}>
    <div onClick={onChange} style={{
      width: 28, height: 15, borderRadius: 8,
      background: checked ? "#2563eb" : "#bbb",
      position: "relative", transition: "background 0.15s", cursor: "pointer",
    }}>
      <div style={{
        width: 11, height: 11, borderRadius: 6, background: "#fff",
        position: "absolute", top: 2, left: checked ? 15 : 2,
        transition: "left 0.15s", boxShadow: "0 1px 2px rgba(0,0,0,0.18)",
      }} />
    </div>
    {label}
  </label>
);

// --- DEMO ---
export default function KpiDashboard() {
  const [spark, setSpark] = useState(true);
  const [showSt, setShowSt] = useState(true);

  const quarters = ["Q1-23","Q2-23","Q3-23","Q4-23","Q1-24","Q2-24","Q3-24","Q4-24","Q1-25","Q2-25","Q3-25","Q4-25"];
  const months = ["Apr","Maj","Jun","Jul","Aug","Sep","Okt","Nov","Dec","Jan","Feb","Mar"];

  const pop = [343200,343800,344100,344900,345400,345900,346200,346800,347300,347900,348400,349100];
  const emp = [78.1,78.4,78.2,78.8,79.1,79.3,79.0,79.5,79.8,80.1,79.9,80.3];
  const vac = [1200,1150,1300,1280,1420,1380,1500,1550,1490,1610,1580,1640];
  const edu = [42.1,42.4,42.8,43.0,43.3,43.1,43.5,43.8,44.0,44.2,44.5,44.8];

  return (
    <div style={{ minHeight: "100vh", background: "#f4f4f3", padding: "24px 16px", fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600&display=swap" rel="stylesheet" />
      <div style={{ maxWidth: 1260, margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 16, marginBottom: 18, alignItems: "center" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#111" }}>Visa:</span>
          <Toggle label="Sparkline" checked={spark} onChange={() => setSpark(!spark)} />
          <Toggle label="Status" checked={showSt} onChange={() => setShowSt(!showSt)} />
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <KpiCard
            title="Folkmängd"
            description="Total folkbokförd befolkning i Hallands län vid kvartalets slut. Källa: SCB befolkningsstatistik."
            subtitle="Hallands län, kvartal 4 2025"
            value={349100} status="on_track" showStatus={showSt}
            showSparkline={spark} sparkData={pop} sparkLabels={quarters} accentColor="#2563eb"
            changes={[ { label: "kv", value: 700 }, { label: "år", value: 2800 } ]}
          />
          <KpiCard
            title="Sysselsättningsgrad, 20–64 år"
            description="Andel sysselsatta i befolkningen 20–64 år. Säsongsrensade kvartalsvärden. Källa: SCB AKU."
            subtitle="Halland, kvartal 4 2025"
            value={80.3} valueSuffix="%" decimals={1} status="on_track" showStatus={showSt}
            showSparkline={spark} sparkData={emp} sparkLabels={quarters} sparkUnit="%" sparkDecimals={1}
            accentColor="#16a34a" sparkColor="#16a34a"
            changes={[ { label: "kv", value: 0.4, unit: " pp" }, { label: "år", value: 1.5, unit: " pp" } ]}
          />
          <KpiCard
            title="Lediga jobb"
            description="Antal nyanmälda lediga platser hos Arbetsförmedlingen under månaden."
            subtitle="Halland, mars 2025"
            value={1640} status="watch" showStatus={showSt}
            showSparkline={spark} sparkData={vac} sparkLabels={months} sparkUnit=" st"
            accentColor="#ea580c" sparkColor="#ea580c"
            changes={[ { label: "mån", value: 60 }, { label: "år", value: 220 } ]}
          />
          <KpiCard
            title="Eftergymnasial utbildning, 25–64 år"
            description="Andel av befolkningen 25–64 år med minst 3 års eftergymnasial utbildning. Källa: SCB utbildningsregistret."
            subtitle="Halland, 2024"
            value={44.8} valueSuffix="%" decimals={1} status="off_track" showStatus={showSt}
            showSparkline={spark} sparkData={edu}
            sparkLabels={["2013","2014","2015","2016","2017","2018","2019","2020","2021","2022","2023","2024"]}
            sparkUnit="%" sparkDecimals={1}
            accentColor="#7c3aed" sparkColor="#7c3aed"
            changes={[ { label: "år", value: 0.6, unit: " pp" }, { label: "5 år", value: 3.2, unit: " pp" } ]}
          />
          <KpiCard
            title="Arbetslöshet, 15–74 år"
            description="Andel arbetslösa i arbetskraften 15–74 år. Källa: SCB AKU."
            subtitle="Halland, kvartal 4 2025"
            value={5.1} valueSuffix="%" decimals={1} status={null} showStatus={showSt}
            showSparkline={spark}
            sparkData={[7.2,7.0,6.8,6.5,6.3,6.1,5.9,5.7,5.5,5.4,5.2,5.1]}
            sparkLabels={quarters} sparkUnit="%" sparkDecimals={1}
            accentColor="#525252" sparkColor="#525252"
            changes={[ { label: "kv", value: -0.1, unit: " pp", inverse: true }, { label: "år", value: -1.2, unit: " pp", inverse: true } ]}
          />
        </div>
      </div>
    </div>
  );
}
