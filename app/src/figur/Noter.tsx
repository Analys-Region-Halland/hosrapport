// figur/Noter.tsx: figurens noter, "Not: …" (stilguiden 6.1).
// Ägare: WP4. Alla noter (seriebrott, luckor, undertryckta värden, olika skalor)
// står i ett stycke som börjar med "Not:". Inga noter, inget element.

import type { Not } from "../data/modell";
import s from "./Noter.module.css";

export interface NoterProps {
  noter: Not[];
}

export default function Noter({ noter }: NoterProps) {
  const texter = noter.map((n) => n.text.trim()).filter(Boolean);
  if (texter.length === 0) return null;
  return <p className={s.noter} data-noter="">Not: {texter.join(" ")}</p>;
}
