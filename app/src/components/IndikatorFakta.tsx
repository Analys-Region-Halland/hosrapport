import type { KpiData } from "../types";
import { kortBeskrivning } from "../utils/definitions";
import { periodRangeLabel } from "../utils/format";

// ════════════════════════════════════════════════════════════
//  IndikatorFakta — referensblocket under diagrammet.
//
//  Två spalter som besvarar var sin fråga:
//    OM INDIKATORN               vad måttet räknar, åt vilket håll det ska
//                                gå, vad det inte fångar, enhet, period, källa.
//    PÅVERKANSFAKTORER OCH TEORI mekanismen bakom talet, följd av de konkreta
//                                sakerna som drar i det.
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
  const fakta = kpi.fakta;
  const matt = fakta?.matt || kortBeskrivning(kpi);
  const riktning = fakta?.riktning || harleddRiktning(kpi);
  const period = periodRangeLabel(kpi.tidsserie, vy);
  const kalla = kpi.kalla;
  const koladaRa = kalla?.kolada_kalla?.replace(/\.$/, "").trim();
  const koladaText = koladaRa && koladaRa.toLowerCase() !== kalla?.namn.toLowerCase()
    ? koladaRa : null;

  return (
    <div className={`ind-fakta${fakta ? " ind-fakta--tva" : ""}`}>
      <section className="ind-fakta__spalt">
        <h4 className="ind-etikett ind-etikett--svag">Om indikatorn</h4>
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
        <section className="ind-fakta__spalt">
          <h4 className="ind-etikett ind-etikett--svag">Påverkansfaktorer och teori</h4>
          <p className="fakta-teori">{fakta.teori}</p>
          <dl className="fakta-lista fakta-lista--faktorer">
            {fakta.faktorer.map((f) => (
              <Rad key={f.rubrik} etikett={f.rubrik}>{f.text}</Rad>
            ))}
          </dl>
        </section>
      )}
    </div>
  );
}
