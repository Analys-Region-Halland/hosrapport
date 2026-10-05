// figur/Atgarder.tsx: figurens åtgärder Tabell, Ladda ner och Förstora (stilguiden 6.1 och 6.8).
// Ägare: WP4. Tabell växlar mellan diagram och tabellvy; knappen heter
// "Diagram" när tabellen visas. Ladda ner är en meny med CSV, SVG och PNG.

import Knapp from "../ui/Knapp";
import Meny from "../ui/Meny";
import s from "./Atgarder.module.css";

export interface AtgarderProps {
  atgarder: ("tabell" | "ladda" | "forstora")[];
  tabellVisas: boolean;
  onTabell(): void;
  onLadda(format: "csv" | "svg" | "png"): void;
  onForstora(): void;
}

export default function Atgarder({ atgarder, tabellVisas, onTabell, onLadda, onForstora }: AtgarderProps) {
  if (atgarder.length === 0) return null;
  return (
    <div className={s.atgarder} data-atgarder="">
      {atgarder.includes("tabell") && (
        <Knapp onClick={onTabell} data-atgard="tabell">{tabellVisas ? "Diagram" : "Tabell"}</Knapp>
      )}
      {atgarder.includes("ladda") && (
        <Meny
          etikett="Ladda ner"
          typ="text"
          val={[
            { id: "csv", etikett: "CSV för Excel", onVal: () => onLadda("csv") },
            { id: "svg", etikett: "SVG", onVal: () => onLadda("svg") },
            { id: "png", etikett: "PNG", onVal: () => onLadda("png") },
          ]}
        />
      )}
      {atgarder.includes("forstora") && (
        <Knapp onClick={onForstora} aria-haspopup="dialog" data-atgard="forstora">Förstora</Knapp>
      )}
    </div>
  );
}
