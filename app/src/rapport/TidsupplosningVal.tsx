// rapport/TidsupplosningVal.tsx: väljaren för tidsupplösning sist i kapitlets
// metarad (stilguiden 4.3 och 5.4). Ägare: WP6.
//
// Ett tunt omslag kring ui/Flikar (WP4): textflikar, visas bara när det finns
// fler än en tidsupplösning, pilarna flyttar fokus och Enter eller mellanslag
// väljer (manuell aktivering, eftersom ett val laddar om kapitlet). Vyerna
// står alltid i ordningen dag, vecka, månad, kvartal, år. Rapportsidan (WP9)
// lägger väljaren i Masthead (children).

import type { ReactNode } from "react";
import type { VyId } from "../data/modell";
import { arVy, VYER } from "../nav/route";
import Flikar from "../ui/Flikar";
import s from "./TidsupplosningVal.module.css";

export interface TidsupplosningValProps {
  vyer: VyId[];
  aktiv: VyId;
  onByt(vy: VyId): void;
}

const VYNAMN: Record<VyId, string> = {
  dag: "Dag",
  vecka: "Vecka",
  manad: "Månad",
  kvartal: "Kvartal",
  ar: "År",
};

export default function TidsupplosningVal({ vyer, aktiv, onByt }: TidsupplosningValProps): ReactNode {
  const ordnade = VYER.filter((v) => vyer.includes(v));
  if (ordnade.length <= 1) return null;
  return (
    <div className={s.val} data-tidsupplosning="">
      <Flikar
        flikar={ordnade.map((v) => ({ id: v, etikett: VYNAMN[v] }))}
        aktiv={aktiv}
        onByt={(id) => {
          if (arVy(id)) onByt(id);
        }}
        etikett="Tidsupplösning"
      />
    </div>
  );
}
