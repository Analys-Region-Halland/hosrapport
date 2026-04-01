import { useState, useEffect, useCallback } from "react";
import type { KpiData, ContentBlock } from "../types";
import type {} from "../utils/format";
import FacetedChart from "./FacetedChart";
import EditableBlock, { InsertZone } from "./EditableBlock";
import { getBlocks, setBlocks as persistBlocks } from "../stores/blocks";

// ════════════════════════════════════════════════════════
//  SummaryModal — per-sektionsanalys
//  Sektionsrubrik → Indikator → Graf + analys + kommentar
// ════════════════════════════════════════════════════════

const STATUS: Record<string, { color: string; label: string }> = {
  gron: { color: "#16a34a", label: "I fas" },
  gul: { color: "#d97706", label: "Bevaka" },
  rod: { color: "#dc2626", label: "Avvikelse" },
};

interface Props {
  title: string;
  subtitle: string;
  analysText: string;
  kpier: KpiData[];
  targetId: string;
  editMode: boolean;
  vy?: string;
  onClose: () => void;
}

function genId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export default function SummaryModal({
  title,
  subtitle,
  analysText,
  kpier,
  targetId,
  vy,
  onClose,
}: Props) {
  const [locked, setLocked] = useState(true);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "#fff",
        zIndex: 200,
        overflowY: "auto",
        animation: "fadeIn 0.25s ease",
      }}
    >
      <div
        style={{
          maxWidth: 960,
          margin: "0 auto",
          position: "relative",
        }}
      >
        {/* ── Verktygsfält ── */}
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 5,
            background: "rgba(255,255,255,0.95)",
            backdropFilter: "blur(10px)",
            borderBottom: "1px solid #e0e0dc",
            borderRadius: 0,
            padding: "10px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                fontFamily: "'Lexend Deca', sans-serif",
                fontSize: 13,
                fontWeight: 600,
                color: "#00664D",
              }}
            >
              {title}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={() => setLocked(!locked)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "5px 12px",
                borderRadius: 5,
                border: locked ? "1px solid #d4d4d4" : "1px solid #00AB60",
                background: locked ? "#fff" : "#f0fdf4",
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: 11,
                fontWeight: 500,
                color: locked ? "#666" : "#00664D",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {locked ? (
                <>
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2.5L4.5 10 3 13l3-1.5L13.5 4z" />
                    <path d="M10.5 4L12 5.5" />
                  </svg>
                  Redigera
                </>
              ) : (
                <>
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="7" width="10" height="8" rx="1.5" />
                    <path d="M5 7V5a3 3 0 016 0v2" />
                  </svg>
                  Las
                </>
              )}
            </button>
            <button
              onClick={onClose}
              style={{
                padding: "5px 12px",
                borderRadius: 5,
                border: "1px solid #d4d4d4",
                background: "#fff",
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: 11,
                fontWeight: 500,
                color: "#666",
                cursor: "pointer",
              }}
            >
              ✕ Stang
            </button>
          </div>
        </div>

        {/* ── Innehåll ── */}
        <article
          style={{
            maxWidth: 900,
            margin: "0 auto",
            padding: "40px 32px 64px",
            fontFamily: "'IBM Plex Sans', sans-serif",
          }}
        >
          {/* Redigeringsindikator */}
          {!locked && (
            <div
              style={{
                marginBottom: 20,
                padding: "7px 14px",
                borderRadius: 5,
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                fontSize: 12,
                color: "#15803d",
                fontWeight: 500,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#16a34a",
                  animation: "pulse 2s infinite",
                }}
              />
              Klicka på text for att redigera · + for att lagga till
            </div>
          )}

          {/* Accent */}
          <div
            style={{
              height: 3,
              background: "linear-gradient(90deg, #00664D, #00AB60, #C1E8C4)",
              borderRadius: 2,
              marginBottom: 28,
            }}
          />

          {/* Header */}
          <header
            style={{
              textAlign: "center",
              marginBottom: 28,
              paddingBottom: 20,
              borderBottom: "2px solid #00AB60",
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                color: "#00AB60",
              }}
            >
              Region Halland
            </div>
            <h1
              style={{
                fontFamily: "'Merriweather', Georgia, serif",
                fontWeight: 900,
                fontSize: 26,
                color: "#00664D",
                letterSpacing: "-0.025em",
                lineHeight: 1.2,
                margin: "8px 0 6px",
              }}
            >
              {title}
            </h1>
            <div style={{ fontSize: 13, color: "#83888A" }}>{subtitle}</div>
          </header>

          {/* Sektionsanalys */}
          <BlocksEditor
            targetId={`section-${targetId}`}
            defaultAiText={analysText}
            locked={locked}
            vy={vy}
          />

          {/* Per-indikator */}
          {kpier.map((kpi) => (
            <IndicatorBlock key={kpi.id} kpi={kpi} vy={vy} locked={locked} />
          ))}

          {/* Footer */}
          <div
            style={{
              marginTop: 32,
              paddingTop: 16,
              borderTop: "1px solid #e5e5e5",
              textAlign: "center",
              fontSize: 11,
              color: "#bbb",
            }}
          >
            Region Halland &middot; HoS-rapport &middot;{" "}
            {new Date().toLocaleDateString("sv-SE")}
          </div>
        </article>
      </div>
    </div>
  );
}

