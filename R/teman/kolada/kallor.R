# kallor.R — Källregister för Hälso- och sjukvårdsrapportens indikatorer
#
# VARFÖR FILEN FINNS
# Kolada levererar indikatorerna, men Kolada är inte ursprunget. Varje siffra
# har vandrat en väg: ett kvalitetsregister, ett hälsodataregister, en enkät
# eller regionernas egen inrapportering, oftast vidare via Vården i siffror,
# därefter in i Koladas nyckeltalsdatabas och sist hit. Vandringen avgör hur
# siffran ska läsas, och den avgör hur ofta den kan förändras.
#
# Koladas indikatorbeskrivningar avslutas med en fras av typen
# "Källa: Nationella Diabetesregistret". Den frasen bevaras ordagrant per
# indikator (fältet `kolada_kalla`), så att attributionen alltid går att
# granska mot ursprungstexten. Utöver den håller filen ett REDIGERAT register
# över de faktiska primärkällorna: vem som är huvudman, vilken sorts källa det
# är, hur data samlas in och vad det innebär för tolkningen.
#
# TVÅ NIVÅER
#   SKR_KALLOR       — primärkällorna, en post per källa.
#   SKR_KPI_KALLA    — vilken primärkälla varje indikator kommer ur.
#   SKR_VIA          — leveranskedjan (Vården i siffror, Kolada), gemensam
#                      för i stort sett alla indikatorer och beskriven en gång.
#
# NÄR EN TILLDELNING GÅR UTÖVER KOLADAS TEXT
# För en del indikatorer skriver Kolada bara "Källa: Vården i siffror", vilket
# är plattformen och inte registret. Där är primärkällan satt utifrån vad
# indikatorn mäter (till exempel Riksstroke för strokeindikatorerna). Sådana
# tilldelningar är markerade med kommentaren TOLKAD nedan, och Koladas egen
# formulering visas ändå alltid bredvid i rapporten.
#
# Kontrollerat mot källornas egna beskrivningar 2026-08-19.

