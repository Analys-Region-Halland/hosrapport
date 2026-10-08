// rapport/Indikator.tsx: en indikator (stilguiden 4.4). Ägare: WP9.
//
// Ordning, och inget annat:
//   1 rubrikrad     nummer (farg.fokus) + namn (h3, typ.roll.indikator) +
//                   statusmarkör efter namnet; ingen markör för beskrivande mått
//   2 analys        Prosa med begrepp, proveniensrad med länk till Om statistiken
//   3 figur         figur/Figur med h4, visningar, nivåer (brödsmula, nedborrning)
//                   och dagflik, monteras när den närmar sig skärmen
//   4 fördjupning   stängd <details> (rapport/IndikatorFordjupning)
//   5 kommentar     bara när en finns, eller i redigeringsläget (rapport/Kommentar)
// Nyckeltalsraden (värde · plats · period) togs bort 2026-10-08: värde och
// plats står i analysens första mening, i figuren och i Läget i korthet.
// Figurens titel är indikatornamnet, så att figuren står på egna ben vid export.
//
// Begreppen länkas första gången i indikatorn: analysen och fördjupningen
// delar samma `redan`.
//
// Prestanda: blocket har content-visibility: auto, och figuren monteras först
// när den är inom en skärmhöjd från fönstret (IntersectionObserver). Platsen
// hålls med en uppskattad höjd så att sidan inte hoppar. Före utskrift
// monteras alla figurer.

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import Prosa from "../begrepp/Prosa";
import { kpiTillSpec, visningar } from "../charts/kpiTillSpec";
import type { SpecKontext, VisningId } from "../charts/spec";
import type { KapitelModell, KpiModell, VyId } from "../data/modell";
import { tema } from "../design/tema";
import Figur from "../figur/Figur";
import { anmalFigurlage, useFigurAdress } from "../nav/figurlage";
import Lank from "../nav/Lank";
import { KAPITELBLOCK } from "../nav/route";
import { sattAktivtBlock } from "../nav/scroll";
import { aktuellRoute, navigera } from "../nav/useRoute";
import StatusMarkor from "../ui/StatusMarkor";
import IndikatorFordjupning from "./IndikatorFordjupning";
import Kommentar from "./Kommentar";
import { figurReserv, indikatorUppskattning } from "./hojder";
import { brodsmula, bytFokus, giltigtLage, lageFranAdress, lageTillAdress, type NivaLage } from "./nedborrning";
import t from "./delat.module.css";
import s from "./Indikator.module.css";

export interface IndikatorProps {
  kpi: KpiModell;
  kapitel: KapitelModell;
  /** "2.3", ur byggDisposition. */
  nummer: string;
  vy: VyId;
  /** Redigeringsläget (route.red): kommentarer kan läggas till och ändras. */
  redigera?: boolean;
  /** Montera figuren först nära skärmen. Förval: sant (falskt i stilguiden och tester). */
  latFigur?: boolean;
}

export const PROVENIENS = "AI-analys, genererad ur rapportens data.";

