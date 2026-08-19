# config.R — Hälso- och sjukvårdsrapporten (SKR), Kolada-gruppen G2KPI138906
#
# OMTAG 2026-08-19: rapportens sex kapitel är inte längre delar inuti ETT
# område. Varje kapitel är nu en EGEN sektion, alltså en egen rapport med eget
# kort på startsidan, egen inledning och egen källförteckning. Det som tidigare
# var "delar" på kapitelnivå har flyttat ner ett steg: varje kapitel delas i
# sina egna tematiska avsnitt (stroke, hjärta, diabetes, cancer och så vidare).
#
#   Före:  ett område "SKR" → sex delar → 76 indikatorer
#   Nu:    sex områden      → 2-5 avsnitt vardera → 76 indikatorer
#
# OBS: Jämförarens grupperingsträd är inte åtkomligt via öppna API:t (403), så
# tilldelningen indikator → kapitel och avsnitt underhålls manuellt här.
# Oklassade indikatorer hamnar i ett eget kapitel "Övrigt" (bearbeta.R) i
# stället för att tyst försvinna.
#
# Halland highlightas; övriga regioner blir kontextlinjer, Riket streckad.
# Visas bara i årsvyn. Signal: ranking bland regionerna, se `ranking` nedan.

# ── Gemensam ram: samma två stycken inleder varje kapitel ──────────────────
# Kapitlen läses fristående, så ramen måste stå i vart och ett. Håll den kort.
SKR_RAM <- paste0(
  "Hälso- och sjukvårdsrapporten är Sveriges Kommuner och Regioners årliga ",
  "öppna jämförelse av hälso- och sjukvården i landets regioner. Den här ",
  "rapporten återger ett av rapportens kapitel i sin helhet, med Region ",
  "Halland i förgrunden och övriga regioner som jämförelse. Indikatorerna ",
  "hämtas via Koladas öppna API ur den KPI-grupp som SKR publicerar för ",
  "rapporten, och räknas inte om här."
)

SKR_LASANVISNING <- paste0(
  "Signalen i rapporten är en placering, inte en gräns. Varje indikator rankas ",
  "bland de regioner som har ett värde det året: plats 1 till 3 räknas som i ",
  "fas med målet, plats 4 till 7 som något att bevaka och plats 8 eller lägre ",
  "som en avvikelse. Riktningen är satt per indikator, så att ett lågt värde är ",
  "det goda där det ska vara det. Volym- och strukturmått utan målriktning ",
  "rankas inte alls. Att hamna långt ner betyder att andra regioner når längre, ",
  "inte med nödvändighet att nivån i sig är otillräcklig."
)

