// charts/typer/smaMultiplarRita.tsx: ritningen av små multiplar
// (typer/smaMultiplar.tsx räknar scenen). Statiska lager memoiserade på
// scenen: rutnät, axlar, rubrikernas värde och statusmarkör, linjerna och
// panelnamnen. Panelnamnet har en pekaryta (data-panelnamn) som Diagram.tsx
// använder för nedborrning; hand och understrykning sätts i Diagram.module.css
// när figuren kan borra ned. Överlägget ritar hjälplinjen och punkterna vid
// perioden i alla paneler samtidigt (stilguiden 6.8). Ägare: WP3.

import { memo, useContext, type ReactNode } from "react";
import { tema } from "../../design/tema";
import { RitaLager } from "../karna/former";
import { GEOMETRI } from "../karna/geometri";
import { skarp, textAttr } from "../karna/ritstil";
import { RitDelKontext } from "../karna/ritdel";
import { serieFarg } from "../karna/tooltipModell";
import type { AktivPunkt, Scen } from "../register";
import type { ChartSpec } from "../spec";

/** Panelnamnen: typ.roll.granssnitt 600 med en pekaryta över hela namnraden. */
function Panelnamn({ scen }: { scen: Scen }): ReactNode {
  const g = tema.typ.roll.granssnitt;
  const a = textAttr(tema.farg.black, g.viktStark, g.storlek);
  return (
    <g data-del="panelnamn">
      {(scen.paneler ?? []).map((p) => (
        <g key={p.serieId} data-panelnamn={p.serieId}>
          <rect x={p.namn.x} y={p.namn.y} width={Math.max(p.namn.b, tema.komponent.klickyta)} height={p.namn.h} fill="transparent" />
          <text x={p.namn.x} y={p.namn.y + p.namn.h / 2 + g.storlek * 0.35} {...a}>{p.namn.text}</text>
        </g>
      ))}
    </g>
  );
}

const Statisk = memo(function Statisk({ scen }: { scen: Scen }) {
  return (
    <g data-lager="statisk">
      <RitaLager lager={scen.lager} />
      <Panelnamn scen={scen} />
    </g>
  );
});

/** Synkroniserad hjälplinje och punkter för enheten och referensen i varje panel. */
function Overlagg({ scen, spec, aktiv }: { scen: Scen; spec: ChartSpec; aktiv: AktivPunkt }): ReactNode {
  const t = tema;
  const hj = t.diagram.hjalplinje;
  const op = GEOMETRI.overlaggPunkt;
  const farg = new Map(spec.serier.map((s) => [s.id, serieFarg(s)]));
  const paneler = scen.paneler ?? [];
  // Periodens x räknat från plotytans vänsterkant är samma i alla paneler
  let dx: number | undefined;
  for (const q of paneler) {
    const s = q.stopp.find((x) => x.index === aktiv.index);
    if (s) { dx = s.x - q.plot.x; break; }
  }
  if (dx === undefined) return null;
  return (
    <>
      {paneler.map((p) => {
        const vid = p.stopp.filter((s) => s.index === aktiv.index);
        const xa = p.plot.x + (dx as number);
        return (
          <g key={p.serieId} data-panel={p.serieId} data-aktiv-panel={p.serieId === aktiv.serieId ? "" : undefined}>
            <line x1={skarp(xa)} x2={skarp(xa)} y1={p.plot.y} y2={p.plot.y + p.plot.h} stroke={t.farg.text3}
              strokeOpacity={hj.opacitet} strokeWidth={hj.bredd} data-hjalplinje="" />
            {vid.map((s) => (
              <circle key={s.serieId} cx={s.x} cy={s.y} r={op.radie} fill={farg.get(s.serieId) ?? t.farg.text3}
                stroke={t.farg.yta} strokeWidth={op.kant} />
            ))}
          </g>
        );
      })}
    </>
  );
}

export function RitaSmaMultiplar({ scen, spec, aktiv }: { scen: Scen; spec: ChartSpec; aktiv: AktivPunkt | null; fasta: string[] }): ReactNode {
  const del = useContext(RitDelKontext);
  return (
    <>
      {del !== "overlagg" && <Statisk scen={scen} />}
      {del !== "statisk" && (
        <g data-lager="overlagg" pointerEvents="none">
          {aktiv && <Overlagg scen={scen} spec={spec} aktiv={aktiv} />}
        </g>
      )}
    </>
  );
}
