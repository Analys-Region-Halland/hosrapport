// charts/karna/former.tsx: statiska SVG-delar som alla tidsdiagram delar:
// ritformer, lager i ritordning, rutnät, axlar, etikettkolumn, klipp och de
// samlade statiska lagren (stilguiden 6.3–6.4). Allt ritas ur en färdig Scen;
// inga beräkningar här. Ägare: WP2.

import { memo, useId, type ReactNode } from "react";
import { tema } from "../../design/tema";
import type { Etikett, Form, Lager, Scen } from "../register";
import { GEOMETRI } from "./geometri";
import { HALO, kopplingD, LAGERORDNING, markorD, rensaId, skarp, textAttr } from "./ritstil";

/** En ritform som SVG-element. */
export function RitaForm({ f }: { f: Form }): ReactNode {
  switch (f.typ) {
    case "linje":
      return (
        <path d={f.d} fill="none" stroke={f.farg} strokeWidth={f.bredd}
          strokeDasharray={f.streck ?? undefined} strokeLinejoin="round" data-serie={f.serieId} />
      );
    case "yta":
      return <path d={f.d} fill={f.farg} stroke="none" data-serie={f.serieId} />;
    case "punkt":
      if (!f.kant && !f.puls) return <circle cx={f.x} cy={f.y} r={f.r} fill={f.farg} data-serie={f.serieId} />;
      return (
        <g data-serie={f.serieId}>
          {/* Pulsringen syns bara med animationen (Diagram.module.css); i export är den osynlig */}
          {f.puls && <circle cx={f.x} cy={f.y} r={f.r} fill="none" stroke={f.farg} strokeWidth={1.5} opacity={0} data-puls="" />}
          <circle cx={f.x} cy={f.y} r={f.r} fill={f.farg}
            stroke={f.kant ? tema.farg.yta : undefined} strokeWidth={f.kant || undefined} />
        </g>
      );
    case "markor":
      return <path d={markorD(f.form, f.x, f.y, f.storlek)} fill={f.farg} data-serie={f.serieId} data-markor={f.form} />;
    case "streck":
      return (
        <line x1={f.x1} y1={f.y1} x2={f.x2} y2={f.y2} stroke={f.farg} strokeWidth={f.bredd}
          strokeDasharray={f.streck ?? undefined} />
      );
    case "text": {
      const a = textAttr(f.farg, f.vikt, f.storlek);
      return (
        <text x={f.x} y={f.y} textAnchor={f.ankare} {...a} style={f.halo ? HALO : a.style}>
          {f.text}
        </text>
      );
    }
    case "rekt":
      return (
        <rect x={f.x} y={f.y} width={f.b} height={f.h} rx={f.radie} fill={f.farg}
          data-serie={f.serieId} data-index={f.index} />
      );
  }
}

/** Lagren i ritordning. */
export function RitaLager({ lager }: { lager: Lager[] }): ReactNode {
  const perId = new Map(lager.map((l) => [l.id, l]));
  return LAGERORDNING.map((id) => {
    const l = perId.get(id);
    if (!l || l.former.length === 0) return null;
    return (
      <g key={id} data-lager-id={id}>
        {l.former.map((f, i) => <RitaForm key={i} f={f} />)}
      </g>
    );
  });
}

/** Klippyta runt plotytan, med lite luft så att slutpunkter inte skärs av. */
export function Klipp({ id, scen }: { id: string; scen: Scen }): ReactNode {
  const m = GEOMETRI.klippMarginal;
  const { plot } = scen;
  return (
    <clipPath id={id}>
      <rect x={plot.x - m} y={plot.y - m} width={plot.b + 2 * m} height={plot.h + 2 * m} />
    </clipPath>
  );
}

/** Streckat vågrätt rutnät på värdeaxelns ticks (stilguiden 6.3). */
export function Rutnat({ scen }: { scen: Scen }): ReactNode {
  const r = tema.diagram.rutnat;
  const { plot } = scen;
  return (
    <g data-del="rutnat">
      {scen.yTicks.map((t) => (
        <line key={t.v} x1={plot.x} x2={plot.x + plot.b} y1={t.y} y2={t.y}
          stroke={tema.farg.diagram.rutnat} strokeWidth={r.bredd} strokeDasharray={r.streck} />
      ))}
    </g>
  );
}

