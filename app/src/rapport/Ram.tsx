// rapport/Ram.tsx: nya rapportens ram (verktygsrad, innehåll, sidan). Visas
// när adressen har ?ny (App.tsx). Ägare: WP6.
// Stubb från WP0: en tom ram som visar att flaggan, tokens (virtual:tema.css),
// typsnitten och CSS Modules (Ram.module.css i @layer komponent) fungerar.

import s from "./Ram.module.css";

export default function Ram() {
  return (
    <div className={s.ram} data-ram="">
      <main className={s.sida}>
        <p className={s.kicker}>Region Halland · Analys</p>
        <h1 className={s.titel}>Ny rapport under uppbyggnad</h1>
        <p className={s.ingress}>
          Här byggs den nya HoS-rapporten. Den gamla rapporten finns kvar på adressen utan ?ny.
        </p>
      </main>
    </div>
  );
}
