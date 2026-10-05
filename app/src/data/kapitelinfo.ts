// data/kapitelinfo.ts: redaktionell information om rapportens kapitel och teman,
// gemensam för startsidan (WP11), rapportsidans masthead och metarad (WP9) och
// sammanfattningen. Flyttad från gamla src/taxonomy.ts (fryst) så att ny kod inte
// importerar från den gamla appen. Manifestets namn och siffror vinner; detta är
// texter och metadata som inte finns i datan.
//
// Ägare: orkestreraren. WP9 och WP11 läser, ändrar texter bara via slutrapporten.

/** Var datan kommer ifrån. Styr märket på områdeskortet. */
export type Datatyp = "oppen" | "intern";

export interface OmradeDef {
  id: string;
  namn: string;
  /** Kort redaktionell beskrivning (max 2 meningar). */
  beskrivning: string;
  /** Öppen (nationella register) eller intern (regionens egna system). */
  datatyp: Datatyp;
  /** Källorna bakom området, som de ska stå på kortet. */
  kalla: string;
  /** Hur ofta området uppdateras, t.ex. "Årsvis". */
  takt: string;
  /** Vad siffrorna jämförs mot, t.ex. "21 regioner". */
  jamforelse: string;
  /** Vilken publikation området är ett kapitel i, om något. Skrivs ut på
   *  kortet så att det syns vilka rapporter som hör ihop. */
  serie?: string;
  /** Diskret varningsrad på kortet — används när datan inte är skarp än. */
  notis?: string;
}

export interface KategoriDef {
  id: string;
  namn: string;
  /** Kort fråga/devis-kicker ovanför kategorinamnet. */
  kicker: string;
  beskrivning: string;
  omraden: OmradeDef[];
}

/** Publikationen de sex öppna rapporterna är kapitel i. */
const SKR_SERIE = "Hälso- och sjukvårdsrapporten (SKR)";

