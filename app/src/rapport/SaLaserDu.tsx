// rapport/SaLaserDu.tsx: sidan Så läser du rapporten på #/las (arkitektur 4.6).
// Ägare: WP12b. Samma sidmall som kapitlet och Om rapporten
// (Textsida.module.css): masthead, delar med rubrik på kapitelnivå och
// löptext i typ.roll.brod.
//
//   Så är ett kapitel uppbyggt   delarna i ordning (stilguiden 4.3 och 4.4)
//   Så bestäms statusen          rankade och interna indikatorer (begreppen
//                                I fas, Bevaka, Avvikelse; SIGNAL-METODIK 3)
//   Beskrivande mått             (begreppet Beskrivande mått)
//   Så läser du graferna         utseende och användning (stilguiden 6.1,
//                                6.4, 6.7 och 6.8)
//   Begrepp och AI-analys        (begreppet AI-analys, Om statistiken)
//
// Sakuppgifterna kommer ur stilguiden, innehall/begrepp.json, SIGNAL-METODIK.md
// och kapitlens inledningar. Knapparnas och flikarnas namn är de som står i
// gränssnittet. Begreppen länkas en gång per del.

import { useState, type ReactNode } from "react";
import Prosa from "../begrepp/Prosa";
import type { Status } from "../data/modell";
import Lank from "../nav/Lank";
import StatusMarkor from "../ui/StatusMarkor";
import Masthead from "./Masthead";
import t from "./delat.module.css";
import s from "./Textsida.module.css";

const KICKER = "Hälso- och sjukvården i Halland";
const DEK = "Hur ett kapitel är uppbyggt, hur statusen bestäms och hur du använder graferna.";
const HS = " "; // hårt mellanslag före procenttecknet (stilguiden 3.2)

type Post = [term: string, text: string];

const KAPITLETS_DELAR: Post[] = [
  ["Det viktigaste", "Högst sex punkter, en mening var. De väljs med fasta regler, till exempel statusbyten, bästa och sämsta placering och största förändring. Varje punkt slutar med en länk till indikatorn i formen ”se 2.3”."],
  ["Läget i korthet", "En tabell med kapitlets alla indikatorer: senaste värde, plats bland regionerna, utvecklingen i ett litet diagram och status. Sortera genom att klicka på ett kolumnhuvud. Namnet leder till indikatorn."],
  ["Avsnitt", "Indikatorerna står i numrerade avsnitt, vart och ett med en kort inledning. Ett kapitel utan avsnitt visar indikatorerna direkt."],
  ["Indikator", `Rubriken har nummer, namn och status. Under den står nyckeltalsraden med senaste värde, plats och period, till exempel 87,7${HS}% · plats 8 av 21 · 2024. Sedan följer en kort analys och figuren.`],
  ["Fördjupning", "Under figuren finns Om måttet, källan och påverkansfaktorer. Där står vad måttet räknar, varifrån datan kommer och vad som kan påverka värdet. Har verksamheten kommenterat indikatorn står kommentaren sist."],
  ["Om statistiken", "Sist i kapitlet står metoden, hur statusen sätts, begreppen i kapitlet och källorna med vägen till rapporten."],
];

const HITTA =
  "På en bred skärm står innehållsförteckningen till vänster. På en smalare skärm öppnar du den från positionsraden överst, som visar var i kapitlet du är. Finns kapitlet för flera tidsupplösningar, till exempel månad och år, väljer du tidsupplösning sist i kapitlets metarad. Med Alla kapitel i verktygsraden kommer du tillbaka till startsidan.";

const STATUS_INTRO =
  "Status visas med tre ord: I fas, Bevaka och Avvikelse. Färgen hjälper, men ordet står alltid med. Hur statusen bestäms beror på om indikatorn jämför regionerna eller följer regionens egen verksamhet.";

const RANKAD_INTRO =
  "Halland rangordnas bland de regioner som har ett värde det året. Riket räknas inte med, och lika värden får samma plats. Indikatorns riktning avgör om ett högt eller ett lågt värde är bäst.";

const RANKAD: Record<Status, string> = {
  gron: "Plats 1–3, alltså topp 3.",
  gul: "Plats 4–7.",
  rod: "Plats 8 eller lägre.",
};

const RANKAD_TOLKNING =
  "Målet är relativt. Topp 3 säger att Halland hör till de bästa regionerna, inte att ett nationellt mål är nått. Plats 8 eller lägre betyder att andra regioner når längre, inte med nödvändighet att nivån i sig är otillräcklig.";