# ── Primärkällor ────────────────────────────────────────────────────────────
# Fält: namn, huvudman, typ, om (2-5 meningar, visas i rapporten), url.
SKR_KALLOR <- list(

  hsb = list(
    namn = "Hälso- och sjukvårdsbarometern",
    huvudman = "Sveriges Kommuner och Regioner",
    typ = "Befolkningsundersökning",
    om = paste0(
      "Årlig nationell undersökning av befolkningens attityder till, förtroende för ",
      "och uppfattning om hälso- och sjukvården. Den riktar sig till alla som är 18 år ",
      "eller äldre och folkbokförda i regionen, och besvaras via webbenkät eller ",
      "telefonintervju. Samtliga regioner deltar och undersökningen samordnas av SKR. ",
      "Svaren beskriver vad invånarna tycker, inte vad vården har utfört, och påverkas ",
      "därför också av mediebild och allmän opinion."),
    url = "https://skr.se/halsasjukvard/patientinflytande/halsoochsjukvardsbarometern.758.html"
  ),

  npe = list(
    namn = "Nationell patientenkät",
    huvudman = "Sveriges Kommuner och Regioner",
    typ = "Patientenkät",
    om = paste0(
      "Samlingsnamn för de återkommande nationella undersökningarna av ",
      "patientupplevelser. Nationellt gemensamma mätningar görs vartannat år inom ",
      "primärvård, somatisk öppen- och slutenvård, akutmottagningar samt psykiatrisk ",
      "öppen- och slutenvård, och regioner kan komplettera med egna mellanårsmätningar. ",
      "Till skillnad från barometern svarar bara personer som faktiskt har haft en ",
      "vårdkontakt. Att mätningen sker vartannat år gör att en indikator kan stå still ",
      "ett år utan att något i vården har stått still."),
    url = "https://patientenkat.se/nationellpatientenkat.44334.html"
  ),

  vantetider = list(
    namn = "Nationella väntetidsdatabasen (Väntetider i vården)",
    huvudman = "Sveriges Kommuner och Regioner",
    typ = "Lagreglerad inrapportering från regionerna",
    om = paste0(
      "Regionerna är enligt hälso- och sjukvårdslagen skyldiga att rapportera ",
      "väntetidsuppgifter till en nationell databas, så att vårdgarantin kan följas upp. ",
      "SKR tillhandahåller databasen på regionernas uppdrag. Rapportering sker varje ",
      "månad och statistiken publiceras på vantetider.se omkring den 25:e. ",
      "Uppgifterna hämtas ur regionernas vårdinformationssystem, vilket gör att byten ",
      "av journalsystem kan slå igenom som hack i tidsserien snarare än som förändrad ",
      "tillgänglighet."),
    url = "https://skr.se/vantetiderivarden.html"
  ),

  vardplatser = list(
    namn = "SKR:s mätning av vårdplatser, överbeläggningar och utlokaliseringar",
    huvudman = "Sveriges Kommuner och Regioner",
    typ = "Inrapportering från regionerna",
    om = paste0(
      "Varje sjukhus räknar klockan 06 antalet patienter som är överbelagda eller ",
      "utlokaliserade, och antalet disponibla vårdplatser. Regionerna rapporterar in ",
      "resultatet minst en gång i månaden, för både somatisk och psykiatrisk slutenvård. ",
      "En disponibel vårdplats definieras som en plats med utformning, utrustning och ",
      "bemanning som säkerställer patientsäkerhet och arbetsmiljö, vilket betyder att ",
      "en stängd plats försvinner ur nämnaren och kan få beläggningsmåtten att se ",
      "lugnare ut än verksamheten upplever."),
    url = "https://skr.se/vantetiderivarden/vantetidsstatistik/overbelaggningarochutlokaliseradepatienter.54399.html"
  ),

  utskrivningsklara = list(
    namn = "SKR:s uppföljning av utskrivningsklara patienter",
    huvudman = "Sveriges Kommuner och Regioner",
    typ = "Inrapportering från regionerna",
    om = paste0(
      "Regionerna rapporterar hur många vårddygn som används av patienter som är ",
      "medicinskt färdigbehandlade men ännu inte har lämnat sjukhuset. Måttet ligger i ",
      "gränslandet mellan region och kommun: utfallet påverkas av kommunens förmåga att ",
      "ta emot lika mycket som av sjukhusets eget arbete. Det ska därför läsas som ett ",
      "mått på samverkan i utskrivningsprocessen, inte på sjukhusvårdens kvalitet."),
    url = "https://skr.se/halsasjukvard.html"
  ),

  mjg = list(
    namn = "Markörbaserad journalgranskning",
    huvudman = "Sveriges Kommuner och Regioner (metodansvar till Socialstyrelsen 2024)",
    typ = "Strukturerad journalgranskning",
    om = paste0(
      "Metod för att mäta skador och vårdskador. Ett granskningsteam med läkare och ",
      "sjuksköterska drar ett slumpmässigt urval journaler varje månad och söker ",
      "markörer, det vill säga journaluppgifter som indikerar förhöjd risk för skada. ",
      "Vid träff bedöms skadans typ, allvarlighetsgrad och om den hade kunnat undvikas. ",
      "SKR samlade in nationella resultat 2011 till 2023 och avvecklade därefter den ",
      "nationella insamlingen, varför indikatorerna slutar 2023."),
    url = "https://skr.se/halsasjukvard/patientsakerhet/matningavskadorivarden/markorbaseradjournalgranskning.4633.html"
  ),

  ppm = list(
    namn = "SKR:s nationella punktprevalensmätningar",
    huvudman = "Sveriges Kommuner och Regioner",
    typ = "Punktprevalensmätning",
    om = paste0(
      "Samlad observation vid ett givet tillfälle, i stället för löpande registrering. ",
      "Mätningarna har omfattat följsamhet till basala hygienrutiner och klädregler samt ",
      "förekomst av trycksår i slutenvården. En punktprevalensmätning ger en ",
      "ögonblicksbild med hög jämförbarhet mellan regioner, men fångar inte variation ",
      "över året. Den nationella insamlingen avvecklades efter 2023."),
    url = "https://skr.se/halsasjukvard/patientsakerhet.html"
  ),

  par = list(
    namn = "Patientregistret",
    huvudman = "Socialstyrelsen",
    typ = "Hälsodataregister",
    om = paste0(
      "Nationellt hälsodataregister över slutenvård och specialiserad öppenvård. ",
      "Vårdgivarna har lagreglerad uppgiftsskyldighet, vilket ger en i det närmaste ",
      "heltäckande bild av vem som vårdats för vad. Registret används både till ",
      "sjukdomsförekomst och till mått på vårdens flöden, exempelvis återinskrivningar. ",
      "Kodningspraxis skiljer sig något mellan regioner och kan påverka jämförelser ",
      "på marginalen."),
    url = "https://www.socialstyrelsen.se/statistik-och-data/register/patientregistret/"
  ),

  cancerregistret = list(
    namn = "Cancerregistret",
    huvudman = "Socialstyrelsen",
    typ = "Hälsodataregister",
    om = paste0(
      "Ett av landets äldsta hälsodataregister, i drift sedan 1958. Anmälningsplikten är ",
      "reglerad i föreskrift och varje nyupptäckt tumör ska rapporteras, vilket ger hög ",
      "täckningsgrad. Registret ligger till grund för statistik om cancerförekomst och ",
      "överlevnad. Eftersom överlevnadsmått mäts över femårsperioder speglar de vård som ",
      "gavs för flera år sedan."),
    url = "https://www.socialstyrelsen.se/statistik-och-data/register/cancerregistret/"
  ),

  dor = list(
    namn = "Dödsorsaksregistret",
    huvudman = "Socialstyrelsen",
    typ = "Nationellt register över dödsorsaker",
    om = paste0(
      "Register över samtliga dödsfall bland folkbokförda i Sverige, med underliggande ",
      "och bidragande dödsorsak enligt dödsbeviset. Registret är basen för mått på ",
      "åtgärdbar dödlighet, alltså dödsfall som bedöms kunna påverkas av medicinska ",
      "insatser, tidig upptäckt och behandling. Måtten redovisas som flerårsmedelvärden ",
      "eftersom enskilda år ger för få fall i en region av Hallands storlek."),
    url = "https://www.socialstyrelsen.se/statistik-och-data/register/dodsorsaksregistret/"
  ),

  lakemedelsregistret = list(
    namn = "Läkemedelsregistret",
    huvudman = "Socialstyrelsen",
    typ = "Hälsodataregister",
    om = paste0(
      "Register över alla läkemedel som hämtats ut på recept, med uppgift om individ, ",
      "preparat och tidpunkt. Det gör det möjligt att följa samtidig användning av flera ",
      "läkemedel hos äldre. Registret fångar uthämtning, inte faktiskt intag, och ",
      "innehåller inte läkemedel som ges inom slutenvården."),
    url = "https://www.socialstyrelsen.se/statistik-och-data/register/lakemedelsregistret/"
  ),

  ndr = list(
    namn = "Nationella diabetesregistret",
    huvudman = "Nationellt kvalitetsregister",
    typ = "Nationellt kvalitetsregister",
    om = paste0(
      "Kvalitetsregister för diabetesvård, med uppgifter från både primärvård och ",
      "specialistmottagningar om provsvar, riskfaktorer, undersökningar och behandling. ",
      "Registret bygger på att vårdenheterna själva registrerar, vilket gör att ",
      "täckningsgraden är en del av resultatet: en region med hög registrering får en ",
      "mer rättvisande bild än en region med låg."),
    url = "https://www.ndr.nu/"
  ),

  swedeheart = list(
    namn = "SWEDEHEART",
    huvudman = "Nationellt kvalitetsregister",
    typ = "Nationellt kvalitetsregister",
    om = paste0(
      "Samlat kvalitetsregister för hjärtsjukvård, som bland annat följer akut ",
      "kranskärlssjukvård och sekundärprevention efter hjärtinfarkt. Registret används ",
      "både för uppföljning av riktlinjeföljsamhet och för forskning. Måtten avser de ",
      "patienter som registrerats, vilket gör täckningsgraden central för tolkningen."),
    url = "https://www.ucr.uu.se/swedeheart/"
  ),

  riksstroke = list(
    namn = "Riksstroke",
    huvudman = "Nationellt kvalitetsregister",
    typ = "Nationellt kvalitetsregister",
    om = paste0(
      "Nationellt kvalitetsregister för strokevård, som följer patienten från akut ",
      "insjuknande till uppföljning efter tre månader. Registret ger både processmått, ",
      "som vård på strokeenhet, och resultatmått, som funktionsnivå och överlevnad efter ",
      "90 dagar. Uppföljningsmåtten bygger på svar från patienten eller närstående och ",
      "har därför ett visst bortfall."),
    url = "https://www.riksstroke.org/"
  ),

  npcr = list(
    namn = "Nationella prostatacancerregistret",
    huvudman = "Nationellt kvalitetsregister",
    typ = "Nationellt kvalitetsregister",
    om = paste0(
      "Kvalitetsregister för prostatacancer med mycket hög täckningsgrad mot ",
      "Cancerregistret. Registret följer utredning, behandlingsbeslut och uppföljning, ",
      "och används här för processmått som multidisciplinär konferens och tillgång till ",
      "kontaktsjuksköterska."),
    url = "https://npcr.se/"
  ),

  nkbc = list(
    namn = "Nationellt kvalitetsregister för bröstcancer",
    huvudman = "Nationellt kvalitetsregister",
    typ = "Nationellt kvalitetsregister",
    om = paste0(
      "Kvalitetsregister som följer utredning, behandling och uppföljning vid ",
      "bröstcancer. Registret drivs inom ramen för Regionala cancercentrum i samverkan ",
      "och används för att följa hur väl vårdprogrammen tillämpas."),
    url = "https://cancercentrum.se/samverkan/cancerdiagnoser/brost/kvalitetsregister/"
  ),

  scrcr = list(
    namn = "Svenska kolorektalcancerregistret",
    huvudman = "Nationellt kvalitetsregister",
    typ = "Nationellt kvalitetsregister",
    om = paste0(
      "Kvalitetsregister för tjock- och ändtarmscancer, som följer diagnostik, kirurgi, ",
      "onkologisk behandling och uppföljning. Används här för andelen patienter vars ",
      "behandlingsbeslut fattats vid multidisciplinär konferens."),
    url = "https://cancercentrum.se/samverkan/cancerdiagnoser/tjocktarm-andtarm-och-anal/kvalitetsregister/"
  ),

  nlcr = list(
    namn = "Nationella lungcancerregistret",
    huvudman = "Nationellt kvalitetsregister",
    typ = "Nationellt kvalitetsregister",
    om = paste0(
      "Kvalitetsregister för lungcancer, som följer utredning, behandlingsbeslut och ",
      "resultat. Används här för andelen patienter som bedömts vid multidisciplinär ",
      "konferens."),
    url = "https://cancercentrum.se/samverkan/cancerdiagnoser/lunga-och-lungsack/kvalitetsregister/"
  ),

  spor = list(
    namn = "Svenskt perioperativt register",
    huvudman = "Nationellt kvalitetsregister",
    typ = "Nationellt kvalitetsregister",
    om = paste0(
      "Kvalitetsregister för anestesi och operationsverksamhet, som samlar uppgifter ",
      "direkt från operationsplaneringssystemen. Används här för följsamheten till ",
      "WHO:s checklista för säker kirurgi. Att data hämtas ur verksamhetssystemen gör ",
      "täckningen god men innebär också att lokala registreringsrutiner påverkar ",
      "resultatet."),
    url = "https://spor.se/"
  ),

  rcc = list(
    namn = "Regionala cancercentrum i samverkan",
    huvudman = "Regionerna gemensamt",
    typ = "Uppföljning av standardiserade vårdförlopp",
    om = paste0(
      "De standardiserade vårdförloppen vid cancer följs upp gemensamt av de sex ",
      "regionala cancercentrumen. Uppföljningen mäter dels hur stor andel av patienterna ",
      "som utreds inom ett vårdförlopp, dels hur stor andel som påbörjar behandling inom ",
      "den fastställda ledtiden. Nämnaren bygger på ett beräknat antal cancerfall utifrån ",
      "Cancerregistret, vilket gör att andelarna är skattningar och inte exakta kvoter."),
    url = "https://cancercentrum.se/samverkan/vara-uppdrag/statistik/"
  ),

  fohm = list(
    namn = "Folkhälsomyndigheten",
    huvudman = "Folkhälsomyndigheten",
    typ = "Nationell folkhälsostatistik",
    om = paste0(
      "Myndighetens folkhälsostatistik bygger i sin tur på Socialstyrelsens register, ",
      "för suicid på dödsorsaksregistret. Talen redovisas som femårsmedelvärden eftersom ",
      "antalet fall per år är litet i en enskild region, och ett enskilt år därför säger ",
      "mer om slumpen än om utvecklingen."),
    url = "https://www.folkhalsomyndigheten.se/folkhalsorapportering-statistik/"
  ),

  kpp = list(
    namn = "KPP-databasen (kostnad per patient)",
    huvudman = "Sveriges Kommuner och Regioner",
    typ = "Ekonomisk verksamhetsstatistik",
    om = paste0(
      "I KPP beräknas kostnaden för varje enskild vårdkontakt i regionernas egen ",
      "verksamhet. För att kunna jämföra trots olika patientsammansättning viktas ",
      "kontakterna med DRG, en gruppering efter diagnos och vårdtyngd. Kostnad per ",
      "DRG-poäng är därmed ett produktivitetsmått, där lägre kostnad betyder högre ",
      "produktivitet. SKR samlar in regionernas KPP-databaser en gång per år."),
    url = "https://skr.se/halsaochsjukvard/ekonomiochavgiftersjukvard/kostnadperpatientkpp.7873.html"
  ),

  rakenskaper = list(
    namn = "Regionernas räkenskaper (räkenskapssammandrag och bokslut)",
    huvudman = "SCB och Sveriges Kommuner och Regioner",
    typ = "Ekonomisk statistik",
    om = paste0(
      "Regionernas ekonomiska nyckeltal bygger på det årliga räkenskapssammandraget hos ",
      "SCB och på regionernas egna bokslutsuppgifter, sammanställda av SKR. Måtten avser ",
      "hela regionen och inte enbart hälso- och sjukvården, vilket är avsiktligt: de ",
      "beskriver den ekonomiska ställning som vården bedrivs inom. Redovisningsprinciper ",
      "och engångsposter kan ge stora hopp mellan enskilda år."),
    url = "https://skr.se/skr/halsasjukvard/ekonomiavgifter/ekonomiochverksamhetsstatistik.46542.html"
  ),

  strukturjustering = list(
    namn = "Strukturjusterad kostnad (kostnadsutjämningens hälso- och sjukvårdsmodell)",
    huvudman = "SCB och Sveriges Kommuner och Regioner",
    typ = "Ekonomisk statistik med behovsjustering",
    om = paste0(
      "Regionernas nettokostnad justeras för strukturella faktorer som regionen inte kan ",
      "påverka, med hjälp av standardkostnaden i kostnadsutjämningens hälso- och ",
      "sjukvårdsmodell. Modellen väger in vårdbehov, vård och bemanning i glesbygd samt ",
      "lönekostnader. Justeringen är det som gör kostnadsnivåer jämförbara mellan ",
      "regioner. Utjämningssystemet har ändrats vid ett par tillfällen, vilket bryter ",
      "jämförbarheten mellan åren 2013 och 2014 samt mellan 2018 och 2019."),
    url = "https://skr.se/skr/ekonomijuridik/ekonomi/budgetochplanering/kostnadsutjamning.1900.html"
  ),

  skr_ekonomi = list(
    namn = "SKR:s ekonomiska nyckeltal för regioner",
    huvudman = "Sveriges Kommuner och Regioner",
    typ = "Ekonomisk statistik",
    om = paste0(
      "SKR beräknar nyckeltal som gör regionernas ekonomi jämförbar trots olika ",
      "verksamhetsansvar. Justerad skattesats är ett sådant mått: den faktiska ",
      "skattesatsen korrigeras för hur mycket regionen lägger på kollektivtrafik, ",
      "hemsjukvård, färdtjänst och utbildning jämfört med riket, så att det som återstår ",
      "bättre speglar hälso- och sjukvården."),
    url = "https://skr.se/skr/halsasjukvard/ekonomiavgifter.7871.html"
  ),

  socialstyrelsen_statistik = list(
    namn = "Socialstyrelsens statistik om hälso- och sjukvård",
    huvudman = "Socialstyrelsen",
    typ = "Officiell statistik",
    om = paste0(
      "Myndighetens sammanställda statistik bygger på hälsodataregistren, ofta ",
      "patientregistret kombinerat med dödsorsaksregistret och befolkningsuppgifter från ",
      "SCB. Talen åldersstandardiseras, det vill säga räknas om till en gemensam ",
      "åldersfördelning, så att en region med äldre befolkning inte automatiskt får ",
      "sämre värden."),
    url = "https://www.socialstyrelsen.se/statistik-och-data/statistik/"
  )
)

