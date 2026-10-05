// rapport/RamPlatshallare.tsx: platshållaren för "Så läser du rapporten" tills
// sidan är skriven. Ägare: WP6.

import s from "./RamPlatshallare.module.css";

export function LasPlatshallare() {
  return (
    <article className={s.kapitel} data-platshallare="las">
      <header>
        <h1 className={s.titel}>Så läser du rapporten</h1>
        <p className={s.dek}>Läsanvisningen är inte skriven än.</p>
      </header>
    </article>
  );
}
