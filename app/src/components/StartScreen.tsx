import { useState, useEffect } from "react";
import { loadManifest, type SektionSummering } from "../data/load";
import { TAXONOMI, type OmradeDef, type KategoriDef } from "../taxonomy";
import { SIGNAL_COLORS, SIGNAL_LABELS } from "../charts/constants";
import { VY_ORDNING, oppningsVy } from "../utils/vyval";
import type { Scope } from "../types";

// ════════════════════════════════════════════════════════════
//  StartScreen — rapportens omslag och innehållsförteckning.
//
//  Ett kort per rapport, grupperat i taxonomins kategorier. Sedan omtaget
//  2026-08-19 är varje kapitel i SKR:s Hälso- och sjukvårdsrapport en egen
//  rapport, vilket gör grupperingen till bärande struktur och inte bara till
//  en etikett: kategorin får en egen rubrik med grön topplinje, kicker,
//  beskrivning och omfattning, och korten under den läses som en avdelning.
//
//  Kortet är avsett att kunna läsas fristående: vad rapporten innehåller,
//  vilket kapitel den är, varifrån datan kommer, hur ofta den uppdateras,
//  vad den jämförs mot och hur indikatorerna står just nu.
//
//  Siffrorna kommer från manifestet (index.json), som R-exporten fyller
//  med en lätt sammanfattning per sektion. Ingen sektionsdata laddas här:
//  hela startsidan bygger på en enda liten fil.
//
//  Taxonomin (taxonomy.ts) innehåller bara områden med faktisk data.
//  Ett område som finns i taxonomin men saknas i manifestet visas inte;
//  ett område i manifestet utan taxonomi-post hamnar under "Övrigt".
//
//  Tidsperiod väljs INTE här — den bor inne i rapporten.
// ════════════════════════════════════════════════════════════

const FONT_SERIF = "'Source Serif 4', Georgia, serif";
const FONT_SANS = "'IBM Plex Sans', sans-serif";

type StatusN = { gron: number; gul: number; rod: number };

/** Ett område så som startsidan visar det: taxonomi + siffror ur manifestet. */
interface AreaVy extends OmradeDef {
  n_kpier: number;
  n_delar: number;
  status: StatusN;
  /** Vilka tidsvyer området finns i, t.ex. ["Dag", "Vecka"]. */
  vyer: string[];
}

/** En kategori med sina rapporter, i visningsordning. */
interface GruppVy {
  kategori: KategoriDef;
  omraden: AreaVy[];
}

interface Props {
  onPick: (scope: Scope) => void;
}

const VY_NAMN: Record<string, string> = {
  dag: "Dag", vecka: "Vecka", manad: "Månad", kvartal: "Kvartal", ar: "År",
};

const TOM_STATUS: StatusN = { gron: 0, gul: 0, rod: 0 };

/** Kategorin oklassade manifest-sektioner hamnar i (säkerhetsnät). */
const OVRIGT_KATEGORI: KategoriDef = {
  id: "ovrigt",
  namn: "Övrigt",
  kicker: "Ännu inte placerat",
  beskrivning:
    "Områden som finns i datakällan men ännu inte har någon plats i rapportens indelning.",
  omraden: [],
};

