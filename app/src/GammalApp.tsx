// GammalApp.tsx: den gamla rapporten bakom ?gammal (docs/arkitektur.md avsnitt 2).
// Laddas för sig med dynamisk import från App.tsx, så att den inte ligger i
// nya appens huvudbit. Oförändrad i övrigt; raderas när användaren har
// granskat den nya rapporten.
//
// Tunn router i minnet, inget bibliotek:
//   start  → StartScreen (välj "Alla områden" eller ett sakområde)
//   report → ReportShell (äger tidsvyn, laddar data, renderar rapporten)
// Tidsperioden väljs inne i rapporten, inte här och inte på startsidan.
// Typsnitten är självhostade (styles/typsnitt.css), inte Google Fonts.
//
// Gamla vyns stilar (index.css, inslagen i @layer legacy) följer med här i
// stället för i main.tsx. Lagerordningen deklareras i index.html, så att
// stilarna hamnar under nya lagren fast de laddas sist.

import "./index.css";
import { useState } from "react";
import type { Scope } from "./types";
import StartScreen from "./components/StartScreen";
import ReportShell from "./components/ReportShell";

type Screen = { name: "start" } | { name: "report"; scope: Scope };

export default function GammalApp() {
  const [screen, setScreen] = useState<Screen>({ name: "start" });

  return screen.name === "start" ? (
    <StartScreen onPick={(scope) => setScreen({ name: "report", scope })} />
  ) : (
    <ReportShell scope={screen.scope} onBack={() => setScreen({ name: "start" })} />
  );
}
