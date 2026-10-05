// rapport/fordjupning.ts: innehållet i indikatorns fördjupning (stilguiden 4.4):
// Vad måttet räknar, Datakälla och Påverkansfaktorer. Ren funktion. Ägare: WP9.
//
// Faktaunderlaget från R (`fakta`) går först. Saknas det (kapitel 6 och
// akutflödet i dag) byggs texten ur Kolada-beskrivningen och indikatorns egna
// fält, så att delen aldrig står tom.

import { mattOchEnhet } from "../charts/text";
import { kapitelInfo } from "../data/kapitelinfo";
import type { KapitelModell, KpiModell, Paverkansfaktor, VyId } from "../data/modell";
import { arBeskrivande } from "./rapportText";

export interface Datarad {
  etikett: string;
  varde: string;
  url?: string;
}

export interface FordjupningTexter {
  /** Vad måttet räknar: stycken i ordning definition, avgränsning, riktning och mål. */
  matt: string[];
  /** Datakälla: primärkälla, huvudman, uppdateras, vägen till rapporten. */
  kalla: Datarad[];
  /** Påverkansfaktorer, bara när faktaunderlag finns. */
  faktorer: { teori: string; lista: Paverkansfaktor[] } | null;
}

const EM_DASH = String.fromCharCode(0x2014);

/** Kolada-beskrivningen utan titel ("Titel — …") och utan källhänvisning ("Källa: …"). */
export function beskrivningUtanTitel(beskrivning: string | undefined): string {
  if (!beskrivning) return "";
  let text = beskrivning.trim();
  const i = text.indexOf(` ${EM_DASH} `);
  if (i >= 0) text = text.slice(i + 3);
  text = text.replace(/\s*Källa:[\s\S]*$/, "").trim();
  // Inga em dash i rapportens text (stilguiden 3.1)
  return text.replaceAll(` ${EM_DASH} `, ", ").replaceAll(EM_DASH, ", ");
}

/** Riktning och mål när faktaunderlaget saknas. */
function harleddRiktning(kpi: KpiModell): string {
  if (arBeskrivande(kpi) || kpi.riktning === "neutral") {
    return "Måttet saknar målriktning: ett högre eller lägre värde är inte i sig bättre. Det är ett beskrivande mått och får varken status eller plats.";
  }
  const bas = kpi.riktning === "lag" ? "Lägre värde är bättre." : "Högre värde är bättre.";
  const f = kpi.serier[kpi.fokus];
  if (f?.rank !== undefined) return `${bas} Rapportens mål är en plats bland de tre bästa regionerna, topp 3.`;
  const forvantat = f?.tidsserie.some((p) => p.yhat !== undefined);
  if (forvantat) return `${bas} Status sätts mot det förväntade intervallet: ett värde utanför intervallet ger Bevaka eller Avvikelse.`;
  return bas;
}

/** Underliggande enheter i indikatorn, t.ex. "Halmstad, Varberg och Kungsbacka". */
function enhetslista(kpi: KpiModell, kap: KapitelModell): { niva: string; namn: string } | null {
  const barn = kap.enheter.filter((e) => e.parent_id === kpi.fokus && kpi.serier[e.id]);
  if (!barn.length) return null;
  const namn = barn.map((e) => e.namn);
  const lista = namn.length > 1 ? `${namn.slice(0, -1).join(", ")} och ${namn[namn.length - 1]}` : namn[0];
  return { niva: barn[0].niva, namn: lista };
}

export function fordjupningTexter(kpi: KpiModell, kap: KapitelModell, vy: VyId): FordjupningTexter {
  const fakta = kpi.fakta;

  // ── Vad måttet räknar ──
  const matt: string[] = [];
  if (fakta?.matt) matt.push(fakta.matt);
  else {
    const b = beskrivningUtanTitel(kpi.beskrivning);
    if (b) matt.push(b);
    else {
      matt.push(`${mattOchEnhet(kpi, vy)}.`);
      const e = enhetslista(kpi, kap);
      if (e) matt.push(`Redovisas för hela regionen och per ${e.niva}: ${e.namn}.`);
    }
  }
  if (fakta?.avgransning) matt.push(fakta.avgransning);
  matt.push(fakta?.riktning || harleddRiktning(kpi));

  // ── Datakälla ──
  const kalla: Datarad[] = [];
  const k = kpi.kalla;
  const info = kapitelInfo(kap.id);
  if (k) {
    kalla.push({ etikett: "Primärkälla", varde: k.namn, ...(k.url ? { url: k.url } : {}) });
    if (k.huvudman) kalla.push({ etikett: "Huvudman", varde: k.huvudman });
    const takt = k.uppdatering ?? info?.takt;
    if (takt) kalla.push({ etikett: "Uppdateras", varde: takt });
    kalla.push({ etikett: "Vägen till rapporten", varde: [k.namn, ...kap.leverans.map((l) => l.namn), "rapporten"].join(" › ") });
  } else if (info) {
    kalla.push({ etikett: "Primärkälla", varde: info.kalla });
    kalla.push({ etikett: "Uppdateras", varde: info.takt });
  }

  // ── Påverkansfaktorer ──
  const faktorer = fakta && (fakta.teori || fakta.faktorer?.length)
    ? { teori: fakta.teori ?? "", lista: fakta.faktorer ?? [] }
    : null;

  return { matt, kalla, faktorer };
}
