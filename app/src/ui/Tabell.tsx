// ui/Tabell.tsx: tabell enligt stilguiden 5.9 (allmän tabell och figurens tabellvy).
// Ägare: WP4.
//
// - Riktig <table> med <caption>; `captionDold` döljer den visuellt men inte för
//   skärmläsare (i figuren står titeln redan ovanför).
// - En kolumn räknas som tal när alla celler är tal eller saknade värden
//   (null, "–", ".."). Talkolumner högerställs med tabulära siffror och samma
//   antal decimaler i hela kolumnen: `format.decimaler` om kolumnen har
//   decimaltal, annars 0.
// - Första kolumnen blir radrubriker (<th scope="row">) när den är text.
// - `fokusRad` (fokusenhetens rad) sätts i 600.
// - Saknade värden skrivs "–"; ".." lämnas som det står (stilguiden 3.2).
// Celler får även vara React-noder (t.ex. länkar eller statusmarkörer).

import type { ReactNode } from "react";
import type { TalFormat } from "../data/modell";
import { SAKNAS, UNDERTRYCKT, tal } from "../design/format";
import s from "./Tabell.module.css";

export type Cell = string | number | null | ReactNode;

export interface TabellProps {
  caption: string;
  kolumner: string[];
  rader: Cell[][];
  fokusRad?: number;
  format?: Pick<TalFormat, "decimaler">;
  captionDold?: boolean;
  radrubriker?: boolean;    // första kolumnen som radrubriker (förval: ja när den är text)
}

const arSaknad = (v: Cell) => v === null || v === undefined || v === "" || v === SAKNAS || v === UNDERTRYCKT;

/** Kolumnens talformat: null om kolumnen inte är en talkolumn, annars antal decimaler. */
function kolumnDecimaler(rader: Cell[][], j: number, format?: Pick<TalFormat, "decimaler">): number | null {
  let tal = 0;
  let decimal = false;
  let flest = 0;
  for (const rad of rader) {
    const v = rad[j];
    if (typeof v === "number" && Number.isFinite(v)) {
      tal++;
      if (!Number.isInteger(v)) {
        decimal = true;
        const d = String(v).split(".")[1]?.length ?? 0;
        flest = Math.max(flest, Math.min(d, 3));
      }
    } else if (!arSaknad(v)) {
      return null;
    }
  }
  if (tal === 0) return null;
  return decimal ? (format?.decimaler ?? flest) : 0;
}

function cellText(v: Cell, decimaler: number | null): ReactNode {
  if (v === null || v === undefined || v === "") return SAKNAS;
  if (typeof v === "number") return Number.isFinite(v) ? tal(v, decimaler ?? 0) : SAKNAS;
  return v;
}

export default function Tabell({
  caption, kolumner, rader, fokusRad, format, captionDold = false, radrubriker,
}: TabellProps) {
  const decimaler = kolumner.map((_, j) => kolumnDecimaler(rader, j, format));
  const medRubriker = radrubriker ?? (kolumner.length > 1 && decimaler[0] === null);
  return (
    <table className={s.tabell} data-tabell="">
      <caption className={captionDold ? `${s.caption} ${s.dold}` : s.caption}>{caption}</caption>
      <thead>
        <tr>
          {kolumner.map((k, j) => (
            <th key={j} scope="col" className={decimaler[j] !== null ? s.tal : undefined}>{k}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rader.map((rad, i) => (
          <tr key={i} className={i === fokusRad ? s.fokus : undefined} data-fokus={i === fokusRad ? "" : undefined}>
            {rad.map((v, j) => {
              const klass = decimaler[j] !== null ? s.tal : undefined;
              const innehall = cellText(v, decimaler[j]);
              return j === 0 && medRubriker
                ? <th key={j} scope="row" className={klass}>{innehall}</th>
                : <td key={j} className={klass}>{innehall}</td>;
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
