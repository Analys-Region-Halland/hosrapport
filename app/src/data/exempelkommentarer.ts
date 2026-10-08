// data/exempelkommentarer.ts: fiktiva exempel på verksamhetens kommentar
// (2026-10-08). Visar vad en kommentar tillför utöver AI-analysen: AI-analysen
// redovisar värde, plats och förändring; kommentaren förklarar och tolkar.
//
//   Vår bedömning          läget i ord, utan att upprepa siffrorna
//   Varför Halland ...     en tolkning av placeringen
//   Vad som har hänt       konkreta händelser, tidigare och pågående
//   Resultatet och påverkansfaktorerna
//                          årets resultat vägt mot faktorerna i fördjupningen
//                          (vilka som förklarar, vilka som inte gör det),
//                          inte en uppräkning av dem
//   Förslag                vad verksamheten vill göra, i punkter
//
// Händelserna är påhittade men hänger ihop mellan de tre kommentarerna.
// Skribenten är en uppenbar pseudonym och varje kommentar märks "Fiktivt
// exempel" i rapporten (rapport/Kommentar.tsx känner igen id-prefixet).
// Exemplen täcker tre lägen: stark placering men nedgång (1.1), högre värde men
// lägre placering (1.2) och målet nått med små marginaler (1.3).
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
    kommentar("u70447", "Ett högt förtroende som just nu bärs av sjukhusen, inte av helheten", `## Vår bedömning
Hallänningarnas förtroende för vården i sin helhet hör fortfarande till de högsta i landet, men årets nedgång är verklig och inte ett utslag av slumpen. Vi bedömer att den till största delen speglar en nationell rörelse, men att en del av den har en halländsk förklaring som vi själva kan påverka.

## Varför Halland ligger där
Halland har länge haft en vård som invånarna uppfattar som nära och sammanhållen: tre sjukhus inom kort avstånd, en primärvård med högt förtroende och få långvariga konflikter om vårdens organisation. De regioner som ligger före oss, Jönköpings län och Kalmar, har liknande förutsättningar men ligger också före oss i den upplevda tillgängligheten. Det är där avståndet till toppen finns, inte i synen på själva vården.

## Vad som har hänt
Under pandemiåren steg förtroendet i hela landet och Halland nådde sin högsta nivå 2021. Därefter har två saker präglat bilden. Hösten 2024 bytte primärvården telefonisystem, vilket gav långa väntetider i telefon under vintern och mycket uppmärksamhet i lokala medier. Våren 2025 presenterade regionen ett förslag om att samla den akuta ortopedin till Halmstad. Förslaget pausades i juni 2025, men debatten pågick under hela den period då enkäten besvarades.

## Resultatet och påverkansfaktorerna
Den nationella mediebilden förklarar det mesta av nedgången: riket föll ungefär lika mycket, och placeringen är oförändrad. Upplevd tillgänglighet förklarar resten. Förtroendemåttet reagerar ofta året efter att problem märkts i vården, och telefonproblemen vintern 2024 till 2025 passar det mönstret. Nedgången är större än felmarginalen i urvalet, så den ska tas på allvar.

Den tydligaste signalen är att förtroendet för sjukhusen samtidigt ökade (se 1.2). När avståndet mellan sjukhusförtroendet och helheten växer, som det gjort i år, ligger problemet sällan i sjukhusvården. Vi läser det som att det som skaver finns i tillgängligheten och i övergångarna mellan vårdformerna.

## Förslag
- Följa upp telefontillgängligheten i primärvården månad för månad tills den är tillbaka på nivån före bytet.
- Analysera svaren efter ålder och kommun, för att se om nedgången är bred eller koncentrerad till delar av länet.
- Ge invånarna en samlad och tydlig bild av vad som gäller för den akuta ortopedin, eftersom osäkerhet om sjukhusstrukturen påverkar förtroendet även när verksamheten fungerar.`),
  ],

  "ar:kolada-u70446": [
    kommentar("u70446", "Ett starkare år för sjukhusen, i ett år då hela landet gick framåt", `## Vår bedömning
Förtroendet för de halländska sjukhusen ökade tydligt i år och ligger kvar i landets övre skikt. Att placeringen ändå föll ett steg betyder inte att något blivit sämre. Andra regioner ökade mer, och skillnaderna mellan regionerna är så små att placeringen flyttar sig vid minsta förändring.

## Varför Halland ligger där
Halland har korta avstånd till akutsjukhus och vårdkedjor som invånarna i regel uppfattar som sammanhållna. Det ger en stabil grund, och sjukhusförtroendet har legat i landets övre del under nästan hela mätperioden. Det som håller oss från toppen är främst väntetiderna till planerad specialiserad vård, som invånarna upplever som längre än i de regioner som ligger före oss.

## Vad som har hänt
Pandemins första år gav den svagaste placeringen under perioden. Halland var tidigt ute med att skjuta upp planerade operationer våren 2020, och köerna växte snabbare än i många andra regioner. Året efter vände bilden: sjukhusen uppfattades ha klarat påfrestningen, och Halland hade det högsta förtroendet i landet. Sommaren 2024 präglades av stängda vårdplatser och överbeläggningar på medicinklinikerna, vilket fick stort utrymme i lokala medier. Sedan dess har den nya akutmottagningen i Varberg tagits i bruk, hösten 2024, och flödena på akuten har blivit jämnare under 2025.

## Resultatet och påverkansfaktorerna
Vårdplatsläget förklarar både fjolårets svagare resultat och årets återhämtning: rapporteringen sommaren 2024 drog ned bilden, och ett lugnare 2025 lyfte den igen. Sjukhusstrukturen hade kunnat dra åt andra hållet, eftersom förslaget om att samla den akuta ortopedin debatterades samtidigt som enkäten besvarades. Att förtroendet ändå ökade tyder på att beslutet att pausa förslaget togs emot väl.

Väntetiderna till sjukhusvård har inte förbättrats i samma takt och är den faktor som bäst förklarar varför vi inte når de tre främsta. Den lilla spridningen mellan regionerna förklarar att placeringen sjönk ett steg trots ett bättre resultat.

## Förslag
- Hålla fast vid arbetssätten från den nya akutmottagningen och sprida dem till Halmstad.
- Prioritera väntetiderna till planerade operationer, där avståndet till de främsta regionerna är störst.
- Planera sommarens vårdplatser tidigt, eftersom stängda platser får större genomslag i förtroendet än nästan något annat.`),
  ],

  "ar:kolada-u71458": [
    kommentar("u71458", "Långsiktigt arbete bär resultatet, men tillgängligheten är en varningssignal", `## Vår bedömning
Förtroendet för vårdcentralerna är ett av Hallands starkaste resultat och når målet om en plats bland de tre främsta, som det gjort varje år sedan mätningarna började. Årets lilla nedgång är inte oroande i sig, men den pekar på samma svaghet som syns i förtroendet för vården i sin helhet: att komma fram.

## Varför Halland ligger där
Vi ser resultatet som frukten av ett långsiktigt arbete. Halland var tidigt ute med vårdval i primärvården, och vårdcentralerna finns jämnt fördelade över länet. Satsningen på fast läkarkontakt under 2021 och 2022 gjorde att en större andel invånare i dag träffar samma läkare vid återbesök. Det är den del av primärvården som invånarna ger högst betyg.

## Vad som har hänt
Bytet av telefonisystem hösten 2024 gav långa väntetider i telefon under vintern. Problemen är i huvudsak lösta sedan våren 2025, men de låg mitt i den period då många bildade sig en uppfattning inför enkäten. Under 2025 har dessutom två vårdcentraler i norra Halland haft svårt att rekrytera specialister i allmänmedicin och tillfälligt fått förlita sig på hyrläkare.

## Resultatet och påverkansfaktorerna
Att komma fram är den faktor som bäst förklarar årets nedgång, och telefonbytet är den troliga orsaken. Kontinuiteten förklarar varför nedgången stannade vid lite: invånare med fast läkarkontakt har fortsatt högt förtroende även när det varit svårt att nå fram. Samma faktor är också den största risken framåt, eftersom hyrläkare i norra Halland kan dra ned omdömet även om den medicinska kvaliteten är oförändrad. Geografin och primärvårdsuppdragets bredd har vi inte sett några tecken på förändring i.

Marginalerna i toppen är mycket små. En nedgång av samma storlek ett år till kan räcka för att Halland faller ur topp 3, utan att något i grunden har förändrats. Ett stabilt läge kan alltså ändå vara ett sårbart läge.

## Förslag
- Säkra fasta läkare på de två vårdcentralerna i norra Halland, eftersom kontinuiteten är det som bär resultatet.
- Fortsätta följa telefontillgängligheten varje månad och sätta en tydlig gräns för hur långa väntetider i telefon vi accepterar.
- Agera om förtroendet faller ytterligare nästa år eller placeringen hamnar utanför topp 3, men inte läsa in för mycket i en enskild mätning.`),
  ],
};
