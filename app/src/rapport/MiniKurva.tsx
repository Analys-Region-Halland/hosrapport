// rapport/MiniKurva.tsx: de små graferna i hovringskortet i Läget i korthet
// (2026-10-08, tredje versionen). Avskalade varianter av rapportens grafer,
// men med en skala som går att läsa:
//
//   MiniVarde   Hallands värde över tid. Värdeskalan utgår från Hallands
//               värden men spänner minst SPANN_ANDEL av regionernas spridning
//               under perioden, med jämna steg utskrivna till vänster. Då syns
//               utvecklingen tydligt, men brus förstoras inte till dramatik: en
//               liten förändring ser liten ut och en stor ser stor ut.
//   MiniPlats   Platsen över tid på hela fältet, plats 1 överst och sista
//               platsen nederst. Topp 3 är ett grönt fält som slutar exakt
//               mellan plats 3 och 4, så att plats 4 och sämre aldrig ser ut att
//               ligga i målet (förklaringen står i grafens rubrik, RadKort).
//               Varje punkt är en ring i placeringens ton med platsen skriven
//               i, som Hallands linje i bumpdiagrammet.
//
// I värdegrafen står första och senaste värdet som etikett, placerad där den
// inte krockar med linjen (miniEtikett.ts), med connector när den står en bit
// från punkten. Under båda står åren vid ändarna.

import { curveMonotoneX, line } from "d3";
import type { ReactNode } from "react";
import { textbredd } from "../charts/karna/matt";
import { tickText, vardeTicks } from "../charts/karna/skalor";
import type { KpiModell, TalFormat } from "../data/modell";
import { tema } from "../design/tema";
import { placeraEtiketter } from "./miniEtikett";
import { platsTon, type Periodplats, type Periodvarde } from "./radUtveckling";

interface Gemensamt {
  periodText(iso: string): string;
  bredd: number;
  hojd: number;
}

const TICK = 11;
const ETIKETT = 11;
const tickStil = { fontFamily: "var(--typ-not-familj)", fontSize: TICK, fontVariantNumeric: "tabular-nums" } as const;
const etikettStil = { fontFamily: "var(--typ-not-familj)", fontSize: ETIKETT, fontVariantNumeric: "tabular-nums" } as const;
const halo = { stroke: tema.farg.yta, strokeWidth: 4, strokeLinejoin: "round", paintOrder: "stroke" } as const;

/** Värdeskalan spänner minst så här stor del av regionernas spridning. */
const SPANN_ANDEL = 0.4;
/** Luft ovanför plotytan för etiketter ovanför de översta punkterna. */
const TOPP = 16;
/** Luft under plotytan för åren. */
const BOTTEN = 20;
/** Plotytan slutar så här långt från högerkanten (sista punktens radie). */
const HOGER = 7;

interface Yta { x0: number; x1: number; topp: number; botten: number }

/**
 * Senaste och första punktens etiketter (senaste har företräde), placerade
 * kring linjen inom svg:n ovanför tidsaxeln.
 */
function Andetiketter({ pkt, radier, texter, farger, bredd, ned }: {
  pkt: [number, number][];
  radier: [number, number];
  texter: [string, string];
  farger: [string, string];
  bredd: number;
  ned: number;
}): ReactNode {
  const n = pkt.length;
  const vikt = [600, 700] as const;
  const fragor = [
    { punkt: pkt[n - 1], radie: radier[1], bredd: textbredd(texter[1], vikt[1], ETIKETT), ankare: "end" as const },
    ...(n > 1 ? [{ punkt: pkt[0], radie: radier[0], bredd: textbredd(texter[0], vikt[0], ETIKETT), ankare: "start" as const }] : []),
  ];
  const [sista, forsta] = placeraEtiketter(fragor, pkt, { x0: 0, y0: 0, x1: bredd, y1: ned });
  const ritade = [
    { p: sista, text: texter[1], farg: farger[1], vikt: vikt[1], ankare: "end" as const },
    ...(forsta ? [{ p: forsta, text: texter[0], farg: farger[0], vikt: vikt[0], ankare: "start" as const }] : []),
  ];
  return (
    <g>
      {ritade.map(({ p, text, farg, vikt: v, ankare }) => (
        <g key={ankare}>
          {p.connector && (
            <line x1={p.connector[0]} y1={p.connector[1]} x2={p.connector[2]} y2={p.connector[3]}
              stroke={tema.farg.diagram.axel} strokeWidth={1} />
          )}
          <text x={p.x} y={p.y} textAnchor={ankare} style={{ ...etikettStil, fontWeight: v }} fill={farg} {...halo}>{text}</text>
        </g>
      ))}
    </g>
  );
}