export default function StartScreen({ onPick }: Props) {
  const [grupper, setGrupper] = useState<GruppVy[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Sista datum som finns i datan (ISO) — kolofonens datering. */
  const [tomDatum, setTomDatum] = useState<string | null>(null);
  /** Helhetsrapportens omfattning, räknad i den vy "alla" öppnas i. */
  const [helhet, setHelhet] = useState<{ n_omraden: number; status: StatusN } | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadManifest()
      .then((manifest) => {
        if (cancelled) return;

        // Vilka tidsvyer varje område finns i (i kronologisk ordning).
        const vyerFor = new Map<string, string[]>();
        for (const vyId of VY_ORDNING) {
          for (const s of manifest[vyId]?.sektioner ?? []) {
            vyerFor.set(s.id, [...(vyerFor.get(s.id) ?? []), VY_NAMN[vyId] ?? vyId]);
          }
        }

        // Kortets siffror hämtas ur DEN VY KORTET LEDER TILL (vyval.ts), inte
        // ur en godtycklig vy. Annars visar omslaget en statusfördelning som
        // inte återfinns i rapporten bakom kortet.
        const iManifest = new Map<string, SektionSummering>();
        for (const vy of Object.values(manifest)) {
          for (const s of vy.sektioner) {
            if (!iManifest.has(s.id)) iManifest.set(s.id, s);
          }
        }
        const summeringFor = (id: string): SektionSummering | undefined => {
          const vy = oppningsVy(manifest, id);
          const iVy = vy ? manifest[vy]?.sektioner.find((s) => s.id === id) : undefined;
          return iVy ?? iManifest.get(id);
        };

        const bygg = (o: OmradeDef): AreaVy | null => {
          const s = summeringFor(o.id);
          if (!s) return null; // taxonomipost utan data visas inte
          return {
            ...o,
            namn: s.namn || o.namn,
            n_kpier: s.n_kpier,
            n_delar: s.n_delar,
            status: s.status ?? TOM_STATUS,
            vyer: vyerFor.get(o.id) ?? [],
          };
        };

        const lista: GruppVy[] = TAXONOMI
          .map((k) => ({
            kategori: k,
            omraden: k.omraden.map(bygg).filter((a): a is AreaVy => a !== null),
          }))
          .filter((g) => g.omraden.length > 0);

        // Säkerhetsnät: manifest-sektioner utan taxonomi-post tappas inte bort.
        const klassade = new Set(TAXONOMI.flatMap((k) => k.omraden.map((o) => o.id)));
        const ovriga: AreaVy[] = [];
        for (const [id] of iManifest) {
          if (klassade.has(id)) continue;
          const s = summeringFor(id)!;
          ovriga.push({
            id, namn: s.namn,
            beskrivning: "Området finns i datakällan men är ännu inte placerat i rapportens indelning.",
            datatyp: "intern", kalla: "Okänd", takt: "Okänd", jamforelse: "Okänd",
            n_kpier: s.n_kpier, n_delar: s.n_delar, status: s.status ?? TOM_STATUS,
            vyer: vyerFor.get(id) ?? [],
          });
        }
        if (ovriga.length > 0) lista.push({ kategori: OVRIGT_KATEGORI, omraden: ovriga });

        setGrupper(lista);

        // Hero och kolofon beskriver HELHETSRAPPORTEN, och räknas därför i den
        // vy "Alla områden" öppnas i. Summan av korten duger inte: ett område
        // kan öppnas i en annan vy och ha en annan statusfördelning där.
        const helhetsVy = oppningsVy(manifest, "alla");
        const sektioner = helhetsVy ? manifest[helhetsVy]?.sektioner ?? [] : [];
        setHelhet({
          n_omraden: sektioner.length,
          status: sektioner.reduce(
            (a, s) => ({
              gron: a.gron + (s.status?.gron ?? 0),
              gul: a.gul + (s.status?.gul ?? 0),
              rod: a.rod + (s.status?.rod ?? 0),
            }),
            TOM_STATUS,
          ),
        });

        // Alla vyer delar rapportdatum; ta det senaste som finns.
        const datum = Object.values(manifest).map((v) => v.datum).filter(Boolean).sort();
        if (datum.length > 0) setTomDatum(datum[datum.length - 1]);
      })
      .catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)); });
    return () => { cancelled = true; };
  }, []);

  const totalt: StatusN = helhet?.status ?? TOM_STATUS;
  const antalIndikatorer = totalt.gron + totalt.gul + totalt.rod;
  const alla = (grupper ?? []).flatMap((g) => g.omraden);
  const antalOmraden = helhet?.n_omraden ?? alla.length;
  const antalKategorier = (grupper ?? []).length;

  // Folio löper obrutet över kategorierna, så att korten numreras 01…07 och
  // inte börjar om i varje avdelning. Startnumret per grupp räknas ut i
  // förväg; en räknare som skrivs under renderingen är inte tillåten.
  const folioStart: number[] = [];
  (grupper ?? []).reduce((n, g) => { folioStart.push(n); return n + g.omraden.length; }, 1);

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

      <main style={{ flex: 1, maxWidth: 1020, width: "100%", margin: "0 auto", padding: "68px 24px 88px" }}>

        {/* ── Masthead ── */}
        <header style={{ marginBottom: 40 }}>
          <div style={{
            fontSize: 11, fontWeight: 600, textTransform: "uppercase",
            letterSpacing: "0.14em", color: "#00AB60", marginBottom: 14,
          }}>
            Region Halland &middot; Uppföljning
          </div>
          <h1 style={{
            fontFamily: FONT_SERIF, fontWeight: 600, fontSize: 48, color: "#1a1a1a",
            letterSpacing: "-0.028em", lineHeight: 1.05, margin: "0 0 18px", maxWidth: 680,
          }}>
            Hälso- och sjukvården<br />i Halland
          </h1>
          <p style={{ fontFamily: FONT_SERIF, fontSize: 18.5, lineHeight: 1.6, color: "#555", margin: "0 0 34px", maxWidth: 660 }}>
            SKR:s Hälso- och sjukvårdsrapport, uppdelad så att vart och ett av
            dess sex kapitel är en egen rapport. Varje rapport inleds med sitt
            sammanhang, redovisar sina källor indikator för indikator och kan
            läsas för sig eller som en del av helheten.
          </p>

          {/* Kolofon: rapportens omfattning i siffror */}
          {grupper && (
            <div className="start-colophon">
              <Kolofon tal={antalOmraden} etikett="Rapporter" />
              <Kolofon tal={antalIndikatorer} etikett="Indikatorer" />
              <Kolofon tal={antalKategorier} etikett="Avdelningar" />
              {tomDatum && <Kolofon tal={tomDatum} etikett="Data t.o.m." />}
            </div>
          )}
        </header>

        {error ? (
          <div role="status" style={{ padding: "32px 0", color: "#D55E00", fontSize: 14 }}>
            Kunde inte ladda områden: {error}
          </div>
        ) : !grupper ? (
          <div role="status" style={{ padding: "32px 0", color: "#83888A", fontSize: 14 }}>
            Laddar…
          </div>
        ) : (
          <>
            <HeroKort
              onClick={() => onPick("alla")}
              antalOmraden={antalOmraden}
              antalIndikatorer={antalIndikatorer}
              status={totalt}
            />

            {grupper.map((g, gi) => (
              <section key={g.kategori.id} className="start-group">
                <KategoriRubrik
                  kategori={g.kategori}
                  antalOmraden={g.omraden.length}
                  antalIndikatorer={g.omraden.reduce((a, o) => a + o.n_kpier, 0)}
                />
                {g.omraden.map((o, oi) => (
                  <OmradeKort
                    key={o.id}
                    omrade={o}
                    folio={folioStart[gi] + oi}
                    onClick={() => onPick(o.id)}
                  />
                ))}
              </section>
            ))}

            <p style={{ fontSize: 12.5, color: "#a0a49f", lineHeight: 1.65, marginTop: 30, maxWidth: 660 }}>
              Rapporten visar bara områden med inhämtad data. Tidigare områden
              för befolkning, folkhälsa och ekonomi är arkiverade och kan
              återinföras när de ska ingå igen.
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

// ── Kolofonpost: stor mono-siffra + versal etikett ──
function Kolofon({ tal, etikett }: { tal: number | string; etikett: string }) {
  return (
    <div>
      <div className="start-colophon__num">{tal}</div>
      <div className="start-colophon__lbl">{etikett}</div>
    </div>
  );
}

// ── Kategorirubrik: avdelaren mellan rapportgrupperna ──
// Grön topplinje + kicker + serif-titel + kort beskrivning, samma editoriella
// språk som delrubrikerna inne i rapporten (.del-plate).
function KategoriRubrik({ kategori, antalOmraden, antalIndikatorer }: {
  kategori: KategoriDef;
  antalOmraden: number;
  antalIndikatorer: number;
}) {
  return (
    <div className="start-group__head">
      <div className="start-group__rad">
        <span className="start-group__kicker">{kategori.kicker}</span>
        <span className="start-group__meta">
          {antalOmraden} {antalOmraden === 1 ? "rapport" : "rapporter"} &middot; {antalIndikatorer} indikatorer
        </span>
      </div>
      <h2 className="start-group__namn" style={{ fontFamily: FONT_SERIF }}>{kategori.namn}</h2>
      <p className="start-group__text">{kategori.beskrivning}</p>
    </div>
  );
}

// ── Hero: hela rapporten i ett svep ──
function HeroKort({ onClick, antalOmraden, antalIndikatorer, status }: {
  onClick: () => void;
  antalOmraden: number;
  antalIndikatorer: number;
  status: StatusN;
}) {
  return (
    <button type="button" onClick={onClick} className="start-hero">
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: "#9fe0c4", marginBottom: 9 }}>
          Hela rapporten
        </div>
        <div style={{ fontFamily: FONT_SERIF, fontSize: 29, fontWeight: 600, letterSpacing: "-0.022em", lineHeight: 1.1, marginBottom: 7 }}>
          Samtliga rapporter
        </div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.8)", lineHeight: 1.55, maxWidth: 470 }}>
          Alla {antalOmraden} rapporter och {antalIndikatorer} indikatorer i ett
          dokument, med gemensam signalöversikt och sammanfattning.
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 26, flexShrink: 0 }}>
        <div style={{ width: 236 }}>
          <Matare status={status} hero />
          <div className="start-status__rad" style={{ marginTop: 9, color: "rgba(255,255,255,0.82)" }}>
            <span>{status.gron} i fas</span>
            <span>{status.gul} bevaka</span>
            <span>{status.rod} avvikelse</span>
          </div>
        </div>
        <Pil color="#fff" />
      </div>
    </button>
  );
}

