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

import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent, PointerEvent } from "react";
import { tema } from "../design/tema";
import { arFastbar, fastNyckel, tillampaFasta, vaxlaFast } from "./karna/fasta";
import {
  byggTraffmodell, iPlotytan, PEKSKARMSREGLER, pekarlage, startlage, tangent,
} from "./karna/interaktion";
import { nollstallMatt } from "./karna/matt";
import { tidsaxel } from "./karna/skalor";
import { Tooltip } from "./karna/Tooltip";
import { byggPunktIndex, tooltipModell, type Inmatning } from "./karna/tooltipModell";
import { STANDARDREGLER } from "./karna/traff";
import { RENDERARE, type AktivPunkt } from "./register";
import type { ChartSpec } from "./spec";
import s from "./Diagram.module.css";

export interface DiagramProps {
  spec: ChartSpec;
  fasta?: string[];
  onFasta?(ids: string[]): void;
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

export default function Diagram({ spec, fasta, onFasta, bredd: fastBredd }: DiagramProps) {
  const ram = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const bredd = useBredd(ram, fastBredd);
  const typsnitt = useTypsnitt();

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
  const modell = useMemo(() => (scen ? byggTraffmodell(scen, effSpec) : null), [scen, effSpec]);
  const axel = useMemo(() => tidsaxel(effSpec), [effSpec]);
  const punkter = useMemo(() => byggPunktIndex(effSpec, axel), [effSpec, axel]);

  // Aktiv period och serie, och hur den valdes (styr tooltipens uppmaning)
  const [aktiv, setAktiv] = useState<AktivPunkt | null>(null);
  const [satt, setSatt] = useState<Inmatning>("mus");
  const senastePekare = useRef<string>("mouse");
  const tryckt = useRef<string | null>(null);

  // Scenen kan ha ändrats så att den aktiva perioden saknas
  const giltigAktiv = aktiv && modell?.perioder.some((p) => p.index === aktiv.index) ? aktiv : null;

  const vaxla = (serieId: string) => {
    const serie = effSpec.serier.find((x) => x.id === serieId);
    if (!serie || !arFastbar(serie)) return;
    const ny = vaxlaFast(aktuellaFasta, fastNyckel(serie));
    if (onFasta) onFasta(ny);
    else setEgnaFasta(ny);
  };

  const lage = (e: { clientX: number; clientY: number }) => {
    const b = svg.current?.getBoundingClientRect();
    return b ? { px: e.clientX - b.left, py: e.clientY - b.top } : null;
  };

  const etikettUnder = (e: { target: EventTarget }): string | null => {
    const el = e.target instanceof Element ? e.target.closest("[data-etikett]") : null;
    return el?.getAttribute("data-etikett") ?? null;
  };

  type Traff =
    | { slag: "etikett"; aktiv: AktivPunkt }
    | { slag: "plot"; px: number; py: number }
    | { slag: "utanfor" };

  /** Vad pekaren står på: en etikett, plotytan eller något annat (axlar, marginaler). */
  const vidPekare = (e: PointerEvent<SVGSVGElement>): Traff => {
    if (!modell) return { slag: "utanfor" };
    const etikett = etikettUnder(e);
    if (etikett !== null) {
      // Etiketten lyfter serien vid dess sista värde (linjeslutet)
      const index = modell.stoppPerSerie.get(etikett)?.at(-1)?.index ?? modell.perioder.at(-1)?.index;
      if (index !== undefined) return { slag: "etikett", aktiv: { index, serieId: etikett } };
    }
    const l = lage(e);
    if (!l || !iPlotytan(modell, l.px, l.py)) return { slag: "utanfor" };
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
      const ny = pekarlage(modell, traff.px, traff.py, nu, STANDARDREGLER);
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
    const traff = vidPekare(e);
    if (traff.slag === "utanfor") { setAktiv(null); tryckt.current = null; return; }
    const ny = traff.slag === "etikett" ? traff.aktiv : pekarlage(modell, traff.px, traff.py, null, PEKSKARMSREGLER);
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
    const etikett = etikettUnder(e);
    if (etikett !== null) { vaxla(etikett); return; }
    if (giltigAktiv?.serieId) vaxla(giltigAktiv.serieId);
  };

  const onKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
    if (!modell) return;
    const utfall = tangent(e.key, modell, effSpec, giltigAktiv);
    if (!utfall.hanterad) return;
    e.preventDefault();
    if (e.key === "Escape") e.stopPropagation();
    setSatt("tangent");
    setAktiv(utfall.aktiv);
    if (utfall.vaxla) vaxla(utfall.vaxla);
  };

  const onFocus = () => {
    if (!modell || giltigAktiv) return;
    setSatt("tangent");
    setAktiv(startlage(modell, effSpec));
  };

  const onBlur = () => setAktiv(null);

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
    () => (giltigAktiv ? tooltipModell(effSpec, axel, punkter, giltigAktiv, satt) : null),
    [giltigAktiv, effSpec, axel, punkter, satt],
  );
  const xAktiv = giltigAktiv ? modell?.perioder.find((p) => p.index === giltigAktiv.index)?.x : undefined;
  const lyftSerie = giltigAktiv?.serieId ? effSpec.serier.find((x) => x.id === giltigAktiv.serieId) : undefined;
  const hand = !!lyftSerie && arFastbar(lyftSerie);

  const Rita = r.Rita;
  return (
    <div ref={ram} className={s.ram} data-diagram={spec.id} style={{ minHeight: hojd ?? undefined }}>
      {scen && (
        <svg
          ref={svg}
          className={s.svg}
          width={scen.bredd}
          height={scen.hojd}
          viewBox={`0 0 ${scen.bredd} ${scen.hojd}`}
          role="img"
          aria-label={spec.sammanfattning}
          tabIndex={0}
          style={{ cursor: hand ? "pointer" : "default" }}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
          onPointerDown={onPointerDown}
          onMouseDown={onMouseDown}
          onClick={onClick}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          onBlur={onBlur}
        >
          <Rita scen={scen} spec={effSpec} aktiv={giltigAktiv} fasta={aktuellaFasta} />
        </svg>
      )}
      {scen && tooltip && xAktiv !== undefined && (
        <Tooltip modell={tooltip} x={xAktiv} plot={scen.plot} bredd={scen.bredd} />
      )}
      <p className={s.sr} aria-live="polite" data-live="">{tooltip?.live ?? ""}</p>
    </div>
  );
}
