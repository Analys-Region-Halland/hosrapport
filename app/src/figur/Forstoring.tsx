// figur/Forstoring.tsx: förstoringen som dialog med fokusfälla (stilguiden 6.8).
// Ägare: WP4. Ett skal runt ui/Dialog (role="dialog", aria-modal, fokusfälla,
// Escape stänger bara dialogen, fokus åter till knappen). Figur lägger samma
// figur som barn, med indikatornamnet som kicker och samma fästa serier.

import type { ReactNode } from "react";
import Dialog from "../ui/Dialog";
import s from "./Forstoring.module.css";

export interface ForstoringProps {
  oppen: boolean;
  onStang(): void;
  etikett: string;          // dialogens tillgängliga namn: indikatornamn och figurtitel
  children: ReactNode;
}

export default function Forstoring({ oppen, onStang, etikett, children }: ForstoringProps) {
  return (
    <Dialog oppen={oppen} onStang={onStang} etikett={etikett}>
      <div className={s.innehall} data-forstoring="">{children}</div>
    </Dialog>
  );
}