// ── Områdeskort ──
function OmradeKort({ omrade, folio, onClick }: { omrade: AreaVy; folio: number; onClick: () => void }) {
  const o = omrade;
  const vyText = o.vyer.length >= 5 ? "Alla tidsvyer" : o.vyer.join(" · ");

  return (
    <button
      type="button"
      onClick={onClick}
      className="start-area"
      aria-label={`${o.namn}. ${o.n_kpier} indikatorer. ${o.beskrivning}`}
    >
      {/* Huvudspalt: det redaktionella */}
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span className="start-area__folio">{String(folio).padStart(2, "0")}</span>
          {o.serie && <span className="start-area__serie">{o.serie}</span>}
          <span className="start-tag" data-typ={o.datatyp}>
            {o.datatyp === "intern" ? "Intern källa" : "Öppen data"}
          </span>
        </div>

        <div className="start-area__namn">{o.namn}</div>
        <div className="start-area__text">{o.beskrivning}</div>
        {o.notis && <div className="start-notis">{o.notis}</div>}

        <div className="start-fakta">
          <Fakta etikett="Källa" varde={o.kalla} />
          <Fakta etikett="Uppdateras" varde={o.takt} />
          <Fakta etikett="Jämförs mot" varde={o.jamforelse} />
          {vyText && <Fakta etikett="Tidsvyer" varde={vyText} />}
        </div>
      </div>

      {/* Statusspalt: enbart siffror, optiskt i linje med titeln */}
      <div className="start-area__status">
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span className="start-status__tal">{o.n_kpier}</span>
          <span className="start-status__enhet">
            {o.n_delar > 0 ? `indikatorer · ${o.n_delar} avsnitt` : "indikatorer"}
          </span>
        </div>

        <div style={{ marginTop: 12 }}>
          <Matare status={o.status} />
          <div className="start-status__rad" style={{ marginTop: 8 }}>
            <StatusTal n={o.status.gron} status="gron" />
            <StatusTal n={o.status.gul} status="gul" />
            <StatusTal n={o.status.rod} status="rod" />
          </div>
        </div>
      </div>

      {/* Pil */}
      <div style={{ alignSelf: "center" }}>
        <Pil color="#00664D" small />
      </div>
    </button>
  );
}

