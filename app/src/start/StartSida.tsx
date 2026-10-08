// start/StartSida.tsx: startsidan (stilguiden 4.1). En lugn innehållsförteckning:
// brandlist, masthead, Läget just nu, kapitelförteckning per tema och sidfot.
// Ägare: WP11.
//
// Allt hämtas ur manifestet (data/laddning.ts, en liten fil) och kapitelinfo
// (data/kapitelinfo.ts); inga kapitelfiler laddas här. Summering och gruppering
// finns i startModell.ts. Brandlisten och mastheadet ritas direkt, resten när
// manifestet är laddat.
//
// Landmärken (tillägg i WP12b): brandlisten är sidans <header> och sidfoten
// dess <footer>, båda utanför <main>. Ramen (rapport/Ram.tsx) lägger inget eget
// runt startsidan, så <main id="innehall"> finns här.

import { useId, useMemo, type ReactNode } from "react";
import { datum } from "../design/format";
import Lank from "../nav/Lank";
import { STANDARDVY } from "../nav/route";
import Kapitelrad from "./Kapitelrad";
import Statusruta from "./Statusruta";
import { antalMedStatus, type StartModell } from "./startModell";
import { useStatusIndikatorer } from "./statusIndikatorer";
import { useStartModell } from "./useStartModell";
import s from "./StartSida.module.css";

const LOGO = `${import.meta.env.BASE_URL}logo_vit.svg`;

const INGRESS =
  "En samlad analys av hälso- och sjukvården i Halland, byggd av fristående kapitel. " +
  "Varje kapitel kan läsas för sig och redovisar sina källor indikator för indikator. " +
  "Innehållet växer när fler källor kopplas in, både öppna jämförelser och regionens egna data.";

export default function StartSida(): ReactNode {
  const { modell, fel } = useStartModell();

  return (
    <div className={s.startsida} data-startsida="">
      <header className={s.brandlist} data-start-brandlist="">
        <div className={s.brandinnehall}>
          <img src={LOGO} alt="Region Halland" className={s.logo} />
          <span className={s.produkt}>HoS-rapport</span>
        </div>
      </header>

      <main id="innehall" tabIndex={-1} className={`${s.bredd} ${s.huvud}`}>
        <div>
          <p className={s.kicker}>Region Halland · Analys</p>
          <h1 className={s.titel}>Hälso- och sjukvården i Halland</h1>
          <p className={s.ingress}>{INGRESS}</p>
        </div>

        {fel ? (
          <p role="alert" className={s.laddar}>Kunde inte ladda rapportens kapitel: {fel}</p>
        ) : !modell ? (
          <p role="status" className={s.laddar}>Laddar …</p>
        ) : (
          <Innehall modell={modell} />
        )}
      </main>

      <Sidfot />
    </div>
  );
}

function Innehall({ modell }: { modell: StartModell }) {
  const id = useId();
  const kapitel = useMemo(() => modell.teman.flatMap((t) => t.kapitel), [modell]);
  const listor = useStatusIndikatorer(kapitel);
  // Läget just nu får sin lista först när alla kapitel är hämtade (annars vore den ofullständig)
  const allaListor = kapitel.every((k) => listor.has(k.id)) ? kapitel.flatMap((k) => listor.get(k.id) ?? []) : undefined;
  const medStatus = kapitel.filter((k) => antalMedStatus(k.status) > 0).length;
  return (
    <>
      <section className={s.lage} aria-labelledby={`${id}-lage`} data-start-lage="">
        <h2 id={`${id}-lage`} className={s.blockrubrik}>Läget just nu</h2>
        <p className={s.lagetext}>
          {antalMedStatus(modell.lage)} indikatorer i {medStatus} kapitel har en status. Peka på en kategori för att se vilka.
        </p>
        <div className={s.lagematare}>
          <Statusruta status={modell.lage} indikatorer={allaListor} storlek="lage" />
        </div>
        <p className={s.lagelank}>
          <Lank till={{ sida: "sammanfattning", vy: STANDARDVY }} className={s.lank} data-start-sammanfattning="">
            Läs sammanfattningen
          </Lank>
        </p>
      </section>

      {modell.teman.map((t) => (
        <section key={t.id} className={s.tema} aria-labelledby={`${id}-${t.id}`} data-tema={t.id}>
          <h2 id={`${id}-${t.id}`} className={s.temanamn}>{t.namn}</h2>
          <p className={s.temamening}>{t.mening}</p>
          <ol className={s.kapitellista}>
            {t.kapitel.map((k) => <Kapitelrad key={k.id} kapitel={k} indikatorer={listor.get(k.id)} />)}
          </ol>
        </section>
      ))}
    </>
  );
}

// Sidfoten (stilguiden 4.1): Om rapporten · Begrepp · Så läser du rapporten · Publicerad {datum}
function Sidfot() {
  const skiljare = <span className={s.skiljare} aria-hidden="true"> · </span>;
  return (
    <footer className={`${s.bredd} ${s.sidfot}`} data-start-sidfot="">
      <p className={s.sidfotrad}>
        <Lank till={{ sida: "om" }} className={s.lank} data-start-om="">Om rapporten</Lank>
        {skiljare}
        <Lank till={{ sida: "begrepp" }} className={s.lank} data-start-begrepp="">Begrepp</Lank>
        {skiljare}
        <Lank till={{ sida: "las" }} className={s.lank} data-start-las="">Så läser du rapporten</Lank>
        {skiljare}
        <span className={s.publicerad}>Publicerad {datum(__BUILD_DATE__)}</span>
      </p>
    </footer>
  );
}
