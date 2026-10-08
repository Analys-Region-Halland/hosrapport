# Stilguide för HoS-rapporten

Version 1.1 · 2026-10-08 · Gäller webbrapporten, startsidan, sammanfattningen och PowerPoint-exporten.

Stilguiden är normerande. Tokennamnen i tabellerna (`farg.fokus`, `typ.roll.brod` …) är exakt de nycklar som finns i `app/src/design/tema.ts`. Ingen färg, storlek eller avstånd får skrivas direkt i en komponent; allt hämtas ur `tema.ts`. Den levande stilguiden (`app/verktyg/stilguide.html`) renderar allt nedan ur koden och är facit vid tvekan om utseende. Tekniska detaljer (moduler, typer, kontrakt) finns i `docs/arkitektur.md`.

Underlag: GSS/Analysis Function (diagram, tabeller, tillgänglighet), ONS Service Manual (diagramtext, färg, axlar, bulletiner, osäkerhet, små multiplar), Urban Institute, Datawrapper Academy, FT Visual Vocabulary, WCAG 2.2 och DIGG:s webbriktlinjer, GOV.UK Design System (Details, skrivregler), Nielsen Norman Group (progressiv visning, tooltips), Myndigheternas skrivregler, Butterick, SCB:s diagramprofil, Spiegelhalter (trattdiagram).

---

## 1. Principer

| # | Princip | Det betyder i praktiken |
|---|---|---|
| 1 | **Svaret först** | Sammanfattning, kapitel, avsnitt och indikator inleds med sin slutsats. Metod och definitioner ligger sist eller bakom fördjupning. |
| 2 | **En uppgift, en plats** | Varje uppgift (status, värde, plats, period, källa) har en fast position per nivå, se 5.6. Att visa samma sak två gånger är ett fel. |
| 3 | **Tre synliga strukturnivåer** | Kapitel › avsnitt › indikator. Inuti en indikator finns inga innehållsrubriker, bara figurens titel och etiketter. |
| 4 | **Fördjupning på begäran** | Det de flesta läsare behöver syns. Det några behöver ligger högst ett klick bort. Aldrig mer än två nivåer av hopfällning. |
| 5 | **Ett grafspråk** | Alla graftyper delar anatomi, färgroller, typografi och interaktion (avsnitt 6). |
| 6 | **Färg betyder något** | Grönt = Halland eller vald enhet. Grått = sammanhang. Statusfärg bara i statusmarkörer. Ingen färg är dekoration. |
| 7 | **Samma mall oavsett källa** | Alla kapitel byggs av samma block i samma ordning. Block utan data utelämnas och ersätts inte av något annat. |
| 8 | **Tillgängligt som standard** | WCAG 2.2 nivå AA är lagkrav (EN 301 549). Varje graf har tabell, textsammanfattning och tangentbordsstöd. |
| 9 | **Lugn yta, lyfta verktyg** | Löptexten står fritt utan ramar; avstånd grupperar. Det man kan använda (figurer, statusrutan, hovringskort) ligger i kort med hårlinjeram, rundade hörn och mjuk skugga, så att det syns att det är interaktivt (2026-10-08). |
| 10 | **Hög kontrast** | Text, axlar och tickvärden i full eller nära full svärta. Hierarki bärs av storlek och vikt, inte av grå toner (2026-10-08). |

---

## 2. Grundelement

### 2.1 Färg

Alla textfärger är kontrollerade mot både `farg.papper` och `farg.yta`.

| Token | Värde | Kontrast mot papper / yta | Används till |
|---|---|---|---|
| `farg.papper` | #FBFBF9 | – | Sidans bakgrund |
| `farg.yta` | #FFFFFF | – | Figurplattan, popover, tabellhuvud i förstoring |
| `farg.black` | #1A1A1A | 16,8 / 17,4 | Rubriker, brödtext, siffror |
| `farg.text2` | #2F3431 | 12,2 / 12,7 | Dek i sekundära lägen, förklarande rader i tabellhuvud |
| `farg.text3` | #4E5450 | 7,5 / 7,8 | Not, källa, metarad. Lägsta tillåtna textfärg. |
| `farg.harlinje` | #E6E6E1 | – | Rutnät och tabellrader. Aldrig i läsflödet. |
| `farg.fokus` | #00664D | 6,7 / 7,0 | Halland eller vald enhet, länkar, numrering, aktiv flik |
| `farg.fokusLjus` | #E9F2EE | – | Bakgrund för vald rad i tabell och innehållsförteckning |
| `farg.fokusring` | #00664D | – | Tangentbordsfokus: 2 px heldragen, 2 px avstånd |

Fem textfärger totalt (`black`, `text2`, `text3`, `fokus` samt statusfärgernas chiptext). Inga andra gråtoner i text.

### 2.2 Diagramfärger

| Token | Värde | Roll |
|---|---|---|
| `farg.diagram.fokus` | #00664D | Halland eller vald enhet |
| `farg.diagram.kontext` | #CDCDC7 | Övriga regioner eller enheter, som hårfin linje |
| `farg.diagram.kontextPunkt` | #6B716D | Övriga i punktdiagram (där punkten är själva datan) |
| `farg.diagram.kontextAktiv` | #2F3431 | Kontextserie under pekaren |
| `farg.diagram.referens` | #2F3431 | Riket, överordnad nivå, föregående period |
| `farg.diagram.forvantat` | #DDE3EA | Förväntat intervall, ett band |
| `farg.diagram.rutnat` | #CBCBC4 | Streckat rutnät |
| `farg.diagram.axel` | #1A1A1A | x-axelns baslinje och korta axelstreck |
| `farg.diagram.grans` | #4E5450 | Enstaka gränslinje, t.ex. topp 3 i rangordningen |
| `farg.diagram.nollinje` | #1A1A1A | Nollbaslinje i stapeldiagram |
| `farg.diagram.axeltext` | #1A1A1A | Tickvärden |
| `farg.diagram.anslutning` | #8E8E89 | Kopplingslinje från linjeslut till etikett |
| `farg.diagram.markering` | #004990, #B35900, #433C9D, #895B42 | Fästa serier, i denna ordning, högst fyra |

