// ════════════════════════════════════════════════════════════
//  taxonomy.ts — Rapportens områdesindelning (enda sanningskällan)
//
//  OMTAG 2026-08-19: rapporten byggs av fristående kapitel. Innehållet är i
//  dag SKR:s Hälso- och sjukvårdsrapport, uppdelad så att vart och ett av dess
//  sex kapitel är en egen rapport med eget kort på startsidan, plus akutflödet
//  som enda INTERNA område. Tidigare områden (befolkning, folkhälsa, ekonomi)
//  är arkiverade, se R/arkiv/README.md.
//
//  Startsidans ingress säger MEDVETET inte att rapporten är SKR:s underlag:
//  fler källor ska in, även interna, och ramen får inte låsa fast rapporten
//  vid en enda avsändare. Härkomsten står i stället på varje kort, i fälten
//  `serie` och `kalla`, där den hör hemma.
//
//  Kategorierna följer kapitlens egen logik och grupperar dem parvis, så att
//  startsidan får tydliga avgränsningar i stället för en lång rad kort:
//
//    01 Patienten och tillgängligheten  — hur vården uppfattas, och vägen in
//    02 Vårdens kvalitet och säkerhet   — hur vården utförs
//    03 Resultat och resurser           — vad den leder till och vad den kostar
//    04 Interna uppföljningsexempel     — regionens egna system
//
//  Områdena matchas mot datamanifestet (index.json) via id — manifestets
//  namn och siffror vinner. Områden i manifestet utan taxonomi-post hamnar
//  i en "Övrigt"-kategori (säkerhetsnät i StartScreen).
// ════════════════════════════════════════════════════════════

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

export const TAXONOMI: KategoriDef[] = [
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
          "Vårdgarantins tre dagar i primärvården och nittio dagar i den specialiserade vården, plus psykiatri och cancervårdens vårdförlopp. Området med tätast uppföljning i hela rapporten.",
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
    namn: "Interna uppföljningsexempel",
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
export function kategoriForOmrade(omradeId: string): KategoriDef | undefined {
  return TAXONOMI.find((k) => k.omraden.some((o) => o.id === omradeId));
}

/** Områdesdefinition för ett id, eller undefined. */
export function omradeDef(omradeId: string): OmradeDef | undefined {
  for (const k of TAXONOMI) {
    const o = k.omraden.find((o) => o.id === omradeId);
    if (o) return o;
  }
  return undefined;
}
