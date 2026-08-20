import { useState } from "react";
import type { KpiData, Paverkansfaktor } from "../types";
import { kortBeskrivning } from "../utils/definitions";
import { periodRangeLabel } from "../utils/format";

// ════════════════════════════════════════════════════════════
//  Indikatorns två referenssektioner. De exporteras var för sig eftersom de
//  inte längre står bredvid varandra: "Om indikatorn" inleder uppslaget, och
//  "Påverkansfaktorer och teori" kommer efter diagrammet.
//
//  OMTAG 2026-08-20 (fjärde vändan): "Påverkansfaktorer och teori" låg som en
//  underrubrik INNE i "Om indikatorn" och bar därför en egen, svagare
//  rubrikform. De två är inte över- och underordnade, de är två jämbördiga
//  svar på var sin fråga, och renderas nu som två sektioner på samma nivå med
//  identisk rubrik. Därmed finns bara EN rubrikform per nivå i hela
//  indikatorblocket:
//
//    indikatornamn      serif 20
//    sektion            versal grön etikett + grön topplinje   (.ind-etikett)
//    post i sektion     sans halvfet i svart                   (.fakta-lbl)
//    prosa              serif
//    metadata/källa     sans liten och dämpad
//
//  Båda sektionerna är fällbara och står öppna från början.
//
//  Källhänvisningen per faktor sätts i R (indikatorfakta.R) och finns bara
//  där en källa faktiskt dokumenterar påståendet. Faktorer som är analys
//  snarare än regelverk eller mätmetod står medvetet utan.
// ════════════════════════════════════════════════════════════

function enhetsText(kpi: KpiData): string {
  if (kpi.enhet === "procent") return "Andel i procent";
  if (kpi.enhet === "minuter") return "Minuter";
  return "Antal";
}

/** Riktning härledd ur indikatorns egna fält, när fakta-posten saknas. */
function harleddRiktning(kpi: KpiData): string {
  if (kpi.utan_mal) {
    return "Måttet saknar målriktning och färgsätts därför inte.";
  }
  const bas = kpi.inverterad ? "Lägre värde är bättre." : "Högre värde är bättre.";
  if (kpi.rank != null && kpi.rank_av != null) {
    return `${bas} Rapportens mål är en placering bland de tre främsta regionerna.`;
  }
  return bas;
}

/** Sektionsrubrik med fällkontroll. Samma form som rapportens övriga
 *  sektionsetiketter; kontrollen är ett tillägg, inte en annan rubrik. */
function FallbarSektion({
  rubrik, panelId, children,
}: {
  rubrik: string; panelId: string; children: React.ReactNode;
}) {
  const [oppen, setOppen] = useState(true);
  return (
    <section className="ind__sektion">
      <button
        type="button"
        className="ind-etikett ind-etikett--knapp"
        aria-expanded={oppen}
        aria-controls={panelId}
        onClick={() => setOppen((v) => !v)}
      >
        <span>{rubrik}</span>
        <span className="ind-etikett__kontroll">
          <span className="ind-etikett__hint">{oppen ? "Dölj" : "Visa"}</span>
          <svg
            className="ind-etikett__pil" width="11" height="11" viewBox="0 0 16 16"
            fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
          >
            <path d="M3 6l5 5 5-5" />
          </svg>
        </span>
      </button>
      {oppen && <div id={panelId} className="ind-fakta">{children}</div>}
    </section>
  );
}

/** Post i en sektion: halvfet etikett som löper in i texten. */
function Post({ etikett, children }: { etikett: string; children: React.ReactNode }) {
  return (
    <p className="fakta-stycke">
      <span className="fakta-lbl">{etikett}</span>
      {children}
    </p>
  );
}

function Faktor({ faktor, nr }: { faktor: Paverkansfaktor; nr: number }) {
  const { kalla } = faktor;
  return (
    <li className="fakta-faktor">
      <span className="fakta-faktor__nr" aria-hidden="true">{String(nr).padStart(2, "0")}</span>
      <div className="fakta-faktor__kropp">
        {/* Samma form som postetiketten ovan: sans halvfet i svart. */}
        <h5 className="fakta-lbl fakta-lbl--rad">{faktor.rubrik}</h5>
        <p className="fakta-faktor__text">{faktor.text}</p>
        {kalla && (
          kalla.url ? (
            <a className="fakta-kalla" href={kalla.url} target="_blank" rel="noreferrer">
              <PilIkon />
              {kalla.namn}
            </a>
          ) : (
            <span className="fakta-kalla fakta-kalla--tom">{kalla.namn}</span>
          )
        )}
      </div>
    </li>
  );
}

function PilIkon() {
  return (
    <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor"
         strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3.5 8.5L8.5 3.5" /><path d="M4.5 3.5h4v4" />
    </svg>
  );
}

/** Sektion 1 i uppslaget: vad måttet är, innan siffran tolkas. */
export function OmIndikatorn({ kpi, vy }: { kpi: KpiData; vy: string }) {
  const fakta = kpi.fakta;
  const matt = fakta?.matt || kortBeskrivning(kpi);
  const riktning = fakta?.riktning || harleddRiktning(kpi);
  const period = periodRangeLabel(kpi.tidsserie, vy);
  const kalla = kpi.kalla;
  const koladaRa = kalla?.kolada_kalla?.replace(/\.$/, "").trim();
  const koladaText = koladaRa && koladaRa.toLowerCase() !== kalla?.namn.toLowerCase()
    ? koladaRa : null;

  return (
      <FallbarSektion rubrik="Om indikatorn" panelId={`fakta-om-${kpi.id}`}>
        {/* Tre parallella poster i EN form. Tidigare stod definitionen som en
            större, mörkare ingress utan etikett medan de två andra hade
            etikett och egen färg, vilket gjorde sektionen brokig. */}
        <Post etikett="Vad måttet räknar">{matt}</Post>
        <Post etikett="Riktning och mål">{riktning}</Post>
        {fakta?.avgransning && (
          <Post etikett="Vad måttet inte fångar">{fakta.avgransning}</Post>
        )}

        {/* Kolofon: enhet, period och härkomst satt som metadata. */}
        <div className="fakta-kolofon">
          <p>
            {enhetsText(kpi)}
            {period && <> <span className="fakta-kolofon__sep">·</span> {period}</>}
          </p>
          {kalla && (
            <p>
              Källa:{" "}
              {kalla.url ? (
                <a href={kalla.url} target="_blank" rel="noreferrer">{kalla.namn}</a>
              ) : kalla.namn}{" "}
              <span className="fakta-kolofon__sep">·</span> {kalla.typ}
            </p>
          )}
          {/* Koladas egen formulering, men bara när den tillför något utöver
              källans namn. Annars upprepar raden sig själv. */}
          {koladaText && <p>Kolada anger: {koladaText}</p>}
        </div>
      </FallbarSektion>
  );
}

/** Sektion 4 i uppslaget: vad som drar i talet, efter att det visats.
 *  Renderar ingenting för indikatorer utan faktaunderlag i R. */
export function Paverkansfaktorer({ kpi }: { kpi: KpiData }) {
  const fakta = kpi.fakta;
  if (!fakta) return null;
  return (
    <FallbarSektion rubrik="Påverkansfaktorer och teori" panelId={`fakta-pav-${kpi.id}`}>
      <p className="fakta-teori">{fakta.teori}</p>
      <ol className="fakta-faktorer">
        {fakta.faktorer.map((f, i) => (
          <Faktor key={f.rubrik} faktor={f} nr={i + 1} />
        ))}
      </ol>
    </FallbarSektion>
  );
}
