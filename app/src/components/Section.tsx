import { useState } from "react";
import type { Section as SectionType, KpiData, VyData } from "../types";
import KpiCard from "./KpiCard";
import ReportView from "./ReportView";

interface Props {
  section: SectionType;
  vyData: VyData;
  editMode: boolean;
  onOpenChart: (kpi: KpiData) => void;
  visaDagar?: boolean;
}

export default function Section({ section, vyData, editMode: _editMode, onOpenChart, visaDagar }: Props) {
  const [showSummary, setShowSummary] = useState(false);
  const avvik = section.kpier.filter((k) => k.status !== "gron").length;

  return (
    <div style={{
      marginBottom: 20,
      background: "#fff",
      borderRadius: 10,
      border: "1px solid #e0e0dc",
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      overflow: "hidden",
    }}>
      {/* ── Header ── */}
      <div style={{
        padding: "14px 18px 12px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid #f0efeb",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h2 style={{
            fontFamily: "'Lexend Deca', sans-serif",
            fontSize: 14,
            fontWeight: 600,
            color: "#00664D",
            margin: 0,
            letterSpacing: "-0.01em",
          }}>
            {section.namn}
          </h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{
              fontSize: 11, fontWeight: 500, color: "#999",
              fontFamily: "'IBM Plex Mono', monospace",
              fontFeatureSettings: "'tnum'",
            }}>
              {section.kpier.length}
            </span>
            {avvik > 0 && (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 3,
                fontSize: 11, fontWeight: 600, color: "#ea980c",
                background: "#fffbeb", padding: "2px 7px", borderRadius: 4,
              }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#ea980c" }} />
                {avvik}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowSummary(true)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "5px 11px", borderRadius: 5,
            border: "1px solid #e0e0dc", background: "transparent",
            fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 11, fontWeight: 500,
            color: "#777", cursor: "pointer", transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            const t = e.currentTarget;
            t.style.background = "#f7f7f5"; t.style.color = "#00664D"; t.style.borderColor = "#c8c8c4";
          }}
          onMouseLeave={(e) => {
            const t = e.currentTarget;
            t.style.background = "transparent"; t.style.color = "#777"; t.style.borderColor = "#e0e0dc";
          }}
        >
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2,12 L6,2 L10,9 L14,4" />
          </svg>
          Generera delrapport
        </button>
      </div>

      {/* ── KPI-grid ── */}
      <div style={{ padding: "12px 14px 14px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, alignItems: "stretch" }}>
          {section.kpier.map((kpi) => (
            <KpiCard key={kpi.id} kpi={kpi} vyData={vyData} onOpenChart={onOpenChart} visaDagar={visaDagar} />
          ))}
        </div>
      </div>

      {showSummary && (
        <ReportView
          data={vyData}
          sectionId={section.id}
          onClose={() => setShowSummary(false)}
        />
      )}
    </div>
  );
}
