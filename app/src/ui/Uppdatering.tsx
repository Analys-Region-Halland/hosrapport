// ui/Uppdatering.tsx: när rapporten och kapitlen uppdaterades (2026-10-08).
// Ersätter metaraderna ("Årsanalys 2025 · … · Publicerad 31 mar 2026").
//
// En vit ruta i samma kortspråk som statusrutan: en kalenderikon och två eller
// tre fält åtskilda av hårlinjer, varje fält med en kort etikett i farg.fokus
// och värdet i fet svart: "Uppdaterad 31 mars 2026", "Senaste data 2025",
// "Nästa uppdatering 31 dec 2026". Uppgifterna kommer ur manifestet.

import type { ReactNode } from "react";
import s from "./Uppdatering.module.css";

export interface UppdateringsFalt {
  etikett: string;
  varde: string;
}

export default function Uppdatering({ falt, storlek = "normal" }: { falt: UppdateringsFalt[]; storlek?: "normal" | "stor" }): ReactNode {
  if (!falt.length) return null;
  return (
    <dl className={`${s.ruta} ${storlek === "stor" ? s.stor : ""}`} data-uppdatering="">
      <svg className={s.ikon} viewBox="0 0 20 20" aria-hidden="true">
        <rect x="2.5" y="4" width="15" height="13.5" rx="2.5" />
        <path d="M2.5 8.5h15M6.5 2v4M13.5 2v4" />
      </svg>
      {falt.map((f) => (
        <div key={f.etikett} className={s.falt}>
          <dt className={s.etikett}>{f.etikett}</dt>
          <dd className={s.varde}>{f.varde}</dd>
        </div>
      ))}
    </dl>
  );
}
