// charts/karna/Tooltip.tsx: tooltipen i plotytans överkant (stilguiden 6.8).
// Står på fast höjd, till höger om hjälplinjen, och byter sida först när
// hjälplinjen passerat plotytans mitt. Placeringen sätts direkt på elementet
// före målning (useLayoutEffect), så att den aldrig ritas på fel ställe.
// Uppläsningen sker i Diagram.tsx via aria-live; själva rutan är aria-hidden.
// Ägare: WP2.

import { useLayoutEffect, useRef } from "react";
import { GEOMETRI } from "./geometri";
import type { TooltipModell } from "./tooltipModell";
import s from "./Tooltip.module.css";

interface Props {
  modell: TooltipModell;
  x: number;                                              // hjälplinjens x
  plot: { x: number; y: number; b: number; h: number };
  bredd: number;                                          // diagrammets bredd
}

const PRICK = GEOMETRI.overlaggPunkt.radie * 2;

export function Tooltip({ modell, x, plot, bredd }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const b = el.offsetWidth;
    const mitt = plot.x + plot.b / 2;
    const avstand = GEOMETRI.tooltipAvstand;
    let left = x <= mitt ? x + avstand : x - avstand - b;
    left = Math.max(0, Math.min(bredd - b, left));
    el.style.left = `${Math.round(left)}px`;
    el.style.top = `${Math.round(plot.y)}px`;
  });
  return (
    <div ref={ref} className={s.tooltip} data-tooltip="" aria-hidden="true">
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
