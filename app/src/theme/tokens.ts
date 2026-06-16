// tokens.ts — Designsystemets enda sanningskälla för JS/D3.
//
// Samma värden finns som CSS-variabler i app/src/index.css (:root) för
// CSS/komponenter. D3-koden och inline-styles som behöver råvärden importerar
// härifrån. Ändra på BÅDA ställena vid behov (de speglar varandra).

export const color = {
  brand700: "#00664D", // Region Halland mörkgrön — rubriker, primärknapp
  brand500: "#00AB60", // ljusgrön — accenter, overlines
  brand50: "#E3F4E2",  // hover-ton
  ink: "#1a1a1a",      // brödtext
  muted: "#83888A",    // sekundär text
  faint: "#999999",    // tertiär text
  hairline: "#e0e0dc", // tunna linjer/kanter
  surface: "#ffffff",  // kortyta
  canvas: "#eeeee9",   // sidbakgrund
} as const;

// 4px-baserad spacingskala (index: px)
export const space = [0, 4, 8, 12, 16, 20, 24, 28, 32, 40, 48, 64] as const;

export const radius = { sm: 4, md: 6, lg: 8, xl: 10 } as const;

export const shadow = {
  card: "0 1px 3px rgba(0,0,0,0.04)",
  hover: "0 3px 12px rgba(0,0,0,0.08)",
  modal: "0 20px 60px rgba(0,0,0,0.12)",
} as const;

export const z = { toolbar: 10, modal: 200, tooltip: 9999 } as const;

// Återexportera signal-/typsnitts-tokens så allt designsystem nås från ett ställe
export {
  SIGNAL_COLORS,
  SIGNAL_BG,
  SIGNAL_SHAPES,
  SIGNAL_LABELS,
  FONT,
  FONT_MONO,
  FONT_TITEL,
  DEPT_COLORS,
} from "../charts/constants";
