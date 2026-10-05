// charts/karna/stubb.tsx: platshållarrenderare så att Figur och Diagram går att
// rendera innan graftyperna finns (WP4 kan börja mot den). Ritar en tom platta
// med texten "{typ}: byggs i {paket}". Ägare: WP2; tas bort när WP3 har
// ersatt alla typer i typer/*.tsx.
//
// Rita returnerar en egen <svg>: den fungerar både inne i Diagram.tsx yttre
// svg (en inbäddad svg är giltig) och fristående, som när galleriet ritar
// minidiagrammet direkt i en tabellcell.

import { standardHojd, tema as standardTema } from "../../design/tema";
import type { DiagramTyp } from "../spec";
import type { Renderare, Scen } from "../register";

export function stubbRenderare(typ: DiagramTyp, paket: string): Renderare {
  return {
    typ,
    minstaBredd: 0,
    hojd: (bredd) => standardHojd(bredd),
    layout: (_spec, { bredd, hojd }): Scen => ({
      bredd, hojd,
      plot: { x: 0, y: 0, b: bredd, h: hojd },
      xTicks: [], yTicks: [], lager: [], etiketter: [], stopp: [],
    }),
    Rita: ({ scen }) => {
      const t = standardTema;
      return (
        <svg width={scen.bredd} height={scen.hojd} role="img" aria-label={`${typ}: byggs i ${paket}`} data-stubb={typ}>
          <rect x={0.5} y={0.5} width={scen.bredd - 1} height={scen.hojd - 1}
            fill={t.farg.yta} stroke={t.farg.harlinje} />
          <text x={t.rum[4]} y={t.rum[4] + t.typ.roll.not.storlek} fill={t.farg.text3}
            fontFamily={t.typ.familj.sans} fontSize={t.typ.roll.not.storlek}>
            {`${typ}: byggs i ${paket}`}
          </text>
        </svg>
      );
    },
  };
}