export default function Indikator({ kpi, kapitel, nummer, vy, redigera = false, latFigur = true }: IndikatorProps): ReactNode {
  const rubrikId = useId();
  const [redan] = useState(() => new Set<string>());
  const analys = kpi.analystext.trim();
  const om = { sida: "kapitel" as const, id: kapitel.id, vy, i: KAPITELBLOCK.om, ...(redigera ? { red: true } : {}) };
  // Uppskattad höjd för content-visibility innan blocket ritats första gången
  const [hojd] = useState(() => indikatorUppskattning(typeof innerWidth === "number" ? innerWidth : tema.matt.figur));

  return (
    <section
      className={s.indikator}
      style={{ containIntrinsicSize: `auto ${hojd}px` }}
      data-block={kpi.id}
      data-indikator=""
      aria-labelledby={rubrikId}
    >
      <div className={s.rubrikrad}>
        <h3 id={rubrikId} className={s.rubrik}>
          <span className={t.nr}>{nummer}</span>
          {kpi.namn}
        </h3>
        {kpi.status && (
          <span className={s.status}>
            <span className="visuellt-dold">Status: </span>
            <StatusMarkor status={kpi.status} />
          </span>
        )}
      </div>

      {analys && (
        <div className={s.analys}>
          {/* Proveniensen som en liten ruta före texten; hela rutan leder till Om statistiken */}
          <Lank till={om} className={s.proveniens} data-proveniens="">
            <svg className={s.proveniensikon} viewBox="0 0 16 16" aria-hidden="true">
              <path d="M8 1.5 9.4 6.6 14.5 8 9.4 9.4 8 14.5 6.6 9.4 1.5 8 6.6 6.6Z" />
            </svg>
            <span><b>AI-analys</b>, genererad ur rapportens data.</span>
            <span className={s.proveniensvidare}>Så skapas texten <span aria-hidden="true">→</span></span>
          </Lank>
          <Prosa text={analys} redan={redan} className={t.brod} />
        </div>
      )}

      <div className={s.figur}>
        <LatMontering lat={latFigur}>
          <IndikatorFigur kpi={kpi} kapitel={kapitel} vy={vy} />
        </LatMontering>
      </div>

      <div className={s.fordjupning}>
        <IndikatorFordjupning kpi={kpi} kapitel={kapitel} vy={vy} redan={redan} />
      </div>

      <div className={s.kommentar}>
        <Kommentar vy={vy} targetId={kpi.id} redigera={redigera} />
      </div>
    </section>
  );
}

// ════════════════════════════════════════════════════════════
//  Figuren: visning, fästa serier och dagfliken
// ════════════════════════════════════════════════════════════

// Nivåer (WP10, stilguiden 6.7): figurens läge är fokusenheten och visningen
// (rapport/nedborrning.ts). Nivåflikarna kommer ur WP1:s visningar för fokus
// ("Region Halland", "Per sjukhus"; med fokus på ett sjukhus "Halmstad", "Per
// avdelning"). Klick på en panels namn eller en rad i enheternas rangordning
// borrar ned, brödsmulan går upp. Läget står i adressen som v och e: det läses
// när figuren monteras och när läsaren går bakåt eller framåt till indikatorn,
// och skrivs med replaceState när läsaren byter flik eller nivå. Registret i
// nav/figurlage.ts ger "Kopiera länk" och läspositionen samma läge.

export interface IndikatorFigurProps {
  kpi: KpiModell;
  kapitel: KapitelModell;
  vy: VyId;
  /** Läget utan adress (stilguiden): fokus och visning att börja i. Förval: regionen, första visningen. */
  start?: NivaLage;
}

