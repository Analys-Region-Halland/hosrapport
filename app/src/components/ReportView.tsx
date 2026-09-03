import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { usePosition, setPosition, resetPosition } from "../stores/position";
import { SIGNAL_COLORS } from "../charts/constants";
import type {
  VyData,
  KpiData,
  KallaRef,
  Section,
  ContentBlock,
} from "../types";
import FacetedChart from "./FacetedChart";
import { OmIndikatorn, Datakalla, Paverkansfaktorer } from "./IndikatorFakta";
import SignalTimeline from "./SignalTimeline";
import { StatusTag } from "./SignalStrip";
import EditableBlock, { type AnteckningData } from "./EditableBlock";
import { getBlocks, setBlocks as persistBlocks, getForfattare, BLOCKS_KEY } from "../stores/blocks";
import { hasDirty } from "../stores/dirty";
import { fullEtikett, fmtVarde, fmtSuffix } from "../utils/format";
import { ANALYS_RUBRIK_GLOBAL } from "../utils/analys";
import SegmentedControl from "./SegmentedControl";
import { kategoriForOmrade } from "../taxonomy";

// ════════════════════════════════════════════════════════
//  ReportView — fullskärms rapport (översikt + dokument)
// ════════════════════════════════════════════════════════

const mono: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontFeatureSettings: "'tnum'",
  fontVariantNumeric: "tabular-nums",
};

const FONT = "'IBM Plex Sans', sans-serif";

const VY_LABELS: Record<string, string> = {
  dag: "Daglig analys",
  vecka: "Veckoanalys",
  manad: "Månadsanalys",
  kvartal: "Kvartalsanalys",
  ar: "Årsanalys",
};

export interface VyItem { id: string; label: string; disabled?: boolean }

// ── Delar: expandera en sektion med delar till pseudo-sektioner ──
// Används av heatmap-gruppering och TOC så att t.ex. SKR-rapportens sex
// tematiska delar blir egna grupper. Sektion utan delar passerar oförändrad.
function delSektioner(s: Section): Section[] {
  if (!s.delar || s.delar.length === 0) return [s];
  const byId = new Map(s.kpier.map((k) => [k.id, k]));
  return s.delar.map((d) => ({
    id: d.id,
    namn: d.namn,
    analys: d.analys,
    kpier: d.kpi_ids.map((id) => byId.get(id)).filter((k): k is KpiData => !!k),
  }));
}

interface Props {
  /** Färdigladdad vy-data, eller null medan den hämtas. */
  data: VyData | null;
  /** Felmeddelande från dataladdning, om något. */
  error?: string | null;
  /** Om angivet, visa bara denna sektion (delrapport / ett sakområde) */
  sectionId?: string;
  /** Aktiv tidsvy + väljare (rapporten äger tidsperioden) */
  aktivVy: string;
  vyItems: VyItem[];
  onChangeVy: (id: string) => void;
  /** Global Aggregerat/Dag för översikten (per-indikator har egen toggle) */
  visaDagar?: boolean;
  onChangeVisaDagar?: (v: boolean) => void;
  /** Öppna en KPI i stor graf (översikt + heatmap) */
  onOpenChart?: (kpi: KpiData) => void;
  /** Tillbaka till startsidan */
  onBack: () => void;
}

// ── Blockindex: id → var i rapporten blocket hör hemma ──
// Används av positionsraden för att skriva ut "1 Avsnitt › 1.2 Indikator".
// Numreringen speglar exakt den i SectionBlock/DelBlock.
interface BlockInfo {
  typ: "oversikt" | "kapitel" | "avsnitt" | "indikator" | "kallor";
  nr?: string;
  namn: string;
  kapitel?: { nr?: string; namn: string };
  avsnitt?: { nr: string; namn: string };
  kpi?: KpiData;
}

function byggBlockIndex(sektioner: Section[], enskild: boolean): Map<string, BlockInfo> {
  const m = new Map<string, BlockInfo>();
  m.set("oversikt", { typ: "oversikt", namn: "Översikt" });
  sektioner.forEach((sek, i) => {
    const kapNr = enskild ? undefined : String(i + 1);
    const kap = { nr: kapNr, namn: sek.namn };
    m.set(sek.id, { typ: "kapitel", nr: kapNr, namn: sek.namn, kapitel: kap });
    const under = (n: number) => (kapNr ? `${kapNr}.${n}` : String(n));
    const delar = sek.delar && sek.delar.length > 0 ? delSektioner(sek) : null;
    if (delar) {
      delar.forEach((del, di) => {
        const avs = { nr: under(di + 1), namn: del.namn };
        m.set(del.id, { typ: "avsnitt", nr: avs.nr, namn: del.namn, kapitel: kap, avsnitt: avs });
        del.kpier.forEach((kpi, ki) => {
          m.set(kpi.id, { typ: "indikator", nr: `${avs.nr}.${ki + 1}`, namn: kpi.namn, kapitel: kap, avsnitt: avs, kpi });
        });
      });
    } else {
      sek.kpier.forEach((kpi, ki) => {
        m.set(kpi.id, { typ: "indikator", nr: under(ki + 1), namn: kpi.namn, kapitel: kap, kpi });
      });
    }
  });
  m.set("kallor", { typ: "kallor", namn: "Källor" });
  return m;
}

