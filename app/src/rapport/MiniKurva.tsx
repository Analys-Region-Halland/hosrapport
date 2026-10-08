// rapport/MiniKurva.tsx: de små graferna i hovringskortet i Läget i korthet
// (2026-10-08, andra versionen). Avskalade varianter av rapportens grafer:
// inga axlar och inget rutnät, bara det som behövs för att läsa utvecklingen.
//
//   MiniVarde   Hallands värde över tid: lätt utjämnad linje med en svag yta
//               under, en punkt per år och åren under ändarna.
//   MiniPlats   Platsen över tid, plats 1 överst: ett grönt band för topp 3,
//               en linje med en punkt per år i placeringens ton (samma skala som
//               platsbrickan).
// Första och senaste värdet skrivs i kortet ovanför graferna (RadKort), inte i
// graferna, så att inget krockar med linjen.

import { curveMonotoneX, area, line } from "d3";
import { useId, type ReactNode } from "react";
import type { KpiModell } from "../data/modell";
import { tema } from "../design/tema";
import { platsTon, type Periodplats, type Periodvarde } from "./radUtveckling";

interface Gemensamt {
  format(v: number): string;
  periodText(iso: string): string;
  bredd: number;
  hojd: number;
}

const TEXT = 12;
const textStil = { fontFamily: "var(--typ-not-familj)", fontSize: TEXT, fontVariantNumeric: "tabular-nums" } as const;

/** Åren under ändarna och en tunn baslinje. */
function Ar({ x0, x1, y, fran, till }: { x0: number; x1: number; y: number; fran: string; till: string }) {
  return (
    <g>
      <line x1={x0} x2={x1} y1={y} y2={y} stroke={tema.farg.harlinje} strokeWidth={1} />
      <text x={x0} y={y + 15} textAnchor="start" style={textStil} fill={tema.farg.text2}>{fran}</text>
      {till !== fran && <text x={x1} y={y + 15} textAnchor="end" style={textStil} fill={tema.farg.text2}>{till}</text>}
    </g>
  );
}

export function MiniVarde({ serie, periodText, bredd, hojd }: Gemensamt & { serie: Periodvarde[] }): ReactNode {
  const id = useId().replace(/:/g, "");
  if (serie.length === 0) return null;
  const f = tema.diagram.roll.fokus.farg;
  const vanster = 8, hoger = 8, topp = 22, botten = 22;
  const b = bredd - vanster - hoger, h = hojd - topp - botten;
  let lo = Math.min(...serie.map((p) => p.varde)), hi = Math.max(...serie.map((p) => p.varde));
  if (lo === hi) { lo -= 1; hi += 1; }
  const x = (i: number) => vanster + (serie.length > 1 ? (i / (serie.length - 1)) * b : b / 2);
  const y = (v: number) => topp + (1 - (v - lo) / (hi - lo)) * h;
  const pkt = serie.map((p, i) => [x(i), y(p.varde)] as [number, number]);
  const linjen = line().curve(curveMonotoneX)(pkt) ?? "";
  const ytan = area().curve(curveMonotoneX).y0(topp + h + 6)(pkt) ?? "";
  const forsta = serie[0], sista = serie[serie.length - 1];
  return (
    <svg width={bredd} height={hojd} viewBox={`0 0 ${bredd} ${hojd}`} aria-hidden="true" style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id={`yta-${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={f} stopOpacity={0.16} />
          <stop offset="1" stopColor={f} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={ytan} fill={`url(#yta-${id})`} />
      <path d={linjen} fill="none" stroke={f} strokeWidth={2.25} strokeLinejoin="round" />
      {pkt.map(([px, py], i) => (
        <circle key={i} cx={px} cy={py} r={i === pkt.length - 1 ? 4.5 : 2.75} fill={f} stroke={tema.farg.yta} strokeWidth={1.5} />
      ))}
      <Ar x0={vanster} x1={vanster + b} y={topp + h + 7} fran={periodText(forsta.period)} till={periodText(sista.period)} />
    </svg>
  );
}

export function MiniPlats({ platser, periodText, bredd, hojd, riktning }: Omit<Gemensamt, "format"> & { platser: Periodplats[]; riktning: KpiModell["riktning"] }): ReactNode {
  if (platser.length === 0) return null;
  const vanster = 8, hoger = 8, topp = 22, botten = 22;
  const b = bredd - vanster - hoger, h = hojd - topp - botten;
  const n = Math.max(...platser.map((p) => p.av));
  const x = (i: number) => vanster + (platser.length > 1 ? (i / (platser.length - 1)) * b : b / 2);
  const y = (p: number) => topp + ((p - 1) / Math.max(1, n - 1)) * h;
  const pkt = platser.map((p, i) => [x(i), y(p.plats)] as [number, number]);
  const linjen = line().curve(curveMonotoneX)(pkt) ?? "";
  const ton = (p: number) => tema.farg.plats[platsTon(p, riktning)];
  const forsta = platser[0], sista = platser[platser.length - 1];
  const topp3 = riktning !== "neutral" && n > 3;
  return (
    <svg width={bredd} height={hojd} viewBox={`0 0 ${bredd} ${hojd}`} aria-hidden="true" style={{ display: "block", overflow: "visible" }}>
      {topp3 && (
        <g>
          <rect x={vanster - 4} y={topp - 6} width={b + 8} height={y(3) - topp + 12} rx={5} fill={tema.farg.plats.topp.yta} />
          <text x={vanster + b} y={topp - 10} textAnchor="end" style={{ ...textStil, fontSize: 11, fontWeight: 600 }} fill={tema.farg.plats.topp.text}>topp 3</text>
        </g>
      )}
      <path d={linjen} fill="none" stroke={tema.farg.text3} strokeWidth={1.75} strokeLinejoin="round" />
      {pkt.map(([px, py], i) => (
        <circle key={i} cx={px} cy={py} r={i === pkt.length - 1 ? 5 : 3.25} fill={ton(platser[i].plats).punkt} stroke={tema.farg.yta} strokeWidth={1.5} />
      ))}
      <Ar x0={vanster} x1={vanster + b} y={topp + h + 7} fran={periodText(forsta.period)} till={periodText(sista.period)} />
    </svg>
  );
}
