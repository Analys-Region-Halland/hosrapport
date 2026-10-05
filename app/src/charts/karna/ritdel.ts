// charts/karna/ritdel.ts: vilken del av en renderares Rita som ska ritas.
// Diagram.tsx ritar de statiska lagren i den svg som har role="img" (den som
// figuren exporterar som SVG och PNG) och överlägget (hjälplinje, lyft linje,
// punkter) i en egen svg ovanpå, utan roll och utan pekarhändelser. Rita läser
// kontexten; utan leverantör (tester, andra anropare) ritas båda. Ägare: WP2.

import { createContext } from "react";

export type RitDel = "allt" | "statisk" | "overlagg";

export const RitDelKontext = createContext<RitDel>("allt");
