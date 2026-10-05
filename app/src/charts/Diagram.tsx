// charts/Diagram.tsx: mäter bredden, väntar på typsnitten, anropar
// renderarens layout och ritar (docs/arkitektur.md 4.3). Äger
// interaktionslagret: pekare, tangentbord, pekskärm, tooltip och fästa
// serier (stilguiden 6.8). Ägare: WP2.
//
// Ritning: layout körs bara när spec, storlek eller fästa serier ändras.
// Hovring och tangentbord ändrar bara `aktiv`; renderarens statiska lager är
// memoiserade på scenen, så bara överlägget och tooltipen ritas om.
//
// Fästa serier: kontrollerat (fasta + onFasta, figuren äger tillståndet och
// delar det med jämför-raden och rangordningen) eller okontrollerat (bara
// fasta som startvärde, t.ex. i grafprov). Specen bör vara memoiserad hos
// anroparen; en ny spec-identitet ritar om de statiska lagren.
//
// Tillägg i WP3: träffregel, tangentbord och tooltip kommer från renderarens
// `interaktion` (karna/interaktion.ts: tid, rader eller paneler), så att alla
// graftyper delar samma händelser, samma tooltip och samma tangentbordsmönster.
// Renderare utan interaktion (minidiagrammet) ritas som en bild utan fokus.
// Nedborrning: `onFokus` (eller NedborrningKontext runt figuren) anropas vid
// klick på en panels namn och vid Enter i en panel.

import { useContext, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent, PointerEvent } from "react";
import { tema } from "../design/tema";
import { useLager } from "../ui/lager";
import { arFastbar, fastNyckel, tillampaFasta, vaxlaFast } from "./karna/fasta";
import { GEOMETRI } from "./karna/geometri";
import { nollstallMatt } from "./karna/matt";
import { NedborrningKontext } from "./karna/nedborrning";
import { RitDelKontext } from "./karna/ritdel";
import { Tooltip } from "./karna/Tooltip";
import type { Inmatning } from "./karna/tooltipModell";
import { RENDERARE, type AktivPunkt } from "./register";
import type { ChartSpec } from "./spec";
import s from "./Diagram.module.css";

export interface DiagramProps {
  spec: ChartSpec;
  fasta?: string[];
  onFasta?(ids: string[]): void;
  /** Nedborrning (stilguiden 6.7): klick på en panels namn eller Enter i en panel. */
  onFokus?(enhetId: string): void;
  /** Fast bredd i px i stället för mätning. Används vid SSR och i tester. */
  bredd?: number;
}

// ── Typsnitt: layouten mäter text med canvas och väntar därför på dem ──

let typsnittKlara = typeof document === "undefined";
let typsnittLofte: Promise<void> | null = null;

function vantaPaTypsnitt(): Promise<void> {
  if (typsnittLofte) return typsnittLofte;
  const fonts = typeof document !== "undefined" ? document.fonts : undefined;
  if (!fonts) {
    typsnittKlara = true;
    return (typsnittLofte = Promise.resolve());
  }
  const { sans } = tema.typ.familj;
  const storlek = tema.typ.roll.not.storlek;
  typsnittLofte = Promise.all([
    fonts.load(`${tema.typ.roll.not.vikt} ${storlek}px ${sans}`),
    fonts.load(`${tema.typ.roll.not.viktStark} ${storlek}px ${sans}`),
  ])
    .catch(() => undefined)
    .then(() => fonts.ready)
    .then(() => {
      typsnittKlara = true;
      nollstallMatt();
    });
  return typsnittLofte;
}

function useTypsnitt(): boolean {
  const [klara, setKlara] = useState(typsnittKlara);
  useEffect(() => {
    if (klara) return;
    let levande = true;
    vantaPaTypsnitt().then(() => { if (levande) setKlara(true); });
    return () => { levande = false; };
  }, [klara]);
  return klara;
}

// ── Bredd: ResizeObserver på ramen ──

