// charts/karna/Overlagg.tsx: överlägget i tidsdiagram (stilguiden 6.8):
// lodrät hjälplinje vid perioden, lyft kontextlinje med tillfälligt namn och
// punkter för Halland, riket, fästa och lyft serie. Ritas om vid varje
// hovring; de statiska lagren (former.tsx) gör det aldrig. Ägare: WP2.

import { useMemo, type ReactNode } from "react";
import { tema } from "../../design/tema";
import type { AktivPunkt, Scen, Stopp } from "../register";
import type { ChartSpec } from "../spec";
import { StatiskaLager } from "./former";
import { GEOMETRI } from "./geometri";
import { HALO, kopplingD, skarp, textAttr } from "./ritstil";
import { serieFarg } from "./tooltipModell";

/** Ledig plats i etikettkolumnen närmast y0 för ett tillfälligt namn. */
function ledigPlats(scen: Scen, y0: number, avstand: number): number {
  const lo = scen.plot.y, hi = scen.plot.y + scen.plot.h;
  const kandidater = [y0, ...scen.etiketter.flatMap((e) => [e.y - avstand, e.y + avstand])]
    .filter((c) => c >= lo && c <= hi)
    .sort((a, b) => Math.abs(a - y0) - Math.abs(b - y0));
  return kandidater.find((c) => scen.etiketter.every((e) => Math.abs(e.y - c) >= avstand - 0.5)) ?? y0;
}

export function TidsOverlagg({ scen, spec, aktiv }: { scen: Scen; spec: ChartSpec; aktiv: AktivPunkt }): ReactNode {
  const perSerie = useMemo(() => {
    const m = new Map<string, Stopp[]>();
    for (const s of scen.stopp) {
      const l = m.get(s.serieId);
      if (l) l.push(s); else m.set(s.serieId, [s]);
    }
    for (const l of m.values()) l.sort((a, b) => a.index - b.index);
    return m;
  }, [scen]);
  const sistaIndex = useMemo(() => scen.stopp.reduce((m, s) => Math.max(m, s.index), 0), [scen]);
  const xAktiv = scen.stopp.find((s) => s.index === aktiv.index)?.x;
  if (xAktiv === undefined) return null;

  const t = tema;
  const { plot } = scen;
  const delar: ReactNode[] = [];
  const hj = t.diagram.hjalplinje;
  delar.push(
    <line key="hjalplinje" x1={skarp(xAktiv)} x2={skarp(xAktiv)} y1={plot.y} y2={plot.y + plot.h}
      stroke={t.farg.text3} strokeOpacity={hj.opacitet} strokeWidth={hj.bredd} data-hjalplinje="" />,
  );

  const lyft = aktiv.serieId ? spec.serier.find((s) => s.id === aktiv.serieId) : undefined;
  if (lyft?.roll === "kontext") {
    const st = perSerie.get(lyft.id) ?? [];
    let d = "";
    st.forEach((p, i) => {
      d += `${i > 0 && st[i - 1].index === p.index - 1 ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    });
    const ka = t.diagram.roll.kontextAktiv;
    delar.push(<path key="lyft" d={d} fill="none" stroke={ka.farg} strokeWidth={ka.bredd} strokeLinejoin="round" data-lyft={lyft.id} />);
    // Tillfälligt namn när serien saknar etikett i kolumnen (stilguiden 6.4)
    const sista = st[st.length - 1];
    if (sista && !scen.etiketter.some((e) => e.serieId === lyft.id)) {
      const a = textAttr(t.farg.black, t.typ.roll.not.viktStark);
      if (sista.index === sistaIndex) {
        const yl = ledigPlats(scen, sista.y, t.diagram.etikett.minAvstand);
        const e = { ankarX: sista.x + GEOMETRI.koppling.start, ankarY: sista.y, y: yl };
        delar.push(
          <g key="namn" data-tillfalligt-namn={lyft.id}>
            <path d={kopplingD(e)} fill="none" stroke={t.diagram.kopplingslinje.farg} strokeWidth={t.diagram.kopplingslinje.bredd} />
            <text x={sista.x + t.diagram.etikett.kolumnAvstand} y={yl + GEOMETRI.textMitt} {...a} style={HALO}>{lyft.namn}</text>
          </g>,
        );
      } else {
        delar.push(
          <text key="namn" x={sista.x + t.rum[2]} y={sista.y + GEOMETRI.textMitt} {...a} style={HALO} data-tillfalligt-namn={lyft.id}>
            {lyft.namn}
          </text>,
        );
      }
    }
  }

  // Punkter vid perioden för fokus, referens, fästa och lyft serie
  const op = GEOMETRI.overlaggPunkt;
  for (const s of spec.serier) {
    const visas = s.roll === "fokus" || s.roll === "referens" || s.roll === "markerad" || s.id === lyft?.id;
    if (!visas) continue;
    const p = perSerie.get(s.id)?.find((x) => x.index === aktiv.index);
    if (!p) continue;
    delar.push(<circle key={`p-${s.id}`} cx={p.x} cy={p.y} r={op.radie} fill={serieFarg(s)} stroke={t.farg.yta} strokeWidth={op.kant} />);
  }
  return <>{delar}</>;
}

/** Rita för tidsdiagram: memoiserade statiska lager och ett överlägg. */
export function RitaTid({ scen, spec, aktiv }: { scen: Scen; spec: ChartSpec; aktiv: AktivPunkt | null; fasta: string[] }): ReactNode {
  return (
    <>
      <StatiskaLager scen={scen} />
      <g data-lager="overlagg" pointerEvents="none">
        {aktiv && <TidsOverlagg scen={scen} spec={spec} aktiv={aktiv} />}
      </g>
    </>
  );
}