/** Tickvärden vänster om plotytan, högerställda. Ingen axellinje, ingen titel. */
export function YAxel({ scen }: { scen: Scen }): ReactNode {
  const a = textAttr(tema.farg.diagram.axeltext);
  return (
    <g data-del="yaxel">
      {scen.yTicks.map((t) => (
        <text key={t.v} x={scen.plot.x - GEOMETRI.yEtikettLuft} y={t.y + GEOMETRI.textMitt} textAnchor="end" {...a}>
          {t.text}
        </text>
      ))}
    </g>
  );
}

/** Tidsaxel: baslinje 1 px med 5 px streck nedåt vid etiketterna, i axelfärgen (hög kontrast). */
export function XAxel({ scen }: { scen: Scen }): ReactNode {
  const { plot } = scen;
  const y = skarp(plot.y + plot.h);
  const farg = tema.farg.diagram.axel;
  const a = textAttr(tema.farg.diagram.axeltext);
  const x = tema.diagram.xAxel;
  return (
    <g data-del="xaxel">
      <line x1={plot.x} x2={plot.x + plot.b} y1={y} y2={y} stroke={farg} strokeWidth={x.baslinje} />
      {scen.xTicks.map((t) => (
        <g key={String(t.v)}>
          <line x1={skarp(t.x)} x2={skarp(t.x)} y1={y} y2={y + x.streckLangd} stroke={farg} strokeWidth={x.baslinje} />
          <text x={t.x} y={plot.y + plot.h + GEOMETRI.xEtikettBaslinje} textAnchor="middle" {...a}>{t.text}</text>
        </g>
      ))}
    </g>
  );
}

/** Etikettens text på en eller två rader, centrerad på e.y. */
export function EtikettText({ e, farg = e.farg, vikt = e.vikt, halo = false }: { e: Etikett; farg?: string; vikt?: number; halo?: boolean }): ReactNode {
  const rad = tema.diagram.etikett.minAvstand;
  const a = textAttr(farg, vikt);
  const y0 = e.y - ((e.rader.length - 1) * rad) / 2 + GEOMETRI.textMitt;
  return (
    <text x={e.x} y={y0} {...a} style={halo ? HALO : a.style}>
      {e.rader.length === 1 ? e.rader[0] : e.rader.map((r, i) => <tspan key={i} x={e.x} y={y0 + i * rad}>{r}</tspan>)}
    </text>
  );
}

/** Etikettkolumnen: kopplingslinje och namn i seriens färg. */
export function Etikettkolumn({ etiketter }: { etiketter: Etikett[] }): ReactNode {
  const k = tema.diagram.kopplingslinje;
  const rad = tema.diagram.etikett.minAvstand;
  const g = GEOMETRI.koppling;
  return (
    <g data-del="etiketter">
      {etiketter.map((e) => (
        <g key={e.serieId} data-etikett={e.serieId} style={e.interaktiv ? { cursor: "pointer" } : undefined}>
          {/* Pekaryta: hela etikettraden, inte bara glyferna */}
          <rect x={e.x - (g.slut - g.knack)} y={e.y - (rad * e.rader.length) / 2} width={e.textbredd + g.slut - g.knack} height={rad * e.rader.length} fill="transparent" />
          {e.koppling !== false && <path d={kopplingD(e)} fill="none" stroke={k.farg} strokeWidth={k.bredd} />}
          <EtikettText e={e} halo={e.koppling === false} />
        </g>
      ))}
    </g>
  );
}

/**
 * Tidsdiagrammens statiska lager: rutnät, axlar, seriebrott, serierna inom
 * klippytan och etikettkolumnen. Memoiserad på scenen, så hovring ritar
 * aldrig om dem (stilguiden 6.8, "Ritning").
 */
export const StatiskaLager = memo(function StatiskaLager({ scen }: { scen: Scen }) {
  const klipp = `klipp-${rensaId(useId())}`;
  const axel = scen.lager.filter((l) => l.id === "axel");
  const ovriga = scen.lager.filter((l) => l.id !== "axel");
  return (
    <g data-lager="statisk">
      <defs><Klipp id={klipp} scen={scen} /></defs>
      <Rutnat scen={scen} />
      <YAxel scen={scen} />
      <XAxel scen={scen} />
      <RitaLager lager={axel} />
      <g clipPath={`url(#${klipp})`}>
        <RitaLager lager={ovriga} />
      </g>
      <Etikettkolumn etiketter={scen.etiketter} />
    </g>
  );
});
