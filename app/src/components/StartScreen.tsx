import { useState, useEffect } from "react";
import { loadManifest } from "../data/load";
import type { Scope } from "../types";

// ════════════════════════════════════════════════════════════
//  StartScreen — redaktionellt "magasinsomslag".
//
//  Första anhalten: välj "Alla områden" eller ett enskilt sakområde.
//  Tidsperiod väljs INTE här — den bor inne i rapporten. Vi hämtar bara
//  manifestet (billigt, cachat) för att lista sakområdena. Statusräknare
//  visas medvetet inte här; den historien hör hemma i rapportens översikt.
// ════════════════════════════════════════════════════════════

const FONT_SERIF = "'Source Serif 4', Georgia, serif";
const FONT_SANS = "'IBM Plex Sans', sans-serif";
const FONT_MONO = "'IBM Plex Mono', monospace";

// Kort, redaktionell beskrivning per sakområde (frontend-text, ingen datafält).
// Saknas en nyckel faller vi tillbaka på enbart namnet.
const OMRADE_BESKRIVNING: Record<string, string> = {
  akutflode: "Tillgänglighet, väntetider och kapacitet i det akuta flödet.",
  slutenvard: "Beläggning, vårdtider och utskrivningsklara inom slutenvården.",
  skr: "SKR:s öppna jämförelser från Kolada — 76 indikatorer i sex delar, med Halland jämfört mot övriga regioner.",
};

interface AreaChoice {
  id: string;
  namn: string;
  beskrivning?: string;
}

interface Props {
  onPick: (scope: Scope) => void;
}

export default function StartScreen({ onPick }: Props) {
  const [omraden, setOmraden] = useState<AreaChoice[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ etikett: string; uppdaterad: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadManifest()
      .then((manifest) => {
        if (cancelled) return;
        // Unionen av sektioner över alla vyer (så t.ex. Patientenkäten,
        // som bara finns i årsvyn, ändå erbjuds). Stabil ordning: första
        // förekomst vinner.
        const seen = new Map<string, AreaChoice>();
        for (const vy of Object.values(manifest)) {
          for (const s of vy.sektioner) {
            if (!seen.has(s.id)) {
              seen.set(s.id, { id: s.id, namn: s.namn, beskrivning: OMRADE_BESKRIVNING[s.id] });
            }
          }
        }
        setOmraden([...seen.values()]);
        const forsta = Object.values(manifest)[0];
        if (forsta) setMeta({ etikett: forsta.etikett, uppdaterad: forsta.uppdaterad });
      })
      .catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#fbfbf9", fontFamily: FONT_SANS, display: "flex", flexDirection: "column" }}>

      {/* ── Smal brand-bar ── */}
      <nav style={{
        background: "#00664D", height: 48, flexShrink: 0,
        display: "flex", alignItems: "center", padding: "0 24px",
      }}>
        <img src={`${import.meta.env.BASE_URL}logo_vit.svg`} alt="Region Halland" style={{ height: 22 }} />
        <span style={{ width: 1, height: 16, background: "rgba(255,255,255,0.25)", margin: "0 12px" }} />
        <span style={{ fontFamily: "'Lexend Deca', sans-serif", fontWeight: 600, fontSize: 14, color: "#fff", letterSpacing: "-0.01em" }}>
          HoS-rapport
        </span>
      </nav>

      <main style={{ flex: 1, maxWidth: 980, width: "100%", margin: "0 auto", padding: "64px 24px 80px" }}>

        {/* ── Redaktionellt anslag ── */}
        <header style={{ marginBottom: 48, maxWidth: 640 }}>
          <div style={{
            fontSize: 11, fontWeight: 600, textTransform: "uppercase",
            letterSpacing: "0.14em", color: "#00AB60", marginBottom: 14, fontFamily: FONT_SANS,
          }}>
            Region Halland &middot; Uppföljning
          </div>
          <h1 style={{
            fontFamily: FONT_SERIF, fontWeight: 600, fontSize: 46, color: "#1a1a1a",
            letterSpacing: "-0.025em", lineHeight: 1.08, margin: "0 0 18px",
          }}>
            Hälso- och sjukvården<br />i Halland
          </h1>
          <p style={{ fontFamily: FONT_SERIF, fontSize: 18, lineHeight: 1.6, color: "#555", margin: 0 }}>
            Välj ett sakområde för att läsa rapporten, eller sammanställ
            samtliga områden i en gemensam rapport.
          </p>
        </header>

        {/* ── Områdesväljare ── */}
        <div style={{
          display: "flex", alignItems: "baseline", justifyContent: "space-between",
          marginBottom: 16, paddingBottom: 10, borderBottom: "1px solid #e0e0dc",
        }}>
          <span style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "#83888A" }}>
            Välj rapport
          </span>
          {meta && (
            <span style={{ fontSize: 11, color: "#aaa", fontFamily: FONT_MONO }}>
              Uppdaterad {meta.uppdaterad}
            </span>
          )}
        </div>

        {error ? (
          <div role="status" style={{ padding: "32px 0", color: "#D55E00", fontSize: 14 }}>
            Kunde inte ladda områden: {error}
          </div>
        ) : !omraden ? (
          <div role="status" style={{ padding: "32px 0", color: "#83888A", fontSize: 14 }}>
            Laddar…
          </div>
        ) : (
          <>
            {/* Hero-kort: Alla områden */}
            <AllaOmradenCard onClick={() => onPick("alla")} antal={omraden.length} />

            {/* Rutnät: enskilda sakområden */}
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(248px, 1fr))",
              gap: 16, marginTop: 16,
            }}>
              {omraden.map((o, i) => (
                <OmradeCard key={o.id} omrade={o} index={i + 1} onClick={() => onPick(o.id)} />
              ))}
            </div>
          </>
        )}
      </main>

      <footer style={{ flexShrink: 0, padding: "20px 24px", borderTop: "1px solid #ececec" }}>
        <div style={{ maxWidth: 980, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <img src={`${import.meta.env.BASE_URL}logo_farg.svg`} alt="Region Halland" style={{ height: 18, opacity: 0.5 }} />
          <span style={{ fontSize: 11, color: "#bbb" }}>HoS-rapport</span>
        </div>
      </footer>
    </div>
  );
}

