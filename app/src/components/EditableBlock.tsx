import { useState, useRef, useEffect } from "react";
import { markDirty, markClean } from "../stores/dirty";
import { getForfattare, setForfattare } from "../stores/blocks";
import { SIGNAL_COLORS } from "../charts/constants";

// Ljus bakgrundston per fas (signalstatus) för AI-rutan. Ljusare än
// chips-tonerna (SIGNAL_BG) så texten andas. Ingen fas → neutral grön.
const CALLOUT_BG: Record<string, string> = {
  gron: "#f1f7fb",
  gul: "#fdf7ee",
  rod: "#fdf2ec",
};
function calloutColors(signal?: string): { accent: string; bg: string } {
  if (signal && SIGNAL_COLORS[signal]) {
    return { accent: SIGNAL_COLORS[signal], bg: CALLOUT_BG[signal] || "#f4f9f6" };
  }
  return { accent: "#00AB60", bg: "#f4f9f6" };
}

// ════════════════════════════════════════
//  EditableBlock — ett textblock i rapporten. Två sorter, samma mönster:
//  rubrik + text + byline (vem som skrivit).
//
//   type="ai"          → skrivskyddad AI-analys. Rubrik kommer från R
//                        (aiRubrik), texten renderas alltid från R-texten.
//                        Byline: ◆ AI-analys.
//   type="anteckning"  → användarens egen text. Redigerbar komposit
//                        (rubrik + brödtext + skribent). Byline: ✎ namn · datum.
//                        Robust mot dataförlust: autospar (700 ms) +
//                        spara-vid-blur + spara-vid-unmount.
// ════════════════════════════════════════

const FONT_SANS = "'IBM Plex Sans', sans-serif";
const FONT_SERIF = "'Source Serif 4', Georgia, serif";

export interface AnteckningData { title: string; text: string; author: string }

interface Props {
  id: string;
  type: "ai" | "anteckning";
  /** AI-analysens body (type="ai") respektive anteckningens brödtext. */
  text: string;
  /** Rubrik: AI-rubrik (type="ai") eller anteckningens rubrik. */
  rubrik?: string;
  /** Skribent (type="anteckning"). */
  author?: string;
  /** Tidsstämpel för bylinen (type="anteckning"). */
  timestamp?: string;
  /** Fas/signalstatus (type="ai") — färgsätter AI-rutan efter status. */
  signal?: string;
  onSave?: (data: AnteckningData) => void;
  onDelete?: () => void;
}

function fmtDatum(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("sv-SE", { day: "numeric", month: "short" });
}

export default function EditableBlock({ id, type, text, rubrik, author, timestamp, signal, onSave, onDelete }: Props) {
  const editable = type === "anteckning";
  const tom = !rubrik?.trim() && !text.trim();
  const [editing, setEditing] = useState(editable && tom);
  const [draft, setDraft] = useState<AnteckningData>({
    title: rubrik ?? "", text, author: author || getForfattare(),
  });
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  const orig: AnteckningData = { title: rubrik ?? "", text, author: author ?? "" };
  const dirty = editable && (draft.title !== orig.title || draft.text !== orig.text || draft.author !== orig.author);

  // Senaste värden i ref → undviker stale-closure vid flush-on-unmount.
  const latest = useRef({ draft, orig, onSave });
  useEffect(() => { latest.current = { draft, orig, onSave }; });

  const commit = (d: AnteckningData) => {
    if (d.author.trim()) setForfattare(d.author);
    onSave?.(d);
  };

  // Autospar ~700 ms efter senaste tangenttryck. Markerar dirty/clean.
  useEffect(() => {
    if (!editing || !editable) return;
    if (!dirty) { markClean(id); return; }
    markDirty(id);
    const t = setTimeout(() => {
      commit(draft);
      setSavedAt(new Date().toISOString());
      markClean(id);
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, editing, editable, dirty, id]);

  // Spara-vid-unmount (t.ex. vy-byte) om något är osparat.
  useEffect(() => {
    return () => {
      const l = latest.current;
      const o = l.orig;
      if (l.draft.title !== o.title || l.draft.text !== o.text || l.draft.author !== o.author) {
        if (l.draft.author.trim()) setForfattare(l.draft.author);
        l.onSave?.(l.draft);
      }
      markClean(id);
    };
  }, [id]);

  // Fokusera första fältet när redigering startar.
  useEffect(() => {
    if (editing && firstFieldRef.current) {
      const el = firstFieldRef.current;
      el.focus();
      el.selectionStart = el.value.length;
    }
  }, [editing]);

  function startEdit() {
    if (!editable) return;
    setDraft({ title: rubrik ?? "", text, author: author || getForfattare() });
    setEditing(true);
  }

  // Spara omedelbart när blocket lämnas (flush). Tomt block → ta bort.
  function flush() {
    if (dirty) {
      commit(draft);
      setSavedAt(new Date().toISOString());
    }
    markClean(id);
  }

  function done() {
    flush();
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") done();
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) done();
  }

  // ═══════════════════════════════ REDIGERINGSLÄGE ═══════════════════════════════
  if (editing && editable) {
    return (
      <div className="report-note report-note--editing">
        <input
          ref={firstFieldRef}
          value={draft.title}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          onKeyDown={handleKeyDown}
          onBlur={flush}
          maxLength={120}
          placeholder="Rubrik…"
          style={{
            width: "100%", boxSizing: "border-box", padding: "2px 0 6px",
            border: "none", borderBottom: "2px solid var(--brand-700, #00664D)",
            fontFamily: FONT_SERIF, fontSize: 18, fontWeight: 600,
            color: "#1a1a1a", outline: "none", background: "transparent",
          }}
        />
        <textarea
          value={draft.text}
          onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))}
          onKeyDown={handleKeyDown}
          onBlur={flush}
          rows={Math.max(3, draft.text.split("\n").length + 1)}
          placeholder="Skriv text…"
          style={{
            width: "100%", boxSizing: "border-box", marginTop: 10, padding: "10px 12px",
            border: "1px solid #d4d4d4", borderRadius: 6,
            fontFamily: FONT_SERIF, fontSize: 16, lineHeight: 1.7,
            color: "#2b2b2b", resize: "vertical", outline: "none", background: "#fff",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "#888", fontFamily: FONT_SANS }}>
            <PenIcon />
            <input
              value={draft.author}
              onChange={(e) => setDraft((d) => ({ ...d, author: e.target.value }))}
              onKeyDown={handleKeyDown}
              onBlur={flush}
              maxLength={48}
              placeholder="Skribent"
              style={{
                width: 130, padding: "3px 6px", border: "1px solid #d4d4d4", borderRadius: 5,
                fontFamily: FONT_SANS, fontSize: 11.5, color: "#444", outline: "none", background: "#fff",
              }}
            />
          </label>
          <EditorButtons onDone={done} onDelete={onDelete} savedAt={savedAt} />
        </div>
      </div>
    );
  }

  // ═══════════════════════════════ VISNINGSLÄGE ═══════════════════════════════

  // AI-analys — skrivskyddad, inramad som AI och färgsatt efter fas (status)
  if (type === "ai") {
    if (!text.trim()) return null;
    const c = calloutColors(signal);
    return (
      <div className="ai-callout" style={{ borderLeftColor: c.accent, background: c.bg }}>
        <div className="ai-callout__label" style={{ color: c.accent }}>
          <DiamondIcon /> AI-analys
        </div>
        {rubrik?.trim() && <NoteTitle>{rubrik}</NoteTitle>}
        <NoteBody text={text} />
      </div>
    );
  }

  // Egen anteckning — klick/Enter = redigera
  if (!rubrik?.trim() && !text.trim()) return null;
  return (
    <div
      onClick={startEdit}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); startEdit(); } }}
      role="button"
      tabIndex={0}
      aria-label={`Redigera anteckning${rubrik ? `: ${rubrik}` : ""}`}
      className="report-note report-editable"
      style={{ cursor: "text" }}
      title="Klicka för att redigera"
    >
      {rubrik?.trim() && <NoteTitle>{rubrik}</NoteTitle>}
      <NoteBody text={text} />
      <Byline author={author} datum={fmtDatum(timestamp)} />
    </div>
  );
}

