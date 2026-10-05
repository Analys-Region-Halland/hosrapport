// charts/typer/minidiagramRita.tsx: ritningen av minidiagrammet. Fristående
// (i en tabellcell, utan RitDelKontext) blir det en egen <svg> med role="img"
// och textsammanfattningen; inne i Diagram.tsx, som redan har en svg med
// role="img", ritas bara linjen. Minidiagrammet har inget överlägg. Ägare: WP3.

import { useContext, type ReactNode } from "react";
import { RitaLager } from "../karna/former";
import { RitDelKontext } from "../karna/ritdel";
import type { AktivPunkt, Scen } from "../register";
import type { ChartSpec } from "../spec";

export function RitaMinidiagram({ scen, spec }: { scen: Scen; spec: ChartSpec; aktiv: AktivPunkt | null; fasta: string[] }): ReactNode {
  const del = useContext(RitDelKontext);
  if (del === "overlagg") return null;
  const innehall = <g data-lager="statisk"><RitaLager lager={scen.lager} /></g>;
  if (del === "statisk") return innehall;
  return (
    <svg width={scen.bredd} height={scen.hojd} viewBox={`0 0 ${scen.bredd} ${scen.hojd}`} role="img"
      aria-label={spec.sammanfattning} data-minidiagram={spec.id} style={{ display: "block", overflow: "visible" }}>
      {innehall}
    </svg>
  );
}
