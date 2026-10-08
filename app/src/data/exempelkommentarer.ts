// data/exempelkommentarer.ts: fiktiva exempel på verksamhetens kommentar
// (2026-10-08). Visar hur en kommentar kan se ut: läget, en tolkning av varför
// Halland ligger där, utvecklingen, påverkansfaktorer och förslag. Skribenten
// är en uppenbar pseudonym och varje kommentar märks "Fiktivt exempel" i
// rapporten (rapport/Kommentar.tsx känner igen id-prefixet).
//
// Exemplen gäller avsnittet Förtroende för vården i kapitlet Patienters och
// befolkningens syn på vården, och täcker tre olika lägen: stark placering men
// nedgång (1.1), högre värde men lägre placering (1.2) och målet nått med små
// marginaler (1.3). En egen kommentar i webbläsaren ersätter exemplet.
//
// Texten: tomrad mellan stycken, "## " inleder en rubrik, "- " en punkt.

import type { ContentBlock } from "../types";

export const EXEMPEL_PREFIX = "exempel-";

const SKRIBENT = "Exempel Exempelsson";
const DATUM = "2026-10-08T09:00:00.000Z";

const kommentar = (id: string, title: string, text: string): ContentBlock => ({
  id: `${EXEMPEL_PREFIX}${id}`,
  type: "anteckning",
  title,
  text,
  author: SKRIBENT,
  timestamp: DATUM,
});

