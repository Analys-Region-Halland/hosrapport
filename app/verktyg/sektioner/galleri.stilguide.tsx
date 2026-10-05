// galleri.stilguide.tsx: diagramgalleriet (docs/arkitektur.md WP7). Plats och
// data för varje graftyp med riktig data: spaghettigraf med alla regioner och
// riket (med och utan luckor), två fästa regioner, rangordning, linje mot
// förväntat intervall, stapel över tid, små multiplar per sjukhus och
// minidiagram i översiktstabellen. Exemplen och deras spec finns i exempel.ts
// (exempelSpec). Graferna ritas av WP2 och WP3; så länge renderaren är en
// stubb visar exemplet en platshållare. Ägare: WP7 (ramen).

import { Fragment, useMemo, useState } from "react";
import Figur from "../../src/figur/Figur";
import { RENDERARE } from "../../src/charts/register";
import type { ChartSpec } from "../../src/charts/spec";
import { tema } from "../../src/design/tema";
import { Dek, Not, Notis, Prosa, StatusChip, Underrubrik } from "./delar";
import { EXEMPEL, exempelKapitel, exempelSpecMedKalla, oversiktExempel, type Exempel, type SpecKalla } from "./exempel";
import { statusEtikett } from "./stilguide-md";
import s from "./galleri.module.css";

export const id = "galleri";
export const rubrik = "Diagramgalleri";
export const ordning = 69;

const KALLTEXT: Record<SpecKalla, string> = {
  WP1: "spec från kpiTillSpec (WP1)",
  reserv: "spec från galleriets reservspec tills kpiTillSpec finns",
};

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

function Metarad({ e, kalla, spec }: { e: Exempel; kalla: SpecKalla; spec?: ChartSpec }) {
  return (
    <p className={s.meta}>
      {e.typ} · src/{e.fil} ({e.paket}) · data/{e.kalla.vy}-{e.kalla.sektion}.json, {e.kalla.kpi} · {KALLTEXT[kalla]}
      {spec && <><br />{specFakta(spec)}</>}
    </p>
  );
}

function Platshallare({ e }: { e: Exempel }) {
  return (
    <p className={s.platshallare} role="note">
      Platshållare: grafen ritas av {e.paket} i src/{e.fil}. Data och spec är klara; figuren nedan visar stubbrenderaren.
    </p>
  );
}

function Exempelvisning({ e }: { e: Exempel }) {
  const [fasta, setFasta] = useState<string[]>(e.fasta ?? []);
  const resultat = useMemo(() => {
    try {
      return exempelSpecMedKalla(e.namn, { fasta });
    } catch (fel) {
      return { fel: fel instanceof Error ? fel.message : String(fel) };
    }
  }, [e.namn, fasta]);

  return (
    <div className={s.exempel} data-exempel={e.namn} data-bank-bild={`galleri-${e.namn}`}>
      <Underrubrik id={`galleri-${e.namn}`}>{e.rubrik}</Underrubrik>
      <Prosa>{e.vad}</Prosa>
      {"spec" in resultat ? (
        <>
          <Metarad e={e} kalla={resultat.kalla} spec={resultat.spec} />
          {resultat.fel && <Notis rubrik="kpiTillSpec kastade ett fel, reservspecen visas"><p>{resultat.fel}</p></Notis>}
          <Platshallare e={e} />
          <div className={s.figurplats}>
            <Figur spec={resultat.spec} rubrikniva={4} fasta={fasta} onFasta={setFasta} />
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

type OversiktResultat =
  | { grupper: ReturnType<typeof oversiktExempel>; kapitel: ReturnType<typeof exempelKapitel> }
  | { fel: string };

function Oversikt({ e }: { e: Exempel }) {
  const resultat = useMemo((): OversiktResultat => {
    try {
      return { grupper: oversiktExempel(), kapitel: exempelKapitel(e.kalla.vy, e.kalla.sektion) };
    } catch (fel) {
      return { fel: fel instanceof Error ? fel.message : String(fel) };
    }
  }, [e]);

  return (
    <div className={s.exempel} data-exempel={e.namn} data-bank-bild={`galleri-${e.namn}`}>
      <Underrubrik id={`galleri-${e.namn}`}>{e.rubrik}</Underrubrik>
      <Prosa>{e.vad}</Prosa>
      {"grupper" in resultat ? (
        <>
          <Metarad e={e} kalla={resultat.grupper[0]?.rader[0]?.kalla ?? "reserv"} />
          <Platshallare e={e} />
          <table className={s.oversikt}>
            <caption className={s.caption}>Läget i korthet, {resultat.kapitel.namn}</caption>
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
              {resultat.grupper.map((g) => (
                <Fragment key={g.avsnitt}>
                  <tr className={s.grupp}>
                    <th scope="rowgroup" colSpan={5}>{g.avsnitt}</th>
                  </tr>
                  {g.rader.map((r) => (
                    <tr key={r.kpiId}>
                      <td>
                        <a className={s.lank} href={`/?ny#/kapitel/${e.kalla.sektion}?vy=${e.kalla.vy}&i=${r.kpiId}`}>{r.namn}</a>
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
      <Dek>Varje graftyp med riktig data ur rapporten. Hovra, fäst och använd tangentbordet som i rapporten.</Dek>
      <Not>
        Graferna ritas av WP2 och WP3. Tills deras renderare finns visar varje exempel figuren med en platshållare. Varje exempel
        fotograferas för sig i bänken, i 1440 och 390 px.
      </Not>
      {EXEMPEL.map((e) => (e.typ === "minidiagram" ? <Oversikt key={e.namn} e={e} /> : <Exempelvisning key={e.namn} e={e} />))}
    </>
  );
}
