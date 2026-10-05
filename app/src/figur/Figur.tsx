// figur/Figur.tsx: figurramen runt varje diagram (stilguiden 6.1 och 6.8,
// docs/arkitektur.md 4.4). Ägare: WP4.
//
// Delar i ordning: [kicker] titel och undertitel (figcaption) · flikrad för
// visning, nivå och dag (högerställd på desktop, under undertiteln på mobil,
// bara med mer än ett val) · brödsmula · plotytan (Diagram via RENDERARE) eller
// tabellvyn · jämför-raden · noter · källrad med Tabell, Ladda ner och Förstora.
//
// Tillstånd som figuren äger när föräldern inte styr det: fästa serier
// (`fasta`/`onFasta`, delas med diagrammet, jämför-raden och förstoringen) och
// visningen (`visning`/`onVisning`). Skickar föräldern värdet är det styrt.
// Tabellvy och förstoring är alltid figurens egna.
//
// Förstoringen visar samma figur i full bredd med indikatornamnet som kicker
// (spec.kicker, annars `indikatornamn`) och samma fästa serier. Samma kicker
// bakas in i SVG och PNG.
//
// Nedborrning (stilguiden 6.7, tillägg i WP10): `onFokus` går både till
// brödsmulan och till diagrammet, där klick på en panels namn, en rad i
// enheternas rangordning eller Enter gör enheten till fokus. Brödsmulans
// landmärke heter "Nivå, {indikatornamn eller titel}", så att flera figurer på
// samma sida får olika namn.

import { useEffect, useId, useRef, useState } from "react";
import Diagram from "../charts/Diagram";
import type { ChartSpec, VisningId } from "../charts/spec";
import Atgarder from "./Atgarder";
import { begransaFasta } from "./fasta";
import Flikrad from "./Flikrad";
import Forstoring from "./Forstoring";
import JamforRad from "./JamforRad";
import Kallrad from "./Kallrad";
import {
  figurFilnamn, sparaFil, svgStorlek, tillCsv, tillPng, tillSvg, typsnittCss,
} from "./nedladdning";
import Noter from "./Noter";
import TabellVy from "./TabellVy";
import s from "./Figur.module.css";

type Atgard = "tabell" | "ladda" | "forstora";

export interface FigurProps {
  spec: ChartSpec;
  rubrikniva?: 3 | 4;                                  // 4 i indikatorn
  visningar?: { id: VisningId; etikett: string }[]; visning?: VisningId; onVisning?(v: VisningId): void;
  dagFlik?: { pa: boolean; onByt(pa: boolean): void };
  brodsmula?: { id: string; namn: string }[]; onFokus?(enhetId: string): void;
  fasta?: string[]; onFasta?(ids: string[]): void;
  atgarder?: ("tabell" | "ladda" | "forstora")[];      // förval alla tre
  indikatornamn?: string;                              // kicker i förstoring och nedladdning (WP4)
}

const ALLA: Atgard[] = ["tabell", "ladda", "forstora"];
const DAG = "dag";

