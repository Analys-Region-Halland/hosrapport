// galleri.stilguide.tsx: diagramgalleriet (docs/arkitektur.md WP7). Plats och
// data för varje graftyp: spaghettigraf med alla regioner och riket (med och
// utan luckor), två fästa regioner, rangordning (även med lika värden), linje
// mot förväntat intervall, stapel över tid, små multiplar per sjukhus och per
// avdelning, och minidiagram i översiktstabellen. Exemplen och deras spec finns
// i exempel.ts (exempelSpec, byggd av WP1:s kpiTillSpec). Graferna ritas av
// WP2:s och WP3:s renderare. Ägare: WP7 (ramen).

import { Fragment, useMemo, useState } from "react";
import Figur from "../../src/figur/Figur";
import { RENDERARE } from "../../src/charts/register";
import type { ChartSpec, VisningId } from "../../src/charts/spec";
import { tema } from "../../src/design/tema";
import { Dek, Not, Notis, Prosa, StatusChip, Underrubrik } from "./delar";
import {
  EXEMPEL, FIXTURER, RAPPORTKAPITEL, exempelBrodsmula, exempelSpec, exempelVisningar, oversiktExempel, type Exempel,
} from "./exempel";
import { statusEtikett } from "./stilguide-md";
import s from "./galleri.module.css";

export const id = "galleri";
export const rubrik = "Diagramgalleri";
export const ordning = 69;

/** Kort beskrivning av specen: roller, perioder och luckor, så att WP2 och WP3 ser vad de ritar. */
function specFakta(spec: ChartSpec): string {
  const roller = new Map<string, number>();
  for (const serie of spec.serier) roller.set(serie.roll, (roller.get(serie.roll) ?? 0) + 1);
  const perioder = Math.max(0, ...spec.serier.map((x) => x.punkter?.length ?? 0));
  const fokus = spec.serier.find((x) => x.roll === "fokus")?.punkter ?? [];
  const forsta = fokus.findIndex((p) => p.varde !== null);
  const sista = fokus.length - 1 - [...fokus].reverse().findIndex((p) => p.varde !== null);
  const luckor = forsta < 0 ? 0 : fokus.slice(forsta, sista + 1).filter((p) => p.varde === null).length;
  return [
    [...roller].map(([r, n]) => `${r} ${n}`).join(", "),
    perioder ? `${perioder} perioder` : "",
    luckor ? `${luckor} luckor i fokus` : "",
    spec.paneler?.length ? `${spec.paneler.length} paneler` : "",
    spec.noter.length ? `${spec.noter.length} noter` : "",
  ].filter(Boolean).join(" · ");
}

type Resultat<T> = { ok: T } | { fel: string };
function forsok<T>(f: () => T): Resultat<T> {
  try {
    return { ok: f() };
  } catch (fel) {
    return { fel: fel instanceof Error ? fel.message : String(fel) };
  }
}

function Exempelvisning({ e }: { e: Exempel }) {
  const [fasta, setFasta] = useState<string[]>(e.kontext?.fasta ?? []);
  const [fokus, setFokus] = useState<string | undefined>(e.kontext?.fokus);
  const [visning, setVisning] = useState<VisningId>(e.visning);
  const resultat = useMemo(() => forsok(() => ({
    spec: exempelSpec(e.namn, { fasta, fokus }, visning),
    visningar: exempelVisningar(e.namn, { fokus }),
    brodsmula: exempelBrodsmula(e.namn, { fokus }),
  })), [e.namn, fasta, fokus, visning]);

  return (
    <div className={s.exempel} data-exempel={e.namn} data-bank-bild={`galleri-${e.namn}`}>
      <Underrubrik id={`galleri-${e.namn}`}>{e.rubrik}</Underrubrik>
      <Prosa>{e.vad}</Prosa>
      {"ok" in resultat ? (
        <>
          <p className={s.meta}>
            {e.typ} · src/{e.fil} ({e.paket}) · fixturer {FIXTURER[e.data.fixtur].namn}, {e.data.kpi} · kpiTillSpec (WP1)
            <br />
            {specFakta(resultat.ok.spec)}
          </p>
          <div className={s.figurplats}>
            <Figur spec={resultat.ok.spec} rubrikniva={4}
              visningar={resultat.ok.visningar.length > 1 ? resultat.ok.visningar : undefined} visning={visning}
              onVisning={setVisning}
              brodsmula={resultat.ok.brodsmula.length ? resultat.ok.brodsmula : undefined} onFokus={setFokus}
              fasta={fasta} onFasta={setFasta} />
          </div>
        </>
      ) : (
        <Notis rubrik="Exemplet kunde inte byggas"><p>{resultat.fel}</p></Notis>
      )}
    </div>
  );
}

