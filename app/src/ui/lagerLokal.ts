// ui/lagerLokal.ts: tillfällig lagerstapel för popover och ark tills nav/lager.ts
// (WP6) finns. Escape stänger bara det översta lagret (stilguiden 4.5, arkitektur
// 4.6). Gränssnittet är detsamma som stapeln i nav/lager.ts: registrera en
// stängfunktion, få tillbaka en avregistrering. När WP6 är sammanslagen ersätts
// kroppen i registreraLager med ett anrop till oppnaLager. Ägare: WP5.
//
// Lyssnaren sitter på window i fångstfasen och stoppar händelsen, så att ett
// Escape som stänger en popover inte också når lyssnare längre ned (till exempel
// en förstoringsdialog under popovern).

type Stang = () => void;

const stapel: Stang[] = [];
let lyssnar = false;

function vidTangent(e: KeyboardEvent): void {
  if (e.key !== "Escape" || e.isComposing || stapel.length === 0) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  stapel[stapel.length - 1]();
}

/** Lägger ett lager överst. Returnerar en funktion som tar bort det. */
export function registreraLager(stang: Stang): () => void {
  stapel.push(stang);
  if (!lyssnar && typeof window !== "undefined") {
    window.addEventListener("keydown", vidTangent, true);
    lyssnar = true;
  }
  return () => {
    const i = stapel.lastIndexOf(stang);
    if (i >= 0) stapel.splice(i, 1);
    if (stapel.length === 0 && lyssnar) {
      window.removeEventListener("keydown", vidTangent, true);
      lyssnar = false;
    }
  };
}

/** Sant när lagret med denna stängfunktion ligger överst. Används för att ett
 *  klick utanför bara ska stänga det översta lagret, precis som Escape. */
export function arOverst(stang: Stang): boolean {
  return stapel.length > 0 && stapel[stapel.length - 1] === stang;
}