// ════════════════════════════════════════
//  IndicatorBlock — per KPI
// ════════════════════════════════════════

function IndicatorBlock({ kpi, vy, locked }: { kpi: KpiData; vy?: string; locked: boolean }) {
  const st = STATUS[kpi.status] || { color: "#999", label: "Ok\u00e4nd" };

  const first = kpi.tidsserie[0];
  const last = kpi.tidsserie[kpi.tidsserie.length - 1];
  const addYear = (et: string, period: string) => {
    const yr = period.slice(0, 4);
    if (vy === "dag" || vy === "vecka") return `${et} ${yr}`;
    return et;
  };
  const firstLabel = first ? addYear(first.etikett, first.period) : "";
  const lastLabel = last ? addYear(last.etikett, last.period) : "";
  const chartSubtitle = `${firstLabel} \u2013 ${lastLabel}`;

  return (
    <div style={{
      marginTop: 28,
      background: "#fff",
      border: "1px solid #e4e4e0",
      borderRadius: 10,
      overflow: "hidden",
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
    }}>
      {/* Rubrik */}
      <div style={{ padding: "18px 24px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{
            width: 9, height: 9, borderRadius: "50%", background: st.color, flexShrink: 0,
            boxShadow: kpi.status === "rod" ? `0 0 0 3px ${st.color}18` : "none",
          }} />
          <h3 style={{
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontSize: 16, fontWeight: 600, color: "#1a1a1a",
            margin: 0, letterSpacing: "-0.01em",
          }}>
            {kpi.namn}
          </h3>
          <span style={{
            fontSize: 10, fontWeight: 600, color: st.color,
            background: `${st.color}10`, padding: "2px 8px", borderRadius: 4,
            flexShrink: 0, letterSpacing: "0.02em",
          }}>
            {st.label}
          </span>
        </div>
        <p style={{
          margin: 0, fontSize: 12, color: "#999",
          fontFamily: "'IBM Plex Sans', sans-serif", paddingLeft: 17,
        }}>
          {chartSubtitle}
        </p>
      </div>

      {/* Graf */}
      <div style={{ padding: "8px 16px 16px" }}>
        <FacetedChart kpi={kpi} vy={vy} />
      </div>

      {/* Analys + kommentarer */}
      <div style={{
        padding: "16px 24px 20px",
        borderTop: "1px solid #eeede6",
        marginTop: 4,
      }}>
        <BlocksEditor targetId={kpi.id} defaultAiText={kpi.analystext} locked={locked} vy={vy} />
      </div>
    </div>
  );
}

// ════════════════════════════════════════
//  BlocksEditor — AI + kommentarer
// ════════════════════════════════════════

function BlocksEditor({
  targetId,
  defaultAiText,
  locked,
  vy,
}: {
  targetId: string;
  defaultAiText: string;
  locked: boolean;
  vy?: string;
}) {
  // Vy-specifik lagringsnyckel — samma nyckel i huvud- och delrapport
  const storeKey = vy ? `${vy}:${targetId}` : targetId;

  const [blocks, setBlocksState] = useState<ContentBlock[]>(() => {
    const stored = getBlocks(storeKey);
    if (stored.length > 0) return stored;
    return [
      {
        id: `ai-${targetId}`,
        type: "ai" as const,
        text: defaultAiText,
        timestamp: new Date().toISOString(),
      },
    ];
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
      id: genId(),
      type: "kommentar",
      text: "",
      author: "",
      timestamp: new Date().toISOString(),
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
            type={block.type}
            text={block.text}
            title={block.title}
            author={block.author}
            timestamp={block.timestamp}
            locked={locked}
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