function useBredd(ram: React.RefObject<HTMLDivElement | null>, fast: number | undefined): number | null {
  const [matt, setMatt] = useState<number | null>(null);
  useEffect(() => {
    if (fast !== undefined) return;
    const el = ram.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((poster) => {
      const b = Math.floor(poster[0]?.contentRect.width ?? el.clientWidth);
      setMatt((fore) => (fore === b ? fore : b));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ram, fast]);
  return fast ?? matt;
}

const samma = (a: AktivPunkt | null, b: AktivPunkt | null) =>
  a === b || (a !== null && b !== null && a.index === b.index && a.serieId === b.serieId);

/** Etikett eller panelnamn under pekaren: serie-id ur data-etikett eller data-panelnamn. */
function etikettUnder(e: { target: EventTarget }): string | null {
  const el = e.target instanceof Element ? e.target.closest("[data-etikett],[data-panelnamn]") : null;
  return el?.getAttribute("data-etikett") ?? el?.getAttribute("data-panelnamn") ?? null;
}

/** Panelnamnet under pekaren (små multiplar): panelens serie-id. */
function panelnamnUnder(e: { target: EventTarget }): string | null {
  const el = e.target instanceof Element ? e.target.closest("[data-panelnamn]") : null;
  return el?.getAttribute("data-panelnamn") ?? null;
}

export default function Diagram({ spec, fasta, onFasta, onFokus, bredd: fastBredd }: DiagramProps) {
  const ram = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const bredd = useBredd(ram, fastBredd);
  const typsnitt = useTypsnitt();
  const kontextFokus = useContext(NedborrningKontext);
  const nedborrning = onFokus ?? kontextFokus ?? undefined;

  // Fästa serier, kontrollerat eller okontrollerat
  const [egnaFasta, setEgnaFasta] = useState<string[]>(fasta ?? []);
  const aktuellaFasta = useMemo(() => (onFasta ? fasta ?? [] : egnaFasta), [onFasta, fasta, egnaFasta]);
  const fastaNyckel = aktuellaFasta.join("\u0000");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const effSpec = useMemo(() => tillampaFasta(spec, aktuellaFasta), [spec, fastaNyckel]);

  const r = RENDERARE[spec.typ];
  const hojd = bredd !== null ? r.hojd(bredd, effSpec) : null;
  const scen = useMemo(
    () => (bredd !== null && hojd !== null && typsnitt ? r.layout(effSpec, { bredd, hojd }, tema) : null),
    [r, effSpec, bredd, hojd, typsnitt],
  );
  const kanBorra = !!nedborrning;
  const modell = useMemo(
    () => (scen && r.interaktion ? r.interaktion(scen, effSpec, { nedborrning: kanBorra }) : null),
    [r, scen, effSpec, kanBorra],
  );
  const interaktiv = !!r.interaktion;

  // Aktiv period och serie, och hur den valdes (styr tooltipens uppmaning)
  const [aktiv, setAktiv] = useState<AktivPunkt | null>(null);
  const [satt, setSatt] = useState<Inmatning>("mus");
  const senastePekare = useRef<string>("mouse");
  const tryckt = useRef<string | null>(null);

  // Scenen kan ha ändrats så att den aktiva punkten saknas
  const giltigAktiv = aktiv && modell?.giltig(aktiv) ? aktiv : null;

  const vaxla = (serieId: string) => {
    const serie = effSpec.serier.find((x) => x.id === serieId);
    if (!serie || !arFastbar(serie)) return;
    const ny = vaxlaFast(aktuellaFasta, fastNyckel(serie));
    if (onFasta) onFasta(ny);
    else setEgnaFasta(ny);
  };

  const borra = (serieId: string) => {
    if (!nedborrning) return;
    nedborrning(effSpec.serier.find((x) => x.id === serieId)?.enhetId ?? serieId);
  };

  const lage = (e: { clientX: number; clientY: number }) => {
    const b = svg.current?.getBoundingClientRect();
    return b ? { px: e.clientX - b.left, py: e.clientY - b.top } : null;
  };

  type Traff =
    | { slag: "etikett"; aktiv: AktivPunkt }
    | { slag: "plot"; px: number; py: number }
    | { slag: "utanfor" };

  /** Vad pekaren står på: en etikett eller ett panelnamn, plotytan eller något annat (axlar, marginaler). */
  const vidPekare = (e: PointerEvent<SVGSVGElement>): Traff => {
    if (!modell) return { slag: "utanfor" };
    const etikett = etikettUnder(e);
    if (etikett !== null) {
      const a = modell.etikett(etikett);
      if (a) return { slag: "etikett", aktiv: a };
    }
    const l = lage(e);
    if (!l || !modell.inom(l.px, l.py)) return { slag: "utanfor" };
    return { slag: "plot", ...l };
  };

  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    senastePekare.current = e.pointerType;
    if (e.pointerType === "touch" || !modell) return;
    const traff = vidPekare(e);
    if (satt !== "mus") setSatt("mus");
    if (traff.slag === "utanfor") { setAktiv(null); return; }
    if (traff.slag === "etikett") { setAktiv((nu) => (samma(nu, traff.aktiv) ? nu : traff.aktiv)); return; }
    setAktiv((nu) => {
      const ny = modell.pekare(traff.px, traff.py, nu, false);
      return samma(nu, ny) ? nu : ny;
    });
  };

  const onPointerLeave = (e: PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === "touch") return;
    if (svg.current?.matches(":focus-visible")) return;
    setAktiv(null);
  };

  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    senastePekare.current = e.pointerType;
    if (e.pointerType !== "touch" || !modell) return;
    // Tryck på en panels namn borrar ned direkt (namnet är en länk)
    const namn = panelnamnUnder(e);
    if (namn !== null && nedborrning) { borra(namn); return; }
    const traff = vidPekare(e);
    if (traff.slag === "utanfor") { setAktiv(null); tryckt.current = null; return; }
    const ny = traff.slag === "etikett" ? traff.aktiv : modell.pekare(traff.px, traff.py, null, true);
    setSatt("peka");
    if (ny?.serieId && ny.serieId === tryckt.current) {
      tryckt.current = null;
      vaxla(ny.serieId);
      setAktiv(ny);
      return;
    }
    tryckt.current = ny?.serieId ?? null;
    setAktiv(ny);
  };

  // Musklick ska inte ge diagrammet tangentbordsfokus (stilguiden 6.8)
  const onMouseDown = (e: MouseEvent<SVGSVGElement>) => e.preventDefault();

  const onClick = (e: MouseEvent<SVGSVGElement>) => {
    if (senastePekare.current === "touch") return;
    const namn = panelnamnUnder(e);
    if (namn !== null) { borra(namn); return; }
    const etikett = etikettUnder(e);
    if (etikett !== null) { vaxla(etikett); return; }
    if (giltigAktiv?.serieId) vaxla(giltigAktiv.serieId);
  };

  const onKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
    if (!modell) return;
    const utfall = modell.tangent(e.key, giltigAktiv);
    if (!utfall.hanterad) return;
    e.preventDefault();
    if (e.key === "Escape") e.stopPropagation();
    setSatt("tangent");
    setAktiv(utfall.aktiv);
    if (utfall.vaxla) vaxla(utfall.vaxla);
    if (utfall.fokus && nedborrning) nedborrning(utfall.fokus);
  };

  const onFocus = () => {
    if (!modell || giltigAktiv) return;
    setSatt("tangent");
    setAktiv(modell.start());
  };

  const onBlur = () => setAktiv(null);

  // Tooltipen är det översta lagret medan den syns: Escape stänger bara den
  // (lagerstapeln i ui/lager.ts fångar Escape på window). Utan tooltip når
  // Escape vidare, t.ex. till förstoringsdialogen.
  useLager(giltigAktiv !== null, () => { setAktiv(null); tryckt.current = null; });

  // Pekskärm: tryck utanför diagrammet stänger
  useEffect(() => {
    if (satt !== "peka" || !aktiv) return;
    const stang = (e: Event) => {
      if (ram.current && e.target instanceof Node && !ram.current.contains(e.target)) {
        setAktiv(null);
        tryckt.current = null;
      }
    };
    document.addEventListener("pointerdown", stang);
    return () => document.removeEventListener("pointerdown", stang);
  }, [satt, aktiv]);

  const tooltip = useMemo(
    () => (giltigAktiv && modell ? modell.tooltip(giltigAktiv, satt) : null),
    [giltigAktiv, modell, satt],
  );
  const lyftSerie = giltigAktiv?.serieId ? effSpec.serier.find((x) => x.id === giltigAktiv.serieId) : undefined;
  const hand = !!lyftSerie && arFastbar(lyftSerie);

  const Rita = r.Rita;
  return (
    <div ref={ram} className={s.ram} data-diagram={spec.id} data-typ={spec.typ}
      data-nedborrning={nedborrning ? "" : undefined} style={{ minHeight: hojd ?? undefined }}>
      {scen && (
        <svg
          ref={svg}
          className={s.svg}
          width={scen.bredd}
          height={scen.hojd}
          viewBox={`0 0 ${scen.bredd} ${scen.hojd}`}
          role="img"
          aria-label={spec.sammanfattning}
          tabIndex={interaktiv ? 0 : undefined}
          style={{ cursor: hand ? "pointer" : "default" }}
          onPointerMove={interaktiv ? onPointerMove : undefined}
          onPointerLeave={interaktiv ? onPointerLeave : undefined}
          onPointerDown={interaktiv ? onPointerDown : undefined}
          onMouseDown={interaktiv ? onMouseDown : undefined}
          onClick={interaktiv ? onClick : undefined}
          onKeyDown={interaktiv ? onKeyDown : undefined}
          onFocus={interaktiv ? onFocus : undefined}
          onBlur={interaktiv ? onBlur : undefined}
        >
          <RitDelKontext.Provider value="statisk">
            <Rita scen={scen} spec={effSpec} aktiv={null} fasta={aktuellaFasta} />
          </RitDelKontext.Provider>
        </svg>
      )}
      {scen && giltigAktiv && (
        <svg
          className={s.overlagg}
          width={scen.bredd}
          height={scen.hojd}
          viewBox={`0 0 ${scen.bredd} ${scen.hojd}`}
          aria-hidden="true"
          focusable="false"
          data-overlagg=""
        >
          <RitDelKontext.Provider value="overlagg">
            <Rita scen={scen} spec={effSpec} aktiv={giltigAktiv} fasta={aktuellaFasta} />
          </RitDelKontext.Provider>
        </svg>
      )}
      {scen && tooltip && (
        <Tooltip lage={tooltip} bredd={scen.bredd} helBredd={scen.bredd < GEOMETRI.tooltipHelBreddUnder} />
      )}
      {interaktiv && <p className={s.sr} aria-live="polite" data-live="">{tooltip?.modell.live ?? ""}</p>}
    </div>
  );
}