/** Sant när skärmen är smalare än sidomenyns brytpunkt. */
function useSmalSkarm(maxBredd = 900): boolean {
  const [smal, setSmal] = useState(() => window.matchMedia(`(max-width: ${maxBredd}px)`).matches);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${maxBredd}px)`);
    const h = () => setSmal(mq.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, [maxBredd]);
  return smal;
}

export default function ReportView({
  data, error, sectionId, aktivVy, vyItems, onChangeVy,
  visaDagar = false, onChangeVisaDagar, onOpenChart, onBack,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const smal = useSmalSkarm();
  const [tocOppen, setTocOppen] = useState(false);
  const tocOppenRef = useRef(false);
  tocOppenRef.current = tocOppen;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Escape stänger innehållsarket först, rapporten därefter.
      if (tocOppenRef.current) setTocOppen(false);
      else onBack();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onBack]);

  // Varna vid stängning/omladdning om något fortfarande är osparat (utöver
  // autospar + spara-vid-blur/unmount som täcker de flesta fall).
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasDirty()) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // ── Läsposition ──
  // Läslinjen ligger en bit ned i fönstret. Det sista blocket vars överkant
  // passerat linjen är det som läses; progressen är hur långt in i blocket
  // linjen ligger. Resultatet går till positionslagret (positionsrad och
  // innehållsförteckning prenumererar), och fokusklassen sätts direkt på
  // DOM:en så att artikelträdet med alla diagram inte ritas om vid scroll.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let raf = 0;
    const mat = () => {
      raf = 0;
      const tb = el.querySelector<HTMLElement>(".report-toolbar");
      const lasLinje = (tb?.offsetHeight ?? 60) + el.clientHeight * 0.28;
      const block = Array.from(el.querySelectorAll<HTMLElement>("[data-block]"));
      let aktiv: HTMLElement | null = null;
      for (const b of block) {
        if (b.getBoundingClientRect().top <= lasLinje) aktiv = b;
        else break;
      }
      const id = aktiv?.dataset.block ?? "";
      let progress = 0;
      if (aktiv) {
        const r = aktiv.getBoundingClientRect();
        progress = Math.min(1, Math.max(0, (lasLinje - r.top) / Math.max(1, r.height)));
      }
      el.querySelectorAll<HTMLElement>(".fokusbar").forEach((b) => {
        b.classList.toggle("fokusbar--dimmad", id !== "" && b.dataset.block !== id);
      });
      setPosition({ id, progress });
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(mat); };
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    // Första mätningen efter att diagrammen fått sina mått.
    const t = setTimeout(mat, 50);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      clearTimeout(t);
      if (raf) cancelAnimationFrame(raf);
      resetPosition();
    };
  }, [data, sectionId]);

  // Memoiseras så att t.ex. scroll-spy-omritningar inte bygger om heatmapen.
  const visadeSektioner = useMemo(
    () => data ? (sectionId ? data.sektioner.filter((s) => s.id === sectionId) : data.sektioner) : [],
    [data, sectionId],
  );
  // Sektioner med delar (t.ex. SKR) får sin signalöversikt PER DEL inne i
  // kapitlet (DelBlock) — den stora heatmapen överst visar bara övriga
  // sektioner, annars blir den för tung med alla indikatorer i början.
  const heatmapSektioner = useMemo(
    () => visadeSektioner.filter((s) => !s.delar || s.delar.length === 0),
    [visadeSektioner],
  );
  const vyLabel = data ? (VY_LABELS[data.vy] || "") : "";
  const sectionTitle = sectionId ? visadeSektioner[0]?.namn : null;
  const showSidebar = (!sectionId && visadeSektioner.length > 1) ||
    Boolean(sectionId && visadeSektioner[0]?.delar?.length);
  const blockIndex = useMemo(
    () => byggBlockIndex(visadeSektioner, Boolean(sectionId)),
    [visadeSektioner, sectionId],
  );
  // På smal skärm finns sidomenyn bara som ark, öppnat från positionsraden.
  const menyIArk = showSidebar && smal;

  // ── Ladda ner som PowerPoint ──
  // pptxgenjs är tungt och behövs bara vid klick, så modulen laddas dynamiskt.
  // Då hamnar den i en egen chunk i stället för i huvudbunten.
  const [exporterar, setExporterar] = useState(false);
  const [exportFel, setExportFel] = useState<string | null>(null);
  const handleExport = useCallback(async () => {
    if (!data || visadeSektioner.length === 0) return;
    setExporterar(true);
    setExportFel(null);
    try {
      const { exporteraPptx } = await import("../utils/pptx");
      await exporteraPptx({
        sektioner: visadeSektioner,
        vyData: data,
        titel: sectionTitle ?? "Hälso- och sjukvården i Halland",
        kicker: sectionId ? kategoriForOmrade(sectionId)?.namn : undefined,
      });
    } catch (e: unknown) {
      setExportFel(e instanceof Error ? e.message : String(e));
    } finally {
      setExporterar(false);
    }
  }, [data, visadeSektioner, sectionTitle, sectionId]);

  return (
    <div
      ref={scrollRef}
      style={{
        position: "fixed", inset: 0, background: "#fbfbf9",
        zIndex: 200, overflowY: "auto", animation: "fadeIn 0.2s ease",
      }}
    >
      <div style={{ maxWidth: 1320, margin: "0 auto", position: "relative" }}>

        {/* ── Verktygsfält + positionsrad ── */}
        <Toolbar
          onBack={onBack}
          aktivVy={aktivVy} vyItems={vyItems} onChangeVy={onChangeVy}
          onExport={handleExport}
          exporterar={exporterar}
          exportAktiv={Boolean(data) && visadeSektioner.length > 0}
          exportFel={exportFel}
          titel={sectionTitle || "Hälso- och sjukvården"}
          blockIndex={blockIndex}
          onOpenToc={menyIArk ? () => setTocOppen(true) : undefined}
        />

        {/* ── Innehållet som ark på smal skärm ── */}
        {menyIArk && tocOppen && (
          <div className="toc-ark" role="dialog" aria-label="Innehåll">
            <div className="toc-ark__bakgrund" onClick={() => setTocOppen(false)} />
            <div className="toc-ark__panel">
              <SidebarToc
                sections={visadeSektioner}
                visaOversikt={heatmapSektioner.length > 0}
                onNavigera={() => setTocOppen(false)}
              />
            </div>
          </div>
        )}

        {error ? (
          <ReportStatus tone="error" text={`Kunde inte ladda data: ${error}`} />
        ) : !data ? (
          <ReportStatus tone="loading" text="Laddar rapport…" />
        ) : visadeSektioner.length === 0 ? (
          <ReportStatus tone="loading" text="Området saknas i denna tidsvy. Välj en annan vy ovan." />
        ) : (
        /* ── Layout: sidebar + dokument ── */
        <div style={{ display: "flex", alignItems: "flex-start" }}>

          {/* ── Sidebar-TOC ── */}
          {showSidebar && !smal && (
            <SidebarToc
              sections={visadeSektioner}
              visaOversikt={heatmapSektioner.length > 0}
            />
          )}

          {/* ── Dokument ── */}
          <article className="rapport" style={{
            /* minWidth 0: annars vägrar flex-barnet krympa under innehållets
               min-bredd och rapporten sticker ut till höger på smal skärm. */
            flex: 1, minWidth: 0, width: "100%", maxWidth: 880, padding: "40px 32px 64px",
            marginLeft: showSidebar ? 0 : "auto",
            marginRight: showSidebar ? 0 : "auto",
          }}>
            {/* ── Masthead: kicker, titel, streck, datelinje ── */}
            <header className="masthead">
              <img
                className="masthead__logo"
                src={`${import.meta.env.BASE_URL}logo_farg.svg`}
                alt="Region Halland"
              />

              {/* Kicker: var i taxonomin området hör hemma. Enda versala
                  etiketten i flödet, i rollen av caption ovanför titeln. */}
              {sectionId && kategoriForOmrade(sectionId) && (
                <div className="masthead__kicker">{kategoriForOmrade(sectionId)!.namn}</div>
              )}
              <h1 className="masthead__titel">
                {sectionTitle || "Hälso- och sjukvården"}
              </h1>

              <div className="masthead__datelinje">
                <span>{vyLabel} &middot; {data.etikett} &middot; {data.period}</span>
                <span className="masthead__uppdaterad">Uppdaterad {data.uppdaterad}</span>
              </div>
            </header>

            {/* ── Översikt: sammanfattning + signalöversikt över sektioner utan delar.
                   Döljs när alla visade sektioner har delar (delarnas översikter bor i kapitlet). ── */}
            {(heatmapSektioner.length > 0 || !sectionId) && (
              <OversiktBlock
                sektioner={heatmapSektioner}
                vyData={data}
                visaDagar={visaDagar}
                onChangeVisaDagar={onChangeVisaDagar}
                onOpenChart={onOpenChart}
                showGlobal={!sectionId}
              />
            )}

            {/* ── Sektioner ──
                Inledning och källförteckning hör till den ENSKILDA rapporten.
                I helhetsvyn skulle sex inledningar i rad skjuta siffrorna långt
                ner, så där visas bara bedömningarna. */}
            {visadeSektioner.map((sek, i) => (
              <SectionBlock
                key={sek.id}
                section={sek}
                nr={sectionId ? undefined : String(i + 1)}
                vyLabel={vyLabel}
                vy={data.vy}
                onOpenChart={onOpenChart}
                fristaende={Boolean(sectionId)}
              />
            ))}

            <footer className="sidfot">
              <img
                src={`${import.meta.env.BASE_URL}logo_farg.svg`}
                alt="Region Halland"
                style={{ height: 20, opacity: 0.5 }}
              />
              <span className="sidfot__text">
                HoS-rapport &middot; {new Date().toLocaleDateString("sv-SE")}
              </span>
            </footer>
          </article>
        </div>
        )}
      </div>
    </div>
  );
}

// ── Status (laddar/fel) inom rapportskalet ──
function ReportStatus({ tone, text }: { tone: "loading" | "error"; text: string }) {
  return (
    <div role="status" style={{
      padding: "120px 32px", textAlign: "center",
      fontFamily: FONT, fontSize: 15,
      color: tone === "error" ? "#D55E00" : "#83888A",
    }}>
      {text}
    </div>
  );
}

// ════════════════════════════════════════
//  OversiktBlock — heatmap (rapportens ingång)
// ════════════════════════════════════════

function OversiktBlock({
  sektioner, vyData, visaDagar, onChangeVisaDagar, onOpenChart, showGlobal,
}: {
  sektioner: Section[];
  vyData: VyData;
  visaDagar: boolean;
  onChangeVisaDagar?: (v: boolean) => void;
  onOpenChart?: (kpi: KpiData) => void;
  showGlobal?: boolean;
}) {
  const harDagar = vyData.vy !== "dag" &&
    sektioner.some((s) => s.kpier.some((k) => k.dagar && k.dagar.length > 0));

  return (
    <section id="rapport-oversikt" className="ingang fokusbar" data-block="oversikt" style={{ scrollMarginTop: 90 }}>
      {showGlobal && (
        <section>
          <Rubrik marke={AI_MARKE}>{ANALYS_RUBRIK_GLOBAL}</Rubrik>
          <BlocksEditor targetId="global" aiText={vyData.analys} vy={vyData.vy} />
        </section>
      )}
      <section>
        <Rubrik kontroll={harDagar && onChangeVisaDagar && (
          <SegmentedControl
            size="sm"
            ariaLabel="Aggregerat eller dagsnivå"
            items={[{ id: "aggregerat", label: "Aggregerat" }, { id: "dag", label: "Dag" }]}
            value={visaDagar ? "dag" : "aggregerat"}
            onChange={(id) => onChangeVisaDagar(id === "dag")}
          />
        )}>
          Signalöversikt
        </Rubrik>
        <SignalTimeline sektioner={sektioner} vy={vyData.vy} visaDagar={visaDagar} onCellClick={onOpenChart} />
      </section>
    </section>
  );
}

// ════════════════════════════════════════
//  Rubrik — innehållsrubriken: EN form för alla innehållstyper
//  (bedömning, signalöversikt, om indikatorn, påverkansfaktorer, kommentar).
//  Sans i gemener utan linje; en kontroll kan stå längst till höger.
// ════════════════════════════════════════

function Rubrik({
  children, kontroll, marke,
}: {
  children: React.ReactNode; kontroll?: React.ReactNode;
  /** Märke efter rubriktexten, t.ex. "AI-analys". */
  marke?: string;
}) {
  return (
    <h4 className="rub">
      <span>
        {children}
        {marke && <span className="rub__marke">{marke}</span>}
      </span>
      {kontroll ? <span className="rub__kontroll">{kontroll}</span> : null}
    </h4>
  );
}

/** Märket på alla AI-genererade bedömningar. Bylinen under texten säger
 *  samma sak; märket gör det synligt redan i rubriken. */
const AI_MARKE = "AI-analys";

// ════════════════════════════════════════
//  KapitelRubrik — numrerad serif-rubrik med kategorin som kicker.
//  Visas bara i helhetsvyn; i den enskilda rapporten är kapitlet mastheadet.
// ════════════════════════════════════════

function KapitelRubrik({ nr, namn, kicker }: { nr: string; namn: string; kicker?: string }) {
  return (
    <div className="rub-kap">
      {kicker && <div className="rub-kap__kicker">{kicker}</div>}
      <h2 className="rub-kap__titel">
        <span className="rub-nr">{nr}</span>{namn}
      </h2>
    </div>
  );
}

// ════════════════════════════════════════
//  SectionBlock — en hel sektion (ett kapitel)
//
//  Numreringen är rapportens vägvisning: kapitel "1", avsnitt "1.1",
//  indikator "1.1.1". I den enskilda rapporten faller kapitelledet bort
//  (avsnitt "1", indikator "1.1").
// ════════════════════════════════════════

function SectionBlock({
  section, nr, vyLabel, vy, onOpenChart, fristaende = false,
}: {
  section: Section; nr?: string; vyLabel: string; vy: string;
  onOpenChart?: (kpi: KpiData) => void;
  /** Rapporten läses för sig — då hör inledning och källförteckning hit. */
  fristaende?: boolean;
}) {
  const delar = section.delar && section.delar.length > 0 ? delSektioner(section) : null;
  const under = (i: number) => (nr ? `${nr}.${i}` : String(i));
  return (
    <section id={`rapport-${section.id}`} style={{ scrollMarginTop: 90 }}>
      {/* Rubriken utelämnas för enskilt sakområde — namnet står redan i mastheadet. */}
      {nr != null && (
        <KapitelRubrik nr={nr} namn={section.namn} kicker={kategoriForOmrade(section.id)?.namn} />
      )}

      {fristaende && section.inledning && section.inledning.length > 0 && (
        <Inledning stycken={section.inledning} blockId={section.id} />
      )}

      {/* Kapitlets ingång: bedömning + signalöversikt över samtliga
          indikatorer, grupperade per avsnitt. */}
      {delar && (
        <KapitelSammanfattning section={section} grupper={delar} vy={vy} onOpenChart={onOpenChart} />
      )}

      {delar ? (
        delar.map((del, di) => (
          <DelBlock
            key={del.id} del={del} nr={under(di + 1)} vyLabel={vyLabel} vy={vy}
            sectionId={section.id} leverans={section.leverans} onOpenChart={onOpenChart}
          />
        ))
      ) : (
        section.kpier.map((kpi, ki) => (
          <IndicatorBlock
            key={kpi.id} kpi={kpi} nr={under(ki + 1)} vyLabel={vyLabel} vy={vy}
            sectionId={section.id} leverans={section.leverans}
          />
        ))
      )}

      {fristaende && <Kallforteckning kallor={section.kallor} leverans={section.leverans} />}
    </section>
  );
}

// ════════════════════════════════════════
//  Inledning — redaktionell kontext före siffrorna. Ingen etikett:
//  ingressen direkt under mastheadet säger själv vad den är.
// ════════════════════════════════════════

function Inledning({ stycken, blockId }: { stycken: string[]; blockId: string }) {
  const [ingress, ...brod] = stycken;
  return (
    <section className="inledning fokusbar" data-block={blockId} aria-label="Om rapporten">
      <p className="ingress">{ingress}</p>
      <div className="prosa">
        {brod.map((p, i) => <p key={i}>{p}</p>)}
      </div>
    </section>
  );
}

// ════════════════════════════════════════
//  KapitelSammanfattning — kapitlets ingång
//
//  Bedömningen av hela kapitlet plus signalöversikten över SAMTLIGA
//  indikatorer, grupperade per avsnitt. Den stora översikten med filter och
//  sortering hör hemma just här: det är rapportens karta. Varje avsnitt har
//  därtill en egen översikt över sina egna indikatorer, se DelBlock.
// ════════════════════════════════════════

function KapitelSammanfattning({
  section, grupper, vy, onOpenChart,
}: {
  section: Section; grupper: Section[]; vy: string;
  onOpenChart?: (kpi: KpiData) => void;
}) {
  return (
    <div className="ingang fokusbar" data-block={section.id}>
      <section>
        <Rubrik marke={AI_MARKE}>Sammanfattande bedömning</Rubrik>
        <BlocksEditor targetId={section.id} aiText={section.analys} vy={vy} />
      </section>
      <section>
        <Rubrik>Signalöversikt</Rubrik>
        <SignalTimeline sektioner={grupper} vy={vy} visaDagar={false} onCellClick={onOpenChart} />
      </section>
    </div>
  );
}

// ════════════════════════════════════════
//  DelBlock — avsnitt: numrerad rubrik och bedömning, därefter
//  indikatorerna. Avsnittets egen signalöversikt utgick 2026-09-03:
//  kapitlets översikt i början av rapporten täcker redan alla avsnitt.
// ════════════════════════════════════════

function DelBlock({
  del, nr, vyLabel, vy, sectionId, leverans,
}: {
  del: Section; nr: string; vyLabel: string; vy: string;
  /** Kapitlet delen hör till: styr källuppgifterna i indikatorerna. */
  sectionId: string; leverans?: KallaRef[];
  onOpenChart?: (kpi: KpiData) => void;
}) {
  return (
    <section id={`rapport-${del.id}`} style={{ scrollMarginTop: 90 }}>
      <h2 className="rub-avs">
        <span className="rub-nr">{nr}</span>{del.namn}
      </h2>

      <div className="ingang fokusbar" data-block={del.id}>
        <section>
          <Rubrik marke={AI_MARKE}>Bedömning av avsnittet</Rubrik>
          <BlocksEditor targetId={del.id} aiText={del.analys} vy={vy} />
        </section>
      </div>

      {del.kpier.map((kpi, ki) => (
        <IndicatorBlock
          key={kpi.id} kpi={kpi} nr={`${nr}.${ki + 1}`} vyLabel={vyLabel} vy={vy}
          sectionId={sectionId} leverans={leverans}
        />
      ))}
    </section>
  );
}

// ════════════════════════════════════════
//  Källförteckning — varifrån rapportens siffror faktiskt kommer
// ════════════════════════════════════════

function Kallforteckning({ kallor, leverans }: { kallor?: KallaRef[]; leverans?: KallaRef[] }) {
  if (!kallor?.length && !leverans?.length) return null;
  return (
    <section id="rapport-kallor" className="kallor fokusbar" data-block="kallor" style={{ scrollMarginTop: 90 }}>
      <h2 className="rub-avs" style={{ marginTop: 0 }}>Källor</h2>

      {kallor && kallor.length > 0 && (
        <section>
          <Rubrik>Primärkällor</Rubrik>
          {kallor.map((k) => <KallaPost key={k.id} kalla={k} />)}
        </section>
      )}

      {leverans && leverans.length > 0 && (
        <section>
          <Rubrik>Leveranskedja</Rubrik>
          {leverans.map((k) => <KallaPost key={k.namn} kalla={k} />)}
        </section>
      )}
    </section>
  );
}

function KallaPost({ kalla }: { kalla: KallaRef }) {
  return (
    <div className="kalla-post">
      <div className="kalla-post__huvud">
        <h5 className="kalla-post__namn">
          {kalla.url ? (
            <a href={kalla.url} target="_blank" rel="noreferrer">{kalla.namn}</a>
          ) : kalla.namn}
        </h5>
        {kalla.n_indikatorer != null && (
          <span className="kalla-post__antal">
            {kalla.n_indikatorer} {kalla.n_indikatorer === 1 ? "indikator" : "indikatorer"}
          </span>
        )}
      </div>
      <div className="meta kalla-post__meta">{kalla.typ} &middot; {kalla.huvudman}</div>
      <div className="prosa"><p>{kalla.om}</p></div>
    </div>
  );
}

// ════════════════════════════════════════
//  IndicatorBlock — indikatorns uppslag, utan ram.
//
//  Läsordning: vad måttet är, bedömningen, beviset, förklaringen, sist
//  verksamhetens egna ord.
//
//    1. Huvud            nummer, namn, statuschip, Hallands nivå och placering
//    2. Om indikatorn    vad måttet räknar, riktning, avgränsning
//    3. Bedömning        AI-analysen
//    4. Diagram          utfallet mot regionerna (rubriken sätts av diagrammet)
//    5. Påverkansfaktorer och teori
//    6. Verksamhetens kommentar
//
//  Sektionerna 2–6 har samma innehållsrubrik (Rubrik). Enda färgen utöver
//  numrets gröna är statuschippet i huvudet.
// ════════════════════════════════════════

// ── Diagramrubrik och undertext ──
// Rubriken säger vad diagrammet visar, konkret nog att stå för sig själv
// (i PowerPoint-exporten står den utan indikatorhuvudet): måttet, vem som
// jämförs med vem. Undertexten är den tekniska raden: enhet, tidsupplösning,
// period och hur serierna ska läsas. Rubriken är alltså beskrivande, inte
// en slutsats; slutsatsen står i bedömningen ovanför.
const VY_TAKT: Record<string, string> = {
  dag: "dag", vecka: "vecka", manad: "månad", kvartal: "kvartal", ar: "år",
};

function harFacetter(kpi: KpiData): boolean {
  return Boolean(kpi.undernivaer && kpi.undernivaer.length > 0);
}
function harBand(kpi: KpiData): boolean {
  return kpi.tidsserie.some((p) => p.yhat_lower != null);
}

function grafRubrik(kpi: KpiData): string {
  if (harFacetter(kpi)) return `${kpi.namn} per avdelning`;
  if (kpi.kontext_serier && kpi.kontext_serier.length > 0) {
    return `${kpi.namn}, Halland jämfört med övriga regioner`;
  }
  if (harBand(kpi)) return `${kpi.namn} mot statistiskt förväntat intervall`;
  return `${kpi.namn} över tid`;
}

function grafUnderrubrik(kpi: KpiData, forsta: string, sista: string, vy: string): string {
  // Enheten skrivs ut bara när den faktiskt är känd. Kolada märker allt som
  // inte är andel som "antal", även kronbelopp, så ordet "Antal" hade varit
  // direkt fel för kostnadsindikatorerna.
  const enhet = kpi.enhet === "procent" ? "Andel i procent"
    : kpi.enhet === "minuter" ? "Minuter" : "";
  const takt = VY_TAKT[vy];
  const spann = forsta && sista && forsta !== sista ? `${forsta}–${sista}` : (sista || forsta);
  const matt = enhet && takt ? `${enhet} per ${takt}` : enhet || (takt ? `Per ${takt}` : "");
  const las: string[] = [];
  if (kpi.kontext_serier && kpi.kontext_serier.length > 0) {
    las.push("Halland i mörk linje", "övriga regioner i grått");
    if (kpi.riket_serie && kpi.riket_serie.length > 0) las.push("riket streckat");
    if (kpi.topp3_band && kpi.topp3_band.length > 0) las.push("topp 3-zonen i grönt");
  } else if (harBand(kpi)) {
    if (harFacetter(kpi)) las.push("totalen först och därefter varje avdelning");
    las.push("bandet visar det statistiskt förväntade intervallet");
  } else if (harFacetter(kpi)) {
    las.push("totalen först och därefter varje avdelning");
  }
  if (kpi.malniva != null) las.push("målnivån som vågrät linje");
  const bas = [matt, spann].filter(Boolean).join(", ");
  const lasText = las.length > 0 ? las[0].charAt(0).toUpperCase() + las.join(", ").slice(1) : "";
  return [bas, lasText].filter(Boolean).join(". ") + ".";
}

function IndicatorBlock({
  kpi, nr, vyLabel: _vyLabel, vy, sectionId, leverans,
}: {
  kpi: KpiData; nr: string; vyLabel: string; vy: string;
  sectionId: string; leverans?: KallaRef[];
}) {
  const [visaDagar, setVisaDagar] = useState(false);
  const harDagar = vy !== "dag" && kpi.dagar && kpi.dagar.length > 0;

  const aktivSerie = visaDagar && harDagar ? kpi.dagar! : kpi.tidsserie;
  const aktivVy = visaDagar && harDagar ? "dag" : vy;

  const last = aktivSerie[aktivSerie.length - 1];
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
    <article id={`rapport-${kpi.id}`} className="indikator fokusbar" data-block={kpi.id} style={{ scrollMarginTop: 90 }}>

      {/* ── 1. Huvud: nummer, namn, status, readout ── */}
      <header className="indikator__huvud">
        <div className="indikator__titelrad">
          <h3 className="indikator__titel">
            <span className="rub-nr">{nr}</span>{kpi.namn}
          </h3>
          <StatusTag status={kpi.status} neutral={kpi.utan_mal} />
        </div>
        <div className="indikator__readout">
          <span>Halland{" "}
            <strong style={mono}>{fmtVarde(kpi.senaste, kpi.enhet)}{fmtSuffix(kpi.enhet)}</strong>
          </span>
          {kpi.rank != null && kpi.rank_av != null && (
            <span>Plats{" "}
              <strong style={mono}>{kpi.rank}/{kpi.rank_av}</strong>{" "}bland regionerna
            </span>
          )}
          {last && <span className="indikator__readout-svag">Avser {lastLabel}</span>}
        </div>
      </header>

      {/* ── 2. Om indikatorn: vad måttet är, innan siffran tolkas ── */}
      <OmIndikatorn kpi={kpi} />

      {/* ── 3. Datan bakom talet: källa, uppdatering, leveransväg ── */}
      <Datakalla kpi={kpi} vy={vy} sectionId={sectionId} leverans={leverans} />

      {/* ── 4. Den maskinella analysen av utfallet. Statusordet ("Att bevaka")
             står redan i chippet i huvudet och upprepas inte som rubrik. ── */}
      <section>
        <Rubrik marke={AI_MARKE}>Bedömning</Rubrik>
        <AiAnalys targetId={kpi.id} aiText={kpi.analystext} />
      </section>

      {/* ── 5. Diagram. Diagrammets egen rubrik säger vad grafen VISAR och
             står i samma form som övriga innehållsrubriker. ── */}
      <figure className="figur">
        <FacetedChart
          kpi={chartKpi}
          vy={aktivVy}
          rubrik={grafRubrik(kpi)}
          underrubrik={grafUnderrubrik(kpi, firstLabel, lastLabel, aktivVy)}
          verktyg={harDagar ? (
            <SegmentedControl
              size="sm"
              ariaLabel="Aggregerat eller dagsnivå"
              items={[{ id: "aggregerat", label: "Aggregerat" }, { id: "dag", label: "Dag" }]}
              value={visaDagar ? "dag" : "aggregerat"}
              onChange={(id) => setVisaDagar(id === "dag")}
            />
          ) : undefined}
        />
      </figure>

      {/* ── 6. Påverkansfaktorer: vad som drar i talet, efter att det visats ── */}
      <Paverkansfaktorer kpi={kpi} />

      {/* ── 7. Verksamhetens kommentar ── */}
      <section className="kommentar">
        <Rubrik>Verksamhetens kommentar</Rubrik>
        <Anteckningar targetId={kpi.id} vy={vy} />
      </section>
    </article>
  );
}


// ════════════════════════════════════════
//  Textblock — AI-analys respektive verksamhetens egna anteckningar
//
//  De två är åtskilda komponenter sedan indikatorblocket lade diagrammet
//  mellan dem: bedömningen står överst, kommentaren längst ner. BlocksEditor
//  sätter ihop dem igen där de fortfarande hör ihop (kapitel- och
//  avsnittsnivå).
// ════════════════════════════════════════

function genId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** AI-analysen: alltid aktuell R-text, skrivskyddad, lagras aldrig.
 *  Rubriken sätts av den som anropar (Rubrik); här bara text + byline. */
function AiAnalys({ targetId, aiText }: { targetId: string; aiText: string }) {
  return <EditableBlock id={`ai-${targetId}`} type="ai" text={aiText} />;
}

function BlocksEditor({
  targetId, aiText, vy,
}: {
  targetId: string; aiText: string; vy?: string;
}) {
  return (
    <div>
      <AiAnalys targetId={targetId} aiText={aiText} />
      <Anteckningar targetId={targetId} vy={vy} />
    </div>
  );
}

/** Verksamhetens kommentar: användarens egna block, lagrade lokalt. */
function Anteckningar({ targetId, vy }: { targetId: string; vy?: string }) {
  const storeKey = vy ? `${vy}:${targetId}` : targetId;

  // Lagret innehåller ENDAST användarens egna anteckningar. AI-analysen
  // renderas alltid från den aktuella R-texten och lagras aldrig.
  const load = useCallback(() => getBlocks(storeKey), [storeKey]);
  const [userBlocks, setUserBlocks] = useState<ContentBlock[]>(load);

  // Synk mellan flikar
  useEffect(() => {
    const onStorage = (e: StorageEvent) => { if (e.key === BLOCKS_KEY) setUserBlocks(load()); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [load]);

  const persist = useCallback((blocks: ContentBlock[]) => {
    setUserBlocks(blocks);
    persistBlocks(storeKey, blocks);
  }, [storeKey]);

  function saveBlock(blockId: string, d: AnteckningData) {
    if (!d.title.trim() && !d.text.trim()) {
      persist(userBlocks.filter((b) => b.id !== blockId));
      return;
    }
    persist(userBlocks.map((b) => (b.id === blockId
      ? { ...b, title: d.title.trim() || undefined, text: d.text, author: d.author, timestamp: new Date().toISOString() }
      : b)));
  }

  function deleteBlock(blockId: string) {
    persist(userBlocks.filter((b) => b.id !== blockId));
  }

  // Infogar en ny (tom) anteckning vid given position. Tomt block öppnas
  // direkt i redigeringsläge (EditableBlock).
  function addBlock(pos: number) {
    const block: ContentBlock = {
      id: genId(), type: "anteckning", title: "", text: "",
      author: getForfattare(), timestamp: new Date().toISOString(),
    };
    const next = [...userBlocks];
    next.splice(pos, 0, block);
    persist(next);
  }

  return (
    <div>
      {/* Infoga överst */}
      <InsertLine onClick={() => addBlock(0)} />

      {userBlocks.map((block, i) => (
        <div key={block.id}>
          <EditableBlock
            id={block.id}
            type="anteckning"
            rubrik={block.title}
            text={block.text}
            author={block.author}
            timestamp={block.timestamp}
            onSave={(d) => saveBlock(block.id, d)}
            onDelete={() => deleteBlock(block.id)}
          />
          <InsertLine onClick={() => addBlock(i + 1)} />
        </div>
      ))}
    </div>
  );
}

// ── InsertLine — diskret "+ Skriv här" som framträder vid hover/fokus ──
function InsertLine({ onClick }: { onClick: () => void }) {
  return (
    <div className="report-insert">
      <button type="button" className="report-insert__btn" onClick={onClick} aria-label="Lägg till anteckning här">
        <span className="report-insert__plus" aria-hidden="true">+</span> Skriv här
      </button>
    </div>
  );
}

// ════════════════════════════════════════
//  Hjälpkomponenter
// ════════════════════════════════════════

function Toolbar({
  onBack, aktivVy, vyItems, onChangeVy,
  onExport, exporterar = false, exportAktiv = false, exportFel = null,
  titel, blockIndex, onOpenToc,
}: {
  onBack: () => void;
  aktivVy: string; vyItems: VyItem[]; onChangeVy: (id: string) => void;
  onExport?: () => void;
  exporterar?: boolean;
  exportAktiv?: boolean;
  exportFel?: string | null;
  /** Rapportens titel, visas i positionsraden innan läsningen börjat. */
  titel: string;
  blockIndex: Map<string, BlockInfo>;
  /** Finns bara när sidomenyn ligger som ark: raden blir då en knapp. */
  onOpenToc?: () => void;
}) {
  return (
    <div className="report-toolbar">
      <div className="report-toolbar__rad">
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        <button
          onClick={onBack}
          title="Tillbaka till områdesval"
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "5px 12px 5px 9px", borderRadius: 5, border: "1px solid #d4d4d4",
            background: "#fff", fontFamily: FONT, fontSize: 11.5, fontWeight: 500,
            color: "#444", cursor: "pointer", flexShrink: 0,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 3L5 8l5 5" />
          </svg>
          Områden
        </button>
        <span style={{ width: 1, height: 16, background: "#ddd", flexShrink: 0 }} />
        <SegmentedControl
          size="sm"
          ariaLabel="Tidsupplösning"
          items={vyItems}
          value={aktivVy}
          onChange={onChangeVy}
        />
      </div>

      {/* ── Ladda ner: rapportens grafer, bedömningar och källor som PowerPoint ── */}
      {onExport && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          {exportFel && (
            <span role="alert" style={{ fontFamily: FONT, fontSize: 11, color: "#B23A2E" }}>
              Nedladdningen misslyckades
            </span>
          )}
          <button
            type="button"
            onClick={onExport}
            disabled={!exportAktiv || exporterar}
            className="report-export"
            title="Ladda ner kapitlets grafer, bedömningar och källor som PowerPoint"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M8 2v8M4.5 7L8 10.5 11.5 7M2.5 13h11" />
            </svg>
            {exporterar ? "Skapar…" : "PowerPoint"}
          </button>
        </div>
      )}
      </div>
      <Positionsrad titel={titel} blockIndex={blockIndex} onOpenToc={onOpenToc} />
    </div>
  );
}

// ════════════════════════════════════════
//  Positionsrad — var i rapporten läsaren är, alltid synlig.
//
//  Rad två i verktygsfältet. Innan läsningen börjat står rapportens titel;
//  därefter spåret "1 Avsnitt › 1.2 Indikator" med statuschip, och en linje
//  längs underkanten som fylls i takt med att blocket läses. Raden har fast
//  höjd så att innehållet aldrig hoppar när texten byts.
//  Ett tryck på raden öppnar innehållet som ark när sidomenyn inte får plats.
// ════════════════════════════════════════

function Positionsrad({
  titel, blockIndex, onOpenToc,
}: {
  titel: string; blockIndex: Map<string, BlockInfo>; onOpenToc?: () => void;
}) {
  const pos = usePosition();
  const info = pos.id ? blockIndex.get(pos.id) : undefined;

  const spar: { nr?: string; namn: string }[] = [];
  if (info) {
    if (info.kapitel?.nr) spar.push({ nr: info.kapitel.nr, namn: info.kapitel.namn });
    else if (info.typ === "kapitel") spar.push({ namn: "Sammanfattning" });
    if (info.avsnitt) spar.push({ nr: info.avsnitt.nr, namn: info.avsnitt.namn });
    if (info.typ === "indikator") spar.push({ nr: info.nr, namn: info.namn });
    if (info.typ === "oversikt" || info.typ === "kallor") spar.push({ namn: info.namn });
  }
  if (spar.length === 0) spar.push({ namn: titel });

  const inner = spar.map((s, i) => (
    <span key={i} className="posrad__del">
      {i > 0 && <span className="posrad__sep" aria-hidden="true">›</span>}
      {s.nr && <span className="posrad__nr">{s.nr}</span>}
      {s.namn}
    </span>
  ));

  return (
    <div className="posrad" aria-live="polite">
      {onOpenToc ? (
        <button type="button" className="posrad__spar" data-knapp="true" onClick={onOpenToc} title="Öppna innehåll">
          <MenyIkon />
          {inner}
        </button>
      ) : (
        <span className="posrad__spar">{inner}</span>
      )}
      {info?.kpi && <StatusTag size="sm" status={info.kpi.status} neutral={info.kpi.utan_mal} />}
      <span
        className="posrad__linje"
        aria-hidden="true"
        style={{ transform: `scaleX(${info ? pos.progress : 0})` }}
      />
    </div>
  );
}

function MenyIkon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor"
         strokeWidth="1.7" strokeLinecap="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M2.5 4h11M2.5 8h11M2.5 12h7" />
    </svg>
  );
}

// ════════════════════════════════════════
//  SidebarToc — sticky innehållsförteckning
// ════════════════════════════════════════

function SidebarToc({
  sections, visaOversikt = true, onNavigera,
}: {
  sections: Section[]; visaOversikt?: boolean;
  /** Anropas när en länk klickas (arket stängs). */
  onNavigera?: () => void;
}) {
  const { id: activeId, progress } = usePosition();
  const navRef = useRef<HTMLElement>(null);
  // Manuellt öppnade/stängda grupper. Odefinierat = följ scrollen
  // (gruppen som innehåller aktiv rubrik visas utfälld).
  const [oppna, setOppna] = useState<Record<string, boolean>>({});

  // Den aktiva posten hålls i synfältet i menyns egen rullyta. Menyn
  // rullas för sig, aldrig dokumentet, så scrollIntoView används inte.
  useEffect(() => {
    const nav = navRef.current;
    if (!nav || !activeId) return;
    const a = nav.querySelector<HTMLElement>(`a[href="#rapport-${CSS.escape(activeId)}"]`);
    if (!a) return;
    const topp = a.offsetTop;
    const synligTopp = nav.scrollTop + 40;
    const synligBotten = nav.scrollTop + nav.clientHeight - 40;
    if (topp < synligTopp || topp + a.offsetHeight > synligBotten) {
      nav.scrollTo({ top: Math.max(0, topp - nav.clientHeight * 0.4), behavior: "smooth" });
    }
  }, [activeId]);

  return (
    <nav
      ref={navRef}
      className="report-toc"
      style={{ fontFamily: FONT }}
      onClick={(e) => {
        if (onNavigera && (e.target as HTMLElement).closest("a")) onNavigera();
      }}
    >
      <div className="toc__rubrik">Innehåll</div>
      {visaOversikt && (
        <a href="#rapport-oversikt"
          style={{
            display: "block", padding: "3px 0", marginBottom: 10,
            fontSize: 12, fontWeight: activeId === "oversikt" ? 600 : 500,
            color: activeId === "oversikt" ? "#00664D" : "#777",
            textDecoration: "none", lineHeight: 1.4,
            borderLeft: activeId === "oversikt" ? "2px solid #00664D" : "2px solid transparent",
            paddingLeft: 10, marginLeft: -1, transition: "color 0.1s",
          }}
        >
          Översikt
        </a>
      )}
      {sections.flatMap((sek, i) => {
        // Sektion med delar: delarna blir hopfällbara TOC-grupper (i del-
        // rapporten på toppnivå; i helrapporten under kapitelrubriken).
        // Indikatorlänkarna visas bara för öppna grupper — gruppen som läses
        // följer scrollen automatiskt, övriga kan fällas ut manuellt.
        const delar = sek.delar && sek.delar.length > 0 ? delSektioner(sek) : null;
        const sekActive = activeId === sek.id ||
          sek.kpier.some(k => k.id === activeId) ||
          (delar?.some(d => d.id === activeId) ?? false);

        const sekLank = sections.length > 1 && (
          <a href={`#rapport-${sek.id}`}
            style={{
              display: "block", padding: "3px 0",
              fontSize: 12, fontWeight: sekActive ? 600 : 500,
              color: activeId === sek.id ? "#00664D" : sekActive ? "#333" : "#777",
              textDecoration: "none", lineHeight: 1.4,
              borderLeft: activeId === sek.id ? "2px solid #00664D" : "2px solid transparent",
              paddingLeft: 10, marginLeft: -1,
              transition: "color 0.1s",
            }}
          >
            <span className="toc__nr">{i + 1}</span>{sek.namn}
          </a>
        );

        // Kategorietikett före första sektionen i varje ny kategori
        // (bara i helrapporten, där flera sektioner listas).
        const kat = kategoriForOmrade(sek.id)?.namn;
        const prevKat = i > 0 ? kategoriForOmrade(sections[i - 1].id)?.namn : undefined;
        const visaKat = sections.length > 1 && kat && kat !== prevKat;

        // Samma numrering som i dokumentet: kapitelledet bara i helhetsvyn.
        const kapNr = sections.length > 1 ? `${i + 1}.` : "";
        const grupper = delar ?? [sek];
        return (
          <div key={sek.id} style={{ marginBottom: 10 }}>
            {visaKat && (
              <div style={{
                fontSize: 10.5, fontWeight: 600, color: "#a9ada8",
                margin: "14px 0 4px", paddingLeft: 10,
              }}>
                {kat}
              </div>
            )}
            {sekLank}
            {grupper.map((grupp, gi) => (
              <TocGrupp
                key={grupp.id}
                grupp={grupp}
                nr={delar ? `${kapNr}${gi + 1}` : kapNr.replace(/\.$/, "")}
                visaRubrik={!!delar}
                indent={sections.length > 1 ? 18 : 10}
                activeId={activeId}
                progress={progress}
                open={oppna[grupp.id]}
                onToggle={(o) => setOppna((s) => ({ ...s, [grupp.id]: o }))}
              />
            ))}
          </div>
        );
      })}

      {/* Källförteckningen finns bara i den fristående rapporten. */}
      {sections.length === 1 && (sections[0].kallor?.length || sections[0].leverans?.length) ? (
        <a href="#rapport-kallor"
          style={{
            display: "block", padding: "3px 0", marginTop: 4,
            fontSize: 12, fontWeight: activeId === "kallor" ? 600 : 500,
            color: activeId === "kallor" ? "#00664D" : "#777",
            textDecoration: "none", lineHeight: 1.4,
            borderLeft: activeId === "kallor" ? "2px solid #00664D" : "2px solid transparent",
            paddingLeft: 10, marginLeft: -1, transition: "color 0.1s",
          }}
        >
          Källor
        </a>
      ) : null}
    </nav>
  );
}

