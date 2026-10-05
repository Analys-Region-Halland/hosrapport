// nav/lager.ts: rapportens enda lagerstapel (popover, ark, dialog, meny,
// innehållsförteckningens ark). Escape stänger bara det översta lagret och
// navigerar aldrig (docs/arkitektur.md 4.6, stilguiden 4.5). Ägare: WP6.
// ui/lagerLokal.ts (WP5) och ui/lager.ts (WP4, kroken useLager) återexporterar
// härifrån, så det finns en stapel i hela appen.
//
// Användning i en komponent som öppnar något:
//
//   useEffect(() => {
//     if (!oppen) return;
//     return registreraLager(stang);
//   }, [oppen, stang]);
//
// Regler:
// - Ingen komponent lyssnar på Escape för egen räkning. Stapeln har den enda
//   lyssnaren: keydown på window i fångstfasen (samma som WP5:s lokala stapel),
//   så att lagret stängs innan något under det hinner reagera.
// - När ett lager stängs hindras standardbeteendet (t.ex. att en modal
//   <dialog> under lagret också avbryts) och händelsen stoppas helt.
// - Lagret tas ur stapeln innan stang() anropas; komponentens avregistrering
//   efteråt blir en tom operation. Två snabba Escape stänger två lager.
// - Utan öppna lager gör stapeln ingenting: Escape får sitt vanliga beteende.
// - Det som ska kunna stängas med Escape (även en tooltip) registrerar sig som
//   lager. Escape under pågående inmatning med IME (isComposing) räknas inte.
// - arOverst(stang) säger om lagret med den stängfunktionen ligger överst, så
//   att även klick utanför bara stänger det översta lagret.

export interface Tangenthandelse {
  key: string;
  defaultPrevented?: boolean;
  isComposing?: boolean;
  preventDefault(): void;
  stopImmediatePropagation(): void;
}

export interface Lagerstapel {
  /** Lägger ett lager överst. Returnerar en funktion som tar bort det (var det än ligger). */
  registrera(stang: () => void): () => void;
  /** Stänger det översta lagret. Sant om det fanns något att stänga. */
  stangOversta(): boolean;
  /** Sant när lagret med denna stängfunktion ligger överst. */
  arOverst(stang: () => void): boolean;
  antal(): number;
  /** Hanterar en tangenttryckning: Escape stänger det översta lagret. */
  hanteraTangent(e: Tangenthandelse): void;
}

/** Ny, fristående stapel. Appen använder den gemensamma via registreraLager;
 *  egna staplar är till för tester. */
export function skapaLagerstapel(): Lagerstapel {
  const stapel: { stang: () => void }[] = [];

  const stangOversta = (): boolean => {
    const post = stapel.pop();
    if (!post) return false;
    post.stang();
    return true;
  };

  return {
    registrera(stang) {
      const post = { stang };
      stapel.push(post);
      return () => {
        const i = stapel.indexOf(post);
        if (i >= 0) stapel.splice(i, 1);
      };
    },
    stangOversta,
    arOverst: (stang) => stapel.length > 0 && stapel[stapel.length - 1].stang === stang,
    antal: () => stapel.length,
    hanteraTangent(e) {
      if (e.key !== "Escape" || e.defaultPrevented || e.isComposing) return;
      if (!stangOversta()) return;
      e.preventDefault();
      e.stopImmediatePropagation();
    },
  };
}

// ── Den gemensamma stapeln ──

const gemensam = skapaLagerstapel();
let installerad = false;

function installera(): void {
  if (installerad || typeof window === "undefined") return;
  installerad = true;
  window.addEventListener("keydown", (e) => gemensam.hanteraTangent(e), true);
}

/** Lägger ett lager överst i den gemensamma stapeln. Returnerar en funktion som tar bort det. */
export function registreraLager(stang: () => void): () => void {
  installera();
  return gemensam.registrera(stang);
}

/** Samma som registreraLager. Namnet från WP0:s stubb, behålls för paket som skrevs mot den. */
export const oppnaLager = registreraLager;

/** Sant när lagret med denna stängfunktion ligger överst i den gemensamma stapeln. */
export function arOverst(stang: () => void): boolean {
  return gemensam.arOverst(stang);
}

/** Stänger det översta lagret i den gemensamma stapeln. */
export function stangOverstaLager(): boolean {
  return gemensam.stangOversta();
}

/** Antal öppna lager i den gemensamma stapeln. */
export function antalLager(): number {
  return gemensam.antal();
}
