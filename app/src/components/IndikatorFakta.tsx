import { useState } from "react";
import type { KpiData } from "../types";
import { kortBeskrivning } from "../utils/definitions";
import { periodRangeLabel } from "../utils/format";

// ════════════════════════════════════════════════════════════
//  IndikatorFakta — "Om indikatorn", sektionen efter diagrammet.
//
//  OMTAG 2026-08-20 (andra vändan): innehållet låg i etikett-och-värde-rader
//  och läste sig som en tabell, oavsett om rutan runt fanns kvar eller inte.
//  Greppet är nu i stället att låta varje sorts innehåll få sin egen form:
//
//    definitionen   ett stycke satt med tyngd, för det ÄR sektionens svar
//    riktning/avgränsning  löpande stycken med inledande etikett
//    enhet, period, källa  en kolofon, alltså metadata satt som metadata
//    teorin         ett resonerande stycke i serif, som rapportens brödtext
//    påverkansfaktorerna  en numrerad lista med mono-siffror i grönt, samma
//                   språk som kapitelfolion
//
//  Typografiskt gäller genomgående: serif är prosa, sans är etiketter och
//  metadata, mono är siffror. Inget rutnät, inga radlinjer.
//
//  Underlaget kommer från R (kpi.fakta, se R/teman/kolada/indikatorfakta.R).
//  Saknas det renderas vänsterspalten ändå, härledd ur indikatorns egna fält,
//  så att alla kapitel får samma tydliga beskrivning även innan researchen
//  är gjord för dem.
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
        <div id={panelId} className={`ind-fakta${fakta ? " ind-fakta--tva" : ""}`}>
          <section className="fakta-spalt">
            {fakta && <h5 className="fakta-spalt__rubrik">Definition</h5>}

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
          </section>

          {fakta && (
            <section className="fakta-spalt fakta-spalt--delad">
              <h5 className="fakta-spalt__rubrik">Påverkansfaktorer och teori</h5>
              <p className="fakta-teori">{fakta.teori}</p>
              <ol className="fakta-faktorer">
                {fakta.faktorer.map((f, i) => (
                  <li key={f.rubrik} className="fakta-faktor">
                    <span className="fakta-faktor__nr" aria-hidden="true">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <p className="fakta-faktor__text">
                      <span className="fakta-faktor__rubrik">{f.rubrik}</span>
                      {f.text}
                    </p>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      )}
    </>
  );
}
