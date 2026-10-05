// figur/Kallrad.tsx: källraden med åtgärderna högerställda (stilguiden 6.1).
// Ägare: WP4. "Källa: {publikation/system}, {huvudman}", länk när URL finns.

import type { ReactNode } from "react";
import s from "./Kallrad.module.css";

export interface KallradProps {
  kalla?: { namn: string; url?: string };
  children?: ReactNode;     // åtgärderna
}

export default function Kallrad({ kalla, children }: KallradProps) {
  if (!kalla && !children) return null;
  return (
    <div className={s.rad} data-kallrad="">
      {kalla && (
        <p className={s.kalla}>
          Källa: {kalla.url ? <a href={kalla.url}>{kalla.namn}</a> : kalla.namn}
        </p>
      )}
      {children && <div className={s.atgarder}>{children}</div>}
    </div>
  );
}
