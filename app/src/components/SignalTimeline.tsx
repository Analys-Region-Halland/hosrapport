import { useMemo, useState } from "react";
import type { Section, KpiData, TidsseriePoint } from "../types";
import {
  SIGNAL_COLORS, SIGNAL_BG, SIGNAL_TEXT, SIGNAL_LABELS, FONT, FONT_MONO, NEUTRAL_LINE,
} from "../charts/constants";
import { fmtVarde, fmtSuffix } from "../utils/format";
import { kortBeskrivning } from "../utils/definitions";
import { useResizeWidth } from "../hooks/useResizeWidth";
import SegmentedControl from "./SegmentedControl";
import { StatusTag } from "./SignalStrip";
import MiniTrend from "./MiniTrend";

// ════════════════════════════════════════════════════════════
//  SignalTimeline — rapportens signalöversikt som en editoriell tabell.
//
//  En rad per indikator i ett gemensamt rutnät: namn · senaste värde ·
//  placering · signal-lane · statuschip. Kolumnbredderna räknas i px här
//  och delas av kolumnhuvudet, så årsaxeln står exakt över sina rutor och
//  hela tabellen läses som en enhet.
//
//  Legenden ligger ÖVERST och är samtidigt filter: chipen visar hur många
//  indikatorer som har varje status och filtrerar tabellen när man klickar.
//  Sorteringen (avsnitt · status) sitter i samma verktygsrad.
//
//  Lanen är rutor, en per period, utan symboler: fylld ruta = signal, tom
//  ruta med hårlinje = saknar data, grå ruta = mått utan målriktning. Vid
//  hög täthet (dagsvy) slås intilliggande perioder med samma signal ihop.
// ════════════════════════════════════════════════════════════

type SigNyckel = "rod" | "gul" | "gron" | "neutral";
type SortId = "ordning" | "status";

// Ordningen är samtidigt allvarlighetsordning: den styr både chipen i
// verktygsraden och grupperna vid statussortering.
const KEY_ORDNING: SigNyckel[] = ["rod", "gul", "gron", "neutral"];
const KEY_ETIKETT: Record<SigNyckel, string> = {
  rod: SIGNAL_LABELS.rod, gul: SIGNAL_LABELS.gul, gron: SIGNAL_LABELS.gron, neutral: "Utan mål",
};
const NEUTRAL_BG = "#ececea";
const NEUTRAL_TEXT = "#6B7270";
/** Ruta för mått utan målriktning — grå, men tydligt en ruta. */
const UTAN_MAL_FYLLNING = "#dcdcd7";
/** Ruta för period utan data — tom yta med en hårlinje i mitten. */
const SAKNAS_FYLLNING = "linear-gradient(#e3e3df, #e3e3df) center/100% 1px no-repeat";

// Kolumngeometri (px). GAP speglar column-gap i .sig__head/.sig-row.
const GAP = 12;
const W_CHIP = 82;
const W_VARDE = 74;
const W_PLATS = 46;
/** Över denna täthet slås perioder ihop till fält i stället för rutor. */
const TATHETSGRANS = 26;

interface Props {
  sektioner: Section[];
  vy: string;
  visaDagar?: boolean;
  onCellClick?: (kpi: KpiData) => void;
}

type Hover =
  | {
      kind: "cell"; kpi: KpiData; serie: TidsseriePoint[]; refSerie?: TidsseriePoint[];
      point?: TidsseriePoint; etikett: string; prevYear: number | null; idx: number;
      x: number; yTop: number; yBot: number;
    }
  | { kind: "namn"; kpi: KpiData; avsnitt?: string; x: number; yTop: number; yBot: number }
  | { kind: "status"; kpi: KpiData; x: number; yTop: number; yBot: number };

interface Kolumn { period: string; etikett: string }
interface Grupp { id: string; namn: string | null; farg?: string; kpier: KpiData[] }
interface Segment { nyckel: SigNyckel | "saknas"; len: number }

