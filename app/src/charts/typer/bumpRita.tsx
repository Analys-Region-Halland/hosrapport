// charts/typer/bumpRita.tsx: ritningen av bumpdiagrammet (typer/bump.tsx):
// svaga band varannan plats, platserna till vänster, tidsaxeln, de statiska
// lagren och etiketterna, och linjediagrammets överlägg vid hovring.

import { memo, useContext, type ReactNode } from "react";
import { tema } from "../../design/tema";
import { Etikettkolumn, RitaLager, XAxel } from "../karna/former";
import { GEOMETRI } from "../karna/geometri";
import { TidsOverlagg } from "../karna/Overlagg";
import { RitDelKontext } from "../karna/ritdel";
import { textAttr } from "../karna/ritstil";
import type { AktivPunkt, Scen } from "../register";
import type { ChartSpec } from "../spec";

/** Platserna till vänster, i axelfärgen; plats 1–3 gröna och feta när topp 3 är markerat. */
function Platser({ scen }: { scen: Scen }): ReactNode {
  const a = textAttr(tema.farg.diagram.axeltext);
  const topp = textAttr(tema.farg.plats.topp.text, 700);
  const harTopp3 = scen.lager.some((l) => l.id === "zon" && l.former.length > 0);
  return (
    <g data-del="yaxel">
      {scen.yTicks.map((tk) => (
        <text key={tk.v} x={scen.plot.x - GEOMETRI.yEtikettLuft} y={tk.y + GEOMETRI.textMitt} textAnchor="end"
          {...(harTopp3 && tk.v <= 3 ? topp : a)}>{tk.text}</text>
      ))}
    </g>
  );
}

const StatiskaBump = memo(function StatiskaBump({ scen }: { scen: Scen }): ReactNode {
  // Topp 3-fältet (zon) ritas först, under platssiffrorna och linjerna
  const zon = scen.lager.filter((l) => l.id === "zon");
  const axel = scen.lager.filter((l) => l.id === "axel");
  const ovriga = scen.lager.filter((l) => l.id !== "axel" && l.id !== "zon");
  return (
    <g data-lager="statisk">
      <RitaLager lager={zon} />
      <Platser scen={scen} />
      <XAxel scen={scen} />
      <RitaLager lager={axel} />
      <RitaLager lager={ovriga} />
      <Etikettkolumn etiketter={scen.etiketter} />
    </g>
  );
});

export function RitaBump({ scen, spec, aktiv }: { scen: Scen; spec: ChartSpec; aktiv: AktivPunkt | null; fasta: string[] }): ReactNode {
  const del = useContext(RitDelKontext);
  return (
    <>
      {del !== "overlagg" && <StatiskaBump scen={scen} />}
      {del !== "statisk" && (
        <g data-lager="overlagg" pointerEvents="none">
          {aktiv && <TidsOverlagg scen={scen} spec={spec} aktiv={aktiv} />}
        </g>
      )}
    </>
  );
}

