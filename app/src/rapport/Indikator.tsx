// rapport/Indikator.tsx: en indikator (stilguiden 4.4). Ägare: WP9.
//
// Ordning, och inget annat:
//   1 rubrikrad     nummer (farg.fokus) + namn (h3, typ.roll.indikator) +
//                   statusmarkör efter namnet; ingen markör för beskrivande mått
//   2 nyckeltal     värde · plats · period (rapport/Nyckeltal)
//   3 analys        Prosa med begrepp, proveniensrad med länk till Om statistiken
//   4 figur         figur/Figur med h4, visningar och dagflik, monteras när den
//                   närmar sig skärmen
//   5 fördjupning   stängd <details> (rapport/IndikatorFordjupning)
//   6 kommentar     bara när en finns, eller i redigeringsläget (rapport/Kommentar)
// Status visas en gång (rubrikraden), värde, plats och period en gång
// (nyckeltalsraden) och namnet en gång (rubriken; figuren upprepar det inte,
// det står bara som kicker i förstoring och nedladdning).
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
import Lank from "../nav/Lank";
import { KAPITELBLOCK } from "../nav/route";
import StatusMarkor from "../ui/StatusMarkor";
import IndikatorFordjupning from "./IndikatorFordjupning";
import Kommentar from "./Kommentar";
import { figurReserv, indikatorUppskattning } from "./hojder";
import Nyckeltal from "./Nyckeltal";
import { utanUpprepning } from "./rapportText";
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
  const analys = useMemo(() => utanUpprepning(kpi.analystext, kpi), [kpi]);
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
            <span className={t.dold}>Status: </span>
            <StatusMarkor status={kpi.status} />
          </span>
        )}
      </div>

      <div className={s.nyckeltal}>
        <Nyckeltal kpi={kpi} vy={vy} />
      </div>

      {analys && (
        <div className={s.analys}>
          <Prosa text={analys} redan={redan} className={t.brod} />
          <p className={`${t.not} ${s.proveniens}`} data-proveniens="">
            {PROVENIENS}{" "}
            <Lank till={om} className={t.lank}>Så skapas texten</Lank>
          </p>
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

function IndikatorFigur({ kpi, kapitel, vy }: { kpi: KpiModell; kapitel: KapitelModell; vy: VyId }) {
  const [vald, setVald] = useState<VisningId | undefined>(undefined);
  const [fasta, setFasta] = useState<string[]>([]);
  const [dagar, setDagar] = useState(false);
  const harDagar = (kpi.serier[kpi.fokus]?.dagar?.length ?? 0) > 0;
  const pa = harDagar && dagar;

  const vis = useMemo(() => visningar(kpi, kapitel, { vy, dagar: pa }), [kpi, kapitel, vy, pa]);
  const visning: VisningId = vald && vis.some((v) => v.id === vald) ? vald : vis[0]?.id ?? "tid";
  // Specen byggs om bara när visning, dag eller fästa serier ändras; hovring
  // ändrar ingenting här, så de statiska lagren i diagrammet står still.
  const ctx: SpecKontext = useMemo(() => ({ vy, fasta, dagar: pa }), [vy, fasta, pa]);
  const spec = useMemo(() => kpiTillSpec(kpi, kapitel, ctx, visning), [kpi, kapitel, ctx, visning]);
  // "Per dag" är en egen flik: den visar dagsserien över tid, inte den visning som var vald
  const dagFlik = useMemo(() => (harDagar
    ? { pa, onByt: (p: boolean) => { setDagar(p); if (p) setVald("tid"); } }
    : undefined), [harDagar, pa]);

  return (
    <Figur
      spec={spec}
      rubrikniva={4}
      indikatornamn={kpi.namn}
      visningar={vis}
      visning={visning}
      onVisning={setVald}
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