# ── Leveranskedjan ──────────────────────────────────────────────────────────
# Gemensam för nästan alla indikatorer. Beskrivs en gång per rapport i stället
# för en gång per indikator.
SKR_VIA <- list(
  list(
    namn = "Vården i siffror",
    huvudman = "Regionerna och Sveriges Kommuner och Regioner",
    typ = "Publiceringsplattform",
    om = paste0(
      "Regionernas och SKR:s gemensamma samlingsplats för kvalitets- och ",
      "effektivitetsindikatorer. Plattformen hämtar från kvalitetsregister, ",
      "Socialstyrelsens hälsodataregister och regionala databaser, och publicerar dem ",
      "standardiserat. Vissa indikatorer uppdateras varje månad eller kvartal, andra en ",
      "gång per år."),
    url = "https://vardenisiffror.se/"
  ),
  list(
    namn = "Kolada",
    huvudman = "Rådet för främjande av kommunala analyser (RKA)",
    typ = "Nyckeltalsdatabas",
    om = paste0(
      "Öppen databas med flera tusen nyckeltal för kommuner och regioner, som drivs av ",
      "RKA, en ideell förening bildad av staten och SKR. Kolada är den kanal rapporten ",
      "faktiskt hämtar ur, via det öppna API:t och KPI-gruppen för Hälso- och ",
      "sjukvårdsrapporten. Kolada lagrar och tillgängliggör siffrorna men producerar dem ",
      "inte."),
    url = "https://www.kolada.se/"
  )
)