// ── TocGrupp — hopfällbar grupp i innehållsförteckningen ──
function TocGrupp({
  grupp, nr, visaRubrik, indent, activeId, progress, open, onToggle,
}: {
  grupp: Section;
  /** Gruppens nummer i dokumentet ("1.2"); tomt = onumrerad grupp. */
  nr: string; visaRubrik: boolean; indent: number;
  activeId: string; progress: number; open?: boolean; onToggle: (open: boolean) => void;
}) {
  const innehallerAktiv = activeId === grupp.id || grupp.kpier.some((k) => k.id === activeId);
  // Manuellt val vinner; annars följer gruppen scrollen
  const arOppen = open ?? innehallerAktiv;

  return (
    <div style={{ marginBottom: visaRubrik ? 6 : 0 }}>
      {visaRubrik && (
        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
          <button
            type="button"
            onClick={() => onToggle(!arOppen)}
            aria-expanded={arOppen}
            aria-label={`${arOppen ? "Fäll ihop" : "Fäll ut"} ${grupp.namn}`}
            style={{
              border: "none", background: "none", cursor: "pointer",
              padding: "2px 2px 2px 0", marginLeft: indent - 14,
              display: "inline-flex", color: "#aaa", flexShrink: 0,
            }}
          >
            <svg width="9" height="9" viewBox="0 0 10 10" fill="currentColor"
              style={{ transform: arOppen ? "rotate(90deg)" : "none", transition: "transform 0.12s" }}>
              <path d="M3 1.5L7.5 5L3 8.5Z" />
            </svg>
          </button>
          <a href={`#rapport-${grupp.id}`}
            style={{
              display: "block", flex: 1, padding: "3px 0",
              fontSize: 11.5, fontWeight: innehallerAktiv ? 600 : 500,
              color: activeId === grupp.id ? "#00664D" : innehallerAktiv ? "#333" : "#777",
              textDecoration: "none", lineHeight: 1.4,
              transition: "color 0.1s",
            }}
          >
            {nr && <span className="toc__nr">{nr}</span>}{grupp.namn}
            <span style={{ color: "#c4c4be", fontWeight: 400, marginLeft: 5, fontSize: 10.5 }}>
              {grupp.kpier.length}
            </span>
          </a>
        </div>
      )}
      {(arOppen || !visaRubrik) && grupp.kpier.map((kpi, ki) => {
        const aktiv = activeId === kpi.id;
        // Statusprick: menyn är samtidigt en signalkarta över rapporten.
        const prick = kpi.utan_mal ? "#c4c4be" : (SIGNAL_COLORS[kpi.status] ?? "#c4c4be");
        return (
          <a
            key={kpi.id}
            href={`#rapport-${kpi.id}`}
            className="toc__kpi"
            data-aktiv={aktiv}
            title={kpi.namn}
          >
            <span className="toc__prick" style={{ background: prick }} aria-hidden="true" />
            <span className="toc__nr">{nr ? `${nr}.${ki + 1}` : ki + 1}</span>{kpi.namn}
            {aktiv && (
              <span className="toc__fyll" aria-hidden="true" style={{ transform: `scaleX(${progress})` }} />
            )}
          </a>
        );
      })}
    </div>
  );
}

