// rapport/Sammanfattning.tsx: sammanfattningssidan (stilguiden 4.2). Ägare: WP9.
//
// Ersätter gamla helhetsvyn. Inga indikatorblock och inga grafer:
//   1 Masthead          kicker, titel "Sammanfattning", dek, metarad
//   2 Det viktigaste    högst sex punkter över alla kapitel (rapport/huvudpunkter.ts)
//   3 Kapitel för kapitel  nummer + namn (h2), dek, statusmätare, nästa två
//                       till tre huvudpunkter och länken "Läs kapitlet"
//   4 Om statistiken    länk till begreppslistan och läsanvisningen
// Ingen punkt står två gånger: kapitlets punkter är de som inte redan valts
// till Det viktigaste. Mål: högst tre skärmhöjder i 1440 × 900.

import { useMemo, type ReactNode } from "react";
import type { KapitelModell, VyId } from "../data/modell";
import Lank from "../nav/Lank";
import { KAPITELBLOCK } from "../nav/route";
import DetViktigaste, { PunktLista, type ViktigPunkt } from "./DetViktigaste";
import { kapitelPunkter, nummerFor, statusRakning, valjOverKapitel } from "./huvudpunkter";
import Masthead from "./Masthead";
import { usePubliceringsdatum } from "./publicering";
import { ANALYSNAMN, kapitelDek, kapitletsPeriod, periodText, publiceradText } from "./rapportText";
import Statusmatare from "./Statusmatare";
import t from "./delat.module.css";
import s from "./Sammanfattning.module.css";

export interface SammanfattningProps {
  kapitel: KapitelModell[];
  vy: VyId;
  /** Publiceringsdatum (ISO). Förval: manifestets datum för vyn. */
  publicerad?: string;
}

const KICKER = "Hälso- och sjukvården i Halland";
const DEK = "Läget i rapportens kapitel, med det viktigaste först. Varje kapitel har en egen sida med indikatorer, grafer och källor.";

export default function Sammanfattning({ kapitel, vy, publicerad }: SammanfattningProps): ReactNode {
  const datum = usePubliceringsdatum(vy, publicerad);
  const valda = useMemo(() => valjOverKapitel(kapitel), [kapitel]);
  const nummer = useMemo(() => kapitel.map((k) => nummerFor(k)), [kapitel]);

  const punkt = (kapIndex: number, text: string, kpiId: string | undefined, iKapitlet: boolean): ViktigPunkt => {
    const kap = kapitel[kapIndex];
    const nr = kpiId ? nummer[kapIndex].get(kpiId) : undefined;
    const namn = kpiId ? kap.kpier.find((k) => k.id === kpiId)?.namn : undefined;
    if (!nr || !kpiId) return { text };
    return {
      text,
      lank: {
        till: { sida: "kapitel", id: kap.id, vy, i: kpiId },
        text: iKapitlet ? `se ${nr}` : `se ${nr} i kapitel ${kapIndex + 1}`,
        ...(namn ? { namn } : {}),
      },
    };
  };

  const viktigast = valda.map((v) => punkt(v.kapitelIndex, v.punkt.text, v.punkt.kpi_id, false));
  const antal = kapitel.reduce((n, k) => n + k.kpier.length, 0);
  const perioder = kapitel.map(kapitletsPeriod).filter((p): p is string => !!p).sort();
  const period = perioder[perioder.length - 1];
  const metarad = [
    period ? `${ANALYSNAMN[vy]} ${periodText(period, vy)}` : ANALYSNAMN[vy],
    `${kapitel.length} kapitel`,
    `${antal} indikatorer`,
    ...(datum ? [publiceradText(datum)] : []),
  ];

  return (
    <article className={s.sida} data-sammanfattning="">
      <Masthead kicker={KICKER} titel="Sammanfattning" dek={DEK} metarad={metarad} />

      <DetViktigaste punkter={viktigast} blockId={KAPITELBLOCK.viktigast} />

      <div className={s.kapitel}>
        {kapitel.map((k, i) => {
          const rubrikId = `sammanfattning-${k.id}`;
          const egna = kapitelPunkter(k, valda).map((h) => punkt(i, h.text, h.kpi_id, true));
          const dek = kapitelDek(k);
          return (
            <section key={k.id} className={s.post} data-kapitel={k.id} aria-labelledby={rubrikId}>
              <h2 id={rubrikId} className={t.avsnittsrubrik}>
                <span className={t.nr}>{i + 1}</span>
                {k.namn}
              </h2>
              {dek && <p className={`${t.granssnitt} ${s.dek}`}>{dek}</p>}
              <Statusmatare antal={statusRakning(k)} />
              <PunktLista punkter={egna} />
              <p className={t.granssnitt}>
                <Lank till={{ sida: "kapitel", id: k.id, vy }} className={t.lank} data-las-kapitlet="">
                  Läs kapitlet<span className={t.dold}>{` ${k.namn}`}</span>
                </Lank>
              </p>
            </section>
          );
        })}
      </div>

      <section className={s.om} aria-labelledby="sammanfattning-om">
        <h2 id="sammanfattning-om" className={t.avsnittsrubrik}>Om statistiken</h2>
        <p className={`${t.brod} ${s.omText}`}>
          Metod, begrepp och källor står sist i varje kapitel.{" "}
          <Lank till={{ sida: "begrepp" }} className={t.lank}>Begreppslistan</Lank> förklarar orden och{" "}
          <Lank till={{ sida: "las" }} className={t.lank}>Så läser du rapporten</Lank> beskriver hur rapporten är uppbyggd.
        </p>
      </section>
    </article>
  );
}