# ── Indikator till primärkälla ──────────────────────────────────────────────
# TOLKAD = Kolada anger bara plattformen ("Vården i siffror"); primärkällan är
# härledd ur vad indikatorn mäter. Koladas egen formulering visas ändå alltid.
SKR_KPI_KALLA <- c(
  # Befolkningens syn (Hälso- och sjukvårdsbarometern)
  U70446 = "hsb", U70447 = "hsb", U70448 = "hsb", U70449 = "hsb",
  U70450 = "hsb", U71458 = "hsb", N70465 = "hsb", N70466 = "hsb", N70467 = "hsb",

  # Patienternas upplevelse (Nationell patientenkät)
  N79171 = "npe", N79174 = "npe", N79178 = "npe", N79521 = "npe", U71451 = "npe",

  # Väntetider och vårdgaranti
  N79179 = "vantetider", N79173 = "vantetider", N79221 = "vantetider",
  N79222 = "vantetider", N79223 = "vantetider", N79224 = "vantetider",
  U79049 = "vantetider", U79119 = "vantetider",

  # Cancervårdens vårdförlopp
  N70643 = "rcc", N79198 = "rcc",

  # Patientsäkerhet: journalgranskning och punktprevalens
  N70641 = "mjg", N70642 = "mjg",
  U70418 = "ppm", N79180 = "ppm", U79093 = "ppm", U79132 = "ppm",
  N79181 = "spor",

  # Vårdplatser, beläggning och utskrivningsklara
  U70425 = "vardplatser", U79134 = "vardplatser", U79149 = "vardplatser",
  N70845 = "vardplatser",
  N79176 = "utskrivningsklara", U79135 = "utskrivningsklara",

  # Kvalitetsregister: diabetes, hjärta, stroke
  U70477 = "ndr", U70479 = "ndr", U70481 = "ndr", U70483 = "ndr", N79189 = "ndr",
  U70513 = "swedeheart", U70514 = "swedeheart",
  U70486 = "swedeheart",                              # TOLKAD (SEPHIA-uppföljning)
  N79184 = "riksstroke", N79187 = "riksstroke",
  U70495 = "riksstroke", U70530 = "riksstroke",       # TOLKAD

  # Kvalitetsregister: cancer
  U70465 = "npcr",                                    # TOLKAD
  U79062 = "npcr", U79063 = "nkbc", U79071 = "nlcr", U79073 = "scrcr",

  # Hälsodataregister
  U20462 = "par", U79092 = "par", U79029 = "par", U79133 = "par", N70808 = "par",
  N70351 = "cancerregistret", N70352 = "cancerregistret", N79196 = "cancerregistret",
  N79190 = "dor",
  N79175 = "lakemedelsregistret",
  N70341 = "socialstyrelsen_statistik",
  N70346 = "socialstyrelsen_statistik",               # TOLKAD
  N61603 = "fohm",

  # Kostnader, produktivitet och ekonomisk ställning
  U79065 = "kpp", U79066 = "kpp",
  U70020 = "strukturjustering",
  N63125 = "skr_ekonomi",
  N63133 = "rakenskaper", N63135 = "rakenskaper", N63144 = "rakenskaper",
  N63146 = "rakenskaper", N63147 = "rakenskaper"
)

