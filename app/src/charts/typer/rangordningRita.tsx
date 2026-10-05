// charts/typer/rangordningRita.tsx: ritningen av rangordningen (typer/rangordning.tsx
// räknar scenen). Statiska lager memoiserade på scenen; överlägget för den lyfta
// raden ritas vid varje hovring (stilguiden 6.8). Ägare: WP3.

import { memo, useContext, type ReactNode } from "react";
import { varde } from "../../design/format";
import { tema } from "../../design/tema";
import { RitaLager } from "../karna/former";
import { GEOMETRI } from "../karna/geometri";
import { kortaText } from "../karna/matt";
import { HALO, skarp, textAttr } from "../karna/ritstil";
import { RitDelKontext } from "../karna/ritdel";
import { serieFarg } from "../karna/tooltipModell";
import type { AktivPunkt, Scen } from "../register";
import type { ChartSpec, SpecSerie } from "../spec";

/** Punktens radie per roll (stilguiden 6.6): fokus 5,5, övriga och fästa 4,5. */
const radie = (s: SpecSerie) =>
  s.roll === "fokus" ? tema.diagram.rangordning.fokusPunktradie : tema.diagram.rangordning.punktradie;

/** Lodrätt streckat rutnät och tickvärden under plotytan (stilguiden 6.3). Ingen axellinje. */
function Varden({ scen }: { scen: Scen }): ReactNode {
  const { plot } = scen;
  const r = tema.diagram.rutnat;
  const a = textAttr(tema.farg.diagram.axeltext);
  return (
    <>
      <g data-del="rutnat">
        {scen.xTicks.map((tk) => (
          <line key={String(tk.v)} x1={skarp(tk.x)} x2={skarp(tk.x)} y1={plot.y} y2={plot.y + plot.h}
            stroke={tema.farg.diagram.rutnat} strokeWidth={r.bredd} strokeDasharray={r.streck} />
        ))}
      </g>
      <g data-del="xaxel">
        {scen.xTicks.map((tk) => (
          <text key={String(tk.v)} x={tk.x} y={plot.y + plot.h + GEOMETRI.xEtikettBaslinje} textAnchor="middle" {...a}>{tk.text}</text>
        ))}
      </g>
    </>
  );
}

/** De statiska lagren, memoiserade på scenen: ritas aldrig om vid hovring. */
const Statisk = memo(function Statisk({ scen }: { scen: Scen }) {
  return (
    <g data-lager="statisk">
      <Varden scen={scen} />
      <RitaLager lager={scen.lager} />
    </g>
  );
});

/** Överlägget för den lyfta raden: vågrät hjälplinje, punkten med vit kant, namn och värde i 600. */
function Overlagg({ scen, spec, aktiv }: { scen: Scen; spec: ChartSpec; aktiv: AktivPunkt }): ReactNode {
  const st = scen.stopp.find((x) => x.index === aktiv.index);
  const s = st ? spec.serier.find((x) => x.id === st.serieId) : undefined;
  if (!st || !s) return null;
  const t = tema;
  const { plot } = scen;
  const hj = t.diagram.hjalplinje;
  const op = GEOMETRI.overlaggPunkt;
  const y = skarp(st.y);
  const r = radie(s);
  const stark = t.typ.roll.not.viktStark;
  const namnB = plot.x - t.rum[3];
  return (
    <g data-lyft={s.id}>
      <line x1={plot.x} x2={plot.x + plot.b} y1={y} y2={y} stroke={t.farg.text3} strokeOpacity={hj.opacitet}
        strokeWidth={hj.bredd} data-hjalplinje="" />
      <circle cx={st.x} cy={st.y} r={r} fill={serieFarg(s)} stroke={t.farg.yta} strokeWidth={op.kant} />
      {s.roll === "kontext" && (
        <>
          <text x={namnB} y={st.y + GEOMETRI.textMitt} textAnchor="end" {...textAttr(t.farg.black, stark)} style={HALO}>
            {kortaText(s.namn, namnB, stark)}
          </text>
          <text x={st.x + r + t.rum[2]} y={st.y + GEOMETRI.textMitt} {...textAttr(t.farg.black, stark)} style={HALO}>
            {varde(st.varde, spec.x.format)}
          </text>
        </>
      )}
    </g>
  );
}

export function RitaRangordning({ scen, spec, aktiv }: { scen: Scen; spec: ChartSpec; aktiv: AktivPunkt | null; fasta: string[] }): ReactNode {
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
