import { useState, useEffect, useCallback, useMemo } from "react";
import type {
  VyData,
  KpiData,
  KallaRef,
  Section,
  ContentBlock,
} from "../types";
import FacetedChart from "./FacetedChart";
import IndikatorFakta from "./IndikatorFakta";
import SignalTimeline from "./SignalTimeline";
import { StatusTag } from "./SignalStrip";
import EditableBlock, { type AnteckningData } from "./EditableBlock";
import { getBlocks, setBlocks as persistBlocks, getForfattare, BLOCKS_KEY } from "../stores/blocks";
import { hasDirty } from "../stores/dirty";
import { fullEtikett, fmtVarde, fmtSuffix } from "../utils/format";
import { ANALYS_RUBRIK_GLOBAL, analysRubrikForStatus } from "../utils/analys";
import SegmentedControl from "./SegmentedControl";
import SignalBadge from "./SignalBadge";
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
const FONT_RUBRIK = "'Source Serif 4', Georgia, serif";

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

export default function ReportView({
  data, error, sectionId, aktivVy, vyItems, onChangeVy,
  visaDagar = false, onChangeVisaDagar, onOpenChart, onBack,
}: Props) {
  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onBack();
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

  // Scroll spy — markerar aktiv sektion i sidebar-TOC
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          setActiveId(entry.target.id.replace("rapport-", ""));
        }
      }
    }, { rootMargin: "-72px 0px -55% 0px" });

    requestAnimationFrame(() => {
      const targets = document.querySelectorAll("[id^='rapport-']");
      targets.forEach(t => observer.observe(t));
    });
    return () => observer.disconnect();
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
  const allKpier = visadeSektioner.flatMap((s) => s.kpier);
  const within = allKpier.filter((k) => {
    const last = k.tidsserie[k.tidsserie.length - 1];
    return last?.signal === "gron";
  }).length;
  const outside = allKpier.length - within;
  const vyLabel = data ? (VY_LABELS[data.vy] || "") : "";
  const sectionTitle = sectionId ? visadeSektioner[0]?.namn : null;
  const showSidebar = (!sectionId && visadeSektioner.length > 1) ||
    Boolean(sectionId && visadeSektioner[0]?.delar?.length);

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
      style={{
        position: "fixed", inset: 0, background: "#fbfbf9",
        zIndex: 200, overflowY: "auto", animation: "fadeIn 0.2s ease",
      }}
    >
      <div style={{ maxWidth: 1320, margin: "0 auto", position: "relative" }}>

        {/* ── Verktygsfält ── */}
        <Toolbar
          onBack={onBack}
          aktivVy={aktivVy} vyItems={vyItems} onChangeVy={onChangeVy}
          onExport={handleExport}
          exporterar={exporterar}
          exportAktiv={Boolean(data) && visadeSektioner.length > 0}
          exportFel={exportFel}
        />

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
          {showSidebar && (
            <SidebarToc
              sections={visadeSektioner}
              activeId={activeId}
              visaOversikt={heatmapSektioner.length > 0}
            />
          )}

          {/* ── Dokument ── */}
          <article style={{
            flex: 1, maxWidth: 880, padding: "40px 32px 64px",
            fontFamily: FONT,
            marginLeft: showSidebar ? 0 : "auto",
            marginRight: showSidebar ? 0 : "auto",
          }}>
            {/* ── Rapportens rubrik (masthead) ── */}
            <header style={{ marginBottom: 36 }}>
              <div style={{ marginBottom: 24 }}>
                <img
                  src={`${import.meta.env.BASE_URL}logo_farg.svg`}
                  alt="Region Halland"
                  style={{ height: 32 }}
                />
              </div>

              {/* Kategorietikett (eyebrow) — visar var i taxonomin området hör hemma */}
              {sectionId && kategoriForOmrade(sectionId) && (
                <div style={{
                  fontSize: 11, fontWeight: 600, textTransform: "uppercase",
                  letterSpacing: "0.14em", color: "#00AB60", marginBottom: 10,
                }}>
                  {kategoriForOmrade(sectionId)!.namn}
                </div>
              )}
              <h1 style={{
                fontFamily: FONT_RUBRIK,
                fontWeight: 700, fontSize: 42, color: "#1a1a1a",
                letterSpacing: "-0.025em", lineHeight: 1.06, margin: "0 0 16px",
              }}>
                {sectionTitle || "Hälso- och sjukvården"}
              </h1>

              {/* Datelinje: vy + period till vänster, uppdaterad (mono) till höger */}
              <div style={{
                display: "flex", alignItems: "baseline", justifyContent: "space-between",
                gap: 16, paddingTop: 14, borderTop: "3px solid #00664D",
              }}>
                <span style={{ fontFamily: FONT, fontSize: 14, color: "#555", fontWeight: 500 }}>
                  {vyLabel} &middot; {data.etikett} &middot; {data.period}
                </span>
                <span style={{ ...mono, fontSize: 11.5, color: "#aaa" }}>
                  Uppdaterad {data.uppdaterad}
                </span>
              </div>
            </header>

            {/* ── Nyckeltal-sammanfattning ── */}
            <div style={{
              display: "flex", gap: 24, alignItems: "baseline",
              marginBottom: 28, paddingBottom: 20,
              borderBottom: "1px solid #e0e0dc",
            }}>
              <MiniStat value={allKpier.length} label="indikatorer" />
              <MiniStat value={within} label="inom förväntat" signal="gron" />
              {outside > 0 && <MiniStat value={outside} label="utanför" signal="rod" />}
            </div>

            {/* ── Översikt: titel i platta + AI-analys + heatmap (samma mönster som övriga kapitel).
                   Döljs när alla visade sektioner har delar (delarnas heatmaps bor i kapitlet). ── */}
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
                I helhetsvyn skulle sex inledningar i rad upprepa samma ram och
                skjuta siffrorna långt ner, så där visas bara bedömningarna. */}
            {visadeSektioner.map((sek, i) => (
              <SectionBlock
                key={sek.id}
                section={sek}
                index={sectionId ? undefined : i + 1}
                vyLabel={vyLabel}
                vy={data.vy}
                onOpenChart={onOpenChart}
                fristaende={Boolean(sectionId)}
              />
            ))}

            {/* ── Footer ── */}
            <footer style={{
              marginTop: 56, paddingTop: 20,
              borderTop: "1px solid #e0e0dc",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <img
                src={`${import.meta.env.BASE_URL}logo_farg.svg`}
                alt="Region Halland"
                style={{ height: 20, opacity: 0.5 }}
              />
              <span style={{ fontSize: 11, color: "#bbb", fontFamily: FONT }}>
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
    <section id="rapport-oversikt" style={{ scrollMarginTop: 60, marginBottom: 48 }}>
      {/* Titel i platta — exakt samma utseende som övriga kapitel (folio 00). */}
      <ChapterPlate index={0} namn="Översikt" />

      {/* ETT kort med egen titel + AI-analys + heatmap — exakt som indikatorkorten. */}
      <figure className="report-indicator ind report-figure" style={{ margin: 0 }}>
        <div className="ind-etikett">
          <span>Signalöversikt</span>
          {harDagar && onChangeVisaDagar && (
            <SegmentedControl
              size="sm"
              ariaLabel="Aggregerat eller dagsnivå"
              items={[{ id: "aggregerat", label: "Aggregerat" }, { id: "dag", label: "Dag" }]}
              value={visaDagar ? "dag" : "aggregerat"}
              onChange={(id) => onChangeVisaDagar(id === "dag")}
            />
          )}
        </div>

        {/* AI-analys INOM samma box, precis som indikatorernas analys */}
        {showGlobal && (
          <div style={{ maxWidth: 680, marginBottom: 18 }}>
            <BlocksEditor
              targetId="global"
              aiText={vyData.analys}
              aiRubrik={vyData.analys_rubrik || ANALYS_RUBRIK_GLOBAL}
              vy={vyData.vy}
            />
          </div>
        )}

        <SignalTimeline sektioner={sektioner} vy={vyData.vy} visaDagar={visaDagar} onCellClick={onOpenChart} />
        <figcaption style={{
          fontFamily: FONT_RUBRIK, fontStyle: "italic", fontSize: 13, color: "#888",
          marginTop: 14, lineHeight: 1.5,
        }}>
          En rad per indikator, en ruta per period. Peka för värde och trend, klicka på raden för större graf.
        </figcaption>
      </figure>
    </section>
  );
}