/** Åren under ändarna och plotytans baslinje i axelfärgen. */
function Ar({ yta, fran, till }: { yta: Yta; fran: string; till: string }): ReactNode {
  return (
    <g>
      <line x1={yta.x0} x2={yta.x1} y1={yta.botten} y2={yta.botten} stroke={tema.farg.diagram.axel} strokeWidth={1} />
      <text x={yta.x0} y={yta.botten + 15} textAnchor="start" style={tickStil} fill={tema.farg.diagram.axeltext}>{fran}</text>
      {till !== fran && <text x={yta.x1} y={yta.botten + 15} textAnchor="end" style={tickStil} fill={tema.farg.diagram.axeltext}>{till}</text>}
    </g>
  );
}

/** Vågräta hjälplinjer med värdet till vänster (den nedersta är baslinjen). */
function Skala({ yta, ticks }: { yta: Yta; ticks: { y: number; text: string; stark?: boolean }[] }): ReactNode {
  return (
    <g>
      {ticks.map((t) => (
        <g key={t.text}>
          {Math.abs(t.y - yta.botten) > 0.5 && (
            <line x1={yta.x0} x2={yta.x1} y1={t.y} y2={t.y} stroke={tema.farg.harlinje} strokeWidth={1} />
          )}
          <text x={yta.x0 - 6} y={t.y + 4} textAnchor="end" style={{ ...tickStil, fontWeight: t.stark ? 700 : 400 }}
            fill={t.stark ? tema.farg.plats.topp.text : tema.farg.diagram.axeltext}>{t.text}</text>
        </g>
      ))}
    </g>
  );
}

const xSkala = (n: number, yta: Yta) => (i: number) =>
  n > 1 ? yta.x0 + (i / (n - 1)) * (yta.x1 - yta.x0) : (yta.x0 + yta.x1) / 2;

export function MiniVarde({ serie, spann, format, formatVarde, periodText, bredd, hojd }: Gemensamt & {
  serie: Periodvarde[];
  spann: [number, number] | null;
  format: TalFormat;
  formatVarde(v: number): string;
}): ReactNode {
  if (serie.length === 0) return null;
  const f = tema.diagram.roll.fokus.farg;
  const egna = serie.map((p) => p.varde);
  let lo = Math.min(...egna), hi = Math.max(...egna);
  if (spann) {
    // Minsta spann kring Hallands värden, flyttat inom regionernas spridning
    const minst = SPANN_ANDEL * (spann[1] - spann[0]);
    if (hi - lo < minst) {
      const mitt = (lo + hi) / 2;
      lo = mitt - minst / 2; hi = mitt + minst / 2;
      if (lo < spann[0]) { hi += spann[0] - lo; lo = spann[0]; }
      if (hi > spann[1]) { lo -= hi - spann[1]; hi = spann[1]; }
    }
  }
  const vt = vardeTicks(lo, hi, true, false);
  const t0 = vt.ticks[0], t1 = vt.ticks[vt.ticks.length - 1];
  const texter = vt.ticks.map((v) => tickText(v, format, vt.decimaler));
  const vanster = Math.ceil(Math.max(...texter.map((t) => textbredd(t, 400, TICK)))) + 8;
  const yta: Yta = { x0: vanster, x1: bredd - HOGER, topp: TOPP, botten: hojd - BOTTEN };
  const x = xSkala(serie.length, yta);
  const y = (v: number) => yta.topp + (1 - (v - t0) / (t1 - t0 || 1)) * (yta.botten - yta.topp);
  const pkt = serie.map((p, i) => [x(i), y(p.varde)] as [number, number]);
  const linjen = line().curve(curveMonotoneX)(pkt) ?? "";
  const radie = (i: number) => (i === pkt.length - 1 ? 5 : i === 0 ? 4 : 2.75);
  return (
    <svg width={bredd} height={hojd} viewBox={`0 0 ${bredd} ${hojd}`} aria-hidden="true" style={{ display: "block", overflow: "visible" }}>
      <Skala yta={yta} ticks={vt.ticks.map((v, i) => ({ y: y(v), text: texter[i] }))} />
      <Ar yta={yta} fran={periodText(serie[0].period)} till={periodText(serie[serie.length - 1].period)} />
      <path d={linjen} fill="none" stroke={f} strokeWidth={2.25} strokeLinejoin="round" strokeLinecap="round" />
      {pkt.map(([px, py], i) => (
        <circle key={i} cx={px} cy={py} r={radie(i)} fill={f} stroke={tema.farg.yta} strokeWidth={1.5} />
      ))}
      <Andetiketter pkt={pkt} radier={[radie(0), radie(pkt.length - 1)]} bredd={bredd} ned={yta.botten - 2}
        texter={[formatVarde(serie[0].varde), formatVarde(serie[serie.length - 1].varde)]}
        farger={[tema.farg.black, f]} />
    </svg>
  );
}

