import { useState } from "react";
import type { KpiData, Paverkansfaktor } from "../types";
import { kortBeskrivning } from "../utils/definitions";
import { periodRangeLabel } from "../utils/format";

// ════════════════════════════════════════════════════════════
//  IndikatorFakta — "Om indikatorn", sektionen efter diagrammet.
//
//  OMTAG 2026-08-20 (tredje vändan): innehållet låg i två spalter, vilket
//  bröt läsningen mitt i en text som hänger ihop. Nu är det ETT flöde med
//  en enda spaltbredd, i den ordning en läsare faktiskt behöver det:
//
//    definitionen        vad måttet är, satt med tyngd
//    riktning/avgränsning  löpande stycken med inledande etikett
//    kolofon             enhet, period och härkomst som metadata
//    teorin              mekanismen, ett resonerande stycke
//    påverkansfaktorerna numrerad lista, var och en med sin källa
//
//  Typografiskt gäller genomgående: serif är prosa, sans är etiketter och
//  metadata, mono är siffror.
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

/** Löpande stycke med inledande etikett, i stället för en tabellrad. */
function Stycke({ etikett, children }: { etikett: string; children: React.ReactNode }) {
  return (
    <p className="fakta-stycke">
      <span className="fakta-stycke__lbl">{etikett}</span>
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
        <h6 className="fakta-faktor__rubrik">{faktor.rubrik}</h6>
        <p className="fakta-faktor__text">{faktor.text}</p>
        {kalla && (
          kalla.url ? (
            <a className="fakta-faktor__kalla" href={kalla.url} target="_blank" rel="noreferrer">
              <PilIkon />
              {kalla.namn}
            </a>
          ) : (
            <span className="fakta-faktor__kalla fakta-faktor__kalla--tom">{kalla.namn}</span>
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

export default function IndikatorFakta({ kpi, vy }: { kpi: KpiData; vy: string }) {
  const [oppen, setOppen] = useState(true);

  const fakta = kpi.fakta;
  const matt = fakta?.matt || kortBeskrivning(kpi);
  const riktning = fakta?.riktning || harleddRiktning(kpi);
  const period = periodRangeLabel(kpi.tidsserie, vy);
  const kalla = kpi.kalla;
  const koladaRa = kalla?.kolada_kalla?.replace(/\.$/, "").trim();
  const koladaText = koladaRa && koladaRa.toLowerCase() !== kalla?.namn.toLowerCase()
    ? koladaRa : null;
  const panelId = `fakta-${kpi.id}`;

  return (
    <>
      <button
        type="button"
        className="ind-fold"
        aria-expanded={oppen}
        aria-controls={panelId}
        onClick={() => setOppen((v) => !v)}
      >
        <span className="ind-fold__lbl">Om indikatorn</span>
        <span className="ind-fold__linje" aria-hidden="true" />
        <span className="ind-fold__hint">{oppen ? "Dölj" : "Visa"}</span>
        <svg
          className="ind-fold__pil" width="11" height="11" viewBox="0 0 16 16"
          fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
        >
          <path d="M3 6l5 5 5-5" />
        </svg>
      </button>

      {oppen && (
        <div id={panelId} className="ind-fakta">
          {/* Definitionen står som sektionens svar, inte som en tabellrad. */}
          <p className="fakta-lead">{matt}</p>

          <Stycke etikett="Önskvärd riktning">{riktning}</Stycke>
          {fakta?.avgransning && (
            <Stycke etikett="Avgränsning">{fakta.avgransning}</Stycke>
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
            {/* Koladas egen formulering, men bara när den tillför något
                utöver källans namn. Annars upprepar raden sig själv. */}
            {koladaText && <p>Kolada anger: {koladaText}</p>}
          </div>

          {fakta && (
            <>
              <h5 className="fakta-underrubrik">Påverkansfaktorer och teori</h5>
              <p className="fakta-teori">{fakta.teori}</p>
              <ol className="fakta-faktorer">
                {fakta.faktorer.map((f, i) => (
                  <Faktor key={f.rubrik} faktor={f} nr={i + 1} />
                ))}
              </ol>
            </>
          )}
        </div>
      )}
    </>
  );
}
