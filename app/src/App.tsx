import { lazy, Suspense, useEffect, type ReactNode } from "react";
import BegreppSida from "./begrepp/BegreppSida";
import { KAPITELVY, skrivOmGammalt, START, STANDARDVY, type Route } from "./nav/route";
import { navigera, registreraAnkarUppslag, useRouteTillstand } from "./nav/useRoute";
import KapitelSida from "./rapport/KapitelSida";
import OmRapporten from "./rapport/OmRapporten";
import Ram from "./rapport/Ram";
import {
  hittaKapitelForBlock, kapitelForBlockICache, useAllaKapitel, useKapitel, useKapitelIndex, vyForKapitel,
  type KapitelIndex,
} from "./rapport/ramData";
import { Laddar } from "./rapport/Laddar";
import SaLaserDu from "./rapport/SaLaserDu";
import Sammanfattning from "./rapport/Sammanfattning";
import StartSida from "./start/StartSida";

// ════════════════════════════════════════════════════════════
//  App: väljer mellan nya och gamla rapporten (docs/arkitektur.md avsnitt 2).
//    utan parametrar → nya appen (NyApp nedan), även för gamla bokmärken
//    ?gammal         → gamla appen, oförändrad, tills användaren granskat den
//                      nya. Den laddas för sig (GammalApp.tsx), så att den
//                      inte ligger i nya appens huvudbit.
// ════════════════════════════════════════════════════════════

const GAMMAL = typeof location !== "undefined" && new URLSearchParams(location.search).has("gammal");

const GammalApp = lazy(() => import("./GammalApp"));

export default function App() {
  return GAMMAL ? (
    <Suspense fallback={null}>
      <GammalApp />
    </Suspense>
  ) : (
    <NyApp />
  );
}

// ════════════════════════════════════════════════════════════
//  Nya appen: adresser enligt arkitektur.md 4.6 (nav/route.ts)
//    #/                      startsidan (WP11)
//    #/sammanfattning?vy=    sammanfattningen (WP9)
//    #/kapitel/{id}?vy=&i=   kapitlet (WP9), rullat till blocket i
//    #/begrepp, #/begrepp/x  begreppslistan (WP5)
//    #/las                   så läser du rapporten
//    #/om                    om rapporten
//  Startsidan ritar egna landmärken (header, main, footer); ramen lägger
//  main runt övriga sidor. Kapitelraderna på startsidan är länkar.
//  Saknar adressen vy öppnas ett kapitel i månadsvyn om den finns, annars i
//  en vy som har kapitlet (KAPITELVY; routern säger utanVy).
// ════════════════════════════════════════════════════════════

function NyApp() {
  const t = useRouteTillstand();
  const { route, ankare } = t;
  const { index, fel: indexFel } = useKapitelIndex();

  // Ett kapitel visas bara i en vy där det finns; annars byts vyn eller (okänt kapitel) startsidan.
  // Saknade adressen vy öppnas kapitlet i månadsvyn om den finns (KAPITELVY, gamla utils/vyval.ts).
  const onskadVy = t.utanVy ? KAPITELVY : route.sida === "kapitel" ? route.vy : STANDARDVY;
  const kapitelVy = route.sida === "kapitel" && index ? vyForKapitel(index, route.id, onskadVy) : undefined;
  const giltigt = route.sida === "kapitel" && kapitelVy === route.vy;
  const kap = useKapitel(giltigt ? route.vy : null, giltigt ? route.id : null);
  const alla = useAllaKapitel(route.sida === "sammanfattning" ? route.vy : null);

  useEffect(() => {
    if (route.sida !== "kapitel" || !index || kapitelVy === route.vy) return;
    navigera(kapitelVy ? { ...route, vy: kapitelVy } : START, { ersatt: true, fokus: false });
  }, [route, index, kapitelVy]);

  useGamlaAnkare(ankare, index);

  const sidtitel = titelFor(route, index);
  useEffect(() => {
    document.title = sidtitel ? `${sidtitel} · HoS-rapport Halland` : "HoS-rapport Halland";
  }, [sidtitel]);

  let sida: ReactNode;
  let klar = true;
  let kapitel = null;
  let egnaLandmarken = false;

  if (ankare) {
    sida = <Laddar text="Letar upp platsen i rapporten …" />;
    klar = false;
  } else if (indexFel) {
    sida = <Laddar fel={indexFel} />;
  } else if (route.sida !== "start" && !index) {
    sida = <Laddar />;
    klar = false;
  } else {
    switch (route.sida) {
      case "start":
        sida = <StartSida key="start" />;
        egnaLandmarken = true;
        break;
      case "kapitel": {
        kapitel = kap.kapitel;
        klar = kap.klar;
        const vyer = index?.kapitel.find((k) => k.id === route.id)?.vyer ?? [route.vy];
        // Medan nästa vy laddas visas förra vyns kapitel med sin egen vy
        sida = kap.kapitel ? (
          <KapitelSida
            key={`kapitel:${route.id}`}
            kapitel={kap.kapitel}
            vy={kap.vy ?? route.vy}
            vyer={vyer}
            onVy={(vy) => navigera({ ...route, vy }, { fokus: false })}
            redigera={route.red === true}
          />
        ) : (
          <Laddar fel={kap.fel} />
        );
        break;
      }
      case "sammanfattning":
        klar = alla.kapitel !== null;
        sida = alla.kapitel ? (
          <Sammanfattning key="sammanfattning" kapitel={alla.kapitel} vy={route.vy} />
        ) : (
          <Laddar fel={alla.fel} />
        );
        break;
      case "begrepp":
        sida = <BegreppSida key="begrepp" id={route.id} />;
        break;
      case "las":
        sida = <SaLaserDu key="las" />;
        break;
      case "om":
        sida = <OmRapporten key="om" />;
        break;
    }
  }

  return (
    <Ram kapitel={kapitel} klar={klar} sidnamn={sidtitel} egnaLandmarken={egnaLandmarken}>
      {sida}
    </Ram>
  );
}

/** Sidans namn i positionsraden och fönstrets titel. Tomt för startsidan. */
function titelFor(route: Route, index: KapitelIndex | null): string {
  switch (route.sida) {
    case "start":
      return "";
    case "sammanfattning":
      return "Sammanfattning";
    case "kapitel":
      return index?.kapitel.find((k) => k.id === route.id)?.namn ?? "";
    case "begrepp":
      return "Begrepp";
    case "las":
      return "Så läser du rapporten";
    case "om":
      return "Om rapporten";
  }
}

/** Gamla ankare (#rapport-{x}): uppslag bland laddade kapitel, annars sökning i datan. */
function useGamlaAnkare(ankare: string | null, index: KapitelIndex | null): void {
  useEffect(() => {
    if (!index) return;
    return registreraAnkarUppslag((x) => kapitelForBlockICache(index, x));
  }, [index]);

  useEffect(() => {
    if (!ankare || !index) return;
    let avbruten = false;
    hittaKapitelForBlock(index, ankare).then((kap) => {
      if (avbruten) return;
      const till = kap ? skrivOmGammalt(ankare, { kapitelFor: () => kap }) : null;
      // Gamla ankare har ingen vy: kapitlet öppnas enligt KAPITELVY
      navigera(till ?? START, { ersatt: true, fokus: false, utanVy: true });
    });
    return () => {
      avbruten = true;
    };
  }, [ankare, index]);
}
