// ui/Tabell.tsx: tabell enligt stilguiden 5.9 (allmän tabell och figurens tabellvy).
// Ägare: WP4.
//
// - Riktig <table> med <caption>; `captionDold` döljer den visuellt men inte för
//   skärmläsare (i figuren står titeln redan ovanför).
// - Talkolumner (bara tal, heltal skrivna som text, t.ex. plats "7", eller
//   saknade värden) högerställs med tabulära siffror.
// - Decimaler: med `format` (figurens y.format) får alla tal format.decimaler,
//   som WP1:s spec.tabell förutsätter. Utan format får varje kolumn lika många
//   decimaler som dess mest exakta tal (högst tre); heltalskolumner inga.
// - Radrubriker (<th scope="row">): första kolumnen som inte är en talkolumn,
//   t.ex. Region i rangordningens Plats · Region · Värde.
// - `fokusRad` (fokusenhetens rad) sätts i 600.
// - null skrivs "–" (saknas); ".." står kvar (undertryckt), stilguiden 3.2.
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
  radrubrik?: number | null;   // kolumnen med radrubriker; null = inga (förval: första textkolumnen)
}

const arSaknad = (v: Cell) => v === null || v === undefined || v === "" || v === SAKNAS || v === UNDERTRYCKT;
const HELTAL_SOM_TEXT = /^[−-]?\d+$/;

/** null om kolumnen inte är en talkolumn, annars antal decimaler för dess tal. */
function kolumnDecimaler(rader: Cell[][], j: number, format?: Pick<TalFormat, "decimaler">): number | null {
  let antal = 0;
  let flest = 0;
  for (const rad of rader) {
    const v = rad[j];
    if (typeof v === "number" && Number.isFinite(v)) {
      antal++;
      if (!Number.isInteger(v)) flest = Math.max(flest, Math.min(String(v).split(".")[1]?.length ?? 0, 3));
    } else if (typeof v === "string" && HELTAL_SOM_TEXT.test(v)) {
      antal++;
    } else if (!arSaknad(v)) {
      return null;
    }
  }
  if (antal === 0) return null;
  return format?.decimaler ?? flest;
}

function cellText(v: Cell, decimaler: number | null): ReactNode {
  if (v === null || v === undefined || v === "") return SAKNAS;
  if (typeof v === "number") return Number.isFinite(v) ? tal(v, decimaler ?? 0) : SAKNAS;
  return v;
}

export default function Tabell({
  caption, kolumner, rader, fokusRad, format, captionDold = false, radrubrik,
}: TabellProps) {
  const decimaler = kolumner.map((_, j) => kolumnDecimaler(rader, j, format));
  const rubrikKolumn = radrubrik !== undefined ? radrubrik : (() => {
    const j = decimaler.findIndex((d) => d === null);
    return kolumner.length > 1 && j >= 0 ? j : null;
  })();
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
              return j === rubrikKolumn
                ? <th key={j} scope="row" className={klass}>{innehall}</th>
                : <td key={j} className={klass}>{innehall}</td>;
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