const INTERN_INTRO =
  "I akutflödet jämförs värdet med ett förväntat intervall. Intervallet räknas fram ur tidigare perioder, med hänsyn till trend, säsong, veckodag och helgdagar.";

const INTERN: Record<Status, string> = {
  gron: "Värdet ligger inom det förväntade intervallet. Där hamnar ungefär fyra av fem perioder när inget har förändrats.",
  gul: "Värdet ligger utanför det förväntade intervallet men inom det bredare intervall som rymmer 95 procent. Där hamnar omkring 15 procent av perioderna även när inget har förändrats.",
  rod: "Värdet ligger utanför intervallet som rymmer 95 procent. Det händer ungefär en period av tjugo när inget har förändrats.",
};

const INTERN_TOLKNING = [
  "Ett enstaka utfall under bevakning är därför ett skäl att följa utvecklingen, inte att dra slutsatser. I grafen syns det förväntade intervallet som ett band. Ett värde utanför bandet markeras med en triangel och ett värde långt utanför med en romb.",
  "Varje sjukhus bedöms för sig. Ett sjukhus kan därför ha status Avvikelse medan regionen som helhet ligger i fas.",
].join("\n\n");

const BESKRIVANDE =
  "Vissa indikatorer saknar målriktning, till exempel antal vårdtillfällen och antal disponibla vårdplatser. Där är ett högre eller lägre värde inte i sig bättre. De får varken status eller plats, och i nyckeltalsraden står beskrivande mått i stället för plats. De redovisas som underlag för att tolka de indikatorer som har en riktning.";

const GRAFER = [
  "Graferna har inga teckenförklaringar. Halland, riket och de regioner du har valt har sitt namn där linjen slutar. Halland är grönt, riket en streckad mörkgrå linje och övriga regioner ljusgrå linjer. Av de övriga har bara den högsta och den lägsta namn.",
  "Titeln säger vad grafen visar och undertiteln vilket mått, vilken population och vilken period. Under grafen står noter och källan. Ett seriebrott markeras med ett kort streck på tidsaxeln och texten ny metod.",
].join("\n\n");

const ANVANDNING: Post[] = [
  ["Hovra", "Håll pekaren över grafen för att se värdena för en period. Rutan visar Halland, riket och de regioner du har valt, med värde och plats."],
  ["Klicka för att fästa", "Klicka på en linje eller på dess namn för att visa regionen i färg. Klicka igen för att ta bort den. Högst fyra regioner kan vara fästa samtidigt."],
  ["+ Jämför med region", "Öppnar en lista med kryssrutor för regionerna. Högst fyra kan vara valda, och en femte ersätter den som valdes först. De valda står under grafen med ett × som tar bort dem, och Rensa tar bort alla."],
  ["Flikar", "Ovanför grafen byter du visning, till exempel Över tid och Rangordning. I akutflödet väljer du också nivå, som Region Halland och Per sjukhus, och ibland Per dag."],
  ["Nedborrning", "Under Per sjukhus visas en liten graf per sjukhus, med samma skala i alla. Klicka på sjukhusets namn för att gå ner en nivå, till exempel till avdelningarna. I en rangordning av sjukhus klickar du på raden. Länkarna ovanför grafen tar dig tillbaka upp."],
  ["Tabell", "Visar samma uppgifter i en tabell. Diagram tar dig tillbaka till grafen."],
  ["Ladda ner", "Sparar uppgifterna som CSV för Excel, eller grafen som SVG eller PNG med titel, undertitel och källa."],
  ["Förstora", "Visar grafen i full bredd i ett eget fönster, med samma valda regioner. Stäng eller Escape stänger fönstret."],
  ["Tangentbord", "Tabba till grafen. Pilarna åt vänster och höger flyttar mellan perioderna, Home och End till den första och den sista. Pilarna uppåt och nedåt byter linje. Enter fäster linjen och Escape stänger rutan."],
  ["Pekskärm", "Tryck på grafen för att se värdena och tryck på en linje för att lyfta fram den. Tryck på samma linje igen för att fästa den. Tryck utanför grafen för att stänga."],
];

const AI_ANALYS =
  "Analyserna vid indikatorerna och punkterna under Det viktigaste är AI-analys. De skrivs automatiskt med fasta regler ur rapportens data, så att samma läge alltid beskrivs på samma sätt. Texten beskriver vad datan visar, inte varför. Förklaringar står i fördjupningen och i verksamhetens kommentar. Under varje sådan text står AI-analys, genererad ur rapportens data.";

const STATUSAR: Status[] = ["gron", "gul", "rod"];

