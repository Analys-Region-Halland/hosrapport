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

import { useEffect, useId, useState, type ReactNode } from "react";
import { TEMAN } from "../data/kapitelinfo";
import { laddaManifest } from "../data/laddning";
import { datum } from "../design/format";
import Lank from "../nav/Lank";
import { STANDARDVY } from "../nav/route";
import Kapitelrad from "./Kapitelrad";
import Statusmatare from "./Statusmatare";
import { byggStartModell, type StartModell } from "./startModell";
import s from "./StartSida.module.css";

const LOGO = `${import.meta.env.BASE_URL}logo_vit.svg`;

const INGRESS =
  "En samlad analys av hälso- och sjukvården i Halland, byggd av fristående kapitel. " +
  "Varje kapitel kan läsas för sig och redovisar sina källor indikator för indikator. " +
  "Innehållet växer när fler källor kopplas in, både öppna jämförelser och regionens egna data.";

const OM_RAPPORTEN = [
  "HoS-rapporten är Region Hallands samlade analys av hälso- och sjukvården. " +
    "Den visar bara kapitel med inhämtad data.",
  "Tidigare områden för befolkning, folkhälsa och ekonomi är arkiverade och kan återinföras när de ska ingå igen.",
];

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
  return (
    <>
      <section className={s.lage} aria-labelledby={`${id}-lage`} data-start-lage="">
        <h2 id={`${id}-lage`} className={s.blockrubrik}>Läget just nu</h2>
        <div className={s.lagematare}>
          <Statusmatare status={modell.lage} storlek="lage" />
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
            {t.kapitel.map((k) => <Kapitelrad key={k.id} kapitel={k} />)}
          </ol>
        </section>
      ))}
    </>
  );
}

function Sidfot() {
  const id = useId();
  const [omOppen, setOmOppen] = useState(false);
  const skiljare = <span className={s.skiljare} aria-hidden="true"> · </span>;
  return (
    <footer className={`${s.bredd} ${s.sidfot}`} data-start-sidfot="">
      <p className={s.sidfotrad}>
        <button
          type="button"
          className={s.lank}
          aria-expanded={omOppen}
          aria-controls={`${id}-om`}
          onClick={() => setOmOppen((o) => !o)}
          data-start-om=""
        >
          Om rapporten
        </button>
        {skiljare}
        <Lank till={{ sida: "begrepp" }} className={s.lank} data-start-begrepp="">Begrepp</Lank>
        {skiljare}
        <Lank till={{ sida: "las" }} className={s.lank} data-start-las="">Så läser du rapporten</Lank>
        {skiljare}
        <span className={s.publicerad}>Publicerad {datum(__BUILD_DATE__)}</span>
      </p>
      <div id={`${id}-om`} className={s.om} hidden={!omOppen}>
        {OM_RAPPORTEN.map((p, i) => <p key={i}>{p}</p>)}
      </div>
    </footer>
  );
}

function useStartModell(): { modell: StartModell | null; fel: string | null } {
  const [res, setRes] = useState<{ modell: StartModell | null; fel: string | null }>({ modell: null, fel: null });
  useEffect(() => {
    let avbruten = false;
    laddaManifest().then(
      (m) => { if (!avbruten) setRes({ modell: byggStartModell(m, TEMAN), fel: null }); },
      (e: unknown) => { if (!avbruten) setRes({ modell: null, fel: e instanceof Error ? e.message : String(e) }); },
    );
    return () => { avbruten = true; };
  }, []);
  return res;
}
