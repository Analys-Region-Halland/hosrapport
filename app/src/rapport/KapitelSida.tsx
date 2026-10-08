// rapport/KapitelSida.tsx: kapitlet (stilguiden 4.3). Ägare: WP9.
//
// Samma block i samma ordning för alla kapitel; block utan innehåll utelämnas
// (princip 7):
//   1 Masthead          logotyp, kicker (temat), titel, linje, dek, metarad och
//                       tidsupplösningen sist när det finns fler än en vy
//   2 Det viktigaste    huvudpunkterna med länk "se 2.3" till indikatorn
//   3 Läget i korthet   översiktstabellen
//   4 Avsnitt           nummer, rubrik, dek och indikatorerna (utan avsnitt:
//                       indikatorerna direkt)
//   5 Om statistiken    metod, status, begrepp och källor
// data-block sätts på blocken (KAPITELBLOCK), avsnitten och indikatorerna, så
// att ramen kan rulla dit och visa läget i innehållsförteckningen. Numreringen
// kommer ur byggDisposition (rapport/ramDisposition.ts), samma som ramens.

import { useMemo, type ReactNode } from "react";
import type { KapitelModell, VyId } from "../data/modell";
import type { Route } from "../nav/route";
import Avsnitt from "./Avsnitt";
import DetViktigaste, { type ViktigPunkt } from "./DetViktigaste";
import Indikator from "./Indikator";
import LagetIKorthet from "./LagetIKorthet";
import Masthead from "./Masthead";
import OmStatistiken from "./OmStatistiken";
import { byggDisposition, type DispIndikator } from "./ramDisposition";
import { kapitelDek, kapitelKicker } from "./rapportText";
import TidsupplosningVal from "./TidsupplosningVal";
import s from "./KapitelSida.module.css";

export interface KapitelSidaProps {
  kapitel: KapitelModell;
  vy: VyId;
  /** Vyer där kapitlet finns; väljaren visas när de är fler än en. */
  vyer?: VyId[];
  onVy?(vy: VyId): void;
  /** Redigeringsläget (route.red). */
  redigera?: boolean;
  /** Montera figurerna först nära skärmen. Förval: sant. */
  latFigur?: boolean;
}

export default function KapitelSida({
  kapitel, vy, vyer = [], onVy, redigera = false, latFigur = true,
}: KapitelSidaProps): ReactNode {
  const d = useMemo(() => byggDisposition(kapitel), [kapitel]);
  const kpier = useMemo(() => new Map(kapitel.kpier.map((k) => [k.id, k])), [kapitel]);

  const till = (i: string): Route => ({ sida: "kapitel", id: kapitel.id, vy, i, ...(redigera ? { red: true } : {}) });
  const nummer = new Map([...d.avsnitt.flatMap((a) => a.indikatorer), ...d.indikatorer].map((x) => [x.id, x]));
  const punkter: ViktigPunkt[] = kapitel.huvudpunkter.slice(0, 6).map((h) => {
    const x = h.kpi_id ? nummer.get(h.kpi_id) : undefined;
    return x ? { text: h.text, lank: { till: till(x.id), text: `se ${x.nummer}`, namn: x.namn } } : { text: h.text };
  });

  const indikator = (x: DispIndikator) => {
    const kpi = kpier.get(x.id);
    return kpi ? (
      <Indikator key={x.id} kpi={kpi} kapitel={kapitel} nummer={x.nummer} vy={vy} redigera={redigera} latFigur={latFigur} />
    ) : null;
  };

  return (
    <article className={s.kapitel} data-kapitelsida={kapitel.id}>
      <Masthead logotyp kicker={kapitelKicker(kapitel)} titel={kapitel.namn} dek={kapitelDek(kapitel)}>
        {onVy && <TidsupplosningVal vyer={vyer} aktiv={vy} onByt={onVy} />}
      </Masthead>

      <DetViktigaste punkter={punkter} />
      <LagetIKorthet kapitel={kapitel} vy={vy} redigera={redigera} />

      {d.avsnitt.map((a) => {
        const modell = kapitel.avsnitt.find((x) => x.id === a.id);
        return modell ? (
          <Avsnitt key={a.id} avsnitt={modell} nummer={a.nummer}>
            {a.indikatorer.map(indikator)}
          </Avsnitt>
        ) : null;
      })}
      {d.indikatorer.length > 0 && <div className={s.indikatorer}>{d.indikatorer.map(indikator)}</div>}

      <OmStatistiken kapitel={kapitel} />
    </article>
  );
}
