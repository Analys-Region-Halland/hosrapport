// rapport/Verktygsrad.tsx: verktygsraden med "← Alla kapitel", positionsraden
// och Exportera (stilguiden 4.5 och 5.3). Ägare: WP6.
//
// Sticky, höjd matt.verktygsrad, farg.papper. En hårlinje under raden visas
// först när sidan rullats. Ryms i 360 px: positionsraden kortas och
// exportmenyn blir en ikon med etikett för skärmläsare (ikonmeny).
//
// Exportmenyn är ui/Meny (menyknapp, ikonläge och kryssval för
// Redigeringsläge på/av). Escape går via lagerstapeln i nav/lager.ts.

import { useSyncExternalStore, type ReactNode } from "react";
import Lank from "../nav/Lank";
import { START } from "../nav/route";
import Meny, { type MenyVal } from "../ui/Meny";
import s from "./Verktygsrad.module.css";

export interface VerktygsradProps {
  /** Positionsraden. */
  children?: ReactNode;
  /** Valen i Exportera-menyn. Tom lista = ingen meny. */
  meny?: MenyVal[];
  /** Menyknappen som ikon med etikett för skärmläsare (mobil). */
  ikonmeny?: boolean;
  /** Kort statusmeddelande, t.ex. "Länken är kopierad." Läses upp (role=status). */
  status?: string;
  /** Desktop med innehållsförteckning: raden följer sidans spalter. */
  spalt?: boolean;
  /** Inte sticky och med hårlinje, för den levande stilguiden. */
  statisk?: boolean;
}

// Om sidan är rullad. Bara ett booleskt värde, så raden ritas om när det byts.
const arRullad = () => typeof scrollY !== "undefined" && scrollY > 0;
function prenumereraRullning(f: () => void): () => void {
  addEventListener("scroll", f, { passive: true });
  return () => removeEventListener("scroll", f);
}

// Exportmenyns ikon i mobil (pil upp ur en låda)
const EXPORTIKON = (
  <svg className={s.ikon} viewBox="0 0 16 16" aria-hidden="true">
    <path d="M8 10.5V2.5M5 5.5l3-3 3 3M3 9v4.5h10V9" />
  </svg>
);

export default function Verktygsrad({ children, meny = [], ikonmeny = false, status = "", spalt = false, statisk = false }: VerktygsradProps): ReactNode {
  const rullad = useSyncExternalStore(prenumereraRullning, arRullad, () => false);
  return (
    <header
      className={s.verktygsrad}
      data-verktygsrad=""
      data-rullad={rullad || statisk || undefined}
      data-spalt={spalt || undefined}
      data-statisk={statisk || undefined}
    >
      <div className={s.inre}>
        <Lank till={START} className={s.tillbaka} data-tillbaka="">
          <span aria-hidden="true">←</span>Alla kapitel
        </Lank>
        <div className={s.mitt}>{children}</div>
        {meny.length > 0 && (
          <div className={s.meny} data-exportera="">
            <Meny etikett="Exportera" val={meny} ikon={ikonmeny ? EXPORTIKON : undefined} justera="slut" />
          </div>
        )}
      </div>
      <p className={s.status} role="status">{status}</p>
    </header>
  );
}