function Fakta({ etikett, varde }: { etikett: string; varde: string }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div className="start-fakta__lbl">{etikett}</div>
      <div className="start-fakta__val">{varde}</div>
    </div>
  );
}

// ── Mätare: indikatorernas statusfördelning som en remsa ──
// Färg är aldrig ensam bärare: siffrorna under remsan har textetikett.
function Matare({ status, hero = false }: { status: StatusN; hero?: boolean }) {
  const total = status.gron + status.gul + status.rod;
  const andel = (n: number) => (total > 0 ? (n / total) * 100 : 0);
  const titel = `${status.gron} i fas, ${status.gul} att bevaka, ${status.rod} i avvikelse`;
  return (
    <div className={`start-meter${hero ? " start-meter--hero" : ""}`} role="img" aria-label={titel} title={titel}>
      {(["gron", "gul", "rod"] as const).map((s) => (
        <span key={s} style={{ width: `${andel(status[s])}%`, background: SIGNAL_COLORS[s] }} />
      ))}
    </div>
  );
}

function StatusTal({ n, status }: { n: number; status: "gron" | "gul" | "rod" }) {
  return (
    <span style={{ color: n > 0 ? SIGNAL_COLORS[status] : "#c4c4be" }}>
      {n} <span style={{ fontFamily: FONT_SANS, fontSize: 10.5 }}>{SIGNAL_LABELS[status].toLowerCase()}</span>
    </span>
  );
}

function Pil({ color, small = false }: { color: string; small?: boolean }) {
  const s = small ? 22 : 26;
  return (
    <span className="start-arrow" aria-hidden="true" style={{ color }}>
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </span>
  );
}
