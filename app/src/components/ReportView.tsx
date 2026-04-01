import { useState, useEffect, useCallback } from "react";
import type {
  VyData,
  KpiData,
  Section,
  ContentBlock,
} from "../types";
import FacetedChart from "./FacetedChart";
import EditableBlock, { InsertZone } from "./EditableBlock";
import { getBlocks, setBlocks as persistBlocks } from "../stores/blocks";
import { fmtVarde, fmtSuffix, fullEtikett } from "../utils/format";

// ════════════════════════════════════════════════════════
//  ReportView — fullskärms huvudrapport
//  NYT × offentlig förvaltning
// ════════════════════════════════════════════════════════

const SIGNAL: Record<string, { color: string; label: string }> = {
  gron: { color: "#16a34a", label: "Inom förväntat" },
  rod:  { color: "#dc2626", label: "Utanför förväntat" },
};

const mono: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontFeatureSettings: "'tnum'",
  fontVariantNumeric: "tabular-nums",
};

const FONT = "'IBM Plex Sans', sans-serif";
const FONT_RUBRIK = "'Source Serif 4', Georgia, serif";

const VY_LABELS: Record<string, string> = {
  dag: "Daglig uppföljning",
  vecka: "Veckouppföljning",
  manad: "Månadsuppföljning",
  kvartal: "Kvartalsuppföljning",
  ar: "Årsuppföljning",
};

interface Props {
  data: VyData;
  /** Om angivet, visa bara denna sektion (delrapport) */
  sectionId?: string;
  onClose: () => void;
}