# ── Hjälpfunktioner ─────────────────────────────────────────────────────────

#' Koladas egen källformulering, ordagrant ur indikatorbeskrivningen.
#' Returnerar NULL när beskrivningen saknar "Källa:".
kolada_kallfras <- function(beskrivning) {
  if (is.null(beskrivning) || length(beskrivning) == 0) return(NULL)
  if (is.na(beskrivning)) return(NULL)
  if (!grepl("[Kk]älla:", beskrivning)) return(NULL)
  trimws(sub("^.*[Kk]älla:[[:space:]]*", "", beskrivning))
}

#' Källobjekt för en indikator: primärkälla plus Koladas ordagranna formulering.
#' Okänd indikator ger en post med bara Kolada-frasen, aldrig tomma fält.
kalla_for_kpi <- function(kpi_id, beskrivning = NULL) {
  fras <- kolada_kallfras(beskrivning)
  nyckel <- unname(SKR_KPI_KALLA[kpi_id])
  if (is.na(nyckel) || is.null(SKR_KALLOR[[nyckel]])) {
    ut <- list(
      id = "okand",
      namn = if (is.null(fras)) "Ej angiven" else fras,
      huvudman = "Ej fastställd",
      typ = "Ej klassificerad",
      om = paste0("Primärkällan är inte klassificerad i rapportens källregister. ",
                  "Koladas egen formulering visas i stället.")
    )
    if (!is.null(fras)) ut$kolada_kalla <- fras
    return(ut)
  }
  k <- SKR_KALLOR[[nyckel]]
  ut <- list(id = nyckel, namn = k$namn, huvudman = k$huvudman,
             typ = k$typ, om = k$om)
  if (!is.null(k$url)) ut$url <- k$url
  if (!is.null(fras)) ut$kolada_kalla <- fras
  ut
}

#' Källförteckning för en uppsättning indikatorer, i fallande antal.
#' Ger en post per unik primärkälla, med antalet indikatorer den bär.
kallforteckning <- function(kpi_ids) {
  nycklar <- unname(SKR_KPI_KALLA[kpi_ids])
  nycklar <- nycklar[!is.na(nycklar)]
  if (length(nycklar) == 0) return(list())
  tab <- sort(table(nycklar), decreasing = TRUE)
  lapply(names(tab), function(n) {
    k <- SKR_KALLOR[[n]]
    ut <- list(id = n, namn = k$namn, huvudman = k$huvudman,
               typ = k$typ, om = k$om, n_indikatorer = as.integer(tab[[n]]))
    if (!is.null(k$url)) ut$url <- k$url
    ut
  })
}