/** Platsringarnas radie; den senaste är större. */
const RING = 8;
const RING_SISTA = 10;
/** Toner så ljusa att siffran skrivs i tonens mörka text i stället för vitt. */
const LJUSA_TONER = new Set(["gul", "barnsten"]);

/** Platserna som står utskrivna: 1, 5, 10, 15 … och sista platsen. */
function platsTicks(n: number): number[] {
  const t = [1];
  for (let p = 5; p < n; p += 5) t.push(p);
  if (n > 1) {
    if (n - t[t.length - 1] < 3 && t.length > 1) t.pop();
    t.push(n);
  }
  return t;
}

export function MiniPlats({ platser, periodText, bredd, hojd, riktning }: Gemensamt & {
  platser: Periodplats[];
  riktning: KpiModell["riktning"];
}): ReactNode {
  if (platser.length === 0) return null;
  const n = Math.max(...platser.map((p) => p.av));
  const ticks = platsTicks(n);
  const vanster = Math.ceil(Math.max(...ticks.map((t) => textbredd(String(t), 700, TICK)))) + 8;
  const topp3 = riktning !== "neutral" && n > 3;
  const yta: Yta = { x0: vanster, x1: bredd - 2, topp: TOPP, botten: hojd - BOTTEN };
  // Ringarna står inom plotytan; får de inte plats bredvid varandra har bara
  // första och senaste en siffra, de andra är små punkter
  const avstand = platser.length > 1 ? (yta.x1 - yta.x0 - 2 * RING_SISTA) / (platser.length - 1) : Infinity;
  const allaRingar = avstand >= 2 * RING + 3;
  const x = xSkala(platser.length, { ...yta, x0: yta.x0 + RING_SISTA, x1: yta.x1 - RING_SISTA });
  // Varje plats är ett lika högt band; plats p står mitt i sitt band
  const steg = (yta.botten - yta.topp) / n;
  const y = (p: number) => yta.topp + (p - 0.5) * steg;
  const pkt = platser.map((p, i) => [x(i), y(p.plats)] as [number, number]);
  const linjen = line()(pkt) ?? "";
  const forsta = platser[0], sista = platser[platser.length - 1];
  return (
    <svg width={bredd} height={hojd} viewBox={`0 0 ${bredd} ${hojd}`} aria-hidden="true" style={{ display: "block", overflow: "visible" }}>
      {topp3 && (
        <g>
          <rect x={yta.x0} y={yta.topp} width={yta.x1 - yta.x0} height={3 * steg} fill={tema.farg.plats.topp.yta} />
          <line x1={yta.x0} x2={yta.x1} y1={yta.topp + 3 * steg} y2={yta.topp + 3 * steg} stroke={tema.farg.plats.topp.punkt} strokeWidth={1.25} />
        </g>
      )}
      <Skala yta={yta} ticks={ticks.map((t) => ({ y: y(t), text: String(t), stark: topp3 && t <= 3 }))} />
      <Ar yta={yta} fran={periodText(forsta.period)} till={periodText(sista.period)} />
      <path d={linjen} fill="none" stroke={tema.farg.text2} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
      {pkt.map(([px, py], i) => {
        const sist = i === pkt.length - 1;
        const t = platsTon(platser[i].plats, riktning);
        if (!allaRingar && !sist && i !== 0) {
          return <circle key={i} cx={px} cy={py} r={3} fill={tema.farg.plats[t].punkt} stroke={tema.farg.yta} strokeWidth={1.25} />;
        }
        const r = sist ? RING_SISTA : RING;
        const siffra = String(platser[i].plats);
        return (
          <g key={i}>
            <circle cx={px} cy={py} r={r} fill={tema.farg.plats[t].punkt} stroke={tema.farg.yta} strokeWidth={1.5} />
            <text x={px} y={py + (sist ? 4 : 3.5)} textAnchor="middle"
              style={{ ...tickStil, fontSize: (sist ? 11.5 : 10) - (siffra.length > 1 ? 0.5 : 0), fontWeight: 700 }}
              fill={LJUSA_TONER.has(t) ? tema.farg.plats[t].text : tema.farg.yta}>{siffra}</text>
          </g>
        );
      })}
    </svg>
  );
}
