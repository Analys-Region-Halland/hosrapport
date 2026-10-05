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
      {screen.name === "start" ? (
        <StartScreen onPick={(scope) => setScreen({ name: "report", scope })} />
      ) : (
        <ReportShell scope={screen.scope} onBack={() => setScreen({ name: "start" })} />
      )}
    </>
  );
}
