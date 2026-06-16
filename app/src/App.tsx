import { useState } from "react";
import type { Scope } from "./types";
import StartScreen from "./components/StartScreen";
import ReportShell from "./components/ReportShell";

// ════════════════════════════════════════════════════════════
//  App — tunn router (in-memory, inget bibliotek).
//    start  → StartScreen (välj "Alla områden" eller ett sakområde)
//    report → ReportShell (äger tidsvyn, laddar data, renderar rapporten)
//  Tidsperioden väljs INNE i rapporten — inte här, inte på startsidan.
// ════════════════════════════════════════════════════════════

type Screen = { name: "start" } | { name: "report"; scope: Scope };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: "start" });

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&family=Lexend+Deca:wght@300;400;500;600;700&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300;1,400&family=Source+Serif+4:ital,wght@0,400;0,600;0,700;1,400&display=swap"
        rel="stylesheet"
      />

      {screen.name === "start" ? (
        <StartScreen onPick={(scope) => setScreen({ name: "report", scope })} />
      ) : (
        <ReportShell scope={screen.scope} onBack={() => setScreen({ name: "start" })} />
      )}
    </>
  );
}
