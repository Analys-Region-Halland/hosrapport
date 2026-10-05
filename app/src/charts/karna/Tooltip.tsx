// charts/karna/Tooltip.tsx: tooltipen inne i figuren (stilguiden 6.8).
// Står i plotytans överkant på fast höjd, till höger om hjälplinjen, och byter
// sida först när hjälplinjen passerat plotytans mitt. Placeringen sätts direkt
// på elementet före målning (useLayoutEffect), så att den aldrig ritas på fel
// ställe. Uppläsningen sker i Diagram.tsx via aria-live; själva rutan är
// aria-hidden. Ägare: WP2.
//
// Tillägg i WP3:
//   - Ytan kan vara en panels plotyta (små multiplar) i stället för plotytan.
//   - Rangordningen anger radens y: tooltipen står då vid raden, centrerad i
//     höjdled och på andra sidan av plotytans mitt än punkten, så att den
//     aldrig täcker raden man läser eller grannarna med liknande värde.
//   - Under tema.diagram.tooltip.helBreddUnder (560 px) står tooltipen under
//     plotytan i full bredd i stället för ovanpå grafen (stilguiden 6.8,
//     tooltip på mobil). Den läggs ovanpå det som står under diagrammet och
//     flyttar därför inget.

import { useLayoutEffect, useRef } from "react";
import { GEOMETRI } from "./geometri";
import type { TooltipLage } from "./interaktion";
import s from "./Tooltip.module.css";

interface Props {
  lage: TooltipLage;
  bredd: number;            // diagrammets bredd
  helBredd: boolean;        // smalt diagram: under plotytan i full bredd
}

const PRICK = GEOMETRI.overlaggPunkt.radie * 2;

export function Tooltip({ lage, bredd, helBredd }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { modell } = lage;
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (helBredd) {
      el.style.left = "0px";
      el.style.width = `${Math.round(bredd)}px`;
      el.style.top = `${Math.round(lage.under + GEOMETRI.tooltipUnder)}px`;
      return;
    }
    el.style.width = "";
    const { x, y, yta } = lage;
    const b = el.offsetWidth;
    const mitt = yta.x + yta.b / 2;
    const avstand = GEOMETRI.tooltipAvstand;
    let left: number;
    let top: number;
    if (y === undefined) {
      left = x <= mitt ? x + avstand : x - avstand - b;
      top = yta.y;
    } else {
      // Centrerad på raden, inom plotytan; är tooltipen högre än plotytan
      // (få rader) får den gå ned över axeln men aldrig under diagrammet.
      const h = el.offsetHeight;
      left = x > mitt ? yta.x : yta.x + yta.b - b;
      const hogst = Math.max(0, Math.min(yta.y + yta.h, lage.under) - h);
      const lagst = Math.max(0, Math.min(yta.y, lage.under - h));
      top = Math.max(lagst, Math.min(Math.max(hogst, lagst), y - h / 2));
    }
    left = Math.max(0, Math.min(bredd - b, left));
    el.style.left = `${Math.round(left)}px`;
    el.style.top = `${Math.round(top)}px`;
  });
  return (
    <div ref={ref} className={helBredd ? `${s.tooltip} ${s.helBredd}` : s.tooltip} data-tooltip="" data-hel-bredd={helBredd ? "" : undefined} aria-hidden="true">
      <div className={s.rubrik}>
        {modell.rubrik}
        {modell.nyMetod && <span className={s.tillagg}> · ny metod</span>}
      </div>
      {modell.rader.length > 0 && (
        <table className={s.tabell}>
          <tbody>
            {modell.rader.map((r, i) => (
              <tr key={r.serieId ?? `rad-${i}`} className={r.fet ? s.fet : undefined}>
                <td className={s.namn}>
                  {r.farg ? (
                    <svg className={s.prick} width={PRICK} height={PRICK} aria-hidden="true">
                      <circle cx={PRICK / 2} cy={PRICK / 2} r={PRICK / 2} fill={r.farg} />
                    </svg>
                  ) : (
                    <span className={s.ingenPrick} style={{ width: PRICK }} />
                  )}
                  {r.namn}
                </td>
                <td className={s.varde}>{r.varde}</td>
                {modell.rader.some((x) => x.plats) && <td className={s.plats}>{r.plats ?? ""}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {modell.noter.map((n) => <div key={n} className={s.not}>{n}</div>)}
      {modell.uppmaning && <div className={s.not}>{modell.uppmaning}</div>}
    </div>
  );
}
