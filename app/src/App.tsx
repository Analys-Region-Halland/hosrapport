import { useEffect, useState, type ReactNode } from "react";
import type { Scope } from "./types";
import StartScreen from "./components/StartScreen";
import ReportShell from "./components/ReportShell";
import BegreppSida from "./begrepp/BegreppSida";
import { skrivOmGammalt, START, STANDARDVY, type Route } from "./nav/route";
import { navigera, registreraAnkarUppslag, useRouteTillstand } from "./nav/useRoute";
import KapitelSida from "./rapport/KapitelSida";
import Ram from "./rapport/Ram";
import {
  hittaKapitelForBlock, kapitelForBlockICache, useAllaKapitel, useKapitel, useKapitelIndex, vyForKapitel,
  type KapitelIndex,
} from "./rapport/ramData";
import {
  BegreppPlatshallare, KapitelPlatshallare, Laddar, LasPlatshallare, SammanfattningPlatshallare,
  StartPlatshallare, Stubbgrans,
} from "./rapport/RamPlatshallare";
import Sammanfattning from "./rapport/Sammanfattning";
import StartSida from "./start/StartSida";

// ════════════════════════════════════════════════════════════
//  App: väljer mellan gamla och nya rapporten (docs/arkitektur.md avsnitt 2).
//    ?ny i adressen → nya appen (NyApp nedan). WP0 äger flaggan, WP6 den nya grenen.
//    annars         → gamla appen, oförändrad, tills WP9 och WP11 är godkända.
// ════════════════════════════════════════════════════════════

const NY = typeof location !== "undefined" && new URLSearchParams(location.search).has("ny");

export default function App() {
  return NY ? <NyApp /> : <GammalApp />;
}

// ════════════════════════════════════════════════════════════
//  Nya appen: adresser enligt arkitektur.md 4.6 (nav/route.ts)
//    #/                      startsidan (WP11)
//    #/sammanfattning?vy=    sammanfattningen (WP9)
//    #/kapitel/{id}?vy=&i=   kapitlet (WP9), rullat till blocket i
//    #/begrepp, #/begrepp/x  begreppslistan (WP5)
//    #/las                   så läser du rapporten
//  Sidorna i andra paket renderas i en Stubbgrans: så länge de är stubbar
//  visas ramens platshållare (rapport/RamPlatshallare.tsx).
// ════════════════════════════════════════════════════════════

function NyApp() {
  const t = useRouteTillstand();
  const { route, ankare } = t;
  const { index, fel: indexFel } = useKapitelIndex();

  // Ett kapitel visas bara i en vy där det finns; annars byts vyn eller (okänt kapitel) startsidan.
  const kapitelVy = route.sida === "kapitel" && index ? vyForKapitel(index, route.id, route.vy) : undefined;
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
        sida = (
          <Stubbgrans key="start" ersattning={<StartPlatshallare index={index} />}>
            <StartSida onValj={(id) => navigera({ sida: "kapitel", id, vy: (index && vyForKapitel(index, id, STANDARDVY)) ?? STANDARDVY })} />
          </Stubbgrans>
        );
        break;
      case "kapitel": {
        kapitel = kap.kapitel;
        klar = kap.klar;
        const vyer = index?.kapitel.find((k) => k.id === route.id)?.vyer ?? [route.vy];
        sida = kap.kapitel ? (
          <Stubbgrans
            key={`kapitel:${route.id}`}
            ersattning={
              <KapitelPlatshallare
                kapitel={kap.kapitel}
                vy={route.vy}
                vyer={vyer}
                period={index?.period[route.vy]}
                onVy={(vy) => navigera({ ...route, vy }, { fokus: false })}
              />
            }
          >
            <KapitelSida kapitel={kap.kapitel} vy={route.vy} />
          </Stubbgrans>
        ) : (
          <Laddar fel={kap.fel} />
        );
        break;
      }
      case "sammanfattning":
        klar = alla.kapitel !== null;
        sida = alla.kapitel ? (
          <Stubbgrans key="sammanfattning" ersattning={<SammanfattningPlatshallare kapitel={alla.kapitel} vy={route.vy} />}>
            <Sammanfattning kapitel={alla.kapitel} vy={route.vy} />
          </Stubbgrans>
        ) : (
          <Laddar fel={alla.fel} />
        );
        break;
      case "begrepp":
        sida = (
          <Stubbgrans key="begrepp" ersattning={<BegreppPlatshallare id={route.id} />}>
            <BegreppSida id={route.id} />
          </Stubbgrans>
        );
        break;
      case "las":
        sida = <LasPlatshallare />;
        break;
    }
  }

  return (
    <Ram kapitel={kapitel} klar={klar} sidnamn={sidtitel}>
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
      navigera(till ?? START, { ersatt: true, fokus: false });
    });
    return () => {
      avbruten = true;
    };
  }, [ankare, index]);
}

// ════════════════════════════════════════════════════════════
//  Gamla appen: tunn router i minnet, inget bibliotek.
//    start  → StartScreen (välj "Alla områden" eller ett sakområde)
//    report → ReportShell (äger tidsvyn, laddar data, renderar rapporten)
//  Tidsperioden väljs inne i rapporten, inte här och inte på startsidan.
//  Typsnitten är självhostade (styles/typsnitt.css), inte Google Fonts.
// ════════════════════════════════════════════════════════════

type Screen = { name: "start" } | { name: "report"; scope: Scope };

function GammalApp() {
  const [screen, setScreen] = useState<Screen>({ name: "start" });

  return screen.name === "start" ? (
    <StartScreen onPick={(scope) => setScreen({ name: "report", scope })} />
  ) : (
    <ReportShell scope={screen.scope} onBack={() => setScreen({ name: "start" })} />
  );
}
