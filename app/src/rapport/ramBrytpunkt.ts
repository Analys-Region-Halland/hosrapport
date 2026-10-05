// rapport/ramBrytpunkt.ts: aktuell brytpunkt (stilguiden 2.5) via matchMedia
// med mediafrågorna ur design/tema.ts. CSS-variabler går inte att använda i
// @media, så ramen väljer struktur (spalt eller ark, ikon eller text) här i
// stället för med egna px-värden i CSS. Ägare: WP6.

import { useSyncExternalStore } from "react";
import { mediafraga } from "../design/tema";

export type Brytpunkt = "mobil" | "mellan" | "desktop";

function las(): Brytpunkt {
  if (typeof matchMedia === "undefined") return "desktop";
  if (matchMedia(mediafraga.desktop).matches) return "desktop";
  if (matchMedia(mediafraga.mobil).matches) return "mobil";
  return "mellan";
}

function prenumerera(f: () => void): () => void {
  const fragor = [matchMedia(mediafraga.desktop), matchMedia(mediafraga.mobil)];
  fragor.forEach((m) => m.addEventListener("change", f));
  return () => fragor.forEach((m) => m.removeEventListener("change", f));
}

/** mobil < 640, mellan 640–1199, desktop ≥ 1200. */
export function useBrytpunkt(): Brytpunkt {
  return useSyncExternalStore(prenumerera, las, () => "desktop");
}
