// rapport/LagetIKorthet.tsx: översiktstabellen Läget i korthet (stilguiden 5.8).
// Ägare: WP9.
//
// Kolumner: Indikator (länk till indikatorn), Senaste (värde och, när den
// skiljer sig från kapitlets, perioden under), Plats ("8 av 21"), Utveckling
// (minidiagram 96 × 24 via RENDERARE.minidiagram) och Status (statusmarkör).
// Grupperad per avsnitt i standardordningen. Kolumnhuvudena sorterar
// (aria-sort); "Indikator" återställer standardordningen. På mobil döljs Plats
// och Utveckling. Sorteringslogiken finns i rapport/oversikt.ts.

import { useMemo, useState, type ReactNode } from "react";
import { minidiagramSpec } from "../charts/kpiTillSpec";
import { RENDERARE } from "../charts/register";
import type { ChartSpec } from "../charts/spec";
import type { KapitelModell, KpiModell, VyId } from "../data/modell";
import { SAKNAS, varde } from "../design/format";
import { tema } from "../design/tema";
import Lank from "../nav/Lank";
import { KAPITELBLOCK } from "../nav/route";
import StatusMarkor from "../ui/StatusMarkor";
import { ariaSort, gruppera, nastaSortering, oversiktRader, STANDARD, type SortKolumn, type Sortering } from "./oversikt";
import { periodText } from "./rapportText";
import t from "./delat.module.css";
import s from "./LagetIKorthet.module.css";

export interface LagetIKorthetProps {
  kapitel: KapitelModell;
  vy: VyId;
  /** Redigeringsläget; länkarna behåller det. */
  redigera?: boolean;
}

const RUBRIK_ID = `${KAPITELBLOCK.laget}-rubrik`;

export default function LagetIKorthet({ kapitel, vy, redigera = false }: LagetIKorthetProps): ReactNode {
  const rader = useMemo(() => oversiktRader(kapitel), [kapitel]);
  const kpier = useMemo(() => new Map(kapitel.kpier.map((k) => [k.id, k])), [kapitel]);
  const [sortering, setSortering] = useState<Sortering>(STANDARD);
  if (!rader.length) return null;
  const grupper = gruppera(rader, sortering);
  // Plats bara när någon indikator har en (block utan data utelämnas, princip 7)
  const harPlats = rader.some((r) => r.plats !== null);
  const kolumner = harPlats ? 5 : 4;
  const klick = (k: SortKolumn | "standard") => setSortering((nu) => nastaSortering(nu, k));

  const huvud = (kolumn: SortKolumn | "standard", text: string, klass = "") => {
    const aktiv = sortering.kolumn === kolumn && kolumn !== "standard";
    const pil = aktiv && sortering.kolumn !== "standard" ? (sortering.fallande ? "↓" : "↑") : "";
    return (
      <th scope="col" className={klass || undefined} aria-sort={ariaSort(sortering, kolumn)}>
        <button type="button" className={s.sortera} onClick={() => klick(kolumn)} data-sortera={kolumn}>
          {text}
          {pil && <span aria-hidden="true" className={s.pil}>{pil}</span>}
          {kolumn === "standard" && sortering.kolumn !== "standard" && <span className="visuellt-dold"> (avsnittens ordning)</span>}
        </button>
      </th>
    );
  };

  return (
    <section data-block={KAPITELBLOCK.laget} aria-labelledby={RUBRIK_ID}>
      <h2 id={RUBRIK_ID} className={t.blockrubrik}>Läget i korthet</h2>
      <table className={s.tabell} data-oversikt="">
        <caption className="visuellt-dold">
          {harPlats
            ? "Kapitlets indikatorer med senaste värde, plats bland regionerna, utveckling och status. Kolumnhuvudena sorterar."
            : "Kapitlets indikatorer med senaste värde, utveckling och status. Kolumnhuvudena sorterar."}
        </caption>
        <thead>
          <tr>
            {huvud("standard", "Indikator", s.namnkolumn)}
            {huvud("senaste", "Senaste", s.tal)}
            {harPlats && huvud("plats", "Plats", `${s.tal} ${s.dMob}`)}
            <th scope="col" className={s.dMob}><span className={s.huvudtext}>Utveckling</span></th>
            {huvud("status", "Status")}
          </tr>
        </thead>
        {grupper.map((g, gi) => (
          <tbody key={g.grupp?.id ?? `alla-${gi}`}>
            {g.grupp && (
              <tr className={s.grupp}>
                <th scope="rowgroup" colSpan={kolumner}>{g.grupp.namn}</th>
              </tr>
            )}
            {g.rader.map((r) => {
              const kpi = kpier.get(r.kpiId) as KpiModell;
              return (
                <tr key={r.kpiId} data-rad={r.kpiId}>
                  <th scope="row" className={s.namn}>
                    <Lank
                      till={{ sida: "kapitel", id: kapitel.id, vy, i: r.kpiId, ...(redigera ? { red: true } : {}) }}
                      className={s.namnlank}
                    >
                      {r.namn}
                    </Lank>
                  </th>
                  <td className={s.tal}>
                    {varde(r.senaste, kpi.format)}
                    {r.avvikandePeriod && <span className={s.period}>{periodText(r.avvikandePeriod, vy)}</span>}
                  </td>
                  {harPlats && (
                    <td className={`${s.tal} ${s.dMob}`}>
                      {r.plats !== null && r.platsAv !== null ? `${r.plats} av ${r.platsAv}` : SAKNAS}
                    </td>
                  )}
                  <td className={`${s.utveckling} ${s.dMob}`}>
                    <Minidiagram kpi={kpi} kapitel={kapitel} vy={vy} />
                  </td>
                  <td className={s.status}>
                    {r.status ? <StatusMarkor status={r.status} /> : <span className={s.beskrivande}>beskrivande mått</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        ))}
      </table>
    </section>
  );
}

/** Minidiagrammet i fasta mått (stilguiden 6.5), ritat av renderaren direkt. */
function Minidiagram({ kpi, kapitel, vy }: { kpi: KpiModell; kapitel: KapitelModell; vy: VyId }) {
  const r = RENDERARE.minidiagram;
  const { bredd, hojd } = tema.diagram.hojd.minidiagram;
  const spec: ChartSpec = useMemo(() => minidiagramSpec(kpi, kapitel, { vy }), [kpi, kapitel, vy]);
  const scen = useMemo(() => r.layout(spec, { bredd, hojd }, tema), [r, spec, bredd, hojd]);
  const Rita = r.Rita;
  return (
    <span className={s.mini} data-minidiagram="">
      <Rita scen={scen} spec={spec} aktiv={null} fasta={[]} />
    </span>
  );
}
