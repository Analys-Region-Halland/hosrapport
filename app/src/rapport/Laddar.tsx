// rapport/Laddar.tsx: det ramen visar medan en sida laddas, eller när den inte
// gick att ladda. Ägare: WP6 (var del av RamPlatshallare.tsx).

import s from "./Laddar.module.css";

/** Laddar eller fel. */
export function Laddar({ fel, text = "Laddar …" }: { fel?: string | null; text?: string }) {
  return fel ? (
    <p role="alert" className={s.fel}>Kunde inte ladda rapporten: {fel}</p>
  ) : (
    <p role="status" className={s.laddar}>{text}</p>
  );
}