/** Indikatorns figur med visningar, nivåer och dagflik. Exporteras för stilguiden (WP10). */
export function IndikatorFigur({ kpi, kapitel, vy, start }: IndikatorFigurProps) {
  const adress = useFigurAdress();
  const [onskat, setOnskat] = useState<NivaLage>(() =>
    (adress || !start ? lageFranAdress(adress?.route ?? null, kpi, kapitel, vy) : start));
  // Bakåt, framåt och vanliga länkar till indikatorn: följ adressens läge
  const [adressNr, setAdressNr] = useState(adress?.nr);
  if (adress && adress.nr !== adressNr) {
    setAdressNr(adress.nr);
    const r = adress.route;
    if (adress.kalla === "historik" && r.sida === "kapitel" && r.i === kpi.id) setOnskat(lageFranAdress(r, kpi, kapitel, vy));
  }
  const lage = useMemo(() => giltigtLage(kpi, kapitel, vy, onskat), [kpi, kapitel, vy, onskat]);

  const [fasta, setFasta] = useState<string[]>([]);
  const [dagar, setDagar] = useState(false);
  const harDagar = (kpi.serier[lage.fokus]?.dagar?.length ?? 0) > 0;
  const pa = harDagar && dagar;

  // Flikarna hör till nivån, inte till dagfliken: samma flikar med och utan dagar
  const vis = useMemo(() => visningar(kpi, kapitel, { vy, fokus: lage.fokus }), [kpi, kapitel, vy, lage.fokus]);
  const brodsmulan = useMemo(() => brodsmula(kpi, kapitel, lage.fokus), [kpi, kapitel, lage.fokus]);
  // Specen byggs om bara när nivå, visning, dag eller fästa serier ändras; hovring
  // ändrar ingenting här, så de statiska lagren i diagrammet står still.
  const fokus = lage.fokus === kpi.fokus ? undefined : lage.fokus;
  const ctx: SpecKontext = useMemo(() => ({ vy, fokus, fasta, dagar: pa }), [vy, fokus, fasta, pa]);
  const spec = useMemo(() => kpiTillSpec(kpi, kapitel, ctx, lage.visning), [kpi, kapitel, ctx, lage.visning]);

  // Läget i registret (för "Kopiera länk" och läspositionen), bara i rapportens ram
  const iRam = adress !== null;
  const adressLage = useMemo(() => lageTillAdress(kpi, kapitel, vy, lage), [kpi, kapitel, vy, lage]);
  useEffect(() => {
    if (!iRam) return;
    anmalFigurlage(kpi.id, adressLage);
    return () => anmalFigurlage(kpi.id, null);
  }, [iRam, kpi.id, adressLage]);

  /** Nytt läge från läsaren: tillstånd, register och adress (replaceState, ingen rullning). */
  const byt = (ny: NivaLage) => {
    setOnskat(ny);
    if (!iRam) return;
    const lage = lageTillAdress(kpi, kapitel, vy, ny);
    anmalFigurlage(kpi.id, lage);
    const r = aktuellRoute();
    if (r.sida !== "kapitel" || r.id !== kapitel.id) return;
    navigera({
      sida: "kapitel", id: r.id, vy: r.vy, i: kpi.id,
      ...(lage.v ? { v: lage.v } : {}), ...(lage.e ? { e: lage.e } : {}), ...(r.red ? { red: true } : {}),
    }, { ersatt: true, rulla: false, fokus: false });
  };
  const bytVisning = (v: VisningId) => byt({ fokus: lage.fokus, visning: v });
  const bytNiva = (enhetId: string) => {
    byt(bytFokus(kpi, kapitel, vy, lage, enhetId));
    setFasta([]);
    // Läsaren arbetar i den här figuren: den är blocket läsaren står vid
    if (iRam) sattAktivtBlock(kpi.id);
  };
  // "Per dag" är en egen flik: den visar dagsserien över tid, inte den visning som var vald
  const dagFlik = harDagar
    ? { pa, onByt: (p: boolean) => { setDagar(p); if (p) bytVisning("tid"); } }
    : undefined;

  return (
    <Figur
      spec={spec}
      rubrikniva={4}
      indikatornamn={kapitel.namn}
      visningar={vis}
      visning={lage.visning}
      onVisning={bytVisning}
      brodsmula={brodsmulan}
      onFokus={bytNiva}
      fasta={fasta}
      onFasta={setFasta}
      dagFlik={dagFlik}
    />
  );
}

// ════════════════════════════════════════════════════════════
//  Lat montering
// ════════════════════════════════════════════════════════════

function LatMontering({ lat, children }: { lat: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [synlig, setSynlig] = useState(() => !lat || typeof IntersectionObserver === "undefined");
  const [reserv] = useState(() => figurReserv(typeof innerWidth === "number" ? innerWidth : tema.matt.figur));

  useEffect(() => {
    if (synlig) return;
    const el = ref.current;
    if (!el) return;
    const visa = () => setSynlig(true);
    const obs = new IntersectionObserver((poster) => {
      if (poster.some((p) => p.isIntersecting)) visa();
    }, { rootMargin: "100% 0px" });
    obs.observe(el);
    addEventListener("beforeprint", visa);
    return () => {
      obs.disconnect();
      removeEventListener("beforeprint", visa);
    };
  }, [synlig]);

  if (synlig) return <>{children}</>;
  return <div ref={ref} className={s.vantar} style={{ minBlockSize: reserv }} data-figur-vantar="" aria-hidden="true" />;
}