export default function Figur(props: FigurProps) {
  const {
    spec, rubrikniva = 3, visningar = [], dagFlik, brodsmula, onFokus,
    atgarder = ALLA, indikatornamn,
  } = props;

  // Fästa serier: styrda av föräldern eller figurens egna.
  const [egnaFasta, setEgnaFasta] = useState<string[]>(() => begransaFasta(props.fasta ?? []));
  const fasta = props.fasta !== undefined ? begransaFasta(props.fasta) : egnaFasta;
  const satFasta = (ids: string[]) => {
    const nya = begransaFasta(ids);
    if (props.fasta === undefined) setEgnaFasta(nya);
    props.onFasta?.(nya);
  };

  // Visning: styrd eller egen.
  const [egenVisning, setEgenVisning] = useState<VisningId | undefined>(props.visning ?? visningar[0]?.id);
  const visning: VisningId = props.visning ?? egenVisning ?? visningar[0]?.id ?? "tid";
  const bytVisning = (v: VisningId) => {
    if (props.visning === undefined) setEgenVisning(v);
    props.onVisning?.(v);
  };

  const [tabell, setTabell] = useState(false);
  const [forstorad, setForstorad] = useState(false);
  const [meddelande, setMeddelande] = useState("");
  const plot = useRef<HTMLDivElement>(null);
  const titelId = useId();
  const undertitelId = useId();
  const panelId = useId();

  const flikar = [...visningar, ...(dagFlik ? [{ id: DAG, etikett: "Per dag" }] : [])];
  const aktivFlik: string = dagFlik?.pa ? DAG : visning;
  const bytFlik = (id: string) => {
    if (id === DAG) { dagFlik?.onByt(true); return; }
    if (dagFlik?.pa) dagFlik.onByt(false);
    bytVisning(id as VisningId);
  };
  const medFlikar = flikar.length > 1;

  const kicker = spec.kicker ?? indikatornamn;
  const fristaende = kicker && kicker !== spec.kicker ? { ...spec, kicker } : spec;

  // Brödsmulan uppåt: länken man klickade försvinner (den blir aktuell nivå,
  // eller hela brödsmulan försvinner på regionnivå). Fokus flyttas då till den
  // valda fliken (nivån man kom till), annars till diagrammet.
  const ram = useRef<HTMLElement>(null);
  const fokusEfterUppat = useRef(false);
  const uppat = (enhetId: string) => {
    fokusEfterUppat.current = true;
    onFokus?.(enhetId);
  };
  useEffect(() => {
    if (!fokusEfterUppat.current) return;
    fokusEfterUppat.current = false;
    const el = ram.current?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')
      ?? ram.current?.querySelector<HTMLElement>('[data-plotyta] svg[role="img"]');
    el?.focus({ preventScroll: true });
  }, [spec.id]);

  const ladda = async (format: "csv" | "svg" | "png") => {
    setMeddelande("");
    const namn = figurFilnamn(spec, aktivFlik, format);
    try {
      if (format === "csv") {
        sparaFil(new Blob([tillCsv(spec)], { type: "text/csv;charset=utf-8" }), namn);
        return;
      }
      const svgEl = plot.current?.querySelector<SVGSVGElement>('svg[role="img"]')
        ?? plot.current?.querySelector<SVGSVGElement>("svg");
      if (!svgEl) throw new Error("Diagrammet saknas");
      const typsnitt = await typsnittCss().catch(() => "");
      const svg = tillSvg(fristaende, svgEl, typsnitt);
      if (format === "svg") {
        sparaFil(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), namn);
        return;
      }
      const { bredd, hojd } = svgStorlek(svg);
      sparaFil(await tillPng(svg, bredd, hojd), namn);
    } catch (e) {
      console.error(e);
      setMeddelande("Filen kunde inte skapas. Försök igen eller välj ett annat format.");
    }
  };

  const Rubrik = rubrikniva === 4 ? "h4" : "h3";
  const visaBrodsmula = (brodsmula?.length ?? 0) > 1;

  return (
    <figure
      ref={ram}
      className={s.platta}
      aria-labelledby={titelId}
      aria-describedby={spec.undertitel ? undertitelId : undefined}
      data-figur={spec.id}
    >
      <figcaption className={s.rubriker}>
        {spec.kicker && <p className={s.kicker} data-kicker="">{spec.kicker}</p>}
        <Rubrik id={titelId} className={s.titel}>{spec.titel}</Rubrik>
        {spec.undertitel && <p id={undertitelId} className={s.undertitel}>{spec.undertitel}</p>}
      </figcaption>

      {medFlikar && (
        <div className={s.flikar}>
          <Flikrad flikar={flikar} aktiv={aktivFlik} onByt={bytFlik} etikett="Visning" panel={panelId} />
        </div>
      )}

      {visaBrodsmula && brodsmula && (
        <nav className={`${s.hel} ${s.brodsmula}`} aria-label={`Nivå, ${kicker ?? spec.titel}`} data-brodsmula="">
          <ol>
            {brodsmula.map((b, i) => (
              <li key={b.id}>
                {i < brodsmula.length - 1
                  ? <button type="button" className={s.brodsmulaLank} onClick={() => uppat(b.id)} data-brodsmula-lank={b.id}>{b.namn}</button>
                  : <span aria-current="location">{b.namn}</span>}
              </li>
            ))}
          </ol>
        </nav>
      )}

      <div
        id={panelId}
        className={`${s.hel} ${s.panel}`}
        role={medFlikar ? "tabpanel" : undefined}
        aria-labelledby={medFlikar ? `${panelId}-flik-${aktivFlik}` : undefined}
      >
        <div ref={plot} className={tabell ? s.plotDold : s.plotyta} data-plotyta="">
          <Diagram spec={spec} fasta={fasta} onFasta={satFasta} onFokus={onFokus} />
        </div>
        {tabell && <TabellVy tabell={spec.tabell} format={spec.y.format} />}
      </div>

      {!tabell && (spec.jamforbara?.length ?? 0) > 0 && (
        <div className={`${s.hel} ${s.jamfor}`}>
          <JamforRad spec={spec} fasta={fasta} onFasta={satFasta} />
        </div>
      )}

      <div className={`${s.hel} ${s.fot}`}>
        <Noter noter={spec.noter} />
        <Kallrad kalla={spec.kalla}>
          {atgarder.length > 0 && (
            <Atgarder
              atgarder={atgarder}
              tabellVisas={tabell}
              onTabell={() => setTabell((t) => !t)}
              onLadda={(f) => { void ladda(f); }}
              onForstora={() => setForstorad(true)}
            />
          )}
        </Kallrad>
        <p className={s.meddelande} role="status">{meddelande}</p>
      </div>

      {atgarder.includes("forstora") && (
        <Forstoring
          oppen={forstorad}
          onStang={() => setForstorad(false)}
          etikett={kicker ? `${kicker}: ${spec.titel}` : spec.titel}
        >
          <Figur
            {...props}
            spec={fristaende}
            fasta={fasta}
            onFasta={satFasta}
            visning={visning}
            onVisning={bytVisning}
            atgarder={atgarder.filter((a) => a !== "forstora")}
          />
        </Forstoring>
      )}
    </figure>
  );
}
