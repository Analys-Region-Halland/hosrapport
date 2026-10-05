// nav/lager.ts: stapeln av öppna lager (popover, ark, dialog, meny). Escape
// stänger bara det översta och navigerar aldrig (docs/arkitektur.md 4.6,
// stilguiden 4.5). Ägare: WP6.
//
// Användning i en komponent som öppnar något:
//
//   useEffect(() => {
//     if (!oppen) return;
//     return registreraLager(() => setOppen(false));
//   }, [oppen]);
//
// Regler:
// - Ingen komponent lyssnar på Escape på document för egen räkning. Stapeln
//   har den enda lyssnaren (keydown på document, bubblingsfasen).
// - stang() anropas när lagret är överst och Escape trycks. Lagret är då redan
//   borttaget ur stapeln; avregistreringen som komponenten gör när den stängs
//   blir en tom operation.
// - En komponent som själv använder Escape inne i ett lager (t.ex. grafens
//   tooltip) anropar event.preventDefault(); då låter stapeln tangenten vara.
// - Escape under pågående inmatning med IME (isComposing) räknas inte.

export interface Tangenthandelse {
  key: string;
  defaultPrevented?: boolean;
  isComposing?: boolean;
  preventDefault(): void;
}

export interface Lagerstapel {
  /** Lägger ett lager överst. Returnerar en funktion som tar bort det (var det än ligger). */
  registrera(stang: () => void): () => void;
  /** Stänger det översta lagret. Sant om det fanns något att stänga. */
  stangOversta(): boolean;
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
    antal: () => stapel.length,
    hanteraTangent(e) {
      if (e.key !== "Escape" || e.defaultPrevented || e.isComposing) return;
      if (stangOversta()) e.preventDefault();
    },
  };
}

// ── Den gemensamma stapeln ──

const gemensam = skapaLagerstapel();
let installerad = false;

function installera(): void {
  if (installerad || typeof document === "undefined") return;
  installerad = true;
  document.addEventListener("keydown", (e) => gemensam.hanteraTangent(e));
}

/** Lägger ett lager överst i den gemensamma stapeln. Returnerar en funktion som tar bort det. */
export function registreraLager(stang: () => void): () => void {
  installera();
  return gemensam.registrera(stang);
}

/** Samma som registreraLager. Namnet från WP0:s stubb, behålls för paket som skrevs mot den. */
export const oppnaLager = registreraLager;

/** Stänger det översta lagret i den gemensamma stapeln. */
export function stangOverstaLager(): boolean {
  return gemensam.stangOversta();
}

/** Antal öppna lager i den gemensamma stapeln. */
export function antalLager(): number {
  return gemensam.antal();
}
