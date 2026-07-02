import { useState, useEffect } from "react";
import { loadManifest } from "../data/load";
import { TAXONOMI, type OmradeDef } from "../taxonomy";
import type { Scope } from "../types";

// ════════════════════════════════════════════════════════════
//  StartScreen — redaktionellt "magasinsomslag".
//
//  Områdena visas grupperade i taxonomins kategorier (taxonomy.ts):
//  varje kategori är en inramad "box" med folio, kicker och beskrivning.
//  Aktiva områden (finns i manifestet) är klickbara; planerade områden
//  visas nedtonade med "Planerat"-märke och tänkt innehåll — så att
//  helhetsbilden över möjliga områden syns redan nu.
//
//  Tidsperiod väljs INTE här — den bor inne i rapporten. Manifestet
//  (billigt, cachat) avgör vilka områden som faktiskt har data.
// ════════════════════════════════════════════════════════════

const FONT_SERIF = "'Source Serif 4', Georgia, serif";
const FONT_SANS = "'IBM Plex Sans', sans-serif";
const FONT_MONO = "'IBM Plex Mono', monospace";

/** Ett område så som startsidan visar det: taxonomi + manifest-status. */
interface AreaVy extends OmradeDef {
  /** Finns i datamanifestet → klickbart. */
  aktiv: boolean;
}

interface KategoriVy {
  id: string;
  namn: string;
  kicker: string;
  beskrivning: string;
  omraden: AreaVy[];
}

interface Props {
  onPick: (scope: Scope) => void;
}

export default function StartScreen({ onPick }: Props) {
  const [kategorier, setKategorier] = useState<KategoriVy[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ etikett: string; uppdaterad: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadManifest()
      .then((manifest) => {
        if (cancelled) return;
        // Unionen av sektioner över alla vyer (så t.ex. SKR-rapporten,
        // som bara finns i årsvyn, ändå erbjuds). Manifestets namn vinner.
        const iManifest = new Map<string, string>();
        for (const vy of Object.values(manifest)) {
          for (const s of vy.sektioner) {
            if (!iManifest.has(s.id)) iManifest.set(s.id, s.namn);
          }
        }

        // Taxonomi + manifest → kategorivyer. Ett område är aktivt bara
        // om det finns i manifestet (oavsett vad taxonomin påstår).
        const kats: KategoriVy[] = TAXONOMI.map((k) => ({
          id: k.id,
          namn: k.namn,
          kicker: k.kicker,
          beskrivning: k.beskrivning,
          omraden: k.omraden.map((o) => ({
            ...o,
            namn: iManifest.get(o.id) ?? o.namn,
            aktiv: iManifest.has(o.id),
          })),
        }));

        // Säkerhetsnät: manifest-sektioner utan taxonomi-post → "Övrigt".
        const klassade = new Set(TAXONOMI.flatMap((k) => k.omraden.map((o) => o.id)));
        const oklassade = [...iManifest.entries()].filter(([id]) => !klassade.has(id));
        if (oklassade.length > 0) {
          kats.push({
            id: "ovrigt",
            namn: "Övrigt",
            kicker: "Oklassade områden",
            beskrivning: "Områden i datakällan som ännu inte placerats i en kategori.",
            omraden: oklassade.map(([id, namn]) => ({
              id, namn, beskrivning: "", aktiv: true,
            })),
          });
        }

        setKategorier(kats);
        const forsta = Object.values(manifest)[0];
        if (forsta) setMeta({ etikett: forsta.etikett, uppdaterad: forsta.uppdaterad });
      })
      .catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)); });
    return () => { cancelled = true; };
  }, []);

  const antalAktiva = kategorier
    ? kategorier.reduce((n, k) => n + k.omraden.filter((o) => o.aktiv).length, 0)
    : 0;

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

      <main style={{ flex: 1, maxWidth: 1020, width: "100%", margin: "0 auto", padding: "64px 24px 80px" }}>

        {/* ── Redaktionellt anslag ── */}
        <header style={{ marginBottom: 48, maxWidth: 680 }}>
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
            Rapporten är indelad i kategorier som följer vårdens logik, från
            befolkningens behov till vårdens resurser. Välj ett sakområde,
            eller sammanställ samtliga områden i en gemensam rapport.
          </p>
        </header>

        {error ? (
          <div role="status" style={{ padding: "32px 0", color: "#D55E00", fontSize: 14 }}>
            Kunde inte ladda områden: {error}
          </div>
        ) : !kategorier ? (
          <div role="status" style={{ padding: "32px 0", color: "#83888A", fontSize: 14 }}>
            Laddar…
          </div>
        ) : (
          <>
            {/* ── Hero: Alla områden ── */}
            <AllaOmradenCard onClick={() => onPick("alla")} antal={antalAktiva} uppdaterad={meta?.uppdaterad} />

            {/* ── Kategoriboxar ── */}
            {kategorier.map((k, i) => (
              <KategoriBox key={k.id} kategori={k} index={i + 1} onPick={onPick} />
            ))}

            <p style={{ fontSize: 12.5, color: "#a0a49f", lineHeight: 1.6, marginTop: 28, maxWidth: 640 }}>
              Nedtonade områden är planerade men saknar ännu data. Indelningen
              bygger på etablerade ramverk för uppföljning av hälso- och
              sjukvård samt förvaltningens egna dimensioner, och utvecklas
              löpande tillsammans med verksamheten.
            </p>
          </>
        )}
      </main>

      <footer style={{ flexShrink: 0, padding: "20px 24px", borderTop: "1px solid #ececec" }}>
        <div style={{ maxWidth: 1020, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <img src={`${import.meta.env.BASE_URL}logo_farg.svg`} alt="Region Halland" style={{ height: 18, opacity: 0.5 }} />
          <span style={{ fontSize: 11, color: "#bbb" }}>HoS-rapport</span>
        </div>
      </footer>
    </div>
  );
}