// ── Hero-kort "Alla områden" (fylld grön, distinkt) ──
function AllaOmradenCard({ onClick, antal }: { onClick: () => void; antal: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="start-card start-card--hero"
      style={{
        width: "100%", textAlign: "left", cursor: "pointer",
        background: "#00664D", border: "none", borderRadius: 12,
        padding: "26px 28px", color: "#fff", fontFamily: FONT_SANS,
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "#9fe0c4", marginBottom: 8 }}>
          Hela rapporten
        </div>
        <div style={{ fontFamily: FONT_SERIF, fontSize: 27, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: 6 }}>
          Alla områden
        </div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.78)", lineHeight: 1.5 }}>
          Samtliga {antal} sakområden samlade i en gemensam rapport med översikt och heatmap.
        </div>
      </div>
      <Arrow color="#fff" />
    </button>
  );
}

// ── Sakområdeskort ──
function OmradeCard({ omrade, index, onClick }: { omrade: AreaChoice; index: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="start-card"
      style={{
        textAlign: "left", cursor: "pointer", background: "#fff",
        border: "1px solid #e0e0dc", borderRadius: 12, padding: "22px 22px 20px",
        fontFamily: FONT_SANS, display: "flex", flexDirection: "column",
        minHeight: 168, boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{ fontFamily: FONT_MONO, fontSize: 13, fontWeight: 600, color: "#c4c4be" }}>
          {String(index).padStart(2, "0")}
        </span>
        <Arrow color="#00664D" small />
      </div>
      <div style={{ fontFamily: FONT_SERIF, fontSize: 21, fontWeight: 600, color: "#1a1a1a", letterSpacing: "-0.015em", lineHeight: 1.2, marginBottom: 8 }}>
        {omrade.namn}
      </div>
      {omrade.beskrivning && (
        <div style={{ fontSize: 13.5, color: "#83888A", lineHeight: 1.5, marginTop: "auto" }}>
          {omrade.beskrivning}
        </div>
      )}
    </button>
  );
}

function Arrow({ color, small = false }: { color: string; small?: boolean }) {
  const s = small ? 18 : 26;
  return (
    <span className="start-arrow" aria-hidden="true" style={{ flexShrink: 0, display: "inline-flex", color, transition: "transform 0.18s" }}>
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </span>
  );
}
