import { useState, useEffect } from "react";
import { getVComment, saveVComment, type VComment } from "../stores/comments";

interface Props {
  targetId: string;
  aiText: string;
  editMode: boolean;
}

export default function VCommentBlock({ targetId, aiText, editMode }: Props) {
  const [comment, setVComment] = useState<VComment | undefined>();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [author, setAuthor] = useState("");

  useEffect(() => {
    setVComment(getVComment(targetId));
  }, [targetId]);

  function handleSave() {
    const c: VComment = {
      targetId,
      text: draft,
      author: author || "Anonym",
      timestamp: new Date().toISOString(),
    };
    saveVComment(c);
    setVComment(c);
    setEditing(false);
  }

  const paragraphs = aiText.split("\n\n");

  return (
    <div style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
      {/* AI-analys */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#16a34a", display: "inline-block" }} />
          <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#16a34a" }}>
            AI-analys
          </span>
        </div>
        <div style={{ fontFamily: "'Merriweather', Georgia, serif" }}>
          {paragraphs.map((p, i) => (
            <p
              key={i}
              style={{
                fontSize: i === 0 ? 16 : 15,
                fontWeight: 300,
                fontStyle: i === 0 ? "italic" : "normal",
                lineHeight: 1.85,
                color: "#00664D",
                margin: "0 0 14px",
              }}
            >
              {p}
            </p>
          ))}
        </div>
      </div>

      {/* Verksamhetskommentar */}
      <div
        style={{
          borderLeft: "3px solid #2563eb",
          paddingLeft: 16,
          marginTop: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#2563eb", display: "inline-block" }} />
          <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "#2563eb" }}>
            Verksamhetskommentar
          </span>
          {editMode && !editing && (
            <button
              onClick={() => { setDraft(comment?.text || ""); setAuthor(comment?.author || ""); setEditing(true); }}
              style={{
                marginLeft: "auto", background: "none", border: "1px solid #d4d4d4", borderRadius: 4,
                padding: "2px 8px", fontSize: 11, fontWeight: 500, color: "#666", cursor: "pointer",
              }}
            >
              {comment?.text ? "Redigera" : "+ Lagg till"}
            </button>
          )}
        </div>

        {editing ? (
          <div>
            <input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Ditt namn"
              style={{
                width: "100%", padding: "6px 8px", border: "1px solid #d4d4d4", borderRadius: 4,
                fontSize: 13, fontFamily: "'IBM Plex Sans', sans-serif", marginBottom: 6,
              }}
            />
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={4}
              placeholder="Skriv verksamhetens kommentar..."
              style={{
                width: "100%", padding: "8px", border: "1px solid #d4d4d4", borderRadius: 4,
                fontSize: 14, fontFamily: "'IBM Plex Sans', sans-serif", lineHeight: 1.6, resize: "vertical",
              }}
            />
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              <button
                onClick={handleSave}
                style={{
                  background: "#2563eb", color: "#fff", border: "none", borderRadius: 4,
                  padding: "5px 14px", fontSize: 12, fontWeight: 500, cursor: "pointer",
                }}
              >
                Spara
              </button>
              <button
                onClick={() => setEditing(false)}
                style={{
                  background: "none", border: "1px solid #d4d4d4", borderRadius: 4,
                  padding: "5px 14px", fontSize: 12, fontWeight: 500, color: "#666", cursor: "pointer",
                }}
              >
                Avbryt
              </button>
            </div>
          </div>
        ) : comment?.text ? (
          <div>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: "#1a1a1a", margin: "0 0 6px" }}>{comment.text}</p>
            <div style={{ fontSize: 11, color: "#888" }}>
              {comment.author} &middot; {new Date(comment.timestamp).toLocaleString("sv-SE")}
            </div>
          </div>
        ) : (
          <p style={{ fontSize: 13, color: "#aaa", fontStyle: "italic", margin: 0 }}>Ingen kommentar tillagd.</p>
        )}
      </div>
    </div>
  );
}