// ════════════════════════════════════════
//  Delkomponenter
// ════════════════════════════════════════

function NoteTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 style={{
      fontFamily: FONT_SERIF, fontWeight: 600, fontSize: 17, color: "#1a1a1a",
      letterSpacing: "-0.01em", lineHeight: 1.3, margin: "0 0 6px",
    }}>
      {children}
    </h4>
  );
}

function NoteBody({ text }: { text: string }) {
  const paragraphs = text.split("\n\n").filter(Boolean);
  if (paragraphs.length === 0) return null;
  return (
    <div style={{ fontFamily: FONT_SERIF }}>
      {paragraphs.map((p, i) => (
        <p key={i} style={{
          fontSize: 17, fontWeight: 400, lineHeight: 1.7, color: "#2b2b2b",
          margin: `0 0 ${i < paragraphs.length - 1 ? "0.7em" : "0"}`,
        }}>
          {p}
        </p>
      ))}
    </div>
  );
}

// Byline för egna anteckningar — vem som skrivit + datum.
function Byline({ author, datum }: { author?: string; datum?: string }) {
  const namn = author?.trim();
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10,
      fontFamily: FONT_SANS, fontSize: 11, fontWeight: 600,
      letterSpacing: "0.02em", color: "#9a9a96",
    }}>
      <PenIcon />
      <span>{namn || "Egen kommentar"}{datum ? ` · ${datum}` : ""}</span>
    </div>
  );
}

function DiamondIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true">
      <path d="M5 0l5 5-5 5-5-5z" />
    </svg>
  );
}

function PenIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2.5L4.5 10 3 13l3-1.5L13.5 4z" /><path d="M10.5 4L12 5.5" />
    </svg>
  );
}

// ── Knapprad i redigeringsläge ──
function EditorButtons({ onDone, onDelete, savedAt }: {
  onDone: () => void;
  onDelete?: () => void;
  savedAt?: string | null;
}) {
  return (
    <div style={{ display: "inline-flex", gap: 8, alignItems: "center", marginLeft: "auto" }}>
      <span style={{ fontSize: 11, fontFamily: FONT_SANS, color: savedAt ? "var(--brand-700, #00664D)" : "#bbb" }}>
        {savedAt
          ? `✓ Sparat ${new Date(savedAt).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })}`
          : "Sparas automatiskt"}
      </span>
      {onDelete && (
        <button onClick={onDelete} type="button" style={{
          padding: "5px 12px", borderRadius: 5,
          border: "1px solid #f0c9c0", background: "#fff", color: "#b5430f",
          fontSize: 11, fontWeight: 500, fontFamily: FONT_SANS, cursor: "pointer",
        }}>
          Ta bort
        </button>
      )}
      <button onClick={onDone} type="button" style={{
        padding: "5px 14px", borderRadius: 5, border: "none",
        background: "var(--brand-700, #00664D)", color: "#fff", fontSize: 12, fontWeight: 600,
        fontFamily: FONT_SANS, cursor: "pointer",
      }}>
        Klar
      </button>
    </div>
  );
}