// ════════════════════════════════════════
//  ChapterPlate — kapitelrubrik som grön platta (folio + namn)
// ════════════════════════════════════════

function ChapterPlate({ index, namn, kicker }: { index?: number; namn: string; kicker?: string }) {
  return (
    <div className="chapter-plate" style={kicker ? { alignItems: "flex-start" } : undefined}>
      {index != null && (
        <span className="chapter-plate__folio" style={{ ...mono, marginTop: kicker ? 3 : 0 }}>
          {String(index).padStart(2, "0")}
        </span>
      )}
      {index != null && <span className="chapter-plate__divider" aria-hidden="true" />}
      <div style={{ minWidth: 0 }}>
        {kicker && (
          <div style={{
            fontSize: 10.5, fontWeight: 600, textTransform: "uppercase",
            letterSpacing: "0.13em", color: "#00AB60", marginBottom: 3,
          }}>
            {kicker}
          </div>
        )}
        <h2 className="chapter-plate__namn" style={{ fontFamily: FONT_RUBRIK }}>
          {namn}
        </h2>
      </div>
    </div>
  );
}

// ════════════════════════════════════════
//  SectionBlock — en hel sektion
// ════════════════════════════════════════

function SectionBlock({
  section, index, vyLabel, vy, onOpenChart, fristaende = false,
}: {
  section: Section; index?: number; vyLabel: string; vy: string;
  onOpenChart?: (kpi: KpiData) => void;
  /** Rapporten läses för sig — då hör inledning och källförteckning hit. */
  fristaende?: boolean;
}) {
  const delar = section.delar && section.delar.length > 0 ? delSektioner(section) : null;
  return (
    <section
      id={`rapport-${section.id}`}
      style={{ marginTop: index != null ? 56 : 0, scrollMarginTop: 60 }}
    >
      {/* Plattan utelämnas för enskilt sakområde — namnet står redan i mastheaden. */}
      {index != null && (
        <ChapterPlate
          index={index}
          namn={section.namn}
          kicker={kategoriForOmrade(section.id)?.namn}
        />
      )}

      {fristaende && section.inledning && section.inledning.length > 0 && (
        <Inledning stycken={section.inledning} />
      )}

      {/* Kapitlets översikt: räknare + bedömning + signalöversikt över samtliga
          indikatorer, grupperade per avsnitt. Ligger på kapitelnivå och inte
          per avsnitt — annars upprepas samma remsa fyra gånger i rad. */}
      {delar && (
        <KapitelOversikt
          section={section}
          grupper={delar}
          vy={vy}
          onOpenChart={onOpenChart}
        />
      )}

      {delar ? (
        /* Tematiska avsnitt (SKR-kapitlets indelning) — rubrik + bedömning */
        delar.map((del, di) => (
          <DelBlock key={del.id} del={del} nr={di + 1} vyLabel={vyLabel} vy={vy} />
        ))
      ) : (
        /* Indikatorer — varje som ett distinkt kort (analys + egna texter bor här) */
        section.kpier.map((kpi) => (
          <IndicatorBlock key={kpi.id} kpi={kpi} vyLabel={vyLabel} vy={vy} />
        ))
      )}

      {fristaende && <Kallforteckning kallor={section.kallor} leverans={section.leverans} />}
    </section>
  );
}

