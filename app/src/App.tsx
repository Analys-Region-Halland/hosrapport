import { useState } from "react";
import type { VyData, KpiData, AllData } from "./types";
import Section from "./components/Section";
import ChartModal from "./components/ChartModal";
import ReportView from "./components/ReportView";
import hosData from "./data/hos-data.json";

const allData = hosData as AllData;

type VyId = "dag" | "vecka" | "manad" | "kvartal" | "ar";

const VYER: { id: VyId; text: string }[] = [
  { id: "dag", text: "Dag" },
  { id: "vecka", text: "Vecka" },
  { id: "manad", text: "Månad" },
  { id: "kvartal", text: "Kvartal" },
  { id: "ar", text: "År" },
];

export default function App() {
  const [aktivVy, setAktivVy] = useState<VyId>("dag");
  const [visaDagar, setVisaDagar] = useState(false);
  const [editMode] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [chartKpi, setChartKpi] = useState<KpiData | null>(null);

  // Nollställ dag-toggle vid vy-byte
  const bytVy = (vy: VyId) => { setAktivVy(vy); setVisaDagar(false); };
  const harDagToggle = aktivVy !== "dag";

  const data = allData[aktivVy] as VyData;
  const allKpier = data.sektioner.flatMap((s) => s.kpier);
  const bevaka = allKpier.filter((k) => k.status === "gul").length;

  return (
    <div style={{ minHeight: "100vh", background: "#eeeee9", fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <link
        href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&family=Lexend+Deca:wght@300;400;500;600;700&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300;1,400&family=Source+Serif+4:wght@400;600;700&display=swap"
        rel="stylesheet"
      />

      {/* ─── Topbar ─── */}
      <nav style={{
        background: "#00664D",
        padding: "0 24px",
        height: 48,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{
            fontFamily: "'Lexend Deca', sans-serif", fontWeight: 600, fontSize: 14,
            color: "#fff", letterSpacing: "-0.01em",
          }}>
            HoS-rapport
          </span>
          <span style={{ width: 1, height: 16, background: "rgba(255,255,255,0.25)" }} />
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", fontWeight: 400 }}>
            Region Halland
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 400,
            fontFamily: "'IBM Plex Mono', monospace",
          }}>
            {data.datum} / {data.uppdaterad}
          </span>
        </div>
      </nav>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 20px 56px" }}>

        {/* ─── Vy-väljare ─── */}
        <div style={{
          display: "flex", gap: 0, marginBottom: 20,
          background: "#fff", borderRadius: 8,
          border: "1px solid rgba(131,136,138,0.22)",
          overflow: "hidden", width: "fit-content",
        }}>
          {VYER.map((vy, i) => (
            <button
              key={vy.id}
              onClick={() => bytVy(vy.id)}
              style={{
                padding: "9px 18px",
                border: "none",
                background: aktivVy === vy.id ? "#00664D" : "transparent",
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: 13,
                fontWeight: aktivVy === vy.id ? 600 : 500,
                color: aktivVy === vy.id ? "#fff" : "#83888A",
                cursor: "pointer",
                transition: "all 0.15s",
                borderRight: i < VYER.length - 1 ? "1px solid rgba(131,136,138,0.12)" : "none",
              }}
              onMouseEnter={(e) => {
                if (aktivVy !== vy.id) {
                  e.currentTarget.style.color = "#00664D";
                  e.currentTarget.style.background = "rgba(227,244,226,0.5)";
                }
              }}
              onMouseLeave={(e) => {
                if (aktivVy !== vy.id) {
                  e.currentTarget.style.color = "#83888A";
                  e.currentTarget.style.background = "transparent";
                }
              }}
            >
              {vy.text}
            </button>
          ))}
        </div>

        {/* ─── Aggregerat / Dag toggle ─── */}
        {harDagToggle && (
          <div style={{
            display: "flex", gap: 0, marginBottom: 20, marginTop: -10,
            background: "#fff", borderRadius: 6,
            border: "1px solid rgba(131,136,138,0.18)",
            overflow: "hidden", width: "fit-content",
          }}>
            {(["aggregerat", "dag"] as const).map((mode, i) => {
              const active = mode === "dag" ? visaDagar : !visaDagar;
              return (
                <button
                  key={mode}
                  onClick={() => setVisaDagar(mode === "dag")}
                  style={{
                    padding: "6px 14px",
                    border: "none",
                    background: active ? "#00664D" : "transparent",
                    fontFamily: "'IBM Plex Sans', sans-serif",
                    fontSize: 11.5,
                    fontWeight: active ? 600 : 500,
                    color: active ? "#fff" : "#83888A",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    borderRight: i === 0 ? "1px solid rgba(131,136,138,0.12)" : "none",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) { e.currentTarget.style.color = "#00664D"; e.currentTarget.style.background = "rgba(227,244,226,0.5)"; }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) { e.currentTarget.style.color = "#83888A"; e.currentTarget.style.background = "transparent"; }
                  }}
                >
                  {mode === "aggregerat" ? "Aggregerat" : "Dag"}
                </button>
              );
            })}
          </div>
        )}

        {/* ─── Dashboard header ─── */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16 }}>
            <div>
              <h1 style={{
                fontFamily: "'Lexend Deca', sans-serif", fontWeight: 700, fontSize: 28,
                color: "#00664D", margin: 0, letterSpacing: "-0.025em", lineHeight: 1.1,
              }}>
                {data.etikett}
              </h1>
              <p style={{
                fontSize: 13, color: "#83888A", fontWeight: 400, margin: "6px 0 0",
                lineHeight: 1.4,
              }}>
                {data.period}
                {data.dagar_period && (
                  <span style={{ marginLeft: 8, color: "#aaa" }}>
                    · Dagvy: {data.dagar_period.etikett} ({data.dagar_period.start.slice(5)} – {data.dagar_period.slut.slice(5)})
                  </span>
                )}
                {data.nasta_period && (
                  <span style={{ marginLeft: 8, color: "#aaa" }}>
                    · Nästa: {data.nasta_period.etikett}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Stats-bar */}
          <div style={{
            display: "flex", gap: 16, alignItems: "center",
            padding: "10px 16px", background: "#fff",
            borderRadius: 8, border: "1px solid #e0e0dc",
            boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
          }}>
            <StatChip value={allKpier.length} label="nyckeltal" />
            <span style={{ width: 1, height: 20, background: "#e8e8e4" }} />
            <StatChip
              value={allKpier.filter((k) => k.status === "gron").length}
              label="i fas"
              dot="#16a34a"
            />
            <StatChip value={bevaka} label="bevaka" dot="#ea980c" />
            <StatChip
              value={allKpier.filter((k) => k.status === "rod").length}
              label="avvikelser"
              dot="#dc2626"
            />
            <div style={{ marginLeft: "auto" }}>
              <button
                onClick={() => setShowReport(true)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "7px 14px", borderRadius: 6,
                  border: "none", background: "#00664D",
                  fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, fontWeight: 600,
                  color: "#fff", cursor: "pointer", transition: "background 0.15s",
                  letterSpacing: "0.01em",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#005540"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#00664D"; }}
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2,12 L6,2 L10,9 L14,4" />
                  <circle cx="14" cy="4" r="1.5" fill="currentColor" stroke="none" />
                </svg>
                Generera huvudrapport
              </button>
            </div>
          </div>
        </div>

        {/* ─── Sektioner ─── */}
        {data.sektioner.map((sek) => (
          <Section key={sek.id} section={sek} vyData={data} editMode={editMode} onOpenChart={setChartKpi} visaDagar={visaDagar} />
        ))}
      </div>

      {/* ─── Rapport-vy (fullskärm) ─── */}
      {showReport && (
        <ReportView
          data={data}
          onClose={() => setShowReport(false)}
        />
      )}

      {chartKpi && <ChartModal kpi={chartKpi} vyData={data} visaDagar={visaDagar} onClose={() => setChartKpi(null)} />}

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.4 } }
        @media (max-width: 900px) {
          div[style*="repeat(4"] { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 500px) {
          div[style*="repeat(4"], div[style*="repeat(2"] { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 768px) {
          [data-tufte-strip] { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 480px) {
          [data-tufte-strip] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function StatChip({ value, label, dot }: { value: number; label: string; dot?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      {dot && <span style={{ width: 7, height: 7, borderRadius: "50%", background: dot, flexShrink: 0 }} />}
      <span style={{
        fontFamily: "'IBM Plex Mono', monospace", fontSize: 15, fontWeight: 600,
        color: "#0a0a0a", letterSpacing: "-0.02em",
        fontFeatureSettings: "'tnum'", fontVariantNumeric: "tabular-nums",
      }}>
        {value}
      </span>
      <span style={{ fontSize: 12, color: "#888", fontWeight: 400 }}>{label}</span>
    </div>
  );
}
