import { useState } from "react";
import type { KpiData, KallaRef, Paverkansfaktor } from "../types";
import { kortBeskrivning } from "../utils/definitions";
import { periodRangeLabel } from "../utils/format";
import { omradeDef } from "../taxonomy";

// ════════════════════════════════════════════════════════════
//  Indikatorns referenssektioner. De exporteras var för sig eftersom de
//  inte står bredvid varandra i uppslaget: "Om indikatorn" och "Datakälla
//  och uppdatering" inleder det, "Påverkansfaktorer och teori" kommer efter
//  diagrammet.
//
//  OMTAG 2026-09-03: posterna ("Vad måttet räknar" ...) är riktiga
//  underrubriker (.rub-under) i stället för inlöpande etiketter, och
//  "Vad måttet inte fångar" finns inte längre som egen post: avgränsningen
//  står som andra stycke under "Vad måttet räknar", eftersom måttets
//  kvaliteter och brister hör ihop. Källinformationen har fått en egen
//  sektion som handlar om datan: varifrån, hur ofta, via vilka led.
//
//  Rubriknivåerna i uppslaget:
//    indikatornamn      serif 23, numrerad
//    sektion            innehållsrubrik, sans 19          (.rub)
//    post i sektion     underrubrik, sans 15              (.rub-under)
//    prosa              serif 16
//    datarad            etikett sans 13 + värde serif 16  (.datarader)
//
//  Sektionerna är fällbara och står öppna från början.
// ════════════════════════════════════════════════════════════

const VY_ORD: Record<string, string> = {
  dag: "dag", vecka: "vecka", manad: "månad", kvartal: "kvartal", ar: "år",
};

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

/** Innehållsrubrik med fällkontroll. Samma form som rapportens övriga
 *  innehållsrubriker (.rub); kontrollen är ett tillägg, inte en annan rubrik. */
function FallbarSektion({
  rubrik, panelId, children,
}: {
  rubrik: string; panelId: string; children: React.ReactNode;
}) {
  const [oppen, setOppen] = useState(true);
  return (
    <section>
      <button
        type="button"
        className="rub"
        aria-expanded={oppen}
        aria-controls={panelId}
        onClick={() => setOppen((v) => !v)}
      >
        <span>{rubrik}</span>
        <span className="rub__kontroll">
          <span className="rub__hint">{oppen ? "Dölj" : "Visa"}</span>
          <svg
            className="rub__pil" width="11" height="11" viewBox="0 0 16 16"
            fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
          >
            <path d="M3 6l5 5 5-5" />
          </svg>
        </span>
      </button>
      {oppen && <div id={panelId} className="fakta prosa">{children}</div>}
    </section>
  );
}

function Faktor({ faktor, nr }: { faktor: Paverkansfaktor; nr: number }) {
  const { kalla } = faktor;
  return (
    <li className="fakta-faktor">
      <span className="fakta-faktor__nr" aria-hidden="true">{String(nr).padStart(2, "0")}</span>
      <div className="fakta-faktor__kropp">
        <h5 className="rub-under">{faktor.rubrik}</h5>
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

/** Sektion 1 i uppslaget: vad måttet är, dess kvaliteter och brister. */
export function OmIndikatorn({ kpi }: { kpi: KpiData }) {
  const fakta = kpi.fakta;
  const matt = fakta?.matt || kortBeskrivning(kpi);
  const riktning = fakta?.riktning || harleddRiktning(kpi);

  return (
    <FallbarSektion rubrik="Om indikatorn" panelId={`fakta-om-${kpi.id}`}>
      <h5 className="rub-under">Vad måttet räknar</h5>
      <p>{matt}</p>
      {/* Avgränsningen är en del av beskrivningen av måttet, inte en egen post. */}
      {fakta?.avgransning && <p>{fakta.avgransning}</p>}

      <h5 className="rub-under">Riktning och mål</h5>
      <p>{riktning}</p>
    </FallbarSektion>
  );
}

/** Sektion 2 i uppslaget: datan bakom talet. Varifrån den kommer, hur ofta
 *  den förnyas och genom vilka led den når rapporten. För områden utan
 *  källpost i R (regionens egna system) hämtas uppgifterna ur taxonomin. */
export function Datakalla({
  kpi, vy, sectionId, leverans,
}: {
  kpi: KpiData; vy: string; sectionId: string; leverans?: KallaRef[];
}) {
  const kalla = kpi.kalla;
  const omrade = omradeDef(sectionId);
  const period = periodRangeLabel(kpi.tidsserie, vy);
  const koladaRa = kalla?.kolada_kalla?.replace(/\.$/, "").trim();
  const koladaText = koladaRa && koladaRa.toLowerCase() !== kalla?.namn.toLowerCase()
    ? koladaRa : null;

  const rader: { lbl: string; val: React.ReactNode }[] = [];
  if (kalla) {
    rader.push({
      lbl: "Primärkälla",
      val: kalla.url
        ? <a href={kalla.url} target="_blank" rel="noreferrer">{kalla.namn}</a>
        : kalla.namn,
    });
    rader.push({ lbl: "Typ av källa", val: kalla.typ });
    rader.push({ lbl: "Huvudman", val: kalla.huvudman });
    if (kalla.uppdatering) rader.push({ lbl: "Uppdateras", val: kalla.uppdatering });
    if (leverans && leverans.length > 0) {
      rader.push({
        lbl: "Vägen till rapporten",
        val: [kalla.namn, ...leverans.map((l) => l.namn), "den här rapporten"].join(" › "),
      });
    }
    if (koladaText) rader.push({ lbl: "Kolada anger", val: koladaText });
  } else if (omrade) {
    rader.push({ lbl: "Källa", val: omrade.kalla });
    rader.push({ lbl: "Uppdateras", val: omrade.takt });
    rader.push({ lbl: "Jämförs mot", val: omrade.jamforelse });
  }
  const takt = VY_ORD[vy];
  rader.push({
    lbl: "Mått och period",
    val: [takt ? `${enhetsText(kpi)} per ${takt}` : enhetsText(kpi), period].filter(Boolean).join(", "),
  });

  return (
    <FallbarSektion rubrik="Datakälla och uppdatering" panelId={`fakta-data-${kpi.id}`}>
      <dl className="datarader">
        {rader.map((r) => (
          <div key={r.lbl} style={{ display: "contents" }}>
            <dt>{r.lbl}</dt>
            <dd>{r.val}</dd>
          </div>
        ))}
      </dl>
      {!kalla && omrade?.notis && (
        <p className="meta datarader__notis">{omrade.notis}</p>
      )}
    </FallbarSektion>
  );
}

/** Sektion efter diagrammet: vad som drar i talet, efter att det visats.
 *  Renderar ingenting för indikatorer utan faktaunderlag i R. */
export function Paverkansfaktorer({ kpi }: { kpi: KpiData }) {
  const fakta = kpi.fakta;
  if (!fakta) return null;
  return (
    <FallbarSektion rubrik="Påverkansfaktorer och teori" panelId={`fakta-pav-${kpi.id}`}>
      <p>{fakta.teori}</p>
      <ol className="fakta-faktorer">
        {fakta.faktorer.map((f, i) => (
          <Faktor key={f.rubrik} faktor={f} nr={i + 1} />
        ))}
      </ol>
    </FallbarSektion>
  );
}