// ════════════════════════════════════════
//  Inledning — redaktionell kontext före siffrorna
// ════════════════════════════════════════

function Inledning({ stycken }: { stycken: string[] }) {
  const [ingress, ...brod] = stycken;
  return (
    <section className="report-lead" aria-label="Om rapporten">
      <div className="report-lead__label">Om den här rapporten</div>
      <p className="report-lead__ingress" style={{ fontFamily: FONT_RUBRIK }}>{ingress}</p>
      {brod.map((p, i) => (
        <p key={i} className="report-lead__text" style={{ fontFamily: FONT_RUBRIK }}>{p}</p>
      ))}
    </section>
  );
}

// ════════════════════════════════════════
//  KapitelOversikt — räknare + bedömning + signalöversikt per avsnitt
// ════════════════════════════════════════

function KapitelOversikt({
  section, grupper, vy, onOpenChart,
}: {
  section: Section; grupper: Section[]; vy: string;
  onOpenChart?: (kpi: KpiData) => void;
}) {
  return (
    <figure className="report-indicator ind report-figure" style={{ margin: "0 0 26px" }}>
      <div className="ind-etikett"><span>Signalöversikt</span></div>

      <div style={{ maxWidth: 680, marginBottom: 18 }}>
        <BlocksEditor
          targetId={section.id}
          aiText={section.analys}
          aiRubrik={section.analys_rubrik || "Bedömning"}
          vy={vy}
        />
      </div>

      <SignalTimeline sektioner={grupper} vy={vy} visaDagar={false} onCellClick={onOpenChart} />
      <figcaption style={{
        fontFamily: FONT_RUBRIK, fontStyle: "italic", fontSize: 13, color: "#888",
        marginTop: 14, lineHeight: 1.5,
      }}>
        En rad per indikator, en ruta per år. Peka för värde och trend, klicka på raden för större graf.
      </figcaption>
    </figure>
  );
}