// ── Hero-kort "Alla områden" (fylld grön, distinkt) ──
function AllaOmradenCard({ onClick, antal, uppdaterad }: { onClick: () => void; antal: number; uppdaterad?: string }) {
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
        marginBottom: 40,
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
          Samtliga {antal} aktiva sakområden i en gemensam rapport med översikt och signalkarta.
          {uppdaterad && <span style={{ fontFamily: FONT_MONO, fontSize: 12, marginLeft: 10, color: "rgba(255,255,255,0.55)" }}>Uppdaterad {uppdaterad}</span>}
        </div>
      </div>
      <Arrow color="#fff" />
    </button>
  );
}

// ── Kategoribox: inramad grupp med folio, kicker och områdeskort ──
function KategoriBox({ kategori, index, onPick }: { kategori: KategoriVy; index: number; onPick: (scope: Scope) => void }) {
  return (
    <section
      aria-labelledby={`kat-${kategori.id}`}
      style={{
        border: "1px solid #e0e0dc", borderRadius: 12, background: "#fff",
        padding: "24px 26px 26px", marginBottom: 20,
      }}
    >
      {/* Kategorihuvud: grön spine + folio + kicker + namn */}
      <div style={{ display: "flex", gap: 18, alignItems: "flex-start", marginBottom: 20, borderLeft: "4px solid #00664D", paddingLeft: 18 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 4 }}>
            <span style={{ fontFamily: FONT_MONO, fontSize: 12, fontWeight: 600, color: "#c4c4be" }}>
              {String(index).padStart(2, "0")}
            </span>
            <span style={{ fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.13em", color: "#00AB60" }}>
              {kategori.kicker}
            </span>
          </div>
          <h2 id={`kat-${kategori.id}`} style={{
            fontFamily: FONT_SERIF, fontSize: 24, fontWeight: 600, color: "#1a1a1a",
            letterSpacing: "-0.02em", margin: "0 0 5px", lineHeight: 1.15,
          }}>
            {kategori.namn}
          </h2>
          <p style={{ fontSize: 13.5, color: "#83888A", lineHeight: 1.5, margin: 0, maxWidth: 560 }}>
            {kategori.beskrivning}
          </p>
        </div>
      </div>

      {/* Områdeskort */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(236px, 1fr))", gap: 12,
      }}>
        {kategori.omraden.map((o) =>
          o.aktiv
            ? <OmradeCard key={o.id} omrade={o} onClick={() => onPick(o.id)} />
            : <PlaneradCard key={o.id} omrade={o} />,
        )}
      </div>
    </section>
  );
}

// ── Aktivt områdeskort (klickbart) ──
function OmradeCard({ omrade, onClick }: { omrade: AreaVy; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="start-card"
      style={{
        textAlign: "left", cursor: "pointer", background: "#fbfbf9",
        border: "1px solid #e0e0dc", borderRadius: 10, padding: "16px 16px 14px",
        fontFamily: FONT_SANS, display: "flex", flexDirection: "column", minHeight: 118,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
        <span style={{ fontFamily: FONT_SERIF, fontSize: 17.5, fontWeight: 600, color: "#1a1a1a", letterSpacing: "-0.01em", lineHeight: 1.25 }}>
          {omrade.namn}
        </span>
        <Arrow color="#00664D" small />
      </div>
      {omrade.beskrivning && (
        <span style={{ fontSize: 12.5, color: "#83888A", lineHeight: 1.5 }}>
          {omrade.beskrivning}
        </span>
      )}
    </button>
  );
}

// ── Planerat område (placeholder, ej klickbart) ──
function PlaneradCard({ omrade }: { omrade: AreaVy }) {
  const [visaExempel, setVisaExempel] = useState(false);
  return (
    <div
      onMouseEnter={() => setVisaExempel(true)}
      onMouseLeave={() => setVisaExempel(false)}
      style={{
        textAlign: "left", background: "transparent",
        border: "1px dashed #d6d6d0", borderRadius: 10, padding: "16px 16px 14px",
        fontFamily: FONT_SANS, display: "flex", flexDirection: "column", minHeight: 118,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
        <span style={{ fontFamily: FONT_SERIF, fontSize: 17.5, fontWeight: 600, color: "#9a9e99", letterSpacing: "-0.01em", lineHeight: 1.25 }}>
          {omrade.namn}
        </span>
        <span style={{
          flexShrink: 0, fontSize: 9.5, fontWeight: 600, textTransform: "uppercase",
          letterSpacing: "0.1em", color: "#a0a49f", border: "1px solid #dcdcd6",
          borderRadius: 4, padding: "2px 6px", marginTop: 2,
        }}>
          Planerat
        </span>
      </div>
      <span style={{ fontSize: 12.5, color: "#a0a49f", lineHeight: 1.5 }}>
        {visaExempel && omrade.exempel ? omrade.exempel : omrade.beskrivning}
      </span>
    </div>
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
