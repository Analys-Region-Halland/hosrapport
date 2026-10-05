// charts/karna/nedborrning.ts: nedborrning från små multiplar (stilguiden 6.7):
// klick på en panels namn eller Enter i panelen anropar onFokus(enhetId).
// Diagram.tsx tar emot onFokus som prop. Figurer som ännu inte skickar den
// vidare till diagrammet (WP4:s Figur) kan i stället lägga funktionen i den
// här kontexten runt figuren; propen går före kontexten. Ägare: WP3.

import { createContext } from "react";

export const NedborrningKontext = createContext<((enhetId: string) => void) | null>(null);