function aktivSerie(kpi: KpiData, visaDagar: boolean): TidsseriePoint[] {
  return visaDagar && kpi.dagar && kpi.dagar.length > 0 ? kpi.dagar : kpi.tidsserie;
}

/** Statusnyckel för en indikator. Mått utan målriktning färgsätts aldrig:
 *  de är "neutral" oavsett vad R råkar sätta i status-fältet. */
function sigNyckel(kpi: KpiData): SigNyckel {
  if (kpi.utan_mal) return "neutral";
  return kpi.status === "rod" || kpi.status === "gul" || kpi.status === "gron" ? kpi.status : "neutral";
}

function toDate(iso: string): Date | null {
  const [y, m, d] = iso.split("-").map(Number);
  return Number.isFinite(y) ? new Date(y, (m || 1) - 1, d || 1) : null;
}

function prevYearValue(serie: TidsseriePoint[], period: string, effVy: string): number | null {
  const cur = toDate(period);
  if (!cur) return null;
  const target = new Date(cur.getFullYear() - 1, cur.getMonth(), cur.getDate()).getTime();
  const tol = effVy === "dag" ? 4 : effVy === "vecka" ? 6 : effVy === "manad" ? 20 : effVy === "kvartal" ? 50 : 220;
  let best: number | null = null, bestDiff = Infinity;
  for (const p of serie) {
    const d = toDate(p.period);
    if (!d) continue;
    const diff = Math.abs(d.getTime() - target) / 86_400_000;
    if (diff < bestDiff) { bestDiff = diff; best = p.varde; }
  }
  return best != null && bestDiff <= tol ? best : null;
}

/** Kolumnbredder i px. Smala vyer fäller bort plats- och värdekolumnen
 *  innan lanen får ge upp utrymme — lanen är översiktens huvudsak. */
function berakna(width: number, harPlats: boolean) {
  const visaVarde = width >= 560;
  const visaPlats = harPlats && width >= 720;
  const antalKol = 3 + (visaVarde ? 1 : 0) + (visaPlats ? 1 : 0);
  const fast = W_CHIP + (visaVarde ? W_VARDE : 0) + (visaPlats ? W_PLATS : 0) + (antalKol - 1) * GAP;
  let namnW = Math.round(Math.min(400, Math.max(168, width * (visaPlats ? 0.33 : 0.38))));
  let laneW = width - fast - namnW;
  if (laneW < 104) {
    namnW = Math.max(132, namnW - (104 - laneW));
    laneW = Math.max(60, width - fast - namnW);
  }
  const laneX = namnW + GAP + (visaVarde ? W_VARDE + GAP : 0) + (visaPlats ? W_PLATS + GAP : 0);
  const template = [
    namnW + "px",
    visaVarde ? W_VARDE + "px" : "",
    visaPlats ? W_PLATS + "px" : "",
    laneW + "px",
    W_CHIP + "px",
  ].filter(Boolean).join(" ");
  return { visaVarde, visaPlats, laneW, laneX, template };
}

function segmentera(kpi: KpiData, kolumner: Kolumn[], visaDagar: boolean, tat: boolean): Segment[] {
  const serie = aktivSerie(kpi, visaDagar);
  const perPeriod = new Map(serie.map((p) => [p.period, p]));
  const utanMal = Boolean(kpi.utan_mal);
  const raa: (SigNyckel | "saknas")[] = kolumner.map((k) => {
    const p = perPeriod.get(k.period);
    if (!p) return "saknas";
    if (utanMal) return "neutral";
    return p.signal ?? "saknas";
  });
  if (!tat) return raa.map((nyckel) => ({ nyckel, len: 1 }));
  const runs: Segment[] = [];
  for (const nyckel of raa) {
    const sista = runs[runs.length - 1];
    if (sista && sista.nyckel === nyckel) sista.len++;
    else runs.push({ nyckel, len: 1 });
  }
  return runs;
}

