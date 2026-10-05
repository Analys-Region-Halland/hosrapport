// figur/TabellVy.tsx: figurens tabellvy, en riktig <table> med <caption> (stilguiden 5.9).
// Ägare: WP4. Byggs ur spec.tabell; captionen är figurens titel och döljs
// visuellt eftersom titeln står ovanför. Fokusenhetens rad i 600, tal
// högerställda med samma decimaler per kolumn (ui/Tabell). Saknade värden
// förklaras under tabellen. Rutan rullar i sidled och kan nås med Tab; den är
// en namngiven grupp, inte en landmärkesregion, eftersom många figurer har
// samma titel.

import { useId } from "react";
import type { ChartSpec } from "../charts/spec";
import type { TalFormat } from "../data/modell";
import { SAKNAS, UNDERTRYCKT } from "../design/format";
import Tabell from "../ui/Tabell";
import s from "./TabellVy.module.css";

export interface TabellVyProps {
  tabell: ChartSpec["tabell"];
  format?: Pick<TalFormat, "decimaler">;
  captionSynlig?: boolean;
}

export default function TabellVy({ tabell, format, captionSynlig = false }: TabellVyProps) {
  const id = useId();
  const celler = tabell.rader.flat();
  const saknas = celler.some((v) => v === null || v === SAKNAS);
  const dolda = celler.some((v) => v === UNDERTRYCKT);
  const forklaring = [
    saknas ? `${SAKNAS} betyder att värde saknas.` : "",
    dolda ? `${UNDERTRYCKT} betyder att värdet inte visas eftersom det bygger på för få fall.` : "",
  ].filter(Boolean).join(" ");

  return (
    <div data-tabellvy="">
      <div className={s.rulla} role="group" aria-labelledby={id} tabIndex={0}>
        <span id={id} hidden>{tabell.caption}</span>
        <Tabell
          caption={tabell.caption}
          kolumner={tabell.kolumner}
          rader={tabell.rader}
          fokusRad={tabell.fokusRad}
          format={format}
          captionDold={!captionSynlig}
        />
      </div>
      {forklaring && <p className={s.forklaring}>{forklaring}</p>}
    </div>
  );
}
