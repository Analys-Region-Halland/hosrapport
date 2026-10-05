import { useState } from "react";
import type { Scope } from "./types";
import StartScreen from "./components/StartScreen";
import ReportShell from "./components/ReportShell";
import Ram from "./rapport/Ram";

// ════════════════════════════════════════════════════════════
//  App: väljer mellan gamla och nya rapporten (docs/arkitektur.md avsnitt 2).
//    ?ny i adressen → nya ramen (rapport/Ram.tsx). WP0 äger flaggan, WP6 den nya grenen.
//    annars         → gamla appen, oförändrad, tills WP9 och WP11 är godkända.
// ════════════════════════════════════════════════════════════

const NY = typeof location !== "undefined" && new URLSearchParams(location.search).has("ny");

export default function App() {
  return NY ? <Ram /> : <GammalApp />;
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