/** Exemplen per kommentarnyckel `${vy}:${indikatorns id}`. */
export const EXEMPELKOMMENTARER: Record<string, ContentBlock[]> = {
  "ar:kolada-u70447": [
    kommentar("u70447", "Starkt förtroende i jämförelse, men nedgången ska tas på allvar", `## Läget
Sju av tio hallänningar har stort eller mycket stort förtroende för hälso- och sjukvården i sin helhet. Det ger Halland fjärde plats av 21 regioner och ett resultat åtta procentenheter över riket. Avståndet till topp 3 är litet räknat i placering: Gotland på tredje plats ligger bara 0,2 procentenheter före. Till de två främsta, Jönköpings län och Kalmar, är avståndet däremot fem till sex procentenheter.

## Varför Halland ligger där
Vår tolkning är att placeringen speglar en vård som för de flesta upplevs som nära och förutsägbar: korta avstånd till sjukhusen, en primärvård med högt förtroende (se 1.3) och en sammanhållen organisation. Regionerna i toppen har liknande förutsättningar. Att Halland inte når ända upp hänger sannolikt ihop med den upplevda tillgängligheten, där regionen ligger på plats 4 till 7 och inte når topp 3 i någon indikator (se avsnittet Upplevd tillgång och väntetid).

## Utvecklingen
Förtroendet har legat mellan 68 och 77 procent sedan 2016. Nedgången från 75,5 till 71,4 procent det senaste året är den största under hela perioden, men riket föll lika mycket och placeringen är oförändrad. Vi läser därför nedgången främst som en nationell rörelse och inte som en halländsk försämring. Samtidigt ligger resultatet klart under toppåret 2021, och en fortsatt nedgång nästa år vore en tydlig signal att agera på.

## Påverkansfaktorer
Måttet är ett omdöme om vården som system och besvaras av hela befolkningen, även av dem som inte varit i vården under året. Det påverkas därför av nyhetsrapportering och offentlig debatt om väntetider, inte bara av egna vårdmöten. Skillnader på två till tre procentenheter mellan enskilda år ligger inom vad urvalet i Hälso- och sjukvårdsbarometern kan ge.

## Förslag
- Ta reda på vilka grupper som tappat förtroende, till exempel efter ålder och kommun, innan åtgärder väljs.
- Berätta tydligare om det som förbättrats i tillgängligheten, eftersom den upplevda tillgången väger tungt i helhetsomdömet.
- Sätta som delmål att återta nivån från 2024, innan siktet ställs på topp 3, eftersom avståndet till de två främsta är stort.`),
  ],

  "ar:kolada-u70446": [
    kommentar("u70446", "Högre förtroende, men andra regioner ökade mer", `## Läget
78,1 procent av hallänningarna har stort förtroende för sjukhusen, en ökning med 2,9 procentenheter från året innan. Halland ligger på femte plats av 21, knappt fem procentenheter över riket. Till tredje platsen, Dalarna med 80,0 procent, saknas 1,9 procentenheter.

## Varför placeringen sjönk trots ett bättre resultat
Förtroendet för sjukhusen steg i nästan hela landet 2025, och riket ökade med 5,8 procentenheter, dubbelt så mycket som Halland. Placeringen föll därför från fjärde till femte plats. Halland har alltså inte blivit sämre, men andra regioner har knappat in. Placeringen är relativ och ska läsas tillsammans med nivån.

## Tolkning över tid
Sjukhusförtroendet har legat på plats 3 till 6 under större delen av perioden. Undantagen är 2020, då Halland föll till plats 9, och 2021, då Halland låg först med 84,2 procent. Toppåret sammanföll med pandemins andra år, då förtroendet för sjukhusvården steg i hela landet. Vår bedömning är att den halländska nivån i grunden vilar på korta vårdkedjor och närhet till sjukhus, medan väntetiderna på akutmottagningarna drar ned helhetsbilden.

## Påverkansfaktorer
Frågan ställs till hela befolkningen. Omdömet bygger både på egna och närståendes vårdtillfällen och på bilden i media, och en uppmärksammad händelse vid ett enskilt sjukhus kan slå igenom på hela regionens resultat ett år.

## Förslag
- Fortsätta arbetet med väntetiderna på akutmottagningarna, där upplevelsen av sjukhusvården ofta formas.
- Jämföra arbetssätt med Dalarna och Kalmar, som ligger högre, för att hitta konkreta skillnader.
- Bedöma utvecklingen över flera år snarare än enskilda placeringar, eftersom avstånden mellan plats 3 och 6 är små.`),
  ],

  "ar:kolada-u71458": [
    kommentar("u71458", "Stabil topposition, men marginalerna är små", `## Läget
71,9 procent av hallänningarna har stort förtroende för vårdcentralerna. Halland ligger på andra plats av 21 och når målet om en plats bland de tre främsta, nio procentenheter över riket. Halland har legat bland de tre främsta varje år sedan 2016.

## Varför Halland ligger högt
Vår tolkning är att det långsiktiga arbetet i primärvården bär resultatet. Halland var tidigt ute med vårdval, vårdcentralerna finns jämnt fördelade över länet och många invånare har en fast kontakt. Det ger en primärvård som de flesta upplever som tillgänglig och kontinuerlig, och den bilden har varit stabil över tid.

## Utvecklingen
Resultatet sjönk med 1,4 procentenheter det senaste året men ligger fortfarande över alla år före 2021. Nedgången är liten och ryms inom vad som kan väntas mellan två mätningar. Placeringen är oförändrad.

## Därför ska marginalen ändå följas
Avståndet mellan plats 1 och plats 5 är bara 2,5 procentenheter. En nedgång av samma storlek ett år till kan räcka för att Halland faller ur topp 3, utan att något i grunden har försämrats. Ett stabilt läge kan alltså ändå vara ett sårbart läge.

## Påverkansfaktorer
Telefontillgängligheten och möjligheten att få en tid samma dag väger tungt för förtroendet för vårdcentralerna (se kapitlet Tillgänglighet och väntetider). Kontinuitet, att få träffa samma läkare, är en annan faktor som tydligt hänger ihop med förtroende.

## Förslag
- Behålla fokus på kontinuitet och fast läkarkontakt, som sannolikt är en stor del av förklaringen till det höga förtroendet.
- Följa telefontillgängligheten noga, eftersom den har sjunkit och kan påverka förtroendet med viss fördröjning.
- Inte läsa in för mycket i ett enskilt års nedgång, men agera om resultatet faller under 70 procent eller placeringen hamnar utanför topp 3.`),
  ],
};
