// rapport/Ram.tsx: nya rapportens ram (stilguiden 4.5): verktygsrad med
// positionsrad och Exportera, innehållsförteckning som spalt (≥ 1200 px) eller
// ark (under), och sidans innehåll. Visas när adressen har ?ny (App.tsx).
// Ägare: WP6.
//
// Ramen äger läspositionen: den rullar till i när innehållet är `klar`, kör
// scroll-spionen på kapitelsidor och visar aktivt block i positionsraden och
// innehållsförteckningen. Ingen nedtoning av andra block. Startsidan har ingen
// verktygsrad (den har egen brandlist, stilguiden 4.1).

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";
import type { KapitelModell } from "../data/modell";
import { format, STANDARDVY, type Route } from "../nav/route";
import { useAktivtBlock, aktivtBlock, useLasposition } from "../nav/scroll";
import { aktuellRoute, navigera, useRouteTillstand } from "../nav/useRoute";
import Innehall from "./Innehall";
import Positionsrad from "./Positionsrad";
import { useBrytpunkt } from "./ramBrytpunkt";
import { laddaAllaKapitel, laddaManifest } from "./ramData";
import { byggDisposition, positionsdelar } from "./ramDisposition";
import Verktygsrad, { type MenyVal } from "./Verktygsrad";
import s from "./Ram.module.css";

export interface RamProps {
  /** Kapitlet på kapitelsidor: ger innehållsförteckning och positionsrad. */
  kapitel?: KapitelModell | null;
  /** Innehållet för adressen är laddat och renderat; först då rullar ramen till läspositionen. */
  klar?: boolean;
  /** Sidans namn i positionsraden när sidan inte är ett kapitel. */
  sidnamn?: string;
  children?: ReactNode;
}

const RAPPORTTITEL = "Hälso- och sjukvården i Halland";

export default function Ram({ kapitel = null, klar = true, sidnamn = "", children }: RamProps): ReactNode {
  const t = useRouteTillstand();
  const { route } = t;
  const bp = useBrytpunkt();
  const aktivt = useAktivtBlock();
  const [arkOppet, setArkOppet] = useState(false);
  const arKapitel = route.sida === "kapitel" && kapitel !== null && kapitel.id === route.id;
  const disp = useMemo(() => (arKapitel && kapitel ? byggDisposition(kapitel) : null), [arKapitel, kapitel]);
  const { val, status } = useExportMeny(route, arKapitel ? kapitel : null);

  useLasposition(t, klar, arKapitel);

  const hoppa = (e: MouseEvent<HTMLAnchorElement>) => {
    // Inte via adressen: #innehall är ingen rapportadress
    e.preventDefault();
    document.getElementById("innehall")?.focus();
  };

  if (route.sida === "start") {
    return (
      <div className={s.ram} data-ram="" data-sida="start">
        <main id="innehall" className={s.start} tabIndex={-1}>{children}</main>
      </div>
    );
  }

  const spalt = disp !== null && bp === "desktop";
  const kapitelVy = route.sida === "kapitel" ? route.vy : STANDARDVY;
  const red = route.sida === "kapitel" && route.red === true;
  const ark = disp !== null && bp !== "desktop";
  const delar = disp ? positionsdelar(disp, aktivt) : [{ id: route.sida, text: sidnamn }];

  return (
    <div className={s.ram} data-ram="" data-sida={route.sida} data-spalt={spalt || undefined}>
      <a href="#innehall" className={s.hoppa} onClick={hoppa}>Hoppa till innehållet</a>
      <Verktygsrad meny={val} ikonmeny={bp === "mobil"} status={status} spalt={spalt}>
        <Positionsrad
          delar={delar}
          kort={bp === "mobil"}
          onOppnaInnehall={ark ? () => setArkOppet(true) : undefined}
          innehallOppet={ark && arkOppet}
        />
      </Verktygsrad>
      <div className={s.sida}>
        {spalt && kapitel && <Innehall kapitel={kapitel} aktivt={aktivt} variant="spalt" vy={kapitelVy} red={red} />}
        <main id="innehall" className={s.innehall} tabIndex={-1}>{children}</main>
      </div>
      {ark && kapitel && (
        <Innehall kapitel={kapitel} aktivt={aktivt} variant="ark" oppen={arkOppet} onStang={() => setArkOppet(false)} vy={kapitelVy} red={red} />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  Exportera: PowerPoint, Skriv ut, Kopiera länk till här, Redigeringsläge
// ════════════════════════════════════════════════════════════

function useExportMeny(route: Route, kapitel: KapitelModell | null): { val: MenyVal[]; status: string } {
  const [status, setStatus] = useState("");
  const timer = useRef(0);
  const visa = useCallback((text: string) => {
    setStatus(text);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setStatus(""), 5000);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);

  // PowerPoint (WP12a): exporten laddas först vid klick. Publiceringsdatumet
  // är manifestets för vyn, som på kapitlets metarad.
  const pptx = async (lista: () => Promise<KapitelModell[]>, titel: string, omfang: "kapitel" | "rapport") => {
    try {
      const vy = "vy" in route ? route.vy : STANDARDVY;
      visa("Skapar PowerPoint-filen.");
      const [kap, manifest, { exporteraPptx }] = await Promise.all([lista(), laddaManifest(), import("../export/pptx")]);
      const publicerad = manifest[vy]?.datum;
      await exporteraPptx(kap, { titel, vy, omfang, ...(publicerad ? { publicerad } : {}) });
      visa("PowerPoint-filen är klar.");
    } catch (e) {
      console.error(e);
      visa("Kunde inte skapa PowerPoint-filen.");
    }
  };

  const kopiera = () => {
    // Länk till blocket läsaren är i just nu, inte till den fördröjda adressen
    const r = aktuellRoute();
    const blk = aktivtBlock();
    const till: Route = r.sida === "kapitel" && blk !== (r.i ?? "")
      ? { sida: "kapitel", id: r.id, vy: r.vy, ...(blk ? { i: blk } : {}), ...(r.red ? { red: true } : {}) }
      : r;
    const url = location.href.split("#")[0] + format(till);
    navigator.clipboard.writeText(url).then(
      () => visa("Länken är kopierad."),
      () => visa("Kunde inte kopiera länken."),
    );
  };

  const val: MenyVal[] = [];
  if (route.sida === "kapitel" && kapitel) {
    val.push({ id: "pptx-kapitel", etikett: "PowerPoint (kapitlet)", onVal: () => void pptx(async () => [kapitel], kapitel.namn, "kapitel") });
  }
  if (route.sida === "kapitel" || route.sida === "sammanfattning") {
    const vy = route.vy;
    val.push({ id: "pptx-rapport", etikett: "PowerPoint (hela rapporten)", onVal: () => void pptx(() => laddaAllaKapitel(vy), RAPPORTTITEL, "rapport") });
  }
  val.push({ id: "skriv-ut", etikett: "Skriv ut", onVal: () => print() });
  val.push({ id: "kopiera-lank", etikett: "Kopiera länk till här", onVal: kopiera });
  if (route.sida === "kapitel") {
    val.push({
      id: "redigera",
      etikett: "Redigeringsläge",
      kryssad: route.red === true,
      onVal: () => navigera({ ...route, red: !route.red }, { ersatt: true, rulla: false }),
    });
  }
  return { val, status };
}
