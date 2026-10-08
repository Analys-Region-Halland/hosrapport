// rapport/OmRapporten.tsx: sidan Om rapporten på #/om (arkitektur 4.6). Ägare:
// WP12b. Samma sidmall som kapitlet (Textsida.module.css): masthead, delar med
// rubrik på kapitelnivå och löptext i typ.roll.brod.
//
//   Vad rapporten är          kapitlen, SKR:s rapport och det interna exemplet
//   Kapitlen och deras källor  per tema, ur data/kapitelinfo.ts, numrerade som
//                             på startsidan och med länk till kapitlet
//   Exempeldata               akutflödet och undernivåerna
//   Publicering               datum, uppdatering, export och adresser
//
// Sakuppgifterna kommer ur kapitelinfo, kapitlens inledningar (Om statistiken)
// och SIGNAL-METODIK.md avsnitt 6. Kapitellistan byggs med startsidans modell,
// så att numreringen och vyn bakom länken är desamma.

import { useState, type ReactNode } from "react";
import Prosa from "../begrepp/Prosa";
import { kapitelInfo } from "../data/kapitelinfo";
import Lank from "../nav/Lank";
import type { StartKapitel, StartModell } from "../start/startModell";
import { useStartModell } from "../start/useStartModell";
import Uppdatering from "../ui/Uppdatering";
import { Laddar } from "./Laddar";
import Masthead from "./Masthead";
import { uppdateringsFalt, useManifestVy } from "./publicering";
import t from "./delat.module.css";
import s from "./Textsida.module.css";

const KICKER = "Hälso- och sjukvården i Halland";
const DEK = "Vad HoS-rapporten är, vilka källor kapitlen bygger på och hur rapporten publiceras.";

const VAD = [
  "HoS-rapporten är Region Hallands samlade analys av hälso- och sjukvården. Den är byggd av fristående kapitel som kan läsas var för sig. Varje kapitel redovisar sina källor indikator för indikator.",
  "Sex kapitel återger Sveriges Kommuner och Regioners årliga Hälso- och sjukvårdsrapport, med Region Halland i förgrunden och övriga regioner som jämförelse. Indikatorerna hämtas ur Kolada, där SKR publicerar dem för rapporten, och räknas inte om här.",
  "Kapitlet Akutflöde är ett internt analysexempel. Det följer regionens egna system per dag, vecka, månad, kvartal och år, med ett förväntat intervall i stället för placering bland regionerna.",
  "Rapporten visar bara kapitel med inhämtad data. Tidigare områden för befolkning, folkhälsa och ekonomi är arkiverade och kan återinföras när de ska ingå igen.",
].join("\n\n");

const KALLOR_INTRO =
  "Källorna står också sist i varje kapitel, under Om statistiken, och vid varje indikator i fördjupningen under figuren.";

const EXEMPELDATA = [
  "Kapitlet Akutflöde bygger än så länge på exempeldata och inte på regionens egna siffror. Värdena tas fram med en statistisk modell som efterliknar verksamhetens mönster över året, veckan och helgerna.",
  "Samma gäller undernivåerna, alltså värdena per sjukhus, avdelning, ambulansområde och ambulansstation. Avdelningarna och ambulansstationerna är påhittade. Exemplet visar hur rapporten fungerar när den interna kopplingen är på plats.",
].join("\n\n");

const PUBLICERING = [
  "Rapporten publiceras som webbsida. Överst på startsidan och i varje kapitel står när rapporten senast uppdaterades, vilken period den senaste datan gäller och när nästa uppdatering väntas.",
  "Under Exportera i verktygsraden kan ett kapitel eller hela rapporten sparas som PowerPoint. Där finns också Skriv ut och Kopiera länk till här.",
  "Varje kapitel, indikator och begrepp har en egen adress. En kopierad länk öppnar samma ställe i rapporten, med figuren i samma läge.",
].join("\n\n");

export default function OmRapporten(): ReactNode {
  const { modell, fel } = useStartModell();
  const arPost = useManifestVy("ar");
  // Begreppen länkas första gången per del
  const [redan] = useState(() => ({ vad: new Set<string>(), exempel: new Set<string>(), publicering: new Set<string>() }));

  return (
    <article className={s.sida} data-om-sida="">
      <Masthead kicker={KICKER} titel="Om rapporten" dek={DEK}
        uppdatering={<Uppdatering falt={uppdateringsFalt(arPost, true)} />} />

      <section className={s.del} aria-labelledby="om-vad">
        <h2 id="om-vad" className={t.avsnittsrubrik}>Vad rapporten är</h2>
        <Prosa text={VAD} redan={redan.vad} className={t.brod} />
      </section>

      <section className={s.del} aria-labelledby="om-kallor" data-om-kallor="">
        <h2 id="om-kallor" className={t.avsnittsrubrik}>Kapitlen och deras källor</h2>
        <p className={t.brod}>{KALLOR_INTRO}</p>
        {modell ? <Kallor modell={modell} /> : <Laddar fel={fel} />}
      </section>

      <section className={s.del} aria-labelledby="om-exempel">
        <h2 id="om-exempel" className={t.avsnittsrubrik}>Exempeldata</h2>
        <Prosa text={EXEMPELDATA} redan={redan.exempel} className={t.brod} />
      </section>

      <section className={s.del} aria-labelledby="om-publicering">
        <h2 id="om-publicering" className={t.avsnittsrubrik}>Publicering</h2>
        <Prosa text={PUBLICERING} redan={redan.publicering} className={t.brod} />
        <p className={t.brod}>
          Hur kapitlen och graferna läses står i{" "}
          <Lank till={{ sida: "las" }} className={t.lank}>Så läser du rapporten</Lank>. Orden förklaras i{" "}
          <Lank till={{ sida: "begrepp" }} className={t.lank}>begreppslistan</Lank>.
        </p>
      </section>
    </article>
  );
}

/** Kapitlen per tema med källa, takt, publikation och eventuell notis ur kapitelinfo. */
function Kallor({ modell }: { modell: StartModell }) {
  return (
    <>
      {modell.teman.map((tema) => (
        <div key={tema.id} className={s.grupp} data-tema={tema.id}>
          <h3 className={t.blockrubrik}>{tema.namn}</h3>
          <ol className={s.kapitel}>
            {tema.kapitel.map((k) => <KapitelKalla key={k.id} kapitel={k} />)}
          </ol>
        </div>
      ))}
    </>
  );
}

function KapitelKalla({ kapitel: k }: { kapitel: StartKapitel }) {
  const info = kapitelInfo(k.id);
  const meta = [info?.takt ? `Uppdateras ${info.takt.charAt(0).toLowerCase()}${info.takt.slice(1)}` : "", info?.serie ?? ""]
    .filter(Boolean)
    .join(" · ");
  return (
    <li data-kapitel={k.id}>
      <p className={t.etikett}>
        <Lank till={{ sida: "kapitel", id: k.id, vy: k.vy }} className={t.lank}>
          <span className={t.nr}>{k.nummer}</span>
          {k.namn}
        </Lank>
      </p>
      {info?.kalla && <p className={`${t.granssnitt} ${s.kalla}`}>Källa: {info.kalla}</p>}
      {meta && <p className={t.not}>{meta}</p>}
      {info?.notis && <p className={t.not}>{info.notis}</p>}
    </li>
  );
}