- Inga ytor i plotytan utom förväntat intervall och staplar. Topp 3-zoner, områden mellan regioner och skuggningar används inte.
- Markeringsfärgerna har alla ≥ 4,5:1 mot vit yta, så att etiketter i seriens färg också klarar textkravet. Grönt ingår inte (reserverat för fokus) och inte heller rött (förväxlas med status).
- Kontextlinjerna (#D6D6D1) är medvetet ljusa och undantas från kravet på 3:1 eftersom de inte är nödvändiga för budskapet och tabellen ger samma information (WCAG 1.4.11, AF). Allt som bär budskapet (fokus, referens, punkter i punktdiagram) klarar 3:1.

### 2.3 Statusfärger

| Status | Etikett | `markor` (prick, kant) | `text` (chiptext) | `botten` (chipbotten) | Chiptext mot botten |
|---|---|---|---|---|---|
| `gron` | I fas | #2E7D52 | #1F6A43 | #E8F1EC | 5,7:1 |
| `gul` | Bevaka | #B07A12 | #8A5E12 | #F6ECD9 | 4,9:1 |
| `rod` | Avvikelse | #B23A2E | #9A2E22 | #F4E3DF | 6,1:1 |

- Etikettorden är exakt "I fas", "Bevaka", "Avvikelse". Aldrig "Att bevaka" eller symboler i stället för ord.
- Statusfärg får förekomma i: statusmarkören (5.1), statusrutan (5.10), innehållsförteckningens prick, översiktstabellen (även förändringschipen: grön åt rätt håll, röd åt fel håll), punkter utanför förväntat intervall (6.4). Ingen annanstans.
- Placeringens toner (`farg.plats.topp/gul/barnsten/orange/rod/morkrod/neutral`, var och en med `yta`, `text` och `punkt`) används bara för platsbrickan, platsskalan och platsen i hovringskortet (5.8).
- Mått utan målriktning (beskrivande mått) får ingen statusmarkör alls. Nyckeltalsraden säger "beskrivande mått".

### 2.4 Typografi

**Familjer:** `typ.familj.serif` = Source Serif 4, `typ.familj.sans` = IBM Plex Sans. Båda självhostade. Inga andra familjer. Siffror i sans sätts alltid med `font-variant-numeric: tabular-nums` i tabeller, nyckeltal och diagram.

| Token | Familj | Desktop (px/radhöjd, vikt) | Mobil < 640 | Används till |
|---|---|---|---|---|
| `typ.roll.titel` | serif | 44/1.1, 700, spärr −0,02 em | 32 | Rapport-, kapitel- och sammanfattningstitel |
| `typ.roll.avsnitt` | serif | 32/1.2, 600, spärr −0,01 em | 26 | Avsnitt (h2), Om statistiken, kapitel i sammanfattningen |
| `typ.roll.indikator` | serif | 24/1.25, 600 | 21 | Indikatorns namn (h3) |
| `typ.roll.ingress` | serif | 21/1.5, 400 | 19 | Dek under titel och avsnitt, startsidans ingress |
| `typ.roll.brod` | serif | 18/1.6, 400 | 17 | All löptext: analys, fördjupning, Det viktigaste, kommentarer |
| `typ.roll.figurtitel` | sans | 18/1.3, 600 | 17 | Figurtitel, blockrubrik ("Det viktigaste", "Läget i korthet"), startsidans kapitelnamn i listor |
| `typ.roll.granssnitt` | sans | 15/1.45, 400 eller 600 | 15 | Undertitel, nyckeltalsrad, knappar, flikar, tabelltext, etikett i fördjupning |
| `typ.roll.not` | sans | 13/1.4, 400 eller 600 | 13 | Källa, not, metarad, proveniens, kicker, innehållsförteckningens indikatorer, tickvärden och etiketter i diagram. Inget i produkten är mindre än 13 px utom seriebrottets "ny metod" och rangordningens "topp 3" (12 px). |

**Regler**

| Regel | Spec |
|---|---|
| Radlängd | Löptext högst `matt.text` = 34 em (≈ 612 px vid 18 px, 60–70 tecken). Figurer får vara bredare (`matt.figur`). |
| Versaler | Bara kickern ovanför titeln (`typ.roll.not`, 600, versal, spärr 0,08 em, `farg.fokus`). Inga versala etiketter i tabeller, menyer eller flöde. |
| Kursiv | Bara för verktitlar och citat. Aldrig för betoning i genererad text. |
| Fetstil | Bara i rubrikroller, nyckeltal och tabellhuvud. Inte inne i löptext. |
| Kursiv + fet | Aldrig samtidigt. |
| Justering | Vänsterställt överallt. Siffror i tabeller högerställs. |
| Länkar | `farg.fokus`, understrykning 1 px med 0,2 em avstånd. Vid hover 2 px. Besökta länkar ändrar inte färg. |

### 2.5 Avstånd och mått

**Avståndsskala** (`rum.*`, 8-punktsrutnät): 1 = 4, 2 = 8, 3 = 12, 4 = 16, 5 = 24, 6 = 32, 7 = 48, 8 = 64, 9 = 96, 10 = 128 px.

**Närhetsregeln:** avståndet mellan två indikatorer ska vara minst 2,5 gånger det största avståndet inuti en indikator. På avsnitts- och kapitelnivå bärs gränsen av rubriken (numrerad serif 32 px) tillsammans med avståndet, så där gäller inte kvoten. Därför:

| Mellan | Avstånd ovanför | Avstånd under rubriken |
|---|---|---|
| Masthead och första blocket | – | `rum.8` (64) |
| Block på kapitelnivå (Det viktigaste, Läget i korthet, Om statistiken) | `rum.9` (96) | `rum.4` (16) |
| Avsnitt (h2) | `rum.10` (128) | dek `rum.4`, sedan `rum.8` till första indikatorn |
| Indikator (h3) | `rum.9` (96) | nyckeltalsrad `rum.2`, analys `rum.5` |
| Inne i en indikator | högst `rum.6` (32) mellan delar | – |
| Stycken i löptext | 0,9 em | – |

**Mått** (`matt.*`)

| Token | Värde | Vad |
|---|---|---|
| `matt.text` | 34 em | Löptextens maxbredd |
| `matt.figur` | 880 px | Figurens maxbredd; figuren delar vänsterkant med texten och får sticka ut till höger |
| `matt.sida` | 1320 px | Sidans maxbredd inklusive innehållsförteckning |
| `matt.toc` | 220 px | Innehållsförteckningens spalt (bara desktop) |
| `matt.verktygsrad` | 56 px | Verktygsradens höjd |
| `matt.harlinje` | 1 px | Hårlinjer: rutnät, tabellrader, popoverns ram |
| `matt.marginal` | 24 px desktop, 16 px mobil | Sidmarginal |
| `komponent.statusmatare` | höjd 6 px, mellanrum 2 px | Statusmätarens segment (startsida, sammanfattning) |

**Brytpunkter** (`brytpunkt.*`): `mobil` < 640, `mellan` 640–1199 (innehållsförteckning som ark), `desktop` ≥ 1200 (innehållsförteckning som spalt). Inget får ge vågrät rullning vid 320 px.

### 2.6 Rörelse

Korta övergångar (`rorelse.kort` = 120 ms) när popover, tooltip och hovringskort visas och när ett kort eller en tabellrad tonas vid hovring. Det enda som rör sig av sig självt är fokusseriens slutpunkt i linjediagram, som pulserar lugnt (`diagram.puls`, 2,4 s). `prefers-reduced-motion` och utskrift stänger av allt. Ingen scrollstyrd in- eller utfällning.

---

## 3. Text

### 3.1 Skrivregler (gäller handskriven och genererad text)

| Regel | Spec |
|---|---|
| Klarspråk | Mottagaranpassat, det viktigaste först, aktiv form. Meningar ≤ 25 ord, stycken ≤ 5 meningar. |
| Tankstreck | **Inga em dash (—)** i någon text. En dash (–) bara i intervall: `2019–2024`, `plats 4–7`. Skriv om till två meningar, komma eller kolon. |
| Undertitlar | Högst två meningar. Allt längre hör hemma i fördjupningen. |
| Rubriker | Beskrivande, högst 75 tecken, inga frågor, ingen avslutande punkt. Inte "Inledning", "Översikt" eller "Diverse". |
| Namn | "Region Halland" i löptext första gången per indikator, sedan "Halland" eller "regionen". I diagram och tabeller alltid "Halland". "Riket" i diagram, "riket" i löptext. |
| Status | Exakt "I fas", "Bevaka", "Avvikelse". I löptext med liten bokstav: "ligger i fas", "under bevakning". |
| Hänvisning | Till indikator med nummer: "se 2.3". Aldrig "nedan" eller "ovan". |

### 3.2 Tal, enheter och datum (Myndigheternas skrivregler)

| Vad | Skrivs | Exempel |
|---|---|---|
| Tusental | Hårt mellanslag (U+00A0) | `12 345` |
| Decimaler | Komma | `3,4` |
| Procent | Hårt mellanslag före `%` | `87,7 %` |
| Procentenheter | "procentenheter" i löptext, `p.e.` i tabeller och diagram | `ökade med 2,1 procentenheter` |
| Minus | U+2212 i tabeller och diagram, bindestreck i löptext | `−3,2` |
| Kronor | `kr`, tusental med mellanslag | `45 300 kr` |
| Per invånare | `per 100 000 invånare` i undertitel, `per 100 000 inv.` i etiketter | |
| Antal decimaler | procent 1, minuter 0, antal 0, kronor 0, kvoter 1, per invånare 1. Samma antal decimaler genom hela en kolumn eller axel. | |
| Tal i löptext | Ett till tolv med bokstäver, utom med enhet, i tabeller och vid jämförelse med större tal | `tre dagar`, `14 indikatorer` |
| Datum i löptext | `5 oktober 2026` | |
| Månad | Liten bokstav. I löptext utskriven (`mars 2026`), på axlar förkortad (`mar 26`) | |
| Vecka | `vecka 12` i löptext, `v. 12` på axlar | |
| Kvartal | `kvartal 1 2026` i löptext, `kv. 1 26` på axlar | |
| Period | En dash utan mellanslag | `2016–2025`, `jan 2021–mar 2026` |
| Saknas | `–` (inget värde), `..` (för osäkert eller dolt på grund av få fall) | Förklaras i tabellens not |

### 3.3 Ordlista för gränssnittet

Samma sak heter alltid samma sak.

| Begrepp | Betyder | Används inte |
|---|---|---|
| rapporten | Hela HoS-rapporten | – |
| kapitel | Ett av rapportens delar (SKR-kapitlen 1–6, Akutflöde …) | område, rapport (om delen), del |
| avsnitt | Grupp av indikatorer inom ett kapitel | del, sektion |
| indikator | Ett mått med graf | KPI, nyckeltal (i rubriker) |
| sammanfattning | Sidan som sammanfattar alla kapitel | helhetsvy, samtliga rapporter |
| enhet | Generiskt för underliggande organisatorisk nivå. I gränssnittet visas nivåns eget namn (sjukhus, förvaltning, avdelning). | avdelning (när det inte är en avdelning) |
| tidsupplösning | Dag, vecka, månad, kvartal, år | tidsvy |
| AI-analys | Text som genereras ur rapportens data. Förklaras i begreppslistan. | – |

### 3.4 Genererad text

| Text | Längd | Regel |
|---|---|---|
| Det viktigaste | ≤ 6 punkter, en mening var | En sak per punkt. Valda med regler: statusbyte, bästa och sämsta placering, största rörelse, nått eller lämnat topp 3. Varje punkt slutar med länk till indikatorn. |
| Avsnittets dek | 1–2 meningar | Vad som skiljer avsnittet ut. Ingen statusräkning (den står i översikten). |
| Indikatorns analys | 2–4 meningar | Ordning för rankade mått: läge och mål, utveckling, relativt riket och övriga. Börjar inte med siffror som redan står i nyckeltalsraden. Kompletterar grafen, beskriver den inte. |
| Proveniens | En liten ruta före texten | Vit ruta, 1 px ram #D9D9D2, radie 8 px, `typ.roll.not` i `farg.black`: stjärnikon i `farg.fokus`, **AI-analys**, genererad ur rapportens data. och `Så skapas texten →` i 600 `farg.fokus`. Hela rutan är en länk till Om statistiken; hover ger grön ram och understruken länktext (2026-10-08). En märkning per text, aldrig både märke i rubrik och byline. |

---

## 4. Sidmallar

### 4.1 Startsida

| # | Block | Spec |
|---|---|---|
| 1 | Brandlist | `farg.fokus` som yta, 48 px, vit logotyp 22 px och "HoS-rapport" i `typ.roll.granssnitt` 600 vitt. Enda gröna ytan i produkten. |
| 2 | Masthead | Kicker "Region Halland · Analys", titel "Hälso- och sjukvården i Halland" (`typ.roll.titel`), ingress ≤ 3 meningar (`typ.roll.ingress`). |
| 3 | Läget just nu | Blockrubrik, statusrutan i storlek `lage` (5.10) som är summan av kapitelradernas rutor (varje kapitel räknas i den tidsupplösning det öppnas i, 4.5), länk "Läs sammanfattningen". Listan per kategori grupperas per kapitel i två spalter. |
| 4 | Kapitelförteckning | Per tema: temanamn (`typ.roll.avsnitt`) och en mening (`typ.roll.granssnitt`, `farg.text2`). Per kapitel: nummer (`farg.fokus`), namn (`typ.roll.indikator`), dek högst två rader (`typ.roll.granssnitt`) och till höger statusrutan (5.10, 320 px). Ingen metarad (borttagen 2026-10-08): vad siffrorna gäller står i statusrutans rubrikrad. Hela raden är en länk; hover stryker under namnet, utom när pekaren står på statusrutan. |
| 5 | Sidfot | Om rapporten · Begrepp · Så läser du rapporten · Publicerad {datum}. `typ.roll.not`. Brandlisten är `header` och sidfoten `footer`, båda utanför `main`. |

Inga vänsterkanter, topplinjer, källtaggar ("Öppen data") eller fyrfältsfakta. Statusrutan är det enda kortet. Avstånd mellan teman `rum.9`, mellan kapitel `rum.6`.

### 4.2 Sammanfattning

| # | Block | Spec |
|---|---|---|
| 1 | Masthead | Kicker, titel "Sammanfattning", dek, metarad (`7 kapitel · 80 indikatorer · publicerad 5 oktober 2026`) |
| 2 | Det viktigaste | ≤ 6 punkter över alla kapitel |
| 3 | Kapitel för kapitel | Per kapitel: nummer + namn (`typ.roll.avsnitt`), dek, statusruta (5.10), 2–3 huvudpunkter, länk "Läs kapitlet". Inga indikatorblock, inga grafer. |
| 4 | Om statistiken | Länk till begreppslista och läsanvisning |

Mål: ≤ 3 skärmhöjder i 1440 × 900.

### 4.3 Kapitel

| # | Block | Spec |
|---|---|---|
| 1 | Masthead | Logotyp 28 px · kicker (temat) · titel · 2 px `farg.fokus` linje under titeln (enda linjen i flödet) · dek ≤ 2 meningar. Ingen metarad (borttagen 2026-10-08; källan står under Om statistiken och vid varje figur). Finns fler tidsupplösningar visas väljaren under deken (5.4). |
| 2 | Det viktigaste | ≤ 6 punkter (3.4) |
| 3 | Läget i korthet | Översiktstabellen (5.8) |
| 4 | Avsnitt | Nummer + rubrik (`typ.roll.avsnitt`), dek (`typ.roll.ingress`, `farg.text2`), sedan indikatorerna. Ett kapitel utan avsnitt visar indikatorerna direkt. |
| 5 | Om statistiken | Rubrik på avsnittsnivå utan nummer. Innehåll: metodtexten (dagens kapitelinledning), Så läser du status, Begrepp i kapitlet, Källor och leveranskedja. |

### 4.4 Indikator

Mål: ≤ 1,3 skärmhöjder i 1440 × 900 med fördjupningen stängd.

| # | Block | Spec |
|---|---|---|
| 1 | Rubrikrad | Nummer (`farg.fokus`) + namn (`typ.roll.indikator`) + statusmarkör efter namnet på samma rad (bryts under på mobil). |
| 2 | Analys | `typ.roll.brod`, 2–5 meningar. Första meningen anger värde, plats och period (det som förr stod i nyckeltalsraden). Proveniensen som en liten ruta före texten (se Proveniens ovan). |
| 3 | Figur | Avsnitt 6 |
| 4 | Fördjupning | En `<details>` med summeringen "Om måttet, källan och påverkansfaktorer". Stängd som standard. Innehåll i tre delar med etiketter i `typ.roll.granssnitt` 600: **Vad måttet räknar** (definition, avgränsning, riktning och mål), **Datakälla** (radlista: primärkälla, huvudman, uppdateras, vägen till rapporten), **Påverkansfaktorer** (teoristycke + numrerad lista). |
| 5 | Verksamhetens kommentar | Visas bara när en kommentar finns, som ett kort (2026-10-08): vit yta, 1 px ram #D9D9D2, 4 px vänsterkant i `farg.fokus`, radie 10 px, mjuk skugga, högst textbredd. Överst pratbubbla och "Verksamhetens kommentar" (14 px 650 `farg.fokus`), texten i `typ.roll.brod`, sist en fot över hårlinje: initialerna i en rund grön bricka (28 px) och namnet i 650 till vänster, `Uppdaterad 16 juni 2026` (datumet i 650) till höger, allt i `farg.black`. "Lägg till kommentar" syns bara i redigeringsläge. |

Status visas en gång (rubrikraden). Nyckeltalsraden (`71,4 % · plats 4 av 21 · 2025`) används inte (2026-10-08): värde, plats och period står i analysen, figuren och Läget i korthet. Indikatornamnet står i rubriken och som figurens titel, så att figuren står på egna ben när den förstoras, laddas ned eller klistras in i en presentation.

### 4.5 Ram: verktygsrad, positionsrad, innehållsförteckning

En adress utan tidsupplösning öppnar kapitlet i månadsvyn om den finns, annars i den vy som har kapitlet. Startsidans rader och mätare följer samma regel.


| Del | Spec |
|---|---|
| Verktygsrad | Sticky, höjd `matt.verktygsrad`, `farg.papper`. Vänster: `← Alla kapitel`. Mitten: positionsraden. Höger: `Exportera` (meny). En hårlinje under raden visas först när sidan rullats. Ryms i 360 px (positionsraden kortas, exportmenyn blir ikon med etikett för skärmläsare). |
| Positionsrad | `typ.roll.not`, `farg.text2`: `2 Vårdgarantin › 2.3 Väntande till operation`, aktuell del i `farg.black` 600. Ingen statusmarkör och ingen förloppslinje. På mellan och mobil är raden en knapp som öppnar innehållsförteckningen som ark. |
| Exportera | Menyval: PowerPoint (kapitlet eller hela rapporten), Skriv ut, Kopiera länk till här, Redigeringsläge. Listan högerjusteras under knappen. Redigeringsläge är ett kryssval (`menuitemcheckbox`) som visar "på" eller "av" i `farg.text2`. Under 640 px är knappen en ikon på 36 × 36 px med etikett för skärmläsare. |
| Innehållsförteckning | Desktop: spalt `matt.toc`, sticky. Avsnitt i `typ.roll.granssnitt` (aktivt 600 `farg.black`), indikatorer i `typ.roll.not` med statusprick 6 px före namnet. Aktiv indikator: `farg.fokusLjus` bakgrund. Inga trianglar, ingen förloppslinje, inga räknare. Avsnitt fälls ut automatiskt när läsaren är i dem. |
| Läsläge | Ingen nedtoning av andra block. All text har alltid full kontrast. |
| Escape | Stänger bara det översta lagret (popover, ark, förstoring). Navigerar aldrig. |
| URL | Varje kapitel, indikator och begrepp har en adress. Uppdatera, bakåt och delad länk landar på samma ställe. |

### 4.6 Textsida (Så läser du rapporten, Om rapporten)

| Del | Spec |
|---|---|
| Masthead | Som kapitlets, med kicker "Hälso- och sjukvården i Halland", titel, 2 px linje och dek. Metaraden är valfri. |
| Del | Rubrik i `typ.roll.avsnitt` utan nummer, `rum.9` mellan delarna. Underrubrik i `typ.roll.figurtitel`. |
| Löptext | `typ.roll.brod`, `matt.text`. Inga ramar, inga kort. |
| Listor | Term i `typ.roll.granssnitt` 600 över förklaringen i `typ.roll.brod`. En statuslista visar statusmarkören (5.1) över förklaringen. |
| Adresser | `#/las` och `#/om`, länkade från startsidans sidfot. |

---

## 5. Komponenter

### 5.1 Statusmarkör

Pill (enda radien i produkten: 999 px), höjd 24 px, sidoluft 10 px, `typ.roll.not` 600, `status.*.text` på `status.*.botten`. Text alltid med. Inte klickbar och får därför aldrig se ut som filterknappar; filter finns inte i rapporten.

### 5.2 Plats

Siffror i `tabular-nums`. Plats skrivs alltid `plats r av n` (i tabell `r av n`) där n = antal regioner **med värde** det året. (Nyckeltalsraden är borttagen, se 4.4.)

### 5.3 Knappar och länkar

| Typ | Spec |
|---|---|
| Länk | 2.4 |
| Textknapp (figurens åtgärder, Visa mer) | `typ.roll.not` 600, `farg.text2`, ingen ram, understrykning vid hover, klickyta ≥ 24 × 24 px |
| Menyknapp (Exportera) | `typ.roll.granssnitt` 600, `farg.black`, 1 px ram `farg.harlinje`, höjd 36 px. Enda inramade knappen. |
| Avstängd | Används inte. En kontroll som inte kan användas visas inte. |

### 5.4 Flikar (vyval och nivåval i figuren, tidsupplösning i masthead)

Textflikar utan ram: `typ.roll.not` 600, `farg.text2`, aktiv `farg.black` med 2 px `farg.fokus` understrykning. Höjd 32 px, mellanrum `rum.5`. ARIA: `tablist`/`tab`, pilar flyttar, Enter/mellanslag väljer. Visas bara när det finns mer än ett val. Högst fyra flikar per rad, utom tidsupplösningen som kan ha fem (dag, vecka, månad, kvartal, år).

### 5.5 Fördjupning (`<details>`)

Summering i `typ.roll.granssnitt` 600 `farg.fokus` med chevron som roterar 90°. Ingen ram eller bakgrund; innehållet indenteras inte. Öppnas automatiskt av webbläsarens sök i sidan och skrivs ut öppen.

### 5.6 Var varje uppgift visas

| Uppgift | Kapitel | Indikator | Figur | Fördjupning |
|---|---|---|---|---|
| Status | Läget i korthet, innehållsförteckning | Rubrikrad | Nej (undantag 6.4) | Nej |
| Värde, plats | Läget i korthet (med förändring och hovringskort) | Analysens första mening | Tooltip, tabell | Nej |
| Period | Metarad, Läget i korthet | Analysens första mening | Undertitel | Nej |
| Källa | Om statistiken | Nej | Källraden | Datakälla |
| Definition | Begreppslistan | Nej | Undertitelns måttbeskrivning | Vad måttet räknar |

### 5.7 Begrepp (toggletip)

| Del | Spec |
|---|---|
| Markering i text | Ärver texten. Prickad understrykning 1 px `farg.text3`, avstånd 0,2 em. Muspekare: hjälp. Bara första förekomsten per indikator (och per kapitelblock). Aldrig i rubriker, knappar eller tabeller. Ett skiljetecken direkt efter markeringen bryts aldrig till en ny rad. |
| Aktivering | Klick, Enter eller mellanslag. Inte hover. `button` med `aria-expanded`. |
| Popover (≥ 640 px) | `farg.yta`, 1 px ram `farg.harlinje`, ingen skugga, maxbredd 320 px, luft `rum.4`. Term `typ.roll.granssnitt` 600, kort definition `typ.roll.granssnitt`, länk "Mer i begreppslistan" `typ.roll.not`. Stängs med Escape, klick utanför eller samma knapp; fokus återgår till termen. |
| Ark (< 640 px) | Från skärmens nederkant, samma innehåll, stängknapp 44 px. |
| Begreppslista | Alfabetisk, term (`typ.roll.figurtitel`), kort och lång förklaring, källa, se även. Egen adress per begrepp. |
| Skriva begrepp | Kort definition ≤ 25 ord som börjar med vad det är, inte med termen. Lång förklaring ≤ 80 ord. Ingen cirkeldefinition. Källa när definitionen kommer utifrån (Socialstyrelsens termbank, SKR). |

### 5.8 Översiktstabell (Läget i korthet)

Förlaga: indikatortabellen i kommundata (2026-10-08).

| Kolumn | Spec |
|---|---|
| Indikator | Nummer (`farg.fokus`) och namn som länk till indikatorn, `typ.roll.granssnitt` |
| Halland | Värde i 650, högerställt, `tabular-nums`, och förändringen sedan föregående period med värde som chip efter värdet: `89,8 %  ▼ 3,8`. Chipet har statusens botten och text: grönt åt rätt håll, rött åt fel håll, neutralt grått utan riktning. Under: `2025 jmf. 2024` i 12,5 px `farg.text2`; gul bricka när perioden är äldre än kapitlets. |
| Plats | Platskort: platsen som bricka (radie 8, 15 px 700) i placeringens ton (`farg.plats.*`), `av 21`, förändringen som chip (`▲ 2`, `▼ 5`, `● 0`), och under en platsskala 92 px: hela fältet (plats 1 till vänster) som segment i tonerna, Hallands segment starkare, och en markör där Halland står. Tonerna följer statusgränserna för rankade mått (I fas 1–3, Bevaka 4–7, Avvikelse 8+) och delar dem finare, med absoluta gränser som statusen: `topp` 1–3 grön (målet, med kantlinje), `gul` 4–5, `barnsten` 6–7, `orange` 8–11, `rod` 12–16, `morkrod` 17 och sämre (med kantlinje), `neutral` mått utan riktning. Gränserna står i `farg.plats.grans`. |
| Status | Statusmarkör |

Tabellen ligger i ett vitt kort med samma ram som figurerna (6.1): hårlinjeram, radie 12 px, mjuk skugga, 4 px grön kant överst. Kolumnhuvud: namnet i 600 `farg.black` och en förklarande rad under i `farg.text2` (`Senaste värde och förändring`, `Bland regionerna`, `Mot målet`), 2 px svart linje under huvudet. Grupperas per avsnitt: avsnittsnamnet i 600 16 px med ett grönt streck (36 × 3 px) ovanför. Radhöjd 52 px, hårlinje mellan rader. Hela raden är klickbar och leder till indikatorn; raden under pekaren tonas i `farg.fokusLjus` med rundade hörn. Minidiagram används inte i tabellen.

**Hovringskort.** När pekaren står på en rad (eller namnlänken har fokus) visas efter 90 ms ett kort: avsnittet som kicker, indikatorns namn, statusmarkör, senaste värdet och platsen stort med förändringen i ord (`−3,8 procentenheter sedan 2022`, `3 ned sedan 2022`), och två minigrafer, 156 px höga, med en skala som går att läsa: tunna hjälplinjer (`farg.harlinje`) med värdet till vänster i axelfärgen, baslinje i `farg.diagram.axel` och åren under ändarna. *Värde över tid*: bara Halland, lätt utjämnad linje, punkt per år, större slutpunkt. Skalan har jämna steg (`vardeTicks`) och spänner Hallands värden men minst 40 % av regionernas spridning under perioden, så att brus inte ser dramatiskt ut och en stor förändring syns stor. Första och senaste värdet står som etikett vid punkten; läget väljs bland flera kring punkten så att etiketten inte korsar linjen eller går utanför (`rapport/miniEtikett.ts`), med en tunn connector när den står en bit bort. *Plats bland regionerna*: hela fältet med plats 1 överst, platserna 1, 5, 10, 15 och sista utskrivna. Topp 3 är ett ljusgrönt fält med en grön kant exakt mellan plats 3 och 4 (förklaringen `topp 3, målet` i grafens rubrik), så att plats 4 och sämre aldrig ser ut att ligga i målet. Varje år är en ring i placeringens ton med platsen skriven i (vit siffra, mörk på gul och bärnsten), den senaste större, som Hallands linje i bumpdiagrammet; raka linjer mellan åren. Sist `Klicka på raden för att gå till indikatorn`. Escape stänger. Platsen per år räknas bland regionerna med värde det året; senaste året tas från R.

Sortering genom klick på kolumnhuvud (`aria-sort`); grupperingen gäller bara standardordningen. Inga filterchips och inga sorteringsknappar utanför tabellen. På mobil: Indikator, Halland, Status (Plats och förklaringsraderna döljs).

### 5.11 Uppdateringsruta (startsidan och kapitlen)

Ersätter metaraderna (2026-10-08). En vit ruta, 1 px ram #D9D9D2, radie 10 px (12 px på startsidan): kalenderikon i `farg.fokus` och fält åtskilda av lodräta hårlinjer, varje fält med etiketten (12,5 px 600 `farg.fokus`) över värdet (15 px 650 `farg.black`; 17 px på startsidan). Startsidan, under ingressen: `Senast uppdaterad` · `Senaste årsdata` · `Nästa uppdatering`. Kapitlet, under deken: `Uppdaterad` · `Senaste data` · `Nästa uppdatering`. Uppdaterad är byggdatumet (`__BUILD_DATE__`, följer publiceringen); perioden och nästa uppdatering kommer ur manifestet. (Komponenten: `ui/Uppdatering.tsx`.)

### 5.10 Statusruta (startsidan och sammanfattningen)

Ersätter statusmätaren och räkneraden `27 i fas · 21 bevaka · 29 avvikelse` (2026-10-08).

| Del | Spec |
|---|---|
| Kort | `farg.yta`, 1 px ram #D9D9D2, radie 12 px, mjuk skugga. Överst en rubrikrad i full bredd, 650 `farg.black` (13 px, 15 px i Läget just nu), med hårlinje under: `Status för 14 indikatorer`, i Läget just nu `Status för 77 indikatorer i 7 kapitel` och till höger `Peka på en kategori för att se vilka` i `farg.fokus`. Under den tre lika breda fält (I fas, Bevaka, Avvikelse) åtskilda av hårlinjer. |
| Fält | Antalet stort i `status.*.text` (26 px i kapitelraden, 44 px i Läget just nu), ordet under i 600 (i Läget just nu också andelen `35 %`), och en ruta per indikator (9 px, 13 px i Läget just nu) i `status.*.markor`. Ett fält med noll indikatorer är inte klickbart. |
| Hovring och fokus | Fältet tonas i `status.*.botten` och en lista öppnas under rutan: rubrik (prick, ordet, antal) och indikatorerna med nummer och namn som länkar. I Läget just nu grupperas listan per kapitel i två spalter. Listan går att peka in i, stängs med Escape och när pekaren lämnar. |
| Indikatorkort | Pekar man på en indikator i listan (eller ger länken fokus) tonas raden i `plats.topp.yta`, namnet blir grönt och understruket och en pil `→` glider in till höger. Samtidigt visas samma hovringskort som i Läget i korthet (5.8) bredvid listan: till höger om den smala listan när det finns plats, annars till vänster; i Läget just nu bredvid raden. Första kortet efter 60 ms, sedan byter det indikator direkt. Kortet slutar med ett grönt fält i full bredd, `Klicka för att läsa mer i rapporten →` (i tabellen `Klicka på raden för att läsa mer →`). |
| Data | Siffrorna kommer ur manifestet; listorna kräver kapitlen och hämtas i bakgrunden efter första bilden (de cachas, så kapitlet öppnas sedan direkt). Tills de finns står `Hämtar indikatorerna …`. |

### 5.9 Tabell (allmänt, även figurens tabellvy)

Huvud `typ.roll.not` 600 `farg.text2`, gemener. Celler `typ.roll.granssnitt`. Tal högerställda med samma decimaler per kolumn, text vänsterställd. Hårlinje under huvud och mellan rader, inga lodräta linjer, ingen zebra. `<caption>` = figurens titel. Fokusenhetens rad i 600. Saknade värden enligt 3.2 med teckenförklaring i not.

---

## 6. Diagram

Utgångspunkt: de stora graferna i kommundata (`kommundata/app/src/charts/Tidsserie.tsx`), Tufte och Our World in Data. Så lite bläck som möjligt utanför datan, inga legender, namnet där linjen slutar. Figuren ska gå att förstå utan att man rör den; interaktion ger detaljer.

### 6.1 Figurens anatomi

```
[Kicker: indikatornamn, bara fristående]
Titel                                         Över tid   Rangordning   Per sjukhus
Undertitel: mått, enhet. Population, period.

┌ plotyta ────────────────────────────────────────────────┐  Kalmar
│                                                         │  Halland
│                                                         │  Riket
└─────────────────────────────────────────────────────────┘  Västerbotten
+ Jämför med region   ━ Stockholm ×   ━ Skåne ×
Not: Från 2024 mäts telefontillgänglighet på ett nytt sätt.
Källa: Väntetider i vården, SKR, via Kolada          Tabell   Ladda ner   Förstora
```

| Del | Spec |
|---|---|
| Kort | `<figure>` på `farg.yta`, 1 px ram #D9D9D2, radie 12 px (10 mobil), mjuk skugga som djupnar vid hovring, 4 px grön kant (`farg.fokus`) överst. Luft `rum.5` (desktop) / `rum.4` (mobil). Bredd högst `matt.figur`. Skuggan tas bort vid utskrift. |
| Titel | **Indikatorns namn** (2026-10-08), `typ.roll.figurtitel` + 2 px, vikt 650, `farg.black`, högst två rader. Figuren ska stå på egna ben när den laddas ned eller förstoras. |
| Undertitel | `typ.roll.granssnitt`, `farg.black` (inte grå: hierarkin bärs av storlek och vikt), högst två meningar i fast ordning: mått och enhet. Vad figuren visar, population, period. Ingen legendprosa. |
| Flikar | Vyval och nivåval (5.4) som segmentkontroll: inramad grupp (#F1F1EC, radie 10 px) där vald vy är ett vitt fält med skugga. Högerställt på titelraden på desktop, under undertiteln på mobil. |
| Plotyta | `rum.5` under undertiteln. Avsnitt 6.3–6.6. |
| Etiketter | **Inga legender och inga nyckelrader.** Varje serie som visas får sitt namn vid linjeslutet i seriens färg (6.4). Ett band etiketteras där det slutar. |
| Jämför | Under plotytan: textknappen `+ Jämför med region` (eller `+ Jämför med {nivånamn}`) och chips för valda serier (färgstreck, namn, ×). "Rensa" när fler än en är vald. Bara i visningar med jämförbara serier. Till höger ett tips i `farg.text3`: `Peka på en linje för värden, klicka för att fästa den` (rangordning: `Peka på en rad …`), bara med pekare som kan hovra. |
| Not | `typ.roll.not`, `farg.text3`, börjar med "Not:". Seriebrott, luckor, undertryckta värden, olika skalor. |
| Fot | Not och källrad i ett eget band i kortets nederkant (#F6F6F2, hårlinje ovanför). Källa: `typ.roll.not`, `farg.text3`: `Källa: {publikation/system}, {huvudman}`, länk när URL finns. Åtgärder högerställda som inramade knappar med ikon (32 px hög, radie 8 px, ram #CFCFC7, svart ram vid hovring): Tabell (växlar till tabellvy), Ladda ner (meny: CSV, SVG, PNG), Förstora (dialog). |
| Semantik | Titel, undertitel, noter och källa är HTML (`figcaption`), inte SVG-text. SVG:n har `role="img"` och `aria-label` = textsammanfattningen (6.8). |
| Fristående | I förstoring, nedladdning och galleriet står kapitlets namn som kicker (`typ.roll.not` 600, `farg.text2`) ovanför titeln (som redan är indikatornamnet). |

### 6.2 Titelformler

Titeln är alltid indikatorns namn. Det som förr var titeln står nu först i undertitelns andra mening.

| Vy | Undertitel (exempel) |
|---|---|
| Över tid, regioner | Andel samtal besvarade samma dag, procent. Halland jämfört med övriga 20 regioner och riket, 2016–2025. |
| Över tid, intern | Andel belagda vårdplatser, procent. Region Halland mot förväntat intervall, per månad jan 2021–mar 2026. |
| Över tid, volym | Antal besök på akutmottagning per månad. Region Halland, jan 2021–mar 2026. |
| Rangordning (bumpdiagram) | Andel samtal besvarade samma dag, procent. Placering bland 21 regioner år för år, plats 1 är bäst, 2016–2025. |
| Rangordning (en period) | Andel samtal besvarade samma dag, procent. Regionerna rangordnade, 19 med värde, 2025. |
| Per enhet | Antal besök per månad. Per sjukhus, tre sjukhus, jan 2021–mar 2026. |
| Per enhet, rangordning | … Sjukhusen rangordnade, tre med värde, mar 2026. |

Undertitelns måttbeskrivning hämtas från indikatorns `fakta.matt` (kortad till en mening) eller Kolada-titeln, aldrig från `beskrivning` med källhänvisning.

### 6.3 Axlar och rutnät

| Regel | Spec |
|---|---|
| Rutnät | Streckat som i kommundata och OWID: 0,8 px, streck 4 4, `farg.diagram.rutnat`. Följer värdeaxeln: vågrätt i tidsdiagram, lodrätt i rangordning. 4–6 linjer desktop, 3–4 mobil, på jämna värden. |
| Y-axel | Tickvärden vänster om plotytan, högerställda, `typ.roll.not` `farg.diagram.axeltext` (nära svart), `tabular-nums`. `%` och `kr` skrivs i ticken, andra enheter i undertiteln. Ingen axellinje, ingen axeltitel. |
| Domän | Linjer: tickspannet omsluter datan (en gridlinje över högsta och under lägsta värdet), noll krävs inte. Staplar: alltid från noll, nollinjen 1 px `farg.diagram.nollinje`. |
| X-axel | Baslinje 1 px `farg.diagram.axel` (nära svart) med 5 px streck nedåt vid etiketterna. År: varje år när alla får plats (högst 16), annars första, vart femte och sista året (2016, 2020, 2025). Månad: `jan 25` vid varje januari, första och sista månaden om de inte krockar. Vecka: `v. 12`. Dag: `1 mar`. |
| Delad skala | Alla paneler i små multiplar delar y-skala. Skiljer storleken så mycket att panelerna blir oläsliga används index (första perioden = 100) och det står i undertiteln. Fria skalor används inte. |
| Dubbla y-axlar | Används inte. |

### 6.4 Serier, etiketter och markörer

| Roll | Färg | Linje | Punkter | Etikett vid linjeslut |
|---|---|---|---|---|
| `fokus` | `diagram.fokus` | 2 px heldragen | En punkt per period (r 3,5, vit kant 1,25 px) när perioderna står minst 14 px isär, annars bara ensamma värden (r 3). Slutpunkten r 5 med vit kant och en lugnt pulserande ring. Alltid grön. | `typ.roll.not` 600 `farg.fokus` |
| `referens` | `diagram.referens` | 1,25 px, streck 5 4 | Punkt per period r 2,25 (som fokus), slutpunkt r 3 | `typ.roll.not` `farg.diagram.referens` |
| `kontext` | `diagram.kontext` | 0,8 px | Inga, inte heller för ensamma värden | Bara högsta och lägsta, `typ.roll.not` `farg.text3` |
| `kontext` under pekaren | `diagram.kontextAktiv` | 1,75 px | Punkt vid aktuell period | Namnet visas tillfälligt, 600 `farg.black` |
| `markerad` | `diagram.markering[i]` | 1,75 px | Punkt per period r 2,5, slutpunkt r 3,5 | 600 i seriens färg |
| `forvantat` | `diagram.forvantat`, ett band (80 %) | Inget streckat förväntat värde | Utanför bandet: triangel 7 px (`status.gul.markor`) ovan eller under, romb 7 px (`status.rod.markor`) långt utanför (95 %). Varje markerad punkt får en kort etikett: `dec 25, över intervallet`. | "Förväntat intervall" där bandet slutar |
| `grans` | `diagram.grans` | 0,8 px heldragen, en linje | – | "topp 3" vid högerkanten, `typ.roll.not` 12 px. Bara i rangordning. |
| `mal` | `farg.black` | 1 px, streck 2 2 | – | "Mål {värde}" |

| Regel | Spec |
|---|---|
| Kurvform | Lätt utjämnad, monoton kurva (`curveMonotoneX`): passerar genom varje punkt och skjuter aldrig över. Punkterna visar var mätningarna finns (2026-10-08). Bandet för förväntat intervall följer samma kurvform. |
| Luckor | Saknade perioder bryter linjen. Ett ensamt fokusvärde ritas som punkt; ensamma kontextvärden ritas inte. |
| Ytor | Inga zoner, inga fält mellan regioner, ingen skuggning. Enda ytor: förväntat intervall och staplar. |
| Seriebrott | Ett 9 px streck på tidsaxeln vid brottet (`farg.text3`, 1,5 px) och texten "ny metod" i axelns rad när den får plats. Förklaringen står i noten. Ingen linje genom plotytan. |
| Etikettkolumn | Alla etiketter står i en kolumn 21 px till höger om sista perioden. Varje etikett har en kopplingslinje 0,6 px `diagram.anslutning` (vågrät–lodrät–vågrät) från linjeslutet. Etiketterna hålls minst 17 px isär. Högermarginalen växer för att rymma dem, högst 34 % av bredden. Namn kortas med ellips under 560 px. |
| Antal färgade serier | Fokus + referens + högst fyra markerade. Behövs fler: små multiplar. |
| Klipp | Allt ritas inom plotytan. |

### 6.5 Mått

| Variant | Höjd | Används |
|---|---|---|
| Standard | `clamp(300, 0,62 × bredd, 520)` px | Linje, stapel |
| Rangordning | 24 px per rad desktop, 22 mobil, + axel | Punktdiagram |
| Kompakt (panel) | `clamp(170, 0,66 × panelbredd, 230)` | Små multiplar |
| Minidiagram | 24 × 96 px | Används inte längre i Läget i korthet (ersatt av hovringskortets minigrafer, 5.8) |

Små multiplar: 3 kolumner när figuren är ≥ 760 px, 2 vid 480–759, 1 under 480. Högst 12 paneler.

### 6.6 Graftyper

| Typ | När | Uppbyggnad | Regler |
|---|---|---|---|
| **Linje** | Utveckling över tid, ≥ 5 tidpunkter | Fokus, referens, kontext, markerade | Förval för rankade indikatorer, även med färre än 5 tidpunkter eftersom jämförelsen med regionerna bär grafen. Inga zoner. En ensam serie med under 5 tidpunkter: stapel. |
| **Linje mot förväntat** | Intern uppföljning med statistiskt förväntat läge | Fokus, ett band, markerade avvikelser | Bandet etiketteras "Förväntat intervall"; begreppet förklaras i begreppslistan och i fördjupningen. |
| **Bumpdiagram** (2026-10-08) | Placeringen bland regionerna år för år. Förval i visningen Rangordning när fokus har plats för minst två perioder; värdena står redan i Över tid. | En rad per plats (26 px, 22 smalt), plats 1 överst, siffrorna 1–N till vänster i axelfärgen, inget rutnät och inga band. Varje region en linje med S-kurvor mellan åren (`curveBumpX`). Övriga regioner 1,25 px `diagram.kontext` utan punkter. Halland 3 px `diagram.fokus` med platsen i en grön cirkel (r 10, vit siffra 12 px, 10,5 px för tvåsiffrigt) varje år; sista cirkeln pulserar. Fästa regioner 2,25 px i markeringsfärgen med platsen i mindre cirklar. Namnen vid linjeslutet i höjd med sista platsen; saknar en region sista perioden står namnet direkt efter dess sista punkt. Topp 3 som ett mjukt grönt fält (`diagram.bump.topp3`, radie 6) bakom plats 1–3 från platssiffrorna till plotytans högerkant, med en 3 px grön kant till vänster, platssiffrorna 1–3 gröna och feta, och etiketten `Topp 3 · målet` (12 px 700, `farg.plats.topp.text`) ovanför fältet. | Plats bland regionerna med värde varje år; lika värden delar plats (1, 2, 2, 4), raderna ordnas då efter namn men cirkeln visar den delade platsen. År utan värde bryter linjen; ingen plats hittas på. Riket har ingen plats och visas inte. Hovring lyfter en region med samma kurvform; tooltipen visar värde och plats. Tabellvyn visar platserna per år. PowerPoint: värdena som linjediagram med not om att placeringen finns i webbrapporten. |
| **Rangordning** | Läget senaste perioden bland regioner eller enheter (en period, och enheternas rangordning) | En rad per region: namn (`typ.roll.not`, högerställt), punkt r 4,5 `diagram.kontextPunkt`; fokus r 5,5 `diagram.fokus` med namn och värde i 600; fästa regioner i sina färger med värde; riket som lodrät streckad linje med etikett ovanför; topp 3 avgränsas med en `grans`-linje under tredje raden | Sorterad bäst till sämst efter indikatorns riktning; lika värden får samma plats. Övriga värden visas när man hovrar raden. Regioner utan värde listas inte. Neutrala mått: ingen topp 3-linje. |
| **Stapel över tid** | Volymer (antal, kronor) | Staplar i `diagram.fokus`, stapelbredd = 2 × mellanrum | Alltid nollbaslinje. ≤ 24 staplar, annars linje. |
| **Små multiplar** | Samma mått per enhet | Panel: namn (`typ.roll.granssnitt` 600) + senaste värde, enheten i fokus | Delad skala. För andels- och medelmått ritas överordnad nivå som referens i varje panel men etiketteras bara i den första. För summamått ingen referens. Ordning: bäst först enligt indikatorns riktning (efter värde för neutrala mått). Statusmarkör per panel är tillåten (enhetens egen status). |
| **Minidiagram** | Utveckling i tabell | Fokuslinje 1,5 px + slutpunkt r 2,5 | Inga axlar, ingen etikett, egen skala per rad. Aldrig fristående. |
| **Tabell** | Alternativ till varje graf | 5.9 | Alltid tillgänglig via "Tabell". |
| Hantel (v1.1) | Förändring mellan två perioder | Två punkter förbundna med linje | Bara för jämförbara perioder (inte över seriebrott). |
| Liggande stapel (senare) | Storlek per kategori eller enhet | Sorterad, aggregat överst, nollbaslinje | Byggs när data kräver det. |
| Del av helhet (senare) | Fördelning | 100 % liggande staplad, ≤ 4 segment, direktetiketter | Byggs när data kräver det. |
| Trattdiagram (senare) | Jämföra enheter av olika storlek | Värde mot volym med 95 % och 99,8 % gränser | Kräver nämnare per enhet. |

Används aldrig: legender, zoner och skuggade fält i linjediagram, tårtdiagram, 3D, dubbla y-axlar, felstaplar på staplar, staplad yta över tid.

### 6.7 Undernivåer och aggregat

| Regel | Spec |
|---|---|
| Val | Nivåfliken i figuren: `Region Halland` (förval) och `Per {nivånamn}` (från datans nivå, t.ex. "Per sjukhus"). Med fler nivåer: nedborrning genom klick på panelens namn. |
| Brödsmula | Ovanför plotytan när fokus ligger under regionnivå: `Region Halland › Hallands sjukhus › Halmstad` (`typ.roll.not`, länkar). |
| Aggregatet | Visas aldrig som en panel bland enheterna. I enhetsvyn är det referenslinje (andels- och medelmått) eller nämns i undertiteln (summamått). |
| Ordning | Aggregat först, enheter efter värde, "övrigt" sist. Naturlig ordning (t.ex. norr till söder) bara om den är meningsbärande och anges i undertiteln. |
| Få fall | Värden under tröskeln skickas inte från R. De visas som `..` i tabell, lucka i graf, och noten säger "Värden baserade på färre än {n} fall visas inte." |
| Tolkning | Begreppet "Aggregat och enheter" förklarar att helheten kan visa ett annat mönster än delarna. Det upprepas inte i varje figur. |

### 6.8 Interaktion

Målet är att hovring ska kännas lugn: linjen man pekar på ska fastna och inget ska hoppa.

| Handling | Mus | Tangentbord | Pekskärm |
|---|---|---|---|
| Visa värden för en period | Hovra över plotytan: lodrät hjälplinje (1 px `farg.text3`, 35 % opacitet), punkter för Halland, riket och fästa serier, tooltip | Tab till plotytan, ← → mellan perioder, Home/End | Tryck |
| Lyfta en linje | Pekaren inom 8 px från linjen (verkligt avstånd till linjesegmentet, inte lodrätt) | ↑ ↓ växlar serie (Halland, riket, fästa, sedan övriga efter värde) | Tryck på linjen |
| Hålla kvar | Lyft linje släpps först när pekaren är mer än 14 px bort eller minst 4 px närmare en annan linje | – | – |
| Fästa | Klick på linjen eller på dess etikett, eller kryssa i listan `+ Jämför med region` | Enter | Tryck igen på samma linje |
| Ta bort | Klick på fäst linje, × på chipet, avkryssning i listan, "Rensa" | Enter | Tryck på chipets × |
| Stänga | Pekaren lämnar plotytan | Escape | Tryck utanför |
| Byta vy, nivå | Flik | Flik (5.4) | Flik |

**Alla graftyper är interaktiva** med samma hjälplinje, tooltip och tangentbordsmönster. Ingen graf får vara en stillbild.

| Graftyp | Hovring visar | Fästa |
|---|---|---|
| Linje, regioner (spaghetti) | Period; Halland, riket, fästa och lyft region med värde och plats av antal | Region (klick, etikett, lista) |
| Linje mot förväntat | Period; faktiskt värde, förväntat värde, intervallet (80 %) och status i ord | – |
| Stapel över tid | Period; värde, förändring mot föregående period och mot samma period året innan; stapeln under pekaren mörkas | – |
| Små multiplar | Synkroniserad hjälplinje i alla paneler samtidigt; tooltip i panelen under pekaren med enhetens värde och överordnad nivå | Panel (klick på namnet borrar ned, 6.7) |
| Rangordning | Rad under pekaren: namn och värde, plats av antal, skillnad mot riket | Region (klick på raden), samma fästa som i linjevyn |
| Bumpdiagram | Som linje med regioner: år, Halland, fästa och lyft region med värde och plats av antal | Region (klick på linjen, namnet eller listan) |
| Rangordning av enheter | Rad under pekaren: namn och värde, plats av antal, skillnad mot överordnad nivå | Klick på raden borrar ned till enheten (6.7) |
| Minidiagram | Inget eget; raden i tabellen är länk till indikatorn | – |

| Del | Spec |
|---|---|
| Ritning | Statiska lager (rutnät, linjer, etiketter) ritas om bara när fästa serier, storlek eller visning ändras. Hovring och tangentbord ritar bara ett överlägg (hjälplinje, lyft linje, punkter, tooltip). |
| Tooltip | Inne i figuren, i plotytans överkant på fast höjd. Ligger till höger om hjälplinjen och byter sida först när hjälplinjen passerat plotytans mitt. `farg.yta`, 1 px ram `farg.harlinje`, ingen skugga, `typ.roll.not`. Rubrik: perioden i 600 (med "ny metod" efter seriebrott). Rader: färgprick, namn, värde (högerställt, `tabular-nums`), `plats r av n` i `farg.text3`; sorterade efter värde; den lyfta serien i 600. Sist en rad i `farg.text3`: "Klicka för att visa {namn} i grafen" eller "Klicka för att ta bort". Läses upp via `aria-live="polite"`. |
| Tooltip på mobil | Under 560 px står tooltipen under plotytan, i full bredd, i stället för ovanpå grafen. Samma innehåll. |
| Muspekare | Hand bara när en linje som kan fästas är lyft. |
| Fokus | Musklick ger inte grafen tangentbordsfokus. Tab ger synlig fokusring (2.1). |
| Jämför-listan | Popover med kryssrutor i alfabetisk ordning och senaste värde till höger, rad 34 px. Högst fyra; den femte ersätter den äldsta. Listan stängs med Escape eller klick utanför och står kvar öppen medan man kryssar. |
| Täta serier | För dag- och veckodata markeras bara Avvikelse (romb, utanför 95 %), utan korta etiketter. Bevaka syns i tooltipen. Fler än 8 markerade punkter i en serie: inga korta etiketter. |
| Rangordning | Hovring över en rad visar dess värde. Fästa regioner syns i sina färger även här. |
| Klickytor | ≥ 24 × 24 px (WCAG 2.5.8). |
| Textsammanfattning | `aria-label` 100–200 tecken: `{Typ} som visar {mått} för Halland {period}. Senaste värde {x}, {plats}. {Riktning på utvecklingen}.` |
| Förstora | Dialog (`role="dialog"`, `aria-modal`), fokusfälla, Escape stänger, fokus återgår till knappen. Samma figur i full bredd med kicker och samma fästa serier. |
| Ladda ner | CSV med semikolon, decimalkomma och BOM (öppnas rätt i svensk Excel), filnamn `{indikator}-{vy}-{period}.csv`. SVG och PNG med titel, undertitel och källa inbakade. |

### 6.9 PowerPoint

En bild per indikator: kicker (kapitel), titel = indikatornamn, figurens titel och undertitel, grafen, källrad i sidfoten. Samma färger och roller som webben (läses ur `tema.ts`). Rangordning blir liggande stapel, små multiplar blir en graf per enhet. Det som inte kan återges står i noten ("Övriga regioner finns i webbrapporten").

---

## 7. Tillgänglighet (krav före publicering)

| Krav | Kontroll |
|---|---|
| Text ≥ 4,5:1, stor text ≥ 3:1 | Automatiskt test av alla textpar i `tema.ts` |
| Grafiska objekt som bär budskap ≥ 3:1 | Automatiskt test (fokus, referens, statusmarkörer, markeringsfärger, punkter i punktdiagram) |
| Färg är aldrig enda bäraren | Status har ord, serier har direktetiketter eller streckning |
| Textalternativ | Varje graf har `aria-label` (6.8) och tabellvy |
| Tangentbord | Allt nås och används med tangentbord; synlig fokusring överallt |
| Innehåll vid hover eller fokus | Tooltip och popover kan stängas med Escape, pekaren kan flyttas in i dem, de försvinner inte av sig själva (WCAG 1.4.13) |
| Klickytor | ≥ 24 × 24 px |
| Förstoring | Fungerar vid 200 % zoom och 320 px bredd utan vågrät rullning |
| Rubrikstruktur | h1 titel, h2 avsnitt och kapitelblock, h3 indikator, h4 figurtitel. Inga hoppade nivåer. |
| Text bara för skärmläsare | En enda form: den globala klassen `.visuellt-dold` i `styles/bas.css`. |
| Språk | `lang="sv"` |
| Rörelse | Respekterar `prefers-reduced-motion` |
| Automatisk granskning | axe utan allvarliga eller kritiska fel på alla sidor |

---

## 8. Granskningslista inför publicering

| # | Fråga |
|---|---|
| 1 | Börjar varje nivå med sin slutsats? |
| 2 | Visas status, värde, plats, period och källa bara på sin plats (5.6)? |
| 3 | Har varje figur titel, undertitel, källrad och vid behov not? Upprepar titeln indikatornamn eller period? |
| 4 | Stämmer analysens påståenden med datan i figuren (plats av antal med värde, rätt jämförelseår, seriebrott nämnda)? |
| 5 | Finns inga em dash, inga undertitlar över två meningar, inga rubriker som frågor? |
| 6 | Är talformat, decimaler och enheter enligt 3.2? |
| 7 | Är alla nya facktermer med i begreppslistan? |
| 8 | Passerar automatiska tester (kontrast, axe, kontrakt) och skärmdumpsjämförelsen? |
| 9 | Fungerar sidan i 360 px, med tangentbord och vid 200 % zoom? |
| 10 | Fungerar djuplänken till varje kapitel och indikator? |

---

## Bilaga: Ändringar mot tidigare designregler

| Tidigare | Nu | Skäl |
|---|---|---|
| Siffror i IBM Plex Mono | Plex Sans med tabulära siffror | Mono gav verktygskänsla |
| Fokusläge med nedtoning till 48 % | Borttaget | Bröt kontrastkravet, såg avstängt ut |
| Om indikatorn och Datakälla öppna före grafen | Hopfällt efter figuren | Referensmaterial låg före fynden |
| Statusfärgad slutpunkt för Halland | Grön slutpunkt | Status ska synas en gång per indikator |
| Utjämnade kurvor (`curveMonotoneX`) | Raka linjer, luckor syns | Utjämning hittade på förlopp mellan mätpunkter |
| Diagramtitel "{Indikator}, Halland jämfört med …" | Beskrivande titel utan indikatornamn | Upprepade rubriken |
| Legend som prosa i undertiteln | Inga legender; direkta etiketter vid linjeslut | Tufte och OWID: namnet sitter där linjen slutar |
| Grönt topp 3-fält i linjediagrammet | Inget fält; topp 3 är en linje i rangordningen | Ytor i plotytan stjäl uppmärksamhet från linjerna |
| Hovring och klick som ritade om hela grafen | Stabil hovring mot verkligt linjeavstånd, fast tooltip, fästa via klick eller lista | Upplevdes fladdrigt (2026-10-05) |
| Förväntat intervall i två band med streckat förväntat värde | Ett band (80 %), avvikelser markerade och etiketterade | Mindre bläck |
| Vit halo under Hallands linje, punkter vid varje år | Ingen halo, bara slutpunkt (återinfört 2026-10-08: punkt per period när det får plats) | Kommundatas storgrafer; bakgrundslinjerna är så ljusa att halo inte behövs |
| "AI-analys"-märke i rubriken + byline | En proveniensrad | Dubbelmärkning; märket såg ut som en knapp |
| Helhetsvy med alla indikatorer | Sammanfattningssida | 177 803 px lång |
| Tidsväljare i verktygsraden med avstängda val | Väljare i mastheadet, bara när det finns flera | Avstängda kontroller är brus |
| Gul statusmarkör #C28A1E | #B07A12 | Klarade inte 3:1 mot papper |
| Markeringsfärger #FF7E00, #2DB8F6, #A51300 | #B35900, #433C9D, #895B42 | För låg kontrast för etiketter i seriens färg, eller förväxlingsbar med status |
| **Omtag 2026-10-08** | | |
| Statusmätare (stapel) + räknerad `27 i fas · 21 bevaka · 29 avvikelse` | Statusruta med tre fält, en ruta per indikator och lista vid hovring (5.10) | Plottrigt; man ville se vilka indikatorer som ligger i varje kategori |
| Nyckeltalsrad `71,4 % · plats 4 av 21 · 2025` under indikatorrubriken | Borttagen; uppgifterna står i analysen, figuren och tabellen | Såg rörig ut |
| Minidiagram i Läget i korthet | Förändring inom parentes vid värde och plats, hovringskort med minigrafer för värde och plats, hela raden klickbar | Minidiagrammet sade för lite |
| Beskrivande figurtitel ("Halland jämfört med övriga regioner") | Indikatorns namn som titel, vyn i undertiteln | Figuren måste stå på egna ben vid export |
| Platta utan ram, skugga och radie | Kort med ram, radie, skugga och grön kant; inramade åtgärdsknappar med ikon; segmentkontroll för vyer | Grafen ska lyfta ur sidan och visa att den går att använda |
| Raka linjer, 2,5 px, bara slutpunkt | Lätt utjämnad kurva, 2 px, punkt per period, större pulserande slutpunkt | Tydligare vad som är ett år, mjukare uttryck |
| Grå axlar och undertitel (text2 #4A4F4C, text3 #6B716D, axeltext #6B716D) | Nära svarta axlar och tickvärden, svart undertitel, mörkare text2/text3 | Användaren avskyr gråtonad estetik; hög kontrast överlag |
| Plotyta `clamp(260, 0,52 × b, 420)` | `clamp(300, 0,62 × b, 520)` | Plotytan var ihoptryckt |
| Rangordning som punktdiagram för senaste året | Bumpdiagram med placeringen år för år (punktdiagrammet kvar när det bara finns en period) | Värdet finns redan i Över tid; det relativa läget och förändringen över tid var det som saknades |
