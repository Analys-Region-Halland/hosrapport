// grafprov.tsx: provbänk för diagrammen, för visuell granskning utan att
// klicka sig genom rapporten. Körs i dev-servern:
//
//   http://localhost:5173/verktyg/grafprov.html?vy=ar&sektion=skr-tillganglighet&kpi=kolada-n79179
//
// Frågeparametrar:
//   vy, sektion, kpi   vilken datafil och indikator (förval: första indikatorn)
//   w                  figurens bredd i px (förval: upp till matt.figur, 880)
//   fasta              kommaseparerade enhets-id som är fästa från början, t.ex. 0012,0001
//   visning            tid (förval), rang, enheter eller enheterRang
//   stilguide=linje    visa linjediagrammets stilguidesektion i stället
//
// Specen byggs med WP1:s normalisera + kpiTillSpec och ritas i WP4:s Figur.
// Fästa serier ägs här (som indikatorn gör i rapporten), ingår i specens
// kontext och delas med figuren via fasta/onFasta. Granskning med riktiga
// mushändelser: verktyg/grafprov.mjs (CDP mot headless Edge). Ägare: WP2.

import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
// Samma stilordning som main.tsx: reset och självhostade typsnitt, tema, gamla vyn.
import "../src/styles/index.css";
import "virtual:tema.css";
import "../src/index.css";
import Figur from "../src/figur/Figur";
import type { VisningId } from "../src/charts/spec";
import type { VyId } from "../src/data/modell";
import { useSpec } from "./grafprov-data";
import s from "./grafprov.module.css";
import { Sektion as LinjeSektion } from "./sektioner/linje.stilguide";

const q = new URLSearchParams(location.search);
const vy = (q.get("vy") ?? "ar") as VyId;
const sektion = q.get("sektion") ?? "skr-tillganglighet";
const kpi = q.get("kpi");
const w = q.get("w") ? Number(q.get("w")) : undefined;
const startFasta = (q.get("fasta") ?? "").split(",").map((x) => x.trim()).filter(Boolean);
const visning = (q.get("visning") ?? "tid") as VisningId;

export function Prov() {
  const [fasta, setFasta] = useState<string[]>(startFasta);
  const { spec, fel } = useSpec(vy, sektion, kpi, fasta, visning);
  if (fel) return <p className={s.etikett}>{fel}</p>;
  if (!spec) return <p className={s.etikett}>Laddar …</p>;
  return (
    <div className={s.prov} style={w ? { width: w } : undefined} data-grafprov="">
      <p className={s.etikett}>{spec.id} · {vy}</p>
      <Figur spec={spec} rubrikniva={4} fasta={fasta} onFasta={setFasta} />
    </div>
  );
}

export function Sida() {
  return (
    <main className={s.sida}>
      {q.get("stilguide") === "linje" ? <LinjeSektion /> : <Prov />}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<StrictMode><Sida /></StrictMode>);