export const TEMAN: KategoriDef[] = [
  {
    id: "patienten",
    namn: "Patienten och tillgängligheten",
    kicker: "Vägen in i vården",
    beskrivning:
      "Hur vården uppfattas av dem som använder den, och hur lätt den är att komma till. Det första mötet med vården, sett både utifrån och inifrån.",
    omraden: [
      {
        id: "skr-syn-pa-varden",
        namn: "Patienters och befolkningens syn på vården",
        beskrivning:
          "Förtroende, upplevd tillgång och patienternas egna omdömen om sina vårdkontakter. Två skilda mätningar ligger bakom: en till hela befolkningen, en till dem som varit i vården.",
        datatyp: "oppen",
        kalla: "Hälso- och sjukvårdsbarometern, Nationell patientenkät",
        takt: "Årsvis",
        jamforelse: "21 regioner och riket",
        serie: `Kapitel 1 av 6 · ${SKR_SERIE}`,
      },
      {
        id: "skr-tillganglighet",
        namn: "Tillgänglighet och väntetider",
        beskrivning:
          "Vårdgarantins tre dagar i primärvården och nittio dagar i den specialiserade vården, plus psykiatri och cancervårdens vårdförlopp. Kapitlet vars underlag mäts tätast av alla i rapporten.",
        datatyp: "oppen",
        kalla: "Nationella väntetidsdatabasen, Regionala cancercentrum",
        takt: "Årsvis (källan månadsvis)",
        jamforelse: "21 regioner och riket",
        serie: `Kapitel 2 av 6 · ${SKR_SERIE}`,
      },
    ],
  },
  {
    id: "kvalitet",
    namn: "Vårdens kvalitet och säkerhet",
    kicker: "Hur vården utförs",
    beskrivning:
      "Det som ska hända och det som inte ska hända. Riktlinjeföljsamhet på ena sidan, skador och riskfyllda förutsättningar på den andra.",
    omraden: [
      {
        id: "skr-saker-vard",
        namn: "Säker vård",
        beskrivning:
          "Skador och vårdskador, trycksår, hygienrutiner och belastningen på vårdplatserna. Både de skador som mäts och de förutsättningar som gör dem sannolika.",
        datatyp: "oppen",
        kalla: "Markörbaserad journalgranskning, SKR:s mätningar, SPOR",
        takt: "Årsvis",
        jamforelse: "21 regioner och riket",
        serie: `Kapitel 3 av 6 · ${SKR_SERIE}`,
        notis: "Flera av kapitlets nationella mätningar avvecklades efter 2023.",
      },
      {
        id: "skr-kunskapsbaserad",
        namn: "Kunskapsbaserad vård och måluppfyllelse",
        beskrivning:
          "Gör vården det som riktlinjerna säger, vid stroke, hjärtinfarkt, diabetes och cancer. Processmått som mäter om rätt åtgärd blev av, i tid och för rätt personer.",
        datatyp: "oppen",
        kalla: "Nationella kvalitetsregister",
        takt: "Årsvis",
        jamforelse: "21 regioner och riket",
        serie: `Kapitel 4 av 6 · ${SKR_SERIE}`,
      },
    ],
  },
  {
    id: "resultat",
    namn: "Resultat och resurser",
    kicker: "Vad vården leder till och vad den kostar",
    beskrivning:
      "Utfallet i befolkningen och de resurser det uppnås med. De två kapitel som har längst tidshorisont respektive tyngst ekonomiskt innehåll.",
    omraden: [
      {
        id: "skr-sjukdomsforekomst",
        namn: "Sjukdomsförekomst och resultat",
        beskrivning:
          "Hur vanliga de stora sjukdomsgrupperna är, hur många som överlever och vad som händer efter vårdtillfället. Måtten redovisas som flerårsmedelvärden.",
        datatyp: "oppen",
        kalla: "Socialstyrelsens register, Folkhälsomyndigheten",
        takt: "Årsvis",
        jamforelse: "21 regioner och riket",
        serie: `Kapitel 5 av 6 · ${SKR_SERIE}`,
      },
      {
        id: "skr-kostnader",
        namn: "Kostnader och produktivitet",
        beskrivning:
          "Strukturjusterad kostnadsnivå, kostnad per DRG-poäng och regionens finansiella ställning. Jämförbarheten bärs av justeringen för vårdbehov och struktur.",
        datatyp: "oppen",
        kalla: "KPP/DRG, regionernas räkenskaper, SCB",
        takt: "Årsvis",
        jamforelse: "21 regioner och riket",
        serie: `Kapitel 6 av 6 · ${SKR_SERIE}`,
      },
    ],
  },
  {
    id: "internt",
    namn: "Interna analysexempel",
    kicker: "Regionens egna system",
    beskrivning:
      "Regionens egna system, med en annan takt och en annan metod: dygnsdata med statistiska signalgränser i stället för placering bland regionerna. Mallen för de interna områden som tillkommer.",
    omraden: [
      {
        id: "akutflode",
        namn: "Akutflöde",
        beskrivning:
          "Beläggning, akutbesök, väntetider och ambulansuppdrag, brutet ner per sjukhus. Följs på dygnsnivå med statistiska signalgränser i stället för placering bland regionerna.",
        datatyp: "intern",
        kalla: "Regionens vårddatalager",
        takt: "Dagligen",
        jamforelse: "Halmstad, Varberg, Kungsbacka",
        notis: "Exempeldata tills den interna kopplingen är på plats.",
      },
    ],
  },
];

/** Kategori för ett områdes-id, eller undefined om oklassat. */
export function temaForKapitel(kapitelId: string): KategoriDef | undefined {
  return TEMAN.find((k) => k.omraden.some((o) => o.id === kapitelId));
}

/** Områdesdefinition för ett id, eller undefined. */
export function kapitelInfo(kapitelId: string): OmradeDef | undefined {
  for (const k of TAXONOMI) {
    const o = k.omraden.find((o) => o.id === kapitelId);
    if (o) return o;
  }
  return undefined;
}