/** Ett minidiagram i tabellcell: renderaren direkt, i minidiagrammets fasta mått (stilguiden 6.5). */
function Minidiagram({ spec }: { spec: ChartSpec }) {
  const r = RENDERARE.minidiagram;
  const { bredd, hojd } = tema.diagram.hojd.minidiagram;
  const scen = useMemo(() => r.layout(spec, { bredd, hojd }, tema), [r, spec, bredd, hojd]);
  const Rita = r.Rita;
  return (
    <span className={s.mini}>
      <Rita scen={scen} spec={spec} aktiv={null} fasta={[]} />
    </span>
  );
}

function Oversikt({ e }: { e: Exempel }) {
  const resultat = useMemo(() => forsok(oversiktExempel), []);

  return (
    <div className={s.exempel} data-exempel={e.namn} data-bank-bild={`galleri-${e.namn}`}>
      <Underrubrik id={`galleri-${e.namn}`}>{e.rubrik}</Underrubrik>
      <Prosa>{e.vad}</Prosa>
      {"ok" in resultat ? (
        <>
          <p className={s.meta}>{e.typ} · src/{e.fil} ({e.paket}) · {resultat.ok.kalla} · minidiagramSpec (WP1)</p>
          <table className={s.oversikt}>
            <caption className={s.caption}>Läget i korthet, {resultat.ok.kapitel}</caption>
            <thead>
              <tr>
                <th scope="col">Indikator</th>
                <th scope="col" className={s.tal}>Senaste</th>
                <th scope="col" className={`${s.tal} ${s.dMob}`}>Plats</th>
                <th scope="col" className={s.dMob}>Utveckling</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {resultat.ok.avsnitt.map((g) => (
                <Fragment key={g.namn}>
                  <tr className={s.grupp}>
                    <th scope="rowgroup" colSpan={5}>{g.namn}</th>
                  </tr>
                  {g.rader.map((r) => (
                    <tr key={r.kpiId}>
                      <td>
                        <a className={s.lank} href={`/#/kapitel/${RAPPORTKAPITEL.id}?vy=${RAPPORTKAPITEL.vy}&i=${r.kpiId}`}>{r.namn}</a>
                      </td>
                      <td className={s.tal}>
                        {r.senaste}
                        {r.period && <span className={s.period}>{r.period}</span>}
                      </td>
                      <td className={`${s.tal} ${s.dMob}`}>{r.plats ?? "–"}</td>
                      <td className={s.dMob}><Minidiagram spec={r.spec} /></td>
                      <td>{r.status ? <StatusChip status={r.status} etikett={statusEtikett(r.status)} /> : "beskrivande mått"}</td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
          <Not>Minidiagrammen har var sin skala. Plats och Utveckling döljs på mobil (stilguiden 5.8).</Not>
        </>
      ) : (
        <Notis rubrik="Exemplet kunde inte byggas"><p>{resultat.fel}</p></Notis>
      )}
    </div>
  );
}

export function Sektion() {
  return (
    <>
      <Dek>Varje graftyp med data ur rapporten. Hovra, fäst och använd tangentbordet som i rapporten.</Dek>
      <Not>
        Specarna byggs av kpiTillSpec ur WP1:s fixturer, och graferna ritas av renderarna för respektive graftyp. Varje exempel
        fotograferas för sig i bänken, i 1440 och 390 px.
      </Not>
      {EXEMPEL.filter((e) => e.iGalleriet !== false).map((e) => (e.typ === "minidiagram" ? <Oversikt key={e.namn} e={e} /> : <Exempelvisning key={e.namn} e={e} />))}
    </>
  );
}