export default function ReportView({ data, sectionId, onClose }: Props) {
  const [locked, setLocked] = useState(true);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const visadeSektioner = sectionId
    ? data.sektioner.filter((s) => s.id === sectionId)
    : data.sektioner;
  const allKpier = visadeSektioner.flatMap((s) => s.kpier);
  const within = allKpier.filter((k) => {
    const last = k.tidsserie[k.tidsserie.length - 1];
    return last?.signal === "gron";
  }).length;
  const outside = allKpier.length - within;
  const vyLabel = VY_LABELS[data.vy] || "";
  const sectionTitle = sectionId ? visadeSektioner[0]?.namn : null;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, background: "#fbfbf9",
        zIndex: 200, overflowY: "auto", animation: "fadeIn 0.2s ease",
      }}
    >
      <div style={{ maxWidth: 960, margin: "0 auto", position: "relative" }}>

        {/* ── Verktygsfält ── */}
        <Toolbar locked={locked} setLocked={setLocked} vyData={data} onClose={onClose} />

        {/* ── Dokument ── */}
        <article style={{
          maxWidth: 780, margin: "0 auto", padding: "56px 32px 80px",
          fontFamily: FONT,
        }}>
          {/* Redigeringsindikator */}
          {!locked && <EditBanner />}

          {/* ── Rapportens rubrik ── */}
          <header style={{ marginBottom: 48 }}>
            {/* Logo */}
            <div style={{ marginBottom: 32 }}>
              <img
                src="/logo_farg.svg"
                alt="Region Halland"
                style={{ height: 36 }}
              />
            </div>

            {/* Typ-etikett */}
            <div style={{
              fontSize: 11, fontWeight: 600, textTransform: "uppercase",
              letterSpacing: "0.12em", color: "#00AB60", marginBottom: 12,
              fontFamily: FONT,
            }}>
              {vyLabel}
            </div>

            {/* Titel */}
            <h1 style={{
              fontFamily: FONT_RUBRIK,
              fontWeight: 400, fontSize: 36, color: "#1a1a1a",
              letterSpacing: "-0.02em", lineHeight: 1.15, margin: "0 0 12px",
            }}>
              {sectionTitle || "Hälso- och sjukvården"}
            </h1>

            {/* Undertitel */}
            <p style={{
              fontFamily: FONT, fontSize: 16, color: "#666",
              lineHeight: 1.5, margin: "0 0 20px", maxWidth: 520,
            }}>
              {data.etikett} &mdash; {data.period}
            </p>

            {/* Linje */}
            <div style={{ height: 2, background: "#00664D", width: 48 }} />
          </header>

          {/* ── Nyckeltal-sammanfattning ── */}
          <div style={{
            display: "flex", gap: 28, alignItems: "baseline",
            marginBottom: 40, paddingBottom: 24,
            borderBottom: "1px solid #e0e0dc",
          }}>
            <MiniStat value={allKpier.length} label="indikatorer" />
            <MiniStat value={within} label="inom förväntat" dot="#16a34a" />
            {outside > 0 && <MiniStat value={outside} label="utanför" dot="#dc2626" />}
          </div>

          {/* ── Innehållsförteckning (bara huvudrapport) ── */}
          {!sectionId && (
            <nav style={{ marginBottom: 48 }}>
              <div style={{
                fontSize: 10, fontWeight: 600, textTransform: "uppercase",
                letterSpacing: "0.1em", color: "#999", marginBottom: 12,
                fontFamily: FONT,
              }}>
                Innehåll
              </div>
              <ol style={{
                margin: 0, padding: "0 0 0 20px",
                listStyle: "decimal",
              }}>
                {data.sektioner.map((sek) => (
                  <li key={sek.id} style={{ marginBottom: 3 }}>
                    <a
                      href={`#rapport-${sek.id}`}
                      style={{
                        fontSize: 14, color: "#00664D", textDecoration: "none",
                        fontWeight: 500, lineHeight: 1.7,
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.textDecoration = "underline"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.textDecoration = "none"; }}
                    >
                      {sek.namn}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          )}

          {/* ── Global sammanfattning (bara huvudrapport) ── */}
          {!sectionId && (
            <BlocksEditor targetId="global" defaultAiText={data.analys} locked={locked} vy={data.vy} />
          )}

          {/* ── Sektioner ── */}
          {visadeSektioner.map((sek, i) => (
            <SectionBlock
              key={sek.id}
              section={sek}
              index={sectionId ? undefined : i + 1}
              vyLabel={vyLabel}
              vy={data.vy}
              locked={locked}
            />
          ))}

          {/* ── Footer ── */}
          <footer style={{
            marginTop: 72, paddingTop: 28,
            borderTop: "1px solid #e0e0dc",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <img
              src="/logo_farg.svg"
              alt="Region Halland"
              style={{ height: 24, opacity: 0.5 }}
            />
            <span style={{ fontSize: 11, color: "#bbb", fontFamily: FONT }}>
              HoS-rapport &middot; {new Date().toLocaleDateString("sv-SE")}
            </span>
          </footer>
        </article>
      </div>
    </div>
  );
}

// ════════════════════════════════════════
//  SectionBlock — en hel sektion
// ════════════════════════════════════════

function SectionBlock({
  section, index, vyLabel, vy, locked,
}: {
  section: Section; index?: number; vyLabel: string; vy: string; locked: boolean;
}) {
  return (
    <div
      id={`rapport-${section.id}`}
      style={{ marginTop: index != null ? 64 : 0, scrollMarginTop: 60 }}
    >
      {/* Sektionsrubrik */}
      <div style={{ marginBottom: 20 }}>
        {index != null && (
          <div style={{
            fontSize: 10, fontWeight: 600, textTransform: "uppercase",
            letterSpacing: "0.1em", color: "#00AB60", marginBottom: 8,
            fontFamily: FONT,
          }}>
            Kapitel {index}
          </div>
        )}
        <h2 style={{
          fontFamily: FONT_RUBRIK,
          fontSize: 28, fontWeight: 400, color: "#1a1a1a",
          margin: 0, letterSpacing: "-0.015em", lineHeight: 1.2,
        }}>
          {section.namn}
        </h2>
        <div style={{ height: 2, background: "#00664D", width: 32, marginTop: 12 }} />
      </div>

      {/* Sektionsanalys */}
      <BlocksEditor
        targetId={`section-${section.id}`}
        defaultAiText={section.analys}
        locked={locked}
        vy={vy}
      />

      {/* Indikatorer */}
      {section.kpier.map((kpi) => (
        <IndicatorBlock key={kpi.id} kpi={kpi} vyLabel={vyLabel} vy={vy} locked={locked} />
      ))}
    </div>
  );
}

// ════════════════════════════════════════
//  IndicatorBlock — graf + analys separerade
// ════════════════════════════════════════

function IndicatorBlock({
  kpi, vyLabel: _vyLabel, vy, locked,
}: {
  kpi: KpiData; vyLabel: string; vy: string; locked: boolean;
}) {
  const [visaDagar, setVisaDagar] = useState(false);
  const harDagar = vy !== "dag" && kpi.dagar && kpi.dagar.length > 0;

  const aktivSerie = visaDagar && harDagar ? kpi.dagar! : kpi.tidsserie;
  const aktivVy = visaDagar && harDagar ? "dag" : vy;

  const last = aktivSerie[aktivSerie.length - 1];
  const sig = last?.signal ? SIGNAL[last.signal] : null;
  const accent = sig?.color || "#a3a3a3";
  const dec = kpi.enhet === "procent" ? 1 : 0;
  const suffix = fmtSuffix(kpi.enhet);

  const first = aktivSerie[0];
  const firstLabel = first ? fullEtikett(first.etikett, first.period, aktivVy) : "";
  const lastLabel = last ? fullEtikett(last.etikett, last.period, aktivVy) : "";

  // Bygg KPI-objekt med rätt tidsserie för FacetedChart (inkl undernivaer)
  const chartKpi = visaDagar && harDagar
    ? {
        ...kpi,
        tidsserie: kpi.dagar!,
        undernivaer: kpi.undernivaer?.map((sub) => ({
          ...sub,
          tidsserie: sub.dagar && sub.dagar.length > 0 ? sub.dagar : sub.tidsserie,
        })),
      }
    : kpi;

  return (
    <div style={{ marginTop: 40, marginBottom: 44 }}>

      {/* ── Indikator-rubrik — samma nivå som underrubriker ── */}
      <div style={{ marginBottom: 6 }}>
        <div style={{
          display: "flex", alignItems: "baseline", gap: 10,
        }}>
          <h3 style={{
            fontFamily: FONT_RUBRIK,
            fontSize: 20, fontWeight: 400, color: "#1a1a1a",
            margin: 0, letterSpacing: "-0.01em", lineHeight: 1.3,
          }}>
            {kpi.namn}
          </h3>
          {sig && (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              fontSize: 10, fontWeight: 600, color: accent,
              flexShrink: 0,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: accent }} />
              {sig.label}
            </span>
          )}
        </div>
        <div style={{ height: 1, background: "#e0e0dc", marginTop: 8 }} />
      </div>

      {/* Meta-rad */}
      <div style={{
        fontSize: 12, color: "#999", marginBottom: 12, marginTop: 8,
        fontFamily: FONT, lineHeight: 1.4,
      }}>
        {fmtVarde(kpi.senaste, kpi.enhet, dec)}{suffix}
        {last?.yhat != null && (
          <span style={{ color: "#bbb" }}>
            {" "}&middot; förväntat {fmtVarde(last.yhat, kpi.enhet, dec)}{suffix}
          </span>
        )}
        <span style={{ color: "#bbb" }}>
          {" "}&middot; {firstLabel}&ndash;{lastLabel}
        </span>
      </div>

      {/* ── Analystext — direkt under rubriken ── */}
      <div style={{ marginBottom: 24 }}>
        <BlocksEditor targetId={kpi.id} defaultAiText={kpi.analystext} locked={locked} vy={vy} />
      </div>

      {/* ── Grafblock ── */}
      <div style={{
        background: "#fff",
        border: "1px solid #e4e4e0",
        borderRadius: 8,
        padding: "12px 16px 16px",
      }}>
        {/* Aggregerat / Dag toggle */}
        {harDagar && (
          <div style={{
            display: "flex", gap: 0, marginBottom: 10,
            background: "#f5f5f3", borderRadius: 5,
            overflow: "hidden", width: "fit-content",
          }}>
            {(["aggregerat", "dag"] as const).map((mode, i) => {
              const active = mode === "dag" ? visaDagar : !visaDagar;
              return (
                <button
                  key={mode}
                  onClick={() => setVisaDagar(mode === "dag")}
                  style={{
                    padding: "4px 12px",
                    border: "none",
                    background: active ? "#00664D" : "transparent",
                    fontFamily: FONT, fontSize: 10.5,
                    fontWeight: active ? 600 : 500,
                    color: active ? "#fff" : "#888",
                    cursor: "pointer", transition: "all 0.15s",
                    borderRight: i === 0 ? "1px solid rgba(0,0,0,0.06)" : "none",
                  }}
                >
                  {mode === "aggregerat" ? "Aggregerat" : "Dag"}
                </button>
              );
            })}
          </div>
        )}
        <FacetedChart kpi={chartKpi} vy={aktivVy} />
      </div>
    </div>
  );
}

// ════════════════════════════════════════
//  BlocksEditor — AI-text + kommentarer
// ════════════════════════════════════════

function genId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function BlocksEditor({
  targetId, defaultAiText, locked, vy,
}: {
  targetId: string; defaultAiText: string; locked: boolean; vy?: string;
}) {
  const storeKey = vy ? `${vy}:${targetId}` : targetId;

  const [blocks, setBlocksState] = useState<ContentBlock[]>(() => {
    const stored = getBlocks(storeKey);
    if (stored.length > 0) return stored;
    return [{
      id: `ai-${targetId}`, type: "ai" as const,
      text: defaultAiText, timestamp: new Date().toISOString(),
    }];
  });

  const persist = useCallback(
    (newBlocks: ContentBlock[]) => {
      setBlocksState(newBlocks);
      persistBlocks(storeKey, newBlocks);
    },
    [storeKey]
  );

  function handleSave(blockId: string, text: string, title?: string) {
    if (!text.trim()) {
      const block = blocks.find((b) => b.id === blockId);
      if (block?.type === "kommentar") {
        persist(blocks.filter((b) => b.id !== blockId));
        return;
      }
    }
    persist(
      blocks.map((b) =>
        b.id === blockId
          ? { ...b, text, ...(title !== undefined ? { title } : {}), timestamp: new Date().toISOString() }
          : b
      )
    );
  }

  function handleDelete(blockId: string) {
    persist(blocks.filter((b) => b.id !== blockId));
  }

  function handleCancel(blockId: string) {
    const block = blocks.find((b) => b.id === blockId);
    if (block && !block.text.trim()) {
      persist(blocks.filter((b) => b.id !== blockId));
    }
  }

  function handleInsert(afterIndex: number) {
    const newBlock: ContentBlock = {
      id: genId(), type: "kommentar", text: "",
      author: "", timestamp: new Date().toISOString(),
    };
    const updated = [...blocks];
    updated.splice(afterIndex + 1, 0, newBlock);
    persist(updated);
  }

  return (
    <div>
      {blocks.map((block, i) => (
        <div key={block.id}>
          <EditableBlock
            type={block.type} text={block.text}
            title={block.title} author={block.author}
            timestamp={block.timestamp} locked={locked}
            onSave={(text, title) => handleSave(block.id, text, title)}
            onDelete={block.type === "kommentar" ? () => handleDelete(block.id) : undefined}
            onCancel={() => handleCancel(block.id)}
          />
          {!locked && <InsertZone onInsert={() => handleInsert(i)} />}
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════
//  Hjälpkomponenter
// ════════════════════════════════════════

function Toolbar({
  locked, setLocked, vyData, onClose,
}: {
  locked: boolean; setLocked: (v: boolean) => void; vyData: VyData; onClose: () => void;
}) {
  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 10,
      background: "rgba(251,251,249,0.92)", backdropFilter: "blur(12px)",
      borderBottom: "1px solid #e0e0dc", padding: "10px 32px",
      display: "flex", justifyContent: "space-between", alignItems: "center",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <img src="/logo_farg.svg" alt="" style={{ height: 20, opacity: 0.6 }} />
        <span style={{ width: 1, height: 14, background: "#ddd" }} />
        <span style={{
          fontFamily: FONT, fontSize: 12,
          fontWeight: 500, color: "#888",
        }}>
          {vyData.etikett} &middot; {vyData.period}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          onClick={() => setLocked(!locked)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "5px 12px", borderRadius: 5,
            border: locked ? "1px solid #d4d4d4" : "1px solid #00AB60",
            background: locked ? "#fff" : "#f0fdf4",
            fontFamily: FONT, fontSize: 11, fontWeight: 500,
            color: locked ? "#666" : "#00664D", cursor: "pointer", transition: "all 0.15s",
          }}
        >
          {locked ? (
            <>
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2.5L4.5 10 3 13l3-1.5L13.5 4z" /><path d="M10.5 4L12 5.5" />
              </svg>
              Redigera
            </>
          ) : (
            <>
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="7" width="10" height="8" rx="1.5" /><path d="M5 7V5a3 3 0 016 0v2" />
              </svg>
              Lås
            </>
          )}
        </button>
        <button
          onClick={onClose}
          style={{
            padding: "5px 12px", borderRadius: 5,
            border: "1px solid #d4d4d4", background: "#fff",
            fontFamily: FONT, fontSize: 11, fontWeight: 500,
            color: "#666", cursor: "pointer",
          }}
        >
          &times; Stäng
        </button>
      </div>
    </div>
  );
}

function EditBanner() {
  return (
    <div style={{
      marginBottom: 24, padding: "8px 14px", borderRadius: 6,
      background: "#f0fdf4", border: "1px solid #bbf7d0",
      fontSize: 12, color: "#15803d", fontWeight: 500,
      display: "inline-flex", alignItems: "center", gap: 6,
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: "50%",
        background: "#16a34a", animation: "pulse 2s infinite",
      }} />
      Klicka på text för att redigera &middot; + för att lägga till kommentarer
    </div>
  );
}

function MiniStat({ value, label, dot }: { value: number; label: string; dot?: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      {dot && <span style={{ width: 7, height: 7, borderRadius: "50%", background: dot }} />}
      <span style={{ ...mono, fontSize: 18, fontWeight: 600, color: "#0a0a0a" }}>{value}</span>
      <span style={{ fontSize: 13, color: "#888", fontFamily: FONT }}>{label}</span>
    </span>
  );
}