kolada_tema <- list(
  id          = "skr",     # id-rot: kapitlen får id "skr-<kapitel>"
  namn        = "Hälso- och sjukvårdsrapporten (SKR)",
  bara_arsvyn = TRUE,
  signal_typ  = "ranking",
  ranking     = list(grans_gron = 3, grans_gul = 7),
  datakalla   = "data/kolada-hos.rds",
  fokus_region = "0013",   # Region Halland
  riket_id     = "0000",
  min_ar       = 2016,     # begränsa tidsserier (Kolada har data från 1992)

  # Kortnamn för visning där regex-förkortningen (bearbeta.R) inte räcker.
  # Fullständig Kolada-titel finns alltid kvar i beskrivningen (infoknappen).
  kortnamn = c(
    N61603 = "Självmord, 25 år+ (5-årsmedelvärde)",
    N63133 = "Soliditet inklusive ansvarsförbindelsen",
    N63135 = "Finansiella nettotillgångar",
    N63144 = "Självfinansieringsgrad investeringar",
    N63146 = "Resultat efter finansiella poster",
    N63147 = "Balanskravsresultat",
    N79190 = "Sjukvårdsrelaterad åtgärdbar dödlighet",
    U20462 = "Fallskador bland personer 65+",
    U70513 = "Reperfusion inom rekommenderad tid vid större hjärtinfarkt",
    U70514 = "Reperfusion vid större hjärtinfarkt (STEMI)",
    N79189 = "Diabetespatienter med HbA1c över 70, primärvård",
    U70477 = "Blodsocker över HbA1c 70 vid diabetes, primärvård"
  ),

  # ── Kapitlen: en egen rapport var, i visningsordning ─────────────────────
  # Fält per kapitel:
  #   id         sektions-id (även filnamn: ar-<id>.json) och taxonomi-nyckel
  #   namn       rubrik i rapporten och på startsidans kort
  #   inledning  kapitlets egna stycken; SKR_RAM läggs först och
  #              SKR_LASANVISNING sist av bearbeta.R
  #   delar      tematiska avsnitt inom kapitlet, med sina indikatorer
  kapitel = list(

    list(
      id   = "skr-syn-pa-varden",
      namn = "Patienters och befolkningens syn på vården",
      inledning = c(
        paste0(
          "Kapitlet handlar om hur vården uppfattas, inte om vad den ",
          "producerar. Två skilda mätningar ligger bakom. Hälso- och ",
          "sjukvårdsbarometern frågar hela befolkningen om förtroende och ",
          "upplevd tillgång, medan Nationell patientenkät frågar dem som ",
          "faktiskt har varit i vården om just den kontakten. Skillnaden är ",
          "avgörande för tolkningen: förtroendet i befolkningen kan falla ett ",
          "år då patienternas egna omdömen ligger stilla, eftersom bilden av ",
          "vården formas av mer än de egna besöken."),
        paste0(
          "Kapitlet rymmer också befolkningens inställning till digitala ",
          "vårdformer, som 1177 Vårdguidens e-tjänster och vård i hemmet med ",
          "stöd av digital teknik. De frågorna beskriver acceptansen för en ",
          "omställning som redan pågår, och är därmed ett planeringsunderlag ",
          "lika mycket som ett resultatmått."),
        paste0(
          "Underlaget är enkätsvar, med den osäkerhet det innebär. Barometern ",
          "samlar in svar från personer 18 år och äldre via webbenkät och ",
          "telefonintervju, medan patientenkätens nationellt gemensamma ",
          "mätningar görs vartannat år per vårdform. En indikator som står ",
          "still mellan två år kan därför sakna ny mätning snarare än sakna ",
          "utveckling.")
      ),
      delar = list(
        list(id = "syn-fortroende", namn = "Förtroende för vården",
             kpier = c("U70447", "U70446", "U71458")),
        list(id = "syn-tillgang", namn = "Upplevd tillgång och väntetid",
             kpier = c("U70449", "U70448", "U70450")),
        list(id = "syn-patientupplevelse", namn = "Patienternas egen upplevelse",
             kpier = c("U71451", "N79174", "N79521", "N79171", "N79178")),
        list(id = "syn-digitalt", namn = "Inställning till digitala vårdformer",
             kpier = c("N70465", "N70466", "N70467"))
      )
    ),

    list(
      id   = "skr-tillganglighet",
      namn = "Tillgänglighet och väntetider",
      inledning = c(
        paste0(
          "Tillgänglighet är det område där uppföljningen är tätast och kraven ",
          "tydligast reglerade. Vårdgarantin anger att den som söker för ett ",
          "nytt eller försämrat hälsoproblem ska få en medicinsk bedömning i ",
          "primärvården inom tre dagar, och att första besök respektive ",
          "operation i den specialiserade vården ska erbjudas inom nittio ",
          "dagar. Kapitlet följer båda leden och kompletterar med psykiatri ",
          "och cancervård, där egna målnivåer gäller."),
        paste0(
          "Måtten kommer parvis: dels hur länge de som står i kö har väntat, ",
          "dels hur länge de som faktiskt fick vård fick vänta. Paret behövs, ",
          "eftersom en kö kan se kort ut om få släpps in och en genomförd ",
          "väntetid kan se god ut medan kön växer. De ska läsas tillsammans."),
        paste0(
          "Uppgifterna rapporteras varje månad av regionerna till den ",
          "nationella väntetidsdatabasen, som SKR förvaltar på regionernas ",
          "uppdrag, och hämtas maskinellt ur vårdinformationssystemen. Flera ",
          "regioner har bytt journalsystem under senare år, vilket kan ge brott ",
          "i tidsserien som handlar om rapporteringen och inte om vården. ",
          "Cancervårdens standardiserade vårdförlopp följs separat av de ",
          "regionala cancercentrumen och har egna måltal för hur många som ska ",
          "utredas inom ett förlopp och hur många som ska hålla ledtiden.")
      ),
      delar = list(
        list(id = "tillg-primarvard", namn = "Primärvårdens tillgänglighet",
             kpier = c("N79179", "N79173")),
        list(id = "tillg-specialiserad", namn = "Vårdgarantin i specialiserad vård",
             kpier = c("N79221", "N79222", "N79223", "N79224")),
        list(id = "tillg-psykiatri", namn = "Psykiatrisk vård",
             kpier = c("U79049", "U79119")),
        list(id = "tillg-cancer", namn = "Standardiserade vårdförlopp vid cancer",
             kpier = c("N70643", "N79198"))
      )
    ),

    list(
      id   = "skr-saker-vard",
      namn = "Säker vård",
      inledning = c(
        paste0(
          "Säker vård handlar om det som inte ska hända: skador som uppstår ",
          "under vårdtiden. Kapitlet spänner från mätningar som direkt räknar ",
          "skador, som journalgranskning och trycksårsmätningar, till de ",
          "förutsättningar som gör skador mer eller mindre sannolika: ",
          "hygienrutiner, checklista vid operation och belastningen på ",
          "vårdplatserna."),
        paste0(
          "Överbeläggningar och utlokaliserade patienter hör hemma här och inte ",
          "bland tillgänglighetsmåtten. En utlokaliserad patient vårdas på en ",
          "avdelning utan rätt specialistkompetens, vilket är ett ",
          "patientsäkerhetsproblem snarare än ett kömått. Detsamma gäller ",
          "läkemedel: tio eller fler preparat samtidigt hos en äldre person är ",
          "en känd riskfaktor för läkemedelsrelaterad skada."),
        paste0(
          "En stor del av kapitlets mätningar upphörde nationellt efter 2023. ",
          "SKR avvecklade då både den nationella insamlingen av markörbaserad ",
          "journalgranskning och punktprevalensmätningarna av trycksår och ",
          "hygienrutiner, och metodansvaret för journalgranskningen fördes över ",
          "till Socialstyrelsen. Indikatorerna finns kvar eftersom historiken ",
          "har ett värde, men de fylls inte på och ska inte läsas som nuläge. ",
          "De känns igen på att tidsserien stannar 2023.")
      ),
      delar = list(
        list(id = "saker-skador", namn = "Skador och vårdskador",
             kpier = c("N70641", "N70642")),
        list(id = "saker-rutiner", namn = "Förebyggande rutiner",
             kpier = c("U70418", "N79181")),
        list(id = "saker-trycksar", namn = "Trycksår",
             kpier = c("N79180", "U79093", "U79132")),
        list(id = "saker-belastning", namn = "Belastning på vårdplatserna",
             kpier = c("U70425", "U79149", "U79134")),
        list(id = "saker-lakemedel", namn = "Läkemedel hos äldre",
             kpier = c("N79175"))
      )
    ),

    list(
      id   = "skr-kunskapsbaserad",
      namn = "Kunskapsbaserad vård och måluppfyllelse",
      inledning = c(
        paste0(
          "Kapitlet mäter om vården gör det som kunskapsläget säger att den bör ",
          "göra. Indikatorerna följer nationella riktlinjer och vårdprogram för ",
          "fyra stora områden: stroke, hjärtinfarkt, diabetes och cancer. Det ",
          "är processmått. De frågar inte hur det gick för patienten, utan om ",
          "den åtgärd som forskningen pekar ut faktiskt blev av, i tid och för ",
          "rätt personer."),
        paste0(
          "Processmått har en fördel och en svaghet. Fördelen är att de går att ",
          "påverka direkt: att fler patienter kommer till en strokeenhet eller ",
          "att fler behandlingsbeslut fattas vid multidisciplinär konferens är ",
          "beslut som fattas i verksamheten. Svagheten är att hög följsamhet ",
          "inte automatiskt betyder gott resultat för patienten. Utfallen ligger ",
          "i kapitlet om sjukdomsförekomst och resultat."),
        paste0(
          "Nästan hela kapitlet vilar på nationella kvalitetsregister, som ",
          "Riksstroke, SWEDEHEART, Nationella diabetesregistret och ",
          "cancerregistren. Kvalitetsregister bygger på att vårdenheterna själva ",
          "registrerar, vilket gör täckningsgraden till en del av resultatet. ",
          "En region som registrerar färre patienter kan se både bättre och ",
          "sämre ut än den är, beroende på vilka som faller bort.")
      ),
      delar = list(
        list(id = "kunskap-stroke", namn = "Strokevård",
             kpier = c("U70495", "N79187", "U70530")),
        list(id = "kunskap-hjarta", namn = "Hjärtsjukvård",
             kpier = c("U70513", "U70514", "U70486")),
        list(id = "kunskap-diabetes", namn = "Diabetesvård",
             kpier = c("U70477", "N79189", "U70479", "U70481", "U70483")),
        list(id = "kunskap-cancer", namn = "Cancervårdens beslutsprocesser",
             kpier = c("U70465", "U79062", "U79063", "U79071", "U79073"))
      )
    ),

    list(
      id   = "skr-sjukdomsforekomst",
      namn = "Sjukdomsförekomst och resultat",
      inledning = c(
        paste0(
          "Här flyttas blicken från vårdens insatser till vad som faktiskt ",
          "händer med befolkningen. Kapitlet innehåller tre sorters mått: hur ",
          "vanliga de stora sjukdomsgrupperna är, hur många som avlider eller ",
          "överlever, och vad som händer efter vårdtillfället i form av ",
          "återinskrivningar, funktionsnivå och vård som hade kunnat undvikas."),
        paste0(
          "Måtten ska läsas med ett längre tidsperspektiv än övriga kapitel. ",
          "Sjukvårdsrelaterad åtgärdbar dödlighet redovisas som ",
          "treårsmedelvärde, självmord som femårsmedelvärde och canceröverlevnad ",
          "över fem år. Det är avsiktligt: antalet fall i en region av Hallands ",
          "storlek är för litet för att enskilda år ska säga något. Det innebär ",
          "också att en förbättring i vården syns här långsammare än någon ",
          "annanstans i rapporten."),
        paste0(
          "Underlaget är i huvudsak Socialstyrelsens register, framför allt ",
          "patientregistret, cancerregistret och dödsorsaksregistret, med ",
          "befolkningsuppgifter från SCB som nämnare. Talen åldersstandardiseras, ",
          "alltså räknas om till en gemensam åldersfördelning, vilket är ",
          "nödvändigt när regioner med olika åldersstruktur jämförs. Förekomst ",
          "av sjukdom påverkas dessutom av hur mycket vården letar: fler ",
          "undersökningar ger fler upptäckta fall.")
      ),
      delar = list(
        list(id = "sjukdom-forekomst", namn = "Förekomst av stora sjukdomsgrupper",
             kpier = c("N70341", "N70346", "N70351", "N70352")),
        list(id = "sjukdom-overlevnad", namn = "Dödlighet och överlevnad",
             kpier = c("N79190", "N79196", "N61603")),
        list(id = "sjukdom-utfall", namn = "Resultat efter vård",
             kpier = c("N79184", "U79092", "U20462", "U79133"))
      )
    ),

    list(
      id   = "skr-kostnader",
      namn = "Kostnader och produktivitet",
      inledning = c(
        paste0(
          "Kapitlet beskriver vad vården kostar, vad den producerar för ",
          "pengarna och vilken ekonomisk ställning regionen bedriver den ",
          "ifrån. Det rymmer därför tre slags mått som inte ska blandas ihop: ",
          "kostnadsnivå per invånare, produktivitet per producerad enhet och ",
          "regionens samlade finansiella läge."),
        paste0(
          "Jämförbarheten bärs av justeringen. En rak kostnad per invånare ",
          "säger lite, eftersom regioner har olika vårdbehov, olika glesbygd ",
          "och olika lönelägen. Den strukturjusterade kostnaden korrigerar för ",
          "detta med hjälp av standardkostnaden i kostnadsutjämningens hälso- ",
          "och sjukvårdsmodell, och är därför det mått som faktiskt går att ",
          "rangordna. Kostnad per DRG-poäng gör motsvarande sak på ",
          "produktionssidan, genom att väga vårdkontakter efter diagnos och ",
          "vårdtyngd."),
        paste0(
          "Volymmåtten i kapitlet, som antal vårdtillfällen och antal ",
          "disponibla vårdplatser, saknar målriktning. Fler vårdplatser är inte ",
          "självklart bättre och färre vårdtillfällen är inte självklart sämre. ",
          "De redovisas därför utan färgsättning och utan placering, som ",
          "underlag för tolkningen av de mått som har en riktning."),
        paste0(
          "De finansiella nyckeltalen avser hela regionen och inte enbart ",
          "hälso- och sjukvården. Det är avsiktligt: soliditet, ",
          "balanskravsresultat och självfinansieringsgrad beskriver det ",
          "ekonomiska utrymme som vården ska rymmas inom. Enskilda år kan svänga ",
          "kraftigt av redovisningsskäl, exempelvis genom ändrade ",
          "pensionsantaganden, och bör därför läsas som en kurva och inte som ",
          "en punkt.")
      ),
      delar = list(
        list(id = "kostnad-niva", namn = "Kostnadsnivå och produktivitet",
             kpier = c("U70020", "U79065", "U79066")),
        list(id = "kostnad-volym", namn = "Volymer och kapacitet",
             kpier = c("N70808", "N70845", "U79029")),
        list(id = "kostnad-utskrivningsklara", namn = "Utskrivningsklara patienter",
             kpier = c("N79176", "U79135")),
        list(id = "kostnad-ekonomi", namn = "Regionens ekonomiska ställning",
             kpier = c("N63125", "N63133", "N63135", "N63144", "N63146", "N63147"))
      )
    )
  ),

  # Riktning per KPI. Kolada-API:t saknar polaritet, därför manuell lista.
  # "lag"     = lägre värde är bättre (rank stigande)
  # "neutral" = ingen målriktning (volym-/strukturmått) — ingen rankingsignal
  # Allt annat = "hog" (högre är bättre).
  riktning_lag = c(
    "N61603", "N70341", "N70346", "N70351", "N70352", "N70641", "N70642",
    "N79175", "N79176", "N79180", "N79184", "N79189", "N79190",
    "U20462", "U70020", "U70425", "U70477",
    "U79029", "U79065", "U79066", "U79092", "U79093", "U79132", "U79133",
    "U79134", "U79135", "U79149"
  ),
  riktning_neutral = c("N70808", "N70845", "N63125"),

  # Procent-override: indikatorer som redovisas som andel i procent men vars
  # Kolada-titel säger "index" i stället för "andel (%)", så titel-heuristiken
  # i bearbeta.R missar dem. Här: patientupplevelsen "Positivt helhetsintryck".
  procent_kpier = c("N79171", "N79174", "N79178", "N79521", "U71451")
)

# Alla indikatorer ett kapitel omfattar, i avsnittens ordning.
skr_kapitel_kpier <- function(kap) unlist(lapply(kap$delar, function(d) d$kpier))
