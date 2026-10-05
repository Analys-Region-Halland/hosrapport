// charts/typer/stapelRita.tsx: ritningen av stapel över tid (typer/stapel.tsx
// räknar scenen). De statiska lagren är linjediagrammets (rutnät, axlar,
// staplar och nollinje inom klippytan), memoiserade på scenen. Överlägget
// mörkar stapeln under pekaren och drar hjälplinjen från plotytans överkant
// ned till stapeln (stilguiden 6.8). Ägare: WP3.

import { useContext, type ReactNode } from "react";
import { tema } from "../../design/tema";
import { StatiskaLager } from "../karna/former";
import { skarp } from "../karna/ritstil";
import { RitDelKontext } from "../karna/ritdel";
import type { AktivPunkt, Scen } from "../register";
import type { ChartSpec } from "../spec";

function Overlagg({ scen, aktiv }: { scen: Scen; aktiv: AktivPunkt }): ReactNode {
  const stapel = scen.lager.find((l) => l.id === "fokus")?.former
    .find((f) => f.typ === "rekt" && f.index === aktiv.index);
  if (!stapel || stapel.typ !== "rekt") return null;
  const t = tema;
  const hj = t.diagram.hjalplinje;
  const x = skarp(stapel.x + stapel.b / 2);
  return (
    <g data-lyft={stapel.serieId}>
      {stapel.y > scen.plot.y + 1 && (
        <line x1={x} x2={x} y1={scen.plot.y} y2={stapel.y} stroke={t.farg.text3} strokeOpacity={hj.opacitet}
          strokeWidth={hj.bredd} data-hjalplinje="" />
      )}
      <rect x={stapel.x} y={stapel.y} width={stapel.b} height={stapel.h} fill={t.farg.black}
        fillOpacity={t.diagram.stapel.morkning} data-morkad={stapel.index} />
    </g>
  );
}

export function RitaStapel({ scen, aktiv }: { scen: Scen; spec: ChartSpec; aktiv: AktivPunkt | null; fasta: string[] }): ReactNode {
  const del = useContext(RitDelKontext);
  return (
    <>
      {del !== "overlagg" && <StatiskaLager scen={scen} />}
      {del !== "statisk" && (
        <g data-lager="overlagg" pointerEvents="none">
          {aktiv && <Overlagg scen={scen} aktiv={aktiv} />}
        </g>
      )}
    </>
  );
}