// ════════════════════════════════════════
//  DelBlock — tematiskt avsnitt: rubrik + bedömning + indikatorer
//  (signalremsan bor på kapitelnivå, se KapitelOversikt)
// ════════════════════════════════════════

function DelBlock({
  del, nr, vyLabel, vy,
}: {
  del: Section; nr: number; vyLabel: string; vy: string;
}) {
  return (
    <section
      id={`rapport-${del.id}`}
      style={{ marginTop: nr > 1 ? 56 : 0, scrollMarginTop: 60 }}
    >
      <div className="del-plate">
        <span className="del-plate__nr" style={mono}>Avsnitt {nr}</span>
        <h3 className="del-plate__namn" style={{ fontFamily: FONT_RUBRIK }}>
          {del.namn}
        </h3>
      </div>

      {/* Avsnittets bedömning + egna anteckningar. Vitrum avgränsar mot
          första indikatorn; ingen egen ram behövs. */}
      <div style={{ maxWidth: 680, margin: "0 0 32px" }}>
        <BlocksEditor
          targetId={del.id}
          aiText={del.analys}
          aiRubrik="Bedömning"
          vy={vy}
        />
      </div>

      {del.kpier.map((kpi) => (
        <IndicatorBlock key={kpi.id} kpi={kpi} vyLabel={vyLabel} vy={vy} />
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
    <section id="rapport-kallor" className="report-sources" style={{ scrollMarginTop: 60 }}>
      <div className="del-plate">
        <span className="del-plate__nr" style={mono}>Källor</span>
        <h3 className="del-plate__namn" style={{ fontFamily: FONT_RUBRIK }}>
          Varifrån siffrorna kommer
        </h3>
      </div>

      {kallor && kallor.length > 0 && (
        <>
          <div className="report-sources__label">Primärkällor</div>
          {kallor.map((k) => <KallaPost key={k.id} kalla={k} />)}
        </>
      )}

      {leverans && leverans.length > 0 && (
        <>
          <div className="report-sources__label" style={{ marginTop: 28 }}>Leveranskedja</div>
          {leverans.map((k) => <KallaPost key={k.namn} kalla={k} />)}
        </>
      )}
    </section>
  );
}

function KallaPost({ kalla }: { kalla: KallaRef }) {
  return (
    <div className="report-source">
      <div className="report-source__head">
        <h4 className="report-source__namn" style={{ fontFamily: FONT_RUBRIK }}>
          {kalla.url ? (
            <a href={kalla.url} target="_blank" rel="noreferrer">{kalla.namn}</a>
          ) : kalla.namn}
        </h4>
        {kalla.n_indikatorer != null && (
          <span className="report-source__antal" style={mono}>
            {kalla.n_indikatorer} {kalla.n_indikatorer === 1 ? "indikator" : "indikatorer"}
          </span>
        )}
      </div>
      <div className="report-source__meta">{kalla.typ} &middot; {kalla.huvudman}</div>
      <p className="report-source__om" style={{ fontFamily: FONT_RUBRIK }}>{kalla.om}</p>
    </div>
  );
}

// ════════════════════════════════════════
//  IndicatorBlock — indikatorn som ett eget, inramat uppslag.
//
//  Läsordning (omtag 2026-08-20): bedömningen först, sedan beviset, sedan
//  förklaringen, sist verksamhetens egna ord.
//
//    1. Huvud            namn, statuschip, Hallands nivå och placering
//    2. Bedömning        AI-analysen
//    3. Diagram          utfallet mot regionerna
//    4. Faktablock       om indikatorn + påverkansfaktorer och teori
//    5. Verksamhetens kommentar  egna anteckningar
//
//  Sektionerna bärs av gröna etikettlinjer, inte av färgade paneler. Enda
//  färgen utöver grönt är statuschippet i huvudet.
// ════════════════════════════════════════

function IndicatorBlock({
  kpi, vyLabel: _vyLabel, vy,
}: {
  kpi: KpiData; vyLabel: string; vy: string;
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
    <article id={`rapport-${kpi.id}`} className="report-indicator ind" style={{ scrollMarginTop: 60 }}>

      {/* ── 1. Huvud: namn, status, readout ── */}
      <header className="ind__head">
        <div className="ind__titelrad">
          <h3 className="ind__titel" style={{ fontFamily: FONT_RUBRIK }}>{kpi.namn}</h3>
          <StatusTag status={kpi.status} neutral={kpi.utan_mal} />
        </div>
        <div className="ind__readout">
          <span>Halland{" "}
            <strong style={mono}>{fmtVarde(kpi.senaste, kpi.enhet)}{fmtSuffix(kpi.enhet)}</strong>
          </span>
          {kpi.rank != null && kpi.rank_av != null && (
            <span>Plats{" "}
              <strong style={mono}>{kpi.rank}/{kpi.rank_av}</strong>{" "}bland regionerna
            </span>
          )}
          {last && <span className="ind__readout-svag">Avser {lastLabel}</span>}
        </div>
      </header>

      {/* ── 2. Bedömning: AI-analysen, utan panel ── */}
      <section className="ind__sektion">
        <AiAnalys
          targetId={kpi.id}
          aiText={kpi.analystext}
          aiRubrik={kpi.analys_rubrik || analysRubrikForStatus(kpi.status)}
        />
      </section>

      {/* ── 3. Diagram: beviset kommer före förklaringen ── */}
      <figure className="ind__sektion report-figure" style={{ margin: 0 }}>
        <div className="ind-etikett">
          <span>Utfall</span>
          {harDagar && (
            <SegmentedControl
              size="sm"
              ariaLabel="Aggregerat eller dagsnivå"
              items={[{ id: "aggregerat", label: "Aggregerat" }, { id: "dag", label: "Dag" }]}
              value={visaDagar ? "dag" : "aggregerat"}
              onChange={(id) => setVisaDagar(id === "dag")}
            />
          )}
        </div>
        <FacetedChart kpi={chartKpi} vy={aktivVy} visaRubrik={false} />
        <figcaption className="ind__figcaption" style={{ fontFamily: FONT_RUBRIK }}>
          {kpi.kontext_serier && kpi.kontext_serier.length > 0
            ? <>Halland mot övriga regioner (grå) och riket (streckad) &middot; {firstLabel}&ndash;{lastLabel}.</>
            : <>Utfall mot förväntat läge &middot; {firstLabel}&ndash;{lastLabel}.</>}
        </figcaption>
      </figure>

      {/* ── 4. Två jämbördiga referenssektioner: vad måttet är, och vad som
             drar i det. Renderar sina egna <section>, se IndikatorFakta. ── */}
      <IndikatorFakta kpi={kpi} vy={vy} />

      {/* ── 5. Verksamhetens kommentar ── */}
      <section className="ind__sektion ind__kommentar">
        <h4 className="ind-etikett"><span>Verksamhetens kommentar</span></h4>
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

/** AI-analysen: alltid aktuell R-text, skrivskyddad, lagras aldrig. */
function AiAnalys({
  targetId, aiText, aiRubrik,
}: {
  targetId: string; aiText: string; aiRubrik?: string;
}) {
  return (
    <EditableBlock id={`ai-${targetId}`} type="ai" rubrik={aiRubrik} text={aiText} />
  );
}

function BlocksEditor({
  targetId, aiText, aiRubrik, vy,
}: {
  targetId: string; aiText: string; aiRubrik?: string; vy?: string;
}) {
  return (
    <div>
      <AiAnalys targetId={targetId} aiText={aiText} aiRubrik={aiRubrik} />
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
}: {
  onBack: () => void;
  aktivVy: string; vyItems: VyItem[]; onChangeVy: (id: string) => void;
  onExport?: () => void;
  exporterar?: boolean;
  exportAktiv?: boolean;
  exportFel?: string | null;
}) {
  return (
    <div className="report-toolbar" style={{
      position: "sticky", top: 0, zIndex: 10,
      background: "rgba(251,251,249,0.92)", backdropFilter: "blur(12px)",
      borderBottom: "1px solid #e0e0dc", padding: "10px 32px",
      display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16,
    }}>
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
  );
}

// ════════════════════════════════════════
//  SidebarToc — sticky innehållsförteckning
// ════════════════════════════════════════

function SidebarToc({
  sections, activeId, visaOversikt = true,
}: {
  sections: Section[]; activeId: string; visaOversikt?: boolean;
}) {
  // Manuellt öppnade/stängda grupper. Odefinierat = följ scrollen
  // (gruppen som innehåller aktiv rubrik visas utfälld).
  const [oppna, setOppna] = useState<Record<string, boolean>>({});
  return (
    <nav className="report-toc" style={{
      position: "sticky", top: 52,
      alignSelf: "flex-start",
      width: 196, flexShrink: 0,
      padding: "28px 16px 28px 20px",
      fontFamily: FONT,
      borderRight: "1px solid #ebebea",
    }}>
      <div style={{
        fontSize: 9.5, fontWeight: 600, textTransform: "uppercase",
        letterSpacing: "0.1em", color: "#bbb", marginBottom: 14,
      }}>
        Innehåll
      </div>
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
            {i + 1}. {sek.namn}
          </a>
        );

        // Kategorietikett före första sektionen i varje ny kategori
        // (bara i helrapporten, där flera sektioner listas).
        const kat = kategoriForOmrade(sek.id)?.namn;
        const prevKat = i > 0 ? kategoriForOmrade(sections[i - 1].id)?.namn : undefined;
        const visaKat = sections.length > 1 && kat && kat !== prevKat;

        const grupper = delar ?? [sek];
        return (
          <div key={sek.id} style={{ marginBottom: 10 }}>
            {visaKat && (
              <div style={{
                fontSize: 9, fontWeight: 600, textTransform: "uppercase",
                letterSpacing: "0.09em", color: "#a9ada8",
                margin: "12px 0 4px", paddingLeft: 10,
              }}>
                {kat}
              </div>
            )}
            {sekLank}
            {grupper.map((grupp, gi) => (
              <TocGrupp
                key={grupp.id}
                grupp={grupp}
                nr={delar && sections.length === 1 ? gi + 1 : undefined}
                visaRubrik={!!delar}
                indent={sections.length > 1 ? 18 : 10}
                activeId={activeId}
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
  grupp, nr, visaRubrik, indent, activeId, open, onToggle,
}: {
  grupp: Section; nr?: number; visaRubrik: boolean; indent: number;
  activeId: string; open?: boolean; onToggle: (open: boolean) => void;
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
            {nr != null ? `${nr}. ` : ""}{grupp.namn}
            <span style={{ color: "#c4c4be", fontWeight: 400, marginLeft: 5, fontSize: 10.5 }}>
              {grupp.kpier.length}
            </span>
          </a>
        </div>
      )}
      {(arOppen || !visaRubrik) && grupp.kpier.map((kpi) => (
        <a key={kpi.id} href={`#rapport-${kpi.id}`}
          style={{
            display: "block", padding: "2px 0 2px 22px",
            fontSize: 11, fontWeight: activeId === kpi.id ? 600 : 400,
            color: activeId === kpi.id ? "#00664D" : "#aaa",
            textDecoration: "none", lineHeight: 1.45,
            borderLeft: activeId === kpi.id ? "2px solid #00664D" : "2px solid transparent",
            marginLeft: -1,
            transition: "color 0.1s",
          }}
        >
          {kpi.namn}
        </a>
      ))}
    </div>
  );
}

function MiniStat({ value, label, signal }: { value: number; label: string; signal?: string }) {
  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
      {...(signal ? { role: "img", "aria-label": `${value} ${label}` } : {})}
    >
      {signal && <SignalBadge signal={signal} size={8} />}
      <span style={{ ...mono, fontSize: 18, fontWeight: 600, color: "#0a0a0a" }}>{value}</span>
      <span style={{ fontSize: 13, color: "#888", fontFamily: FONT }}>{label}</span>
    </span>
  );
}