function fyllning(nyckel: SigNyckel | "saknas"): string {
  if (nyckel === "saknas") return SAKNAS_FYLLNING;
  if (nyckel === "neutral") return UTAN_MAL_FYLLNING;
  return SIGNAL_COLORS[nyckel];
}

function laneSammanfattning(segment: Segment[], kolumner: Kolumn[]): string {
  const antal: Record<string, number> = {};
  for (const s of segment) antal[s.nyckel] = (antal[s.nyckel] || 0) + s.len;
  const delar = KEY_ORDNING.filter((k) => antal[k]).map((k) => antal[k] + " " + KEY_ETIKETT[k].toLowerCase());
  if (antal.saknas) delar.push(antal.saknas + " utan data");
  const spann = kolumner.length
    ? kolumner[0].etikett + "–" + kolumner[kolumner.length - 1].etikett : "";
  return "Signalhistorik " + spann + ": " + (delar.join(", ") || "ingen signal");
}

export default function SignalTimeline({ sektioner, vy, visaDagar = false, onCellClick }: Props) {
  const [outerRef, width] = useResizeWidth();
  const [sort, setSort] = useState<SortId>("ordning");
  const [filter, setFilter] = useState<SigNyckel | null>(null);
  const [hover, setHover] = useState<Hover | null>(null);

  const alla = useMemo(() => sektioner.flatMap((s) => s.kpier), [sektioner]);
  const flera = sektioner.length > 1;
  const effVy = visaDagar ? "dag" : vy;

  // Gemensam tidsaxel = unionen av alla periodnycklar, så en indikator som
  // sträcker sig längre än den längsta serien inte tappar sina år.
  const kolumner = useMemo<Kolumn[]>(() => {
    const m = new Map<string, string>();
    for (const k of alla) for (const p of aktivSerie(k, visaDagar)) m.set(p.period, p.etikett);
    return [...m.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .map(([period, etikett]) => ({ period, etikett }));
  }, [alla, visaDagar]);

  const antal = useMemo(() => {
    const c: Record<SigNyckel, number> = { rod: 0, gul: 0, gron: 0, neutral: 0 };
    for (const k of alla) c[sigNyckel(k)]++;
    return c;
  }, [alla]);

  const harPlats = useMemo(() => alla.some((k) => k.rank != null && k.rank_av != null), [alla]);
  const harSaknad = useMemo(
    () => alla.some((k) => aktivSerie(k, visaDagar).length < kolumner.length),
    [alla, visaDagar, kolumner.length],
  );
  const avsnittAv = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of sektioner) for (const k of s.kpier) m.set(k.id, s.namn);
    return m;
  }, [sektioner]);

  const grupper = useMemo<Grupp[]>(() => {
    const slapp = (k: KpiData) => !filter || sigNyckel(k) === filter;
    if (sort === "ordning") {
      return sektioner
        .map((s) => ({ id: s.id, namn: flera ? s.namn : null, kpier: s.kpier.filter(slapp) }))
        .filter((g) => g.kpier.length > 0);
    }
    // Statussortering grupperar också: rubrikerna ger listan samma rytm som
    // avsnittsvyn, i stället för sexton rader i en följd. Inom en grupp går
    // bästa placering först, därefter bokstavsordning.
    const plats = (k: KpiData) => k.rank ?? Number.POSITIVE_INFINITY;
    const kpier = alla.filter(slapp)
      .sort((a, b) => plats(a) - plats(b) || a.namn.localeCompare(b.namn, "sv"));
    return KEY_ORDNING.map((k) => ({
      id: "status-" + k,
      namn: KEY_ETIKETT[k],
      farg: k === "neutral" ? NEUTRAL_TEXT : SIGNAL_TEXT[k],
      kpier: kpier.filter((x) => sigNyckel(x) === k),
    })).filter((g) => g.kpier.length > 0);
  }, [sektioner, alla, flera, sort, filter]);

  const visade = grupper.reduce((n, g) => n + g.kpier.length, 0);
  const N = kolumner.length;
  const tat = N > TATHETSGRANS;
  const { visaVarde, visaPlats, laneW, laneX, template } = berakna(width || 900, harPlats);

  // Ett enda rutmått delas av årsaxeln, rutorna, hårkorset och träffytan, så
  // att etiketten står exakt över sin ruta och hårkorset mitt i den.
  const rutGap = tat ? 0 : 2;
  const rutW = N > 0 ? Math.max(1, (laneW - rutGap * (N - 1)) / N) : 0;
  const rutMitt = (i: number) => i * (rutW + rutGap) + rutW / 2;

  // Årsetiketter: så många som ryms utan att krocka, alltid med den sista
  // perioden märkt — det är den som ger status och senaste värde.
  const markta = useMemo(() => {
    const s = new Set<number>();
    if (N === 0 || laneW <= 0) return s;
    const behov = Math.max(...kolumner.map((k) => k.etikett.length)) * 5.8 + 6;
    const steg = Math.max(1, Math.ceil(behov / (laneW / N)));
    for (let i = N - 1; i >= 0; i -= steg) s.add(i);
    return s;
  }, [kolumner, N, laneW]);

  const sortItems = [
    { id: "ordning", label: flera ? "Avsnitt" : "Ordning" },
    { id: "status", label: "Status" },
  ];
  // Sorteringen gör ingen nytta i en kort tabell. Avsnittens egna översikter
  // har ofta bara två till fyra rader; där är kontrollen bara brus.
  const visaSortering = alla.length >= 5;

  const hoverKol = hover?.kind === "cell" ? hover.idx : null;

  return (
    <div className="sig" ref={outerRef}>
      {/* ── Verktygsrad: legend/filter till vänster, sortering till höger ── */}
      <div className="sig__toolbar">
        <div className="sig__chips">
          {KEY_ORDNING.filter((k) => antal[k] > 0).map((k) => {
            const aktiv = filter === k;
            return (
              <button
                key={k}
                type="button"
                className="sig__chip"
                aria-pressed={aktiv}
                data-dim={filter != null && !aktiv}
                title={aktiv ? "Visa alla indikatorer" : "Visa bara " + KEY_ETIKETT[k].toLowerCase()}
                onClick={() => setFilter(aktiv ? null : k)}
                style={{
                  background: k === "neutral" ? NEUTRAL_BG : SIGNAL_BG[k],
                  color: k === "neutral" ? NEUTRAL_TEXT : SIGNAL_TEXT[k],
                  boxShadow: aktiv
                    ? "inset 0 0 0 1.5px " + (k === "neutral" ? NEUTRAL_TEXT : SIGNAL_COLORS[k])
                    : "none",
                }}
              >
                {KEY_ETIKETT[k]}
                <span className="sig__chip-n">{antal[k]}</span>
              </button>
            );
          })}
          {harSaknad && (
            <span className="sig__saknas">
              <span className="sig__saknas-yta" aria-hidden="true" />
              <span className="sig__meta">Saknar data</span>
            </span>
          )}
          {filter && (
            <span className="sig__meta">
              {visade} av {alla.length} &middot;{" "}
              <button type="button" className="sig__lank" onClick={() => setFilter(null)}>
                Visa alla
              </button>
            </span>
          )}
        </div>

        {visaSortering && (
          <div className="sig__sort">
            <span className="sig__sort-lbl">Sortera</span>
            <SegmentedControl
              size="sm"
              ariaLabel="Sortera signalöversikten"
              items={sortItems}
              value={sort}
              onChange={(id) => setSort(id as SortId)}
            />
          </div>
        )}
      </div>

      {/* ── Kolumnhuvud med årsaxeln ── */}
      <div className="sig__head" style={{ gridTemplateColumns: template }}>
        <span className="sig__head-lbl">Indikator</span>
        {visaVarde && <span className="sig__head-lbl sig__head-lbl--num">Senaste</span>}
        {visaPlats && <span className="sig__head-lbl sig__head-lbl--num">Plats</span>}
        <div className="sig__axis">
          {kolumner.map((k, i) => (
            <span
              key={k.period}
              className="sig__axis-t"
              data-on={hoverKol === i}
              style={{ marginRight: i === N - 1 ? 0 : rutGap }}
            >
              {markta.has(i) ? k.etikett : " "}
            </span>
          ))}
        </div>
        <span className="sig__head-lbl sig__head-lbl--num">Status</span>
      </div>

      {/* ── Rader ── */}
      <div className="sig__body" onMouseLeave={() => setHover(null)}>
        {hoverKol != null && N > 0 && (
          <div className="sig__cross" style={{ left: laneX + rutMitt(hoverKol) }} />
        )}

        {grupper.length === 0 && (
          <div className="sig__tom">Ingen indikator med den statusen i den här rapporten.</div>
        )}

        {grupper.map((grupp) => (
          <div key={grupp.id} className="sig__grupp-wrap">
            {grupp.namn && (
              <div className="sig__grupp" style={grupp.farg ? { color: grupp.farg } : undefined}>
                {grupp.namn}
              </div>
            )}
            {grupp.kpier.map((kpi) => {
              const serie = aktivSerie(kpi, visaDagar);
              const segment = segmentera(kpi, kolumner, visaDagar, tat);
              const sista = serie[serie.length - 1];
              const efterslapning =
                sista && N > 0 && sista.period !== kolumner[N - 1].period ? sista.etikett : null;
              const visaNamnKort = (el: HTMLElement) => {
                const r = el.getBoundingClientRect();
                setHover({
                  kind: "namn", kpi, avsnitt: flera ? avsnittAv.get(kpi.id) : undefined,
                  x: r.left + Math.min(150, r.width / 2), yTop: r.top, yBot: r.bottom,
                });
              };
              return (
                <div
                  key={kpi.id}
                  className="sig-row"
                  style={{ gridTemplateColumns: template }}
                  data-klick={Boolean(onCellClick)}
                  onClick={() => onCellClick?.(kpi)}
                >
                  <div className="sig-row__namn">
                    <button
                      type="button"
                      className="sig-row__btn"
                      aria-label={kpi.namn + ". " + (kortBeskrivning(kpi) || "Visa i graf")}
                      onMouseEnter={(ev) => visaNamnKort(ev.currentTarget)}
                      onMouseLeave={() => setHover(null)}
                      onFocus={(ev) => visaNamnKort(ev.currentTarget)}
                      onBlur={() => setHover(null)}
                      onClick={(ev) => { ev.stopPropagation(); onCellClick?.(kpi); }}
                    >
                      {kpi.namn}
                    </button>
                  </div>

                  {visaVarde && (
                    <div className="sig-row__num">
                      {fmtVarde(kpi.senaste, kpi.enhet)}
                      <span style={{ color: "#a9a9a3" }}>{fmtSuffix(kpi.enhet)}</span>
                      {efterslapning && <span className="sig-row__ar">{efterslapning}</span>}
                    </div>
                  )}

                  {visaPlats && (
                    <div className="sig-row__num sig-row__num--svag">
                      {kpi.rank != null && kpi.rank_av != null
                        ? kpi.rank + "/" + kpi.rank_av
                        : "–"}
                    </div>
                  )}

                  <div
                    className="sig-row__lane"
                    role="img"
                    aria-label={kpi.namn + ". " + laneSammanfattning(segment, kolumner)}
                    onMouseMove={(ev) => {
                      const r = ev.currentTarget.getBoundingClientRect();
                      if (r.width <= 0 || N === 0) return;
                      const idx = Math.max(0, Math.min(N - 1, Math.floor((ev.clientX - r.left) / (rutW + rutGap))));
                      const kol = kolumner[idx];
                      const si = serie.findIndex((p) => p.period === kol.period);
                      const point = si >= 0 ? serie[si] : undefined;
                      const refSerie =
                        kpi.referens_serie && kpi.referens_serie.length === serie.length
                          ? kpi.referens_serie : undefined;
                      const prevYear = refSerie
                        ? (si >= 0 ? refSerie[si]?.varde ?? null : null)
                        : prevYearValue(serie, kol.period, effVy);
                      setHover({
                        kind: "cell", kpi, serie, refSerie, point, etikett: kol.etikett,
                        prevYear, idx, x: ev.clientX, yTop: r.top - 7, yBot: r.bottom + 7,
                      });
                    }}
                    onMouseLeave={() => setHover(null)}
                  >
                    {segment.map((seg, i) => (
                      <span
                        key={i}
                        className="sig-row__seg"
                        style={{
                          flex: seg.len + " 1 0",
                          background: fyllning(seg.nyckel),
                          marginRight: i === segment.length - 1 ? 0 : rutGap,
                        }}
                      />
                    ))}
                  </div>

                  <div
                    className="sig-row__chip"
                    style={{ cursor: "help" }}
                    onMouseEnter={(ev) => {
                      const r = ev.currentTarget.getBoundingClientRect();
                      setHover({ kind: "status", kpi, x: r.left + r.width / 2, yTop: r.top, yBot: r.bottom });
                    }}
                    onMouseLeave={() => setHover(null)}
                  >
                    <StatusTag status={kpi.status} size="sm" neutral={kpi.utan_mal} />
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {hover?.kind === "cell" && <CellKort hover={hover} />}
      {hover?.kind === "namn" && <NamnKort hover={hover} />}
      {hover?.kind === "status" && <StatusKort hover={hover} />}
    </div>
  );
}

// ── Delad ram för hover-korten: skarpa hörn, hårlinje, accent i topp ──
function Kort({
  accent, x, yTop, yBot, bredd, children,
}: {
  accent: string; x: number; yTop: number; yBot: number; bredd: number; children: React.ReactNode;
}) {
  const under = yTop < 250;
  const left = Math.max(bredd / 2 + 8, Math.min(window.innerWidth - bredd / 2 - 8, x));
  return (
    <div
      className="sig-kort"
      style={{
        left, top: under ? yBot + 8 : yTop - 8,
        transform: under ? "translate(-50%, 0)" : "translate(-50%, -100%)",
        width: bredd, borderTop: "2px solid " + accent,
      }}
    >
      {children}
    </div>
  );
}

// ── Värderuta: periodens värde + förväntat + föreg. år + minigraf ──
function CellKort({ hover }: { hover: Extract<Hover, { kind: "cell" }> }) {
  const { kpi, serie, refSerie, point, etikett, prevYear, x, yTop, yBot } = hover;
  const dec = kpi.enhet === "procent" ? 1 : 0;
  const suffix = fmtSuffix(kpi.enhet);
  const nyckel = sigNyckel(kpi);
  const accent = nyckel === "neutral" ? NEUTRAL_TEXT : SIGNAL_COLORS[nyckel];
  const sig = kpi.utan_mal ? undefined : point?.signal;
  const BREDD = 252;

  let yoy: { text: string; color: string } | null = null;
  if (point && prevYear != null) {
    const diff = point.varde - prevYear;
    const bra = kpi.inverterad ? diff < 0 : diff > 0;
    const daligt = kpi.inverterad ? diff > 0 : diff < 0;
    const pil = diff > 0 ? "↑" : diff < 0 ? "↓" : "→";
    const enhet = kpi.enhet === "procent" ? " pp" : "";
    yoy = {
      color: kpi.utan_mal ? "#9a9a96" : bra ? SIGNAL_COLORS.gron : daligt ? SIGNAL_COLORS.rod : "#9a9a96",
      text: fmtVarde(prevYear, kpi.enhet, dec) + suffix + "  " + pil + fmtVarde(Math.abs(diff), kpi.enhet, dec) + enhet,
    };
  }

  return (
    <Kort accent={accent} x={x} yTop={yTop} yBot={yBot} bredd={BREDD}>
      <div className="sig-kort__titel">{kpi.namn}</div>
      <div className="sig-kort__meta" style={{ marginBottom: 8 }}>{etikett}</div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{
          fontFamily: FONT_MONO, fontFeatureSettings: "'tnum'", fontVariantNumeric: "tabular-nums",
          fontSize: 23, fontWeight: 700, color: "#0a0a0a", letterSpacing: "-0.02em", lineHeight: 1,
        }}>
          {point ? fmtVarde(point.varde, kpi.enhet, dec) : "–"}
        </span>
        <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: "#aaa", fontWeight: 500 }}>{suffix}</span>
        {sig && (
          <span style={{
            marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 5,
            fontFamily: FONT, fontSize: 11, fontWeight: 600, color: SIGNAL_TEXT[sig],
          }}>
            <span style={{ width: 7, height: 7, background: SIGNAL_COLORS[sig] }} />
            {SIGNAL_LABELS[sig]}
          </span>
        )}
        {!point && <span className="sig-kort__meta" style={{ marginLeft: "auto" }}>Saknar data</span>}
      </div>

      <div style={{ marginTop: 6 }}>
        {point?.yhat != null && (
          <div className="sig-kort__rad">
            <span>förväntat</span>
            <span style={{ fontFamily: FONT_MONO }}>{fmtVarde(point.yhat, kpi.enhet, dec)}{suffix}</span>
          </div>
        )}
        {yoy && (
          <div className="sig-kort__rad">
            <span>föreg. år</span>
            <span style={{ fontFamily: FONT_MONO, color: yoy.color, fontWeight: 600 }}>{yoy.text}</span>
          </div>
        )}
      </div>

      <div style={{ marginTop: 8, borderTop: "1px solid #f0efeb", paddingTop: 6 }}>
        <MiniTrend
          serie={serie} refSerie={refSerie} accent={NEUTRAL_LINE}
          highlightPeriod={point?.period} width={BREDD - 28} height={92}
        />
      </div>

      <div style={{
        marginTop: 8, display: "flex", alignItems: "center", gap: 5,
        fontFamily: FONT, fontSize: 10.5, color: "#aaa", fontWeight: 500,
      }}>
        <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor"
             strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9.5 2.5H13.5V6.5" /><path d="M13.5 2.5L9 7" />
          <path d="M6.5 13.5H2.5V9.5" /><path d="M2.5 13.5L7 9" />
        </svg>
        Klicka för större graf
      </div>
    </Kort>
  );
}

// ── Namnruta: vad indikatorn mäter ──
function NamnKort({ hover }: { hover: Extract<Hover, { kind: "namn" }> }) {
  const { kpi, avsnitt, x, yTop, yBot } = hover;
  const beskrivning = kortBeskrivning(kpi);
  const enhetText = kpi.enhet === "procent" ? "Procent" : kpi.enhet === "minuter" ? "Minuter" : "Antal";
  return (
    <Kort accent="#00664D" x={x} yTop={yTop} yBot={yBot} bredd={290}>
      {avsnitt && (
        <div style={{
          fontFamily: FONT, fontSize: 9.5, fontWeight: 700, textTransform: "uppercase",
          letterSpacing: "0.12em", color: "#00664D", marginBottom: 4,
        }}>
          {avsnitt}
        </div>
      )}
      <div className="sig-kort__titel" style={{ marginBottom: beskrivning ? 6 : 8 }}>{kpi.namn}</div>
      {beskrivning && (
        <div style={{ fontFamily: FONT, fontSize: 12, lineHeight: 1.55, color: "#555", marginBottom: 8 }}>
          {beskrivning}
        </div>
      )}
      <div style={{
        display: "flex", gap: 14, fontFamily: FONT, fontSize: 10.5, color: "#999",
        borderTop: "1px solid #f0efeb", paddingTop: 7,
      }}>
        <span>Enhet: <strong style={{ color: "#666", fontWeight: 600 }}>{enhetText}</strong></span>
        <span>
          <strong style={{ color: "#666", fontWeight: 600 }}>
            {kpi.utan_mal ? "Utan målriktning" : kpi.inverterad ? "Lägre är bättre" : "Högre är bättre"}
          </strong>
        </span>
      </div>
    </Kort>
  );
}

// ── Statusruta: hur "i fas / bevaka / avvikelse" bedöms ──
// Tre varianter: mått utan målriktning, ranking mot andra regioner
// (kontext_serier, t.ex. SKR) och statistiskt förväntat intervall (conformal).
function StatusKort({ hover }: { hover: Extract<Hover, { kind: "status" }> }) {
  const { kpi, x, yTop, yBot } = hover;
  const utanMal = Boolean(kpi.utan_mal);
  const ranking = Boolean(kpi.kontext_serier && kpi.kontext_serier.length > 0);
  const accent = utanMal ? NEUTRAL_TEXT : SIGNAL_COLORS[kpi.status] || "#00664D";
  const nivaer: { sig: "gron" | "gul" | "rod"; txt: string }[] = ranking
    ? [
        { sig: "gron", txt: "Topp 3 bland regionerna" },
        { sig: "gul", txt: "Plats 4–7" },
        { sig: "rod", txt: "Plats 8 eller lägre" },
      ]
    : [
        { sig: "gron", txt: "Inom det förväntade intervallet (80 %)" },
        { sig: "gul", txt: "I ytterkanten, mellan 80 och 95 %" },
        { sig: "rod", txt: "Utanför det förväntade (över 95 %)" },
      ];

  return (
    <Kort accent={accent} x={x} yTop={yTop} yBot={yBot} bredd={300}>
      <div className="sig-kort__titel" style={{ marginBottom: 6 }}>Så bedöms status</div>
      <div style={{
        fontFamily: FONT, fontSize: 12, lineHeight: 1.55, color: "#555",
        marginBottom: utanMal ? 0 : 9,
      }}>
        {utanMal
          ? "Måttet beskriver volym eller struktur och saknar målriktning. Det färgsätts därför inte, utan visas i grått."
          : ranking
            ? "Senaste årets värde rankas mot övriga regioner (hänsyn tas till om högre eller lägre är bättre). Halland är i fas när regionen ligger bland de tre bästa."
            : "Senaste värdet jämförs mot ett statistiskt förväntat intervall. Modellen väger in säsong, veckodag och trend (GLM + conformal prediction)."}
      </div>
      {!utanMal && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {nivaer.map((n) => {
            const aktiv = n.sig === kpi.status;
            return (
              <div key={n.sig} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "3px 6px",
                background: aktiv ? SIGNAL_BG[n.sig] : "transparent",
              }}>
                <span style={{ width: 8, height: 8, background: SIGNAL_COLORS[n.sig], flexShrink: 0 }} />
                <span style={{
                  fontFamily: FONT, fontSize: 11, fontWeight: 600,
                  color: SIGNAL_TEXT[n.sig], width: 62, flexShrink: 0,
                }}>
                  {SIGNAL_LABELS[n.sig]}
                </span>
                <span style={{ fontFamily: FONT, fontSize: 11, color: "#666", lineHeight: 1.4 }}>{n.txt}</span>
              </div>
            );
          })}
        </div>
      )}
    </Kort>
  );
}
