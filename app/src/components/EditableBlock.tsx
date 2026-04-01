import { useState, useRef, useEffect } from "react";

// ════════════════════════════════════════
//  EditableBlock — inline-redigerbart textblock
//  AI-analys: subtil grön bakgrundsbox
//  Kommentar: titel + löptext, ren rapportstil
// ════════════════════════════════════════

interface Props {
  type: "ai" | "kommentar";
  text: string;
  title?: string;
  author?: string;
  timestamp?: string;
  locked: boolean;
  onSave: (text: string, title?: string) => void;
  onDelete?: () => void;
  onCancel?: () => void;
}

export default function EditableBlock({
  type, text, title, author: _author, timestamp: _timestamp,
  locked, onSave, onDelete, onCancel,
}: Props) {
  const [editing, setEditing] = useState(!text && !locked);
  const [draft, setDraft] = useState(text || "");
  const [draftTitle, setDraftTitle] = useState(title || "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (locked && editing) setEditing(false);
  }, [locked]);

  useEffect(() => {
    if (editing && textareaRef.current) {
      const ta = textareaRef.current;
      ta.focus();
      ta.selectionStart = ta.value.length;
    }
  }, [editing]);

  function startEdit() {
    if (locked) return;
    setDraft(text);
    setDraftTitle(title || "");
    setEditing(true);
  }

  function handleSave() {
    onSave(draft, type === "kommentar" ? draftTitle : undefined);
    setEditing(false);
  }

  function handleCancel() {
    setEditing(false);
    onCancel?.();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") handleCancel();
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSave();
  }

  // ═══════════════════════════════
  //  REDIGERINGSLÄGE
  // ═══════════════════════════════

  if (editing) {
    if (type === "ai") {
      return (
        <div style={{
          padding: "16px 20px 18px", marginBottom: 12, borderRadius: 8,
          background: "#f4faf4", border: "2px solid #16a34a",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <AiIcon />
            <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#16a34a" }}>
              AI-analys
            </span>
          </div>
          <textarea
            ref={textareaRef}
            value={draft} onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={Math.max(4, draft.split("\n").length + 2)}
            placeholder="Skriv analystext..."
            style={{
              width: "100%", boxSizing: "border-box", padding: "12px 14px",
              border: "1px solid #c5e0c8", borderRadius: 6,
              fontSize: 15, fontFamily: "'Merriweather', Georgia, serif",
              lineHeight: 1.8, color: "#1a3d2e", resize: "vertical",
              outline: "none", background: "#fff",
            }}
          />
          <EditorButtons onSave={handleSave} onCancel={handleCancel} accent="#00664D" />
        </div>
      );
    }

    // Kommentar: titel + löptext
    return (
      <div style={{ marginBottom: 12, padding: "12px 0" }}>
        <input
          value={draftTitle}
          onChange={(e) => setDraftTitle(e.target.value)}
          placeholder="Rubrik"
          style={{
            width: "100%", boxSizing: "border-box", padding: "8px 0",
            border: "none", borderBottom: "2px solid #00664D",
            fontSize: 17, fontFamily: "'IBM Plex Sans', sans-serif",
            fontWeight: 600, color: "#1a1a1a", outline: "none",
            background: "transparent", letterSpacing: "-0.01em",
            marginBottom: 10,
          }}
        />
        <textarea
          ref={textareaRef}
          value={draft} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={Math.max(3, draft.split("\n").length + 1)}
          placeholder="Skriv text..."
          style={{
            width: "100%", boxSizing: "border-box", padding: "10px 14px",
            border: "1px solid #d4d4d4", borderRadius: 6,
            fontSize: 14.5, fontFamily: "'IBM Plex Sans', sans-serif",
            lineHeight: 1.8, color: "#1a1a1a", resize: "vertical",
            outline: "none", background: "#fff",
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "#00664D"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "#d4d4d4"; }}
        />
        <EditorButtons
          onSave={handleSave} onCancel={handleCancel}
          onDelete={onDelete} accent="#00664D"
        />
      </div>
    );
  }

  // ═══════════════════════════════
  //  VISNINGSLÄGE
  // ═══════════════════════════════

  if (!text) return null;
  const paragraphs = text.split("\n\n").filter(Boolean);

  // ── AI-analys: grön bakgrundsbox ──
  if (type === "ai") {
    return (
      <div
        onClick={locked ? undefined : startEdit}
        onMouseEnter={(e) => { if (!locked) e.currentTarget.style.background = "#eef7ee"; }}
        onMouseLeave={(e) => { if (!locked) e.currentTarget.style.background = "#f4faf4"; }}
        style={{
          position: "relative",
          padding: "16px 20px 18px", marginBottom: 12, borderRadius: 8,
          background: "#f4faf4", border: "1px solid #d8edda",
          cursor: locked ? "default" : "text",
          transition: "background 0.15s",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <AiIcon />
          <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#16a34a" }}>
            AI-analys
          </span>
        </div>
        <div style={{ fontFamily: "'Merriweather', Georgia, serif" }}>
          {paragraphs.map((p, i) => (
            <p key={i} style={{
              fontSize: i === 0 ? 15 : 14.5, fontWeight: 300,
              fontStyle: i === 0 ? "italic" : "normal",
              lineHeight: 1.85, color: "#1a3d2e",
              margin: `0 0 ${i < paragraphs.length - 1 ? 12 : 0}px`,
            }}>
              {p}
            </p>
          ))}
        </div>
      </div>
    );
  }

  // ── Kommentar: ren rapporttext med rubrik ──
  return (
    <div
      onClick={locked ? undefined : startEdit}
      onMouseEnter={(e) => { if (!locked) e.currentTarget.style.background = "#fafaf8"; }}
      onMouseLeave={(e) => { if (!locked) e.currentTarget.style.background = "transparent"; }}
      style={{
        position: "relative",
        padding: "8px 0", marginBottom: 8,
        cursor: locked ? "default" : "text",
        borderRadius: 4,
        transition: "background 0.15s",
      }}
    >
      {title && (
        <h4 style={{
          fontFamily: "'IBM Plex Sans', sans-serif",
          fontSize: 16, fontWeight: 600, color: "#00664D",
          margin: "0 0 6px", letterSpacing: "-0.01em",
        }}>
          {title}
        </h4>
      )}
      <div style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
        {paragraphs.map((p, i) => (
          <p key={i} style={{
            fontSize: 14.5, fontWeight: 400, lineHeight: 1.8,
            color: "#1a1a1a",
            margin: `0 0 ${i < paragraphs.length - 1 ? 10 : 0}px`,
          }}>
            {p}
          </p>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════
//  Hjälpkomponenter
// ════════════════════════════════════════

function AiIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#16a34a" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6.5" /><path d="M6 8.5L7.5 10 10 6.5" />
    </svg>
  );
}

function EditorButtons({ onSave, onCancel, onDelete, accent }: {
  onSave: () => void; onCancel: () => void;
  onDelete?: () => void; accent: string;
}) {
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
      <button onClick={onSave} style={{
        padding: "6px 16px", borderRadius: 5, border: "none",
        background: accent, color: "#fff", fontSize: 12, fontWeight: 600,
        fontFamily: "'IBM Plex Sans', sans-serif", cursor: "pointer",
      }}>
        Spara
      </button>
      <button onClick={onCancel} style={{
        padding: "6px 16px", borderRadius: 5, border: "1px solid #d4d4d4",
        background: "#fff", color: "#666", fontSize: 12, fontWeight: 500,
        fontFamily: "'IBM Plex Sans', sans-serif", cursor: "pointer",
      }}>
        Avbryt
      </button>
      {onDelete && (
        <button onClick={onDelete} style={{
          marginLeft: "auto", padding: "6px 12px", borderRadius: 5,
          border: "1px solid #fecaca", background: "#fff", color: "#b91c1c",
          fontSize: 11, fontWeight: 500, fontFamily: "'IBM Plex Sans', sans-serif",
          cursor: "pointer",
        }}>
          Ta bort
        </button>
      )}
      <span style={{ marginLeft: onDelete ? 0 : "auto", fontSize: 11, color: "#bbb" }}>
        Ctrl+Enter spara &middot; Esc avbryt
      </span>
    </div>
  );
}

// ════════════════════════════════════════
//  InsertZone — infogningsknapp mellan block
// ════════════════════════════════════════

export function InsertZone({ onInsert }: { onInsert: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative", height: 28,
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "4px 0",
      }}
    >
      <div style={{
        position: "absolute", left: 14, right: 14, top: "50%", height: 1,
        background: hovered ? "#d4d4d4" : "transparent",
        transition: "background 0.2s",
      }} />
      <button
        onClick={onInsert}
        style={{
          position: "relative", width: 24, height: 24, borderRadius: "50%",
          border: hovered ? "1px solid #ccc" : "1px solid transparent",
          background: hovered ? "#fff" : "transparent",
          color: hovered ? "#999" : "transparent",
          fontSize: 16, lineHeight: 1,
          fontFamily: "'IBM Plex Sans', sans-serif",
          cursor: hovered ? "pointer" : "default",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.2s", zIndex: 1,
          boxShadow: hovered ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
        }}
      >
        +
      </button>
    </div>
  );
}
