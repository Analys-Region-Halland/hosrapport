import { useState } from "react";
import type { KpiData } from "../types";
import { kortBeskrivning } from "../utils/definitions";
import { periodRangeLabel } from "../utils/format";

// ════════════════════════════════════════════════════════════
//  IndikatorFakta — "Om indikatorn", sektionen efter diagrammet.
//
//  OMTAG 2026-08-20: blocket låg tidigare i en egen tonad ruta och läste sig
//  som en tabell inklämd i uppslaget. Nu är det en sektion bland de andra,
//  med samma gröna etikettlinje som Bedömning, Utfall och Verksamhetens
//  kommentar, och etiketten är samtidigt fällknappen.
//
//  Innehållet står i två spalter, åtskilda av en hårlinje:
//    DEFINITION                  vad måttet räknar, åt vilket håll det ska gå,
//                                vad det inte fångar, enhet, period, källa.
//    PÅVERKANSFAKTORER OCH TEORI mekanismen bakom talet, följd av de konkreta
//                                sakerna som drar i det.
//
//  Raderna linjerar men saknar linjer: alignment ger skanbarheten, medan
//  frånvaron av rutnät håller det borta från tabellkänslan.
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

function Rad({ etikett, children }: { etikett: string; children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div className="fakta-rad">
      <dt className="fakta-rad__lbl">{etikett}</dt>
      <dd className="fakta-rad__val">{children}</dd>
    </div>
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
          <section className="ind-fakta__spalt">
            {fakta && <h5 className="fakta-spaltrubrik">Definition</h5>}
            <dl className="fakta-lista">
              <Rad etikett="Vad som mäts">{matt}</Rad>
              <Rad etikett="Önskvärd riktning">{riktning}</Rad>
              {fakta?.avgransning && <Rad etikett="Avgränsning">{fakta.avgransning}</Rad>}
              <Rad etikett="Enhet och period">
                {enhetsText(kpi)}
                {period ? `, ${period}` : ""}
              </Rad>
              {kalla && (
                <Rad etikett="Källa">
                  {kalla.url ? (
                    <a href={kalla.url} target="_blank" rel="noreferrer">{kalla.namn}</a>
                  ) : kalla.namn}
                  <span className="fakta-rad__svag"> · {kalla.typ}</span>
                  {/* Koladas egen formulering, men bara när den tillför något
                      utöver källans namn. Annars upprepar raden sig själv. */}
                  {koladaText && (
                    <span className="fakta-rad__kolada">Kolada anger: {koladaText}</span>
                  )}
                </Rad>
              )}
            </dl>
          </section>

          {fakta && (
            <section className="ind-fakta__spalt ind-fakta__spalt--delad">
              <h5 className="fakta-spaltrubrik">Påverkansfaktorer och teori</h5>
              <p className="fakta-teori">{fakta.teori}</p>
              <dl className="fakta-lista fakta-lista--faktorer">
                {fakta.faktorer.map((f) => (
                  <Rad key={f.rubrik} etikett={f.rubrik}>{f.text}</Rad>
                ))}
              </dl>
            </section>
          )}
        </div>
      )}
    </>
  );
}