export default function SaLaserDu(): ReactNode {
  // Begreppen länkas första gången per del (Prosa delar `redan` inom delen)
  const [redan] = useState(() => ({
    kapitel: new Set<string>(),
    status: new Set<string>(),
    beskrivande: new Set<string>(),
    grafer: new Set<string>(),
    begrepp: new Set<string>(),
  }));

  return (
    <article className={s.sida} data-las-sida="">
      <Masthead kicker={KICKER} titel="Så läser du rapporten" dek={DEK} />

      <section className={s.del} aria-labelledby="las-kapitel">
        <h2 id="las-kapitel" className={t.avsnittsrubrik}>Så är ett kapitel uppbyggt</h2>
        <Prosa
          text="Alla kapitel byggs av samma delar i samma ordning. Det viktigaste står först och metod och källor sist. En del som saknar innehåll i ett kapitel visas inte."
          redan={redan.kapitel}
          className={t.brod}
        />
        <Lista poster={KAPITLETS_DELAR} redan={redan.kapitel} />
        <div className={s.grupp}>
          <h3 className={t.blockrubrik}>Hitta i kapitlet</h3>
          <Prosa text={HITTA} redan={redan.kapitel} className={t.brod} />
        </div>
      </section>

      <section className={s.del} aria-labelledby="las-status">
        <h2 id="las-status" className={t.avsnittsrubrik}>Så bestäms statusen</h2>
        <Prosa text={STATUS_INTRO} redan={redan.status} className={t.brod} />
        <div className={s.grupp}>
          <h3 className={t.blockrubrik}>Indikatorer som jämför regionerna</h3>
          <Prosa text={RANKAD_INTRO} redan={redan.status} className={t.brod} />
          <Statuslista texter={RANKAD} redan={redan.status} />
          <Prosa text={RANKAD_TOLKNING} redan={redan.status} className={t.brod} />
        </div>
        <div className={s.grupp}>
          <h3 className={t.blockrubrik}>Intern uppföljning</h3>
          <Prosa text={INTERN_INTRO} redan={redan.status} className={t.brod} />
          <Statuslista texter={INTERN} redan={redan.status} />
          <Prosa text={INTERN_TOLKNING} redan={redan.status} className={t.brod} />
        </div>
      </section>

      <section className={s.del} aria-labelledby="las-beskrivande">
        <h2 id="las-beskrivande" className={t.avsnittsrubrik}>Beskrivande mått</h2>
        <Prosa text={BESKRIVANDE} redan={redan.beskrivande} className={t.brod} />
      </section>

      <section className={s.del} aria-labelledby="las-grafer">
        <h2 id="las-grafer" className={t.avsnittsrubrik}>Så läser du graferna</h2>
        <Prosa text={GRAFER} redan={redan.grafer} className={t.brod} />
        <div className={s.grupp}>
          <h3 className={t.blockrubrik}>Så använder du graferna</h3>
          <Lista poster={ANVANDNING} redan={redan.grafer} />
        </div>
      </section>

      <section className={s.del} aria-labelledby="las-begrepp">
        <h2 id="las-begrepp" className={t.avsnittsrubrik}>Begrepp och AI-analys</h2>
        <p className={t.brod}>
          Ord med prickad understrykning förklaras när du klickar på dem eller väljer dem med Enter. Alla förklaringar
          finns i <Lank till={{ sida: "begrepp" }} className={t.lank}>begreppslistan</Lank>.
        </p>
        <Prosa text={AI_ANALYS} redan={redan.begrepp} className={t.brod} />
        <p className={t.brod}>
          Vad rapporten är och vilka källor kapitlen bygger på står i{" "}
          <Lank till={{ sida: "om" }} className={t.lank}>Om rapporten</Lank>.
        </p>
      </section>
    </article>
  );
}

/** Term och förklaring: termen (typ.roll.granssnitt 600) över löptexten. */
function Lista({ poster, redan }: { poster: Post[]; redan: Set<string> }) {
  return (
    <dl className={s.lista}>
      {poster.map(([term, text]) => (
        <div key={term}>
          <dt className={t.etikett}>{term}</dt>
          <dd><Prosa text={text} redan={redan} className={t.brod} /></dd>
        </div>
      ))}
    </dl>
  );
}

/** Statusmarkören bredvid förklaringen (under varandra i mobil). */
function Statuslista({ texter, redan }: { texter: Record<Status, string>; redan: Set<string> }) {
  return (
    <dl className={s.status}>
      {STATUSAR.map((st) => (
        <div key={st} className={s.statusrad}>
          <dt><StatusMarkor status={st} /></dt>
          <dd><Prosa text={texter[st]} redan={redan} className={t.brod} /></dd>
        </div>
      ))}
    </dl>
  );
}
