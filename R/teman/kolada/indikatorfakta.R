# indikatorfakta.R — Redaktionellt faktaunderlag per indikator
#
# Kolada levererar en definition (meta$description) som är korrekt men skriven
# för statistiker: den säger vad som räknas, inte vad talet betyder eller vad
# som får det att röra sig. Den här filen kompletterar med det redaktionella
# underlag som rapporten faktiskt behöver, i två block per indikator:
#
#   OM INDIKATORN            matt, riktning, avgransning
#     Vad som mäts, åt vilket håll det ska gå och vad måttet INTE fångar.
#     Ska gå att läsa utan förkunskap och utan att öppna Koladas definition.
#
#   PÅVERKANSFAKTORER OCH TEORI   teori, faktorer
#     teori    = mekanismen. Varför talet ligger där det ligger och rör sig
#                som det gör. Ett stycke, resonerande.
#     faktorer = de konkreta sakerna som drar i talet, med rubrik + förklaring.
#                Både verksamhetens egna (bemanning, arbetssätt) och sådana
#                som ligger utanför den (mätmetod, befolkning, regelskiften).
#
# OMFATTNING: kapitel 1 (syn på vården) och kapitel 2 (tillgänglighet).
# Indikatorer utan post här renderas utan faktablock — bearbeta.R sätter
# fältet bara när det finns. Nya kapitel fylls på efter hand.
#
# SKRIVREGLER (se även memory/analystext-struktur-och-em-dash.md):
#   - Inga em-streck (—) i prosan. En-streck bara i talintervall.
#   - Faktarutan beskriver INDIKATORN, aldrig Hallands utfall. Utfallet hör
#     hemma i analystexten, som genereras i bearbeta.R.
#   - Håll faktorernas rubriker korta (2-4 ord); de sätts som etiketter.
#
# Källor för uppgifterna om regelverk och mätmetod:
#   Vårdgarantin och tillgänglighetsgarantin, SKR (Väntetider i vården)
#   Hälso- och sjukvårdsbarometern, SKR
#   Nationell patientenkät, SKR
#   Standardiserade vårdförlopp, Regionala cancercentrum i samverkan
#   Förstärkt vårdgaranti BUP, överenskommelse staten och SKR

# ── Källor som faktorerna hänvisar till ────────────────────────────────────
# Endast källor som faktiskt DOKUMENTERAR påståendet får hänvisas till. En
# faktor som är analys och inte regelverk, mätmetod eller nationellt måltal
# lämnas medvetet utan hänvisning: hellre ett tomrum än en källa som inte
# bär det som står. Samtliga URL:er kontrollerade 2026-08-20.

K_VARDGARANTI <- list(
  namn = "Om vårdgarantin, SKR",
  url  = "https://extra.skr.se/vantetiderivarden/omvantetider/omvardgaranti.43558.html")
K_VANTETIDER <- list(
  namn = "Väntetidsstatistik, Väntetider i vården",
  url  = "https://extra.skr.se/vantetiderivarden/vantetidsstatistik.63530.html")
K_ORDLISTA <- list(
  namn = "Begreppsförklaringar, Väntetider i vården",
  url  = "https://extra.skr.se/vantetiderivarden/omvantetider/begreppsforklaringatillo.43531.html")
K_TELEFONI <- list(
  namn = "Telefoni- och chattillgänglighet, Väntetider i vården",
  url  = "https://extra.skr.se/vantetiderivarden/vantetidsstatistik/telefoniochchattillganglighet.84210.html")
K_BUP <- list(
  namn = "Barn- och ungdomspsykiatri, Väntetider i vården",
  url  = "https://extra.skr.se/vantetiderivarden/vantetidsstatistik/barnochungdomspsykiatribup.54393.html")
K_OVERENSK <- list(
  namn = "Överenskommelser om ökad tillgänglighet, SKR",
  url  = "https://extra.skr.se/vantetiderivarden/omvantetider/overenskommelseomokadtillganglighet.43562.html")
K_SOS_3DAGAR <- list(
  namn = "Medicinsk bedömning inom tre dagar, Socialstyrelsen",
  url  = "https://www.socialstyrelsen.se/statistik-och-data/indikatorer/indikatorbibliotek/medicinsk-bedomning-inom-tre-dagar/")
K_BAROMETERN <- list(
  namn = "Hälso- och sjukvårdsbarometern, SKR",
  url  = "https://skr.se/skr/halsasjukvard/patientinflytande/halsoochsjukvardsbarometern.758.html")
K_NPE <- list(
  namn = "Nationell patientenkät, SKR",
  url  = "https://patientenkat.se/")
K_SVF <- list(
  namn = "Standardiserade vårdförlopp, RCC i samverkan",
  url  = "https://cancercentrum.se/samverkan/vara-uppdrag/kunskapsstyrning/vardforlopp/")
K_CANCERREG <- list(
  namn = "Cancerregistret, Socialstyrelsen",
  url  = "https://www.socialstyrelsen.se/statistik-och-data/register/cancerregistret/")
K_1177 <- list(
  namn = "1177 Vårdguiden",
  url  = "https://www.1177.se/")

INDIKATORFAKTA <- list(

  # ══════════════════════════════════════════════════════════════════
  #  KAPITEL 1 — Patienters och befolkningens syn på vården
  # ══════════════════════════════════════════════════════════════════

  # ── Förtroende för vården ──────────────────────────────────────────
  U70447 = list(
    matt = paste0(
      "Andelen av de svarande som uppger stort eller mycket stort förtroende ",
      "för hälso- och sjukvården i sin helhet. Nämnaren är de som tagit ",
      "ställning; svaret \"vet inte\" och uteblivna svar räknas bort."),
    riktning = "Högre andel är bättre.",
    avgransning = paste0(
      "Frågan gäller vården som system i den egna regionen, inte ett enskilt ",
      "vårdmöte. Den ställs till hela befolkningen 18 år och äldre, alltså ",
      "även till dem som inte varit i vården under året."),
    teori = paste0(
      "Förtroende för vården som helhet är ett systemomdöme. Det formas i minst ",
      "lika hög grad av nyhetsrapportering, politisk debatt och berättelser i ",
      "omgivningen som av egna vårdbesök. Måttet rör sig därför trögt över tid, ",
      "men reagerar samtidigt i alla regioner när en fråga får nationellt ",
      "genomslag. Sambandet med upplevd väntetid är det starkaste enskilda i ",
      "undersökningen, vilket i praktiken gör förtroendemåttet till ett ",
      "fördröjt tillgänglighetsmått."),
    faktorer = list(
      list(rubrik = "Nationell mediebild", text = paste0(
        "Frågan besvaras även av dem som saknar egen vårderfarenhet. En ",
        "nyhetshändelse med nationellt genomslag syns därför i samtliga ",
        "regioner samma år, oberoende av den egna verksamheten."),
        kalla = K_BAROMETERN),
      list(rubrik = "Upplevd tillgänglighet", text = paste0(
        "Väntetider är den faktor som starkast samvarierar med förtroende. En ",
        "förbättring i kötiderna syns här först året efter att den märkts i ",
        "vården.")),
      list(rubrik = "Egen vårdkontakt", text = paste0(
        "De som varit i vården under året svarar systematiskt annorlunda än ",
        "övriga. Andelen med vårdkontakt varierar med befolkningens ålder och ",
        "sjuklighet."),
        kalla = K_BAROMETERN),
      list(rubrik = "Urval och osäkerhet", text = paste0(
        "Drygt 50 000 svar samlas in nationellt och fördelas över 21 regioner. ",
        "Skillnader på någon enstaka procentenhet mellan år, eller mellan ",
        "närliggande regioner, ligger inom felmarginalen."),
        kalla = K_BAROMETERN)
    )
  ),

  U70446 = list(
    matt = paste0(
      "Andelen av de svarande som uppger stort eller mycket stort förtroende ",
      "för sjukhusen i den egna regionen."),
    riktning = "Högre andel är bättre.",
    avgransning = paste0(
      "Avser sjukhusen som vårdform, inte den egna vårdcentralen och inte ",
      "vården som helhet. Frågan ställs till hela befolkningen, inte bara till ",
      "dem som vårdats på sjukhus."),
    teori = paste0(
      "Förtroendet för sjukhus ligger genomgående högre än förtroendet för ",
      "vården i stort. Sjukhuset är den vårdform befolkningen har tydligast ",
      "bild av och förknippar med allvarliga tillstånd, medan omdömet om ",
      "vården som helhet också rymmer det som inte fungerar mellan ",
      "vårdformerna. Avståndet mellan de två måtten är därför i sig en ",
      "läsanvisning: när gapet växer ligger problemet sällan i sjukhusvården."),
    faktorer = list(
      list(rubrik = "Sjukhusstrukturen", text = paste0(
        "Närhet till akutsjukhus och frågan om vad som ska utföras var är ",
        "politiskt laddad. Diskussioner om att flytta eller avveckla ",
        "verksamhet påverkar svaren snabbt.")),
      list(rubrik = "Väntetider till sjukhusvård", text = paste0(
        "Sjukhusförtroendet följer tillgängligheten i den specialiserade ",
        "vården närmare än primärvårdsmåtten gör."),
        kalla = K_VANTETIDER),
      list(rubrik = "Vårdplatsläget", text = paste0(
        "Rapportering om stängda vårdplatser, överbeläggning och inhyrd ",
        "personal får stort genomslag i bilden av sjukhuset.")),
      list(rubrik = "Liten spridning", text = paste0(
        "Nivån är hög i alla regioner, vanligen mellan 70 och 80 procent. Att ",
        "spridningen är liten gör att placeringen kan flytta sig flera steg ",
        "vid små förändringar i utfallet."),
        kalla = K_BAROMETERN)
    )
  ),

  U71458 = list(
    matt = paste0(
      "Andelen av de svarande som uppger stort eller mycket stort förtroende ",
      "för vård- och hälsocentralerna i sin hemortsregion."),
    riktning = "Högre andel är bättre.",
    avgransning = paste0(
      "Avser primärvården som vårdform i hemortsregionen, inte enbart den ",
      "mottagning den svarande själv är listad hos."),
    teori = paste0(
      "Primärvården är den vårdform flest har egen erfarenhet av, vilket gör ",
      "måttet mer förankrat i faktiska vårdmöten än förtroendet för vården i ",
      "stort. Samtidigt är primärvården den vårdform där tillgängligheten ",
      "upplevs sämst, och förtroendet ligger därför lägre än för sjukhus trots ",
      "att kontakterna är fler. Måttet svarar på om den nära vården upplevs ",
      "finnas där, inte på om den medicinska kvaliteten är hög."),
    faktorer = list(
      list(rubrik = "Att komma fram", text = paste0(
        "Möjligheten att nå mottagningen och få en tid formar bilden av ",
        "vårdcentralen tydligare än vad som sker under själva besöket."),
        kalla = K_TELEFONI),
      list(rubrik = "Kontinuitet", text = paste0(
        "Att få träffa samma läkare återkommande höjer omdömet påtagligt. Hög ",
        "andel inhyrda läkare drar därför ner måttet även när den medicinska ",
        "kvaliteten är oförändrad.")),
      list(rubrik = "Primärvårdsuppdragets bredd", text = paste0(
        "Regionernas primärvårdsuppdrag skiljer sig åt. Var gränsen går mot ",
        "sjukhusens öppenvård påverkar vad befolkningen förväntar sig av sin ",
        "vårdcentral.")),
      list(rubrik = "Geografi", text = paste0(
        "Avstånd till närmaste mottagning och tillgång till filialer väger ",
        "tyngre i glesbygd än i tätort."))
    )
  ),

  # ── Upplevd tillgång och väntetid ──────────────────────────────────
  U70449 = list(
    matt = paste0(
      "Andelen av de svarande som helt eller delvis instämmer i att de har ",
      "tillgång till den hälso- och sjukvård de behöver."),
    riktning = "Högre andel är bättre.",
    avgransning = paste0(
      "Mäter upplevd tillgång, inte faktisk vårdkonsumtion och inte uppmätt ",
      "väntetid. Den som inte sökt vård svarar utifrån sin förväntan om att ",
      "kunna få vård vid behov."),
    teori = paste0(
      "Nivån ligger högt i alla regioner, kring 90 procent, eftersom frågan ",
      "fångar en förväntan snarare än en erfarenhet. Det gör måttet trögt och ",
      "skillnaderna mellan regioner små, men också känsligt för det som får ",
      "många att tvivla på att vården finns när den behövs. En kraftig ",
      "försämring här är därför ett allvarligare tecken än ett motsvarande ",
      "tapp i de mer rörliga väntetidsfrågorna."),
    faktorer = list(
      list(rubrik = "Takeffekt", text = paste0(
        "Eftersom nivån ligger nära 90 procent finns litet utrymme uppåt. ",
        "Placeringen bland regionerna kan skifta på tiondelar."),
        kalla = K_BAROMETERN),
      list(rubrik = "Egen sjuklighet", text = paste0(
        "Personer med kroniska sjukdomar och täta vårdkontakter svarar mer ",
        "negativt. Regioner med äldre befolkning möter en tyngre svarsgrupp."),
        kalla = K_BAROMETERN),
      list(rubrik = "Geografisk tillgång", text = paste0(
        "Avstånd till vård och tillgången till digitala alternativ påverkar ",
        "upplevelsen av att vården finns att tillgå.")),
      list(rubrik = "Samband med väntetidsfrågorna", text = paste0(
        "Måttet fångar delvis samma sak som frågorna om rimlig väntetid, men ",
        "på en mer principiell nivå. De tre ska läsas tillsammans."),
        kalla = K_BAROMETERN)
    )
  ),

  U70448 = list(
    matt = paste0(
      "Andelen av de svarande som helt eller delvis instämmer i att ",
      "väntetiderna till besök och behandling på sjukhus i regionen är rimliga."),
    riktning = "Högre andel är bättre.",
    avgransning = paste0(
      "Mäter vad befolkningen anser om väntetiderna, inte hur långa de faktiskt ",
      "är. Frågan besvaras även av dem som inte väntat på sjukhusvård."),
    teori = paste0(
      "Det här är barometerns mest kritiska fråga och den med lägst nivå i hela ",
      "undersökningen. Måttet ska läsas som en subjektiv motsvarighet till ",
      "vårdgarantimåtten i kapitlet om tillgänglighet: när de två pekar åt ",
      "olika håll beror det i regel på att förväntan förskjutits, inte på att ",
      "statistiken är fel. Rimlighet är dessutom relativ, vilket gör att en ",
      "region kan förbättra sina faktiska väntetider utan att omdömet följer med."),
    faktorer = list(
      list(rubrik = "Faktiska väntetider", text = paste0(
        "Sambandet med vårdgarantimåtten finns, men med både fördröjning och ",
        "dämpning. Kön måste förbättras under flera år innan omdömet följer efter."),
        kalla = K_VANTETIDER),
      list(rubrik = "Förväntansbildning", text = paste0(
        "Nationell rapportering om vårdköer sätter en referenspunkt som är ",
        "gemensam för alla regioner och som ligger utanför den enskilda ",
        "regionens kontroll.")),
      list(rubrik = "Vem som svarar", text = paste0(
        "De flesta svarande har ingen egen aktuell väntan. Omdömet bygger då på ",
        "andrahandsuppgifter snarare än på erfarenhet."),
        kalla = K_BAROMETERN),
      list(rubrik = "Efterdyningar av pandemin", text = paste0(
        "Köer som byggdes upp från 2020 sänkte nivån i hela landet, och ",
        "återhämtningen har varit ojämn mellan regionerna."),
        kalla = K_VANTETIDER)
    )
  ),

  U70450 = list(
    matt = paste0(
      "Andelen av de svarande som helt eller delvis instämmer i att ",
      "väntetiderna till besök och behandling på vård- eller hälsocentral är ",
      "rimliga."),
    riktning = "Högre andel är bättre.",
    avgransning = paste0(
      "Avser primärvården. Mäter upplevelsen av väntetiden, inte den uppmätta ",
      "väntetiden."),
    teori = paste0(
      "Primärvårdens väntetider bedöms i regel som rimligare än sjukhusens, ",
      "eftersom referenspunkten är dagar och inte månader. Måttet är därför ",
      "känsligare för det som händer i det första steget: om det går att komma ",
      "fram på telefon, om det finns tider samma vecka och om man hänvisas ",
      "vidare. Det korresponderar mot de två primärvårdsmåtten i ",
      "tillgänglighetskapitlet, telefontillgänglighet och medicinsk bedömning ",
      "inom tre dagar."),
    faktorer = list(
      list(rubrik = "Telefontillgänglighet", text = paste0(
        "Att inte komma fram räknas i praktiken som väntetid av den som ringer, ",
        "även om ingen väntetid registrerats någonstans."),
        kalla = K_TELEFONI),
      list(rubrik = "Vårdgarantins tre dagar", text = paste0(
        "Sedan 2022 gäller medicinsk bedömning inom tre dagar. Arbetssätt som ",
        "byggts för den tidigare sjudagarsgarantin ger sämre utfall i både det ",
        "här måttet och i vårdgarantimåttet."),
        kalla = K_VARDGARANTI),
      list(rubrik = "Bemanning och kontinuitet", text = paste0(
        "Vakanser och hög andel inhyrda läkare förlänger tiden till en fast tid ",
        "och märks direkt i omdömet.")),
      list(rubrik = "Digitala ingångar", text = paste0(
        "Chatt och digitala vårdmöten kortar upplevd väntan för den som ",
        "använder dem, men kan öka avståndet för dem som inte gör det."),
        kalla = K_TELEFONI)
    )
  ),

  # ── Patienternas egen upplevelse ───────────────────────────────────
  U71451 = list(
    matt = paste0(
      "Andelen positiva svar i dimensionen helhetsintryck bland patienter som ",
      "besökt primärvården. Dimensionen väger samman om vårdbehovet blev ",
      "tillgodosett, hur mottagningen upplevdes och om patienten skulle ",
      "rekommendera den till någon annan."),
    riktning = "Högre andel är bättre.",
    avgransning = paste0(
      "Endast patienter med ett faktiskt besök under mätperioden ingår. Måttet ",
      "säger därför ingenting om dem som inte kom in i vården."),
    teori = paste0(
      "Patientenkäten och Hälso- och sjukvårdsbarometern mäter olika saker och ",
      "ska inte förväxlas. Enkäten frågar den som varit i vården om just den ",
      "kontakten, och nivån ligger därför systematiskt högre än befolkningens ",
      "allmänna omdöme. Helhetsintrycket är dessutom en sammanvägning av flera ",
      "dimensioner, vilket gör det trögt: det krävs förändring i flera delar ",
      "samtidigt för att indexet ska röra sig."),
    faktorer = list(
      list(rubrik = "Selektionen i urvalet", text = paste0(
        "Bara den som fått ett besök kan svara. En lång kö kan därför höja ",
        "måttet, eftersom de mest missnöjda aldrig kommer med i urvalet."),
        kalla = K_NPE),
      list(rubrik = "Mätcykeln", text = paste0(
        "Nationellt gemensamma mätningar görs vartannat år per vårdform. Ett år ",
        "utan ny mätning ser ut som en oförändrad nivå men saknar i själva ",
        "verket data."),
        kalla = K_NPE),
      list(rubrik = "Kontinuitet och bemötande", text = paste0(
        "Att träffa samma vårdgivare och att bli lyssnad på väger tyngst av de ",
        "ingående dimensionerna."),
        kalla = K_NPE),
      list(rubrik = "Bortfallets sammansättning", text = paste0(
        "Svarsfrekvensen ligger kring hälften och är lägre bland yngre och i ",
        "grupper med annat modersmål. Bortfallet är alltså inte slumpmässigt."),
        kalla = K_NPE)
    )
  ),

  N79174 = list(
    matt = paste0(
      "Andelen positiva svar i dimensionen helhetsintryck bland patienter som ",
      "besökt en specialiserad öppenvårdsmottagning på sjukhus."),
    riktning = "Högre andel är bättre.",
    avgransning = paste0(
      "Avser det enskilda mottagningsbesöket, inte väntetiden fram till det och ",
      "inte vårdkedjan i övrigt."),
    teori = paste0(
      "Planerade öppenvårdsbesök får genomgående de högsta omdömena i hela ",
      "patientenkäten. Besöket är förberett, har en bestämd tid och en tydlig ",
      "fråga att lösa, vilket är gynnsamma förutsättningar jämfört med ",
      "akutmottagningens oplanerade möte. Nivån ligger därför nära nittio ",
      "procent i alla regioner. Det är väntetiden fram till besöket, inte ",
      "besöket i sig, som är den svaga länken, och den mäts på annat håll i ",
      "rapporten."),
    faktorer = list(
      list(rubrik = "Planerad kontakt", text = paste0(
        "Bokad tid och förberett ärende ger höga omdömen oavsett region. Nivån ",
        "har därmed ett tak som ligger nära hundra procent.")),
      list(rubrik = "Information före besöket", text = paste0(
        "Kallelserutiner och besked om vad som ska hända påverkar ",
        "helhetsintrycket mer än besökets längd."),
        kalla = K_NPE),
      list(rubrik = "Liten spridning mellan regioner", text = paste0(
        "Eftersom alla ligger högt kan placeringen ändras kraftigt av mycket ",
        "små skillnader i utfallet."),
        kalla = K_NPE),
      list(rubrik = "Mätningen är avslutad", text = paste0(
        "Indikatorn upphörde i sin nationella form efter 2023. Serien fylls ",
        "inte på och ska läsas som historik, inte som nuläge."),
        kalla = K_NPE)
    )
  ),

  N79521 = list(
    matt = paste0(
      "Andelen positiva svar i dimensionen helhetsintryck bland patienter som ",
      "vårdats inneliggande inom specialiserad sjukhusvård."),
    riktning = "Högre andel är bättre.",
    avgransning = paste0(
      "Avser vårdtillfället på avdelning. Patienter som är för sjuka för att ",
      "svara ingår inte i underlaget."),
    teori = paste0(
      "Slutenvården är den vårdform där patienten tillbringar längst tid och där ",
      "bemanning, vårdplatsläge och kontinuitet får störst genomslag i ",
      "upplevelsen. Omdömet är därför känsligare för belastning än öppenvårdens ",
      "motsvarighet och samvarierar med överbeläggningar och utlokaliserade ",
      "patienter, som följs i kapitlet om säker vård. Ett fall här bör läsas ",
      "tillsammans med de måtten snarare än som ett bemötandeproblem."),
    faktorer = list(
      list(rubrik = "Vårdplatsläget", text = paste0(
        "Överbeläggning och utlokalisering försämrar både omvårdnad och upplevd ",
        "trygghet, och slår igenom i helhetsintrycket.")),
      list(rubrik = "Bemanningskontinuitet", text = paste0(
        "Många olika personal under ett vårdtillfälle sänker omdömet, särskilt ",
        "i frågorna om information och delaktighet."),
        kalla = K_NPE),
      list(rubrik = "Utskrivningsprocessen", text = paste0(
        "Besked om vad som händer efter utskrivning är en av de frågor som ",
        "väger tyngst och samtidigt en av dem som oftast får låga betyg."),
        kalla = K_NPE),
      list(rubrik = "Bortfall bland de sjukaste", text = paste0(
        "De svårast sjuka svarar i lägre grad, vilket sannolikt gör måttet mer ",
        "positivt än den faktiska upplevelsen i hela gruppen."),
        kalla = K_NPE)
    )
  ),

  N79171 = list(
    matt = paste0(
      "Andelen positiva svar i dimensionen helhetsintryck bland patienter som ",
      "besökt en akutmottagning."),
    riktning = "Högre andel är bättre.",
    avgransning = paste0(
      "Avser besöket på akutmottagningen. Patienter som lämnat utan att bli ",
      "undersökta fångas inte av mätningen."),
    teori = paste0(
      "Akutmottagningen är den vårdform där förväntan och verklighet oftast ",
      "skiljer sig åt. Besöket är oplanerat, prioriteringen sker efter medicinsk ",
      "allvarlighetsgrad och inte efter ankomsttid, och väntan sker på plats. ",
      "Måttet är därför starkt kopplat till vistelsetiden och till hur väl ",
      "väntan förklaras, snarare än till vad som medicinskt utförs. Det gör det ",
      "till kapitlets mest flödeskänsliga mått och till en spegel av ",
      "akutflödet i regionens egna system."),
    faktorer = list(
      list(rubrik = "Vistelsetid", text = paste0(
        "Tiden på akutmottagningen är den enskilt starkaste förklaringen till ",
        "omdömet. Den styrs i sin tur av tillgången på vårdplatser på avdelning.")),
      list(rubrik = "Information under väntan", text = paste0(
        "Att få veta varför man väntar höjer omdömet påtagligt även när väntan ",
        "är precis lika lång."),
        kalla = K_NPE),
      list(rubrik = "Prioritering efter allvar", text = paste0(
        "Att andra tas före upplevs som orättvist om prioriteringsprincipen ",
        "inte förklarats.")),
      list(rubrik = "Säsong och belastning", text = paste0(
        "Mätningen görs under en avgränsad period. Infektionssäsong eller en ",
        "enstaka hårt belastad vecka kan påverka utfallet."),
        kalla = K_NPE)
    )
  ),

  N79178 = list(
    matt = paste0(
      "Andelen positiva svar i dimensionen helhetsintryck bland patienter som ",
      "utreds inom ett standardiserat vårdförlopp i cancervården."),
    riktning = "Högre andel är bättre.",
    avgransning = paste0(
      "Avser utredningsfasen, från välgrundad misstanke fram till besked, inte ",
      "den behandling som följer efteråt."),
    teori = paste0(
      "Utredning vid misstänkt cancer är en period av ovisshet, och det är just ",
      "ovissheten som det standardiserade vårdförloppet är konstruerat för att ",
      "korta. Måttet fångar därför i praktiken hur väl förloppet hålls ihop: om ",
      "patienten får en fast kontakt, om besked lämnas när de utlovats och om ",
      "nästa steg är känt. Det korresponderar direkt mot ledtidsmåttet i ",
      "kapitlet om tillgänglighet, men mäter upplevelsen av processen medan ",
      "ledtidsmåttet mäter dess klocka."),
    faktorer = list(
      list(rubrik = "Kontaktsjuksköterska", text = paste0(
        "En namngiven fast kontakt är den åtgärd som starkast höjer omdömet i ",
        "cancervården."),
        kalla = K_SVF),
      list(rubrik = "Besked i utlovad tid", text = paste0(
        "Fördröjda provsvar och uppskjutna besked slår hårdare mot upplevelsen ",
        "än en längre men förutsägbar utredning."),
        kalla = K_SVF),
      list(rubrik = "Diagnosblandning", text = paste0(
        "Förloppen skiljer sig kraftigt åt mellan diagnoser. Regioner med annan ",
        "diagnosfördelning i mätningen har delvis andra förutsättningar."),
        kalla = K_SVF),
      list(rubrik = "Litet urval", text = paste0(
        "Antalet svarande per region är begränsat, vilket ger stora ",
        "slumpmässiga utslag mellan mätningar."),
        kalla = K_NPE)
    )
  ),

  # ── Inställning till digitala vårdformer ───────────────────────────
  N70465 = list(
    matt = paste0(
      "Andelen av de svarande som är mycket eller ganska positiva till 1177 ",
      "Vårdguidens e-tjänster. De som uppger att de inte känner till tjänsterna ",
      "räknas bort från nämnaren."),
    riktning = "Högre andel är bättre.",
    avgransning = paste0(
      "Mäter inställning, inte användning. Eftersom nämnaren bara omfattar dem ",
      "som känner till tjänsterna är talet inte ett mått på spridning."),
    teori = paste0(
      "Måttet beskriver acceptansen för en omställning som redan pågår och är ",
      "därför ett planeringsunderlag lika mycket som ett resultatmått. Att de ",
      "som inte känner till tjänsterna räknas bort gör talet högt och stabilt: ",
      "det mäter uppfattningen hos de redan invigda. Nivån stiger i takt med att ",
      "fler får egen erfarenhet, vilket innebär att en region med hög ",
      "användning har ett annat utgångsläge än en med låg."),
    faktorer = list(
      list(rubrik = "Egen användning", text = paste0(
        "Den som loggat in och uträttat ett ärende är mer positiv. Måttet följer ",
        "därför spridningen av tjänsterna i befolkningen."),
        kalla = K_BAROMETERN),
      list(rubrik = "Gemensam plattform", text = paste0(
        "1177 är nationellt. Skillnader mellan regioner beror på vad respektive ",
        "region valt att lägga in i tjänsten, inte på plattformen i sig."),
        kalla = K_1177),
      list(rubrik = "Tjänsteutbudet", text = paste0(
        "Möjligheten att boka om tid, förnya recept och läsa sin journal ",
        "påverkar nyttan mer än gränssnittet gör."),
        kalla = K_1177),
      list(rubrik = "Kännedom som filter", text = paste0(
        "Låg kännedom lyfter talet, eftersom nämnaren krymper. Nivån ska därför ",
        "inte läsas som täckningsgrad."),
        kalla = K_BAROMETERN)
    )
  ),

  N70466 = list(
    matt = paste0(
      "Andelen av de svarande som är mycket eller ganska positiva till digital ",
      "teknik för vård, konsultation och behandling."),
    riktning = "Högre andel är bättre.",
    avgransning = paste0(
      "Avser vårdmöten som helt eller delvis ersätter fysiska besök, inte ",
      "administrativa e-tjänster som tidbokning och receptförnyelse."),
    teori = paste0(
      "Det här är kapitlets lägsta nivå, och skillnaden mot inställningen till ",
      "1177 är i sig resultatet: befolkningen är positiv till att uträtta ",
      "ärenden digitalt men betydligt mer tveksam till att ersätta själva ",
      "vårdmötet. Måttet är därmed en gränsmarkör för hur långt en digital ",
      "omställning kan drivas med bibehållet förtroende, och det rör sig ",
      "långsamt eftersom det bygger på en principiell hållning snarare än på en ",
      "erfarenhet."),
    faktorer = list(
      list(rubrik = "Ålder", text = paste0(
        "Yngre svarande är genomgående mer positiva. Regioner med äldre ",
        "befolkning har ett lägre utgångsläge som inte handlar om den egna ",
        "verksamheten."),
        kalla = K_BAROMETERN),
      list(rubrik = "Egen erfarenhet", text = paste0(
        "Den som provat ett digitalt vårdmöte är mer positiv än den som inte ",
        "har det, vilket kopplar måttet till utbudet i regionen.")),
      list(rubrik = "Debatten om digital vård", text = paste0(
        "Bilden formas nationellt av diskussionen om digitala vårdgivare och ",
        "deras kostnader, inte av regionens eget erbjudande.")),
      list(rubrik = "Frågans bredd", text = paste0(
        "Frågan gäller vård, konsultation och behandling samlat. Ett lågt tal ",
        "betyder inte att alla former av digital kontakt avvisas."),
        kalla = K_BAROMETERN)
    )
  ),

  N70467 = list(
    matt = paste0(
      "Andelen av de svarande som är mycket eller ganska positiva till större ",
      "möjligheter att vårdas hemma, genom hembesök av vårdpersonal med stöd av ",
      "digital teknik."),
    riktning = "Högre andel är bättre.",
    avgransning = paste0(
      "Avser en kombination av hembesök och teknikstöd. Frågan gäller ",
      "möjligheten i sig, inte den svarandes egen vilja att avstå sjukhusvård."),
    teori = paste0(
      "Frågan ligger mellan de två andra digitala måtten och visar varför: när ",
      "tekniken kombineras med ett fysiskt besök stiger acceptansen kraftigt ",
      "jämfört med rent digitala vårdmöten. Måttet beskriver därmed ",
      "förutsättningarna för omställningen till nära vård, alltså den ",
      "förflyttning som lägger mer vård i hemmet, och visar hur stort mandat en ",
      "region har för den förflyttningen."),
    faktorer = list(
      list(rubrik = "Det fysiska besöket", text = paste0(
        "Att en människa kommer hem är det som gör tekniken acceptabel. Talet ",
        "ligger därför omkring tjugo procentenheter över rent digital vård."),
        kalla = K_BAROMETERN),
      list(rubrik = "Erfarenhet av hemsjukvård", text = paste0(
        "Den som har egen eller närståendes erfarenhet av vård i hemmet svarar ",
        "mer positivt.")),
      list(rubrik = "Boende och närstående", text = paste0(
        "Att vårdas hemma förutsätter en hemmiljö som fungerar. Boendestruktur ",
        "och ensamhet påverkar därför svaren.")),
      list(rubrik = "Delat huvudmannaskap", text = paste0(
        "Hemsjukvården delas mellan region och kommun. Befolkningen skiljer inte ",
        "på huvudmän, men förutsättningarna skiljer sig mellan regioner."))
    )
  ),

  # ══════════════════════════════════════════════════════════════════
  #  KAPITEL 2 — Tillgänglighet och väntetider
  # ══════════════════════════════════════════════════════════════════

  # ── Primärvårdens tillgänglighet ───────────────────────────────────
  N79179 = list(
    matt = paste0(
      "Andelen inkommande telefonsamtal till primärvården som besvarats samma ",
      "dag, redovisat som ett genomsnitt av årets tolv månader."),
    riktning = paste0(
      "Högre andel är bättre. Tillgänglighetsgarantin innebär att den som söker ",
      "kontakt med primärvården ska få kontakt samma dag."),
    avgransning = paste0(
      "Mäter om samtalet besvarats, inte vad som hände sedan. Ett besvarat ",
      "samtal kan sluta med en tid långt fram eller med en hänvisning vidare."),
    teori = paste0(
      "Telefonen är primärvårdens tröskel och måttet är det första ledet i ",
      "vårdgarantins kedja. Det som mäts är teknisk åtkomst, inte medicinsk ",
      "bedömning, vilket gör måttet både lätt att styra och lätt att ",
      "missförstå. En hög siffra betyder att man kommer fram, inte att man får ",
      "vård. Måttet ska därför alltid läsas tillsammans med den medicinska ",
      "bedömningen inom tre dagar: det är i glappet mellan de två som ",
      "primärvårdens verkliga tillgänglighet syns."),
    faktorer = list(
      list(rubrik = "Källbyte 2024", text = paste0(
        "Från och med 2024 mäts telefontillgängligheten på ett nytt sätt, med ",
        "månadsvis rapportering till den nationella väntetidsdatabasen. ",
        "Jämförelser bakåt över det skiftet ska göras med försiktighet."),
        kalla = K_TELEFONI),
      list(rubrik = "Teknisk lösning", text = paste0(
        "Återuppringningsfunktion och kösystem påverkar talet direkt. Hur ett ",
        "samtal räknas beror på hur telefonisystemet är satt upp."),
        kalla = K_TELEFONI),
      list(rubrik = "Digitala ingångar", text = paste0(
        "Chatt och e-tjänster avlastar telefonen. Regioner som styrt om flöden ",
        "får färre men ofta mer komplexa samtal kvar i telefonen."),
        kalla = K_TELEFONI),
      list(rubrik = "Bemanning i slussen", text = paste0(
        "Mätningen avser samma arbetsdag, minst mellan klockan åtta och sjutton. ",
        "Bemanningen i telefonslussen är därför avgörande för utfallet."),
        kalla = K_TELEFONI),
      list(rubrik = "Årsvärdet är ett medelvärde", text = paste0(
        "Talet är ett genomsnitt av tolv månader och kräver data för minst tio. ",
        "Enstaka bortfallsmånader kan påverka årets värde."),
        kalla = K_TELEFONI)
    )
  ),

  N79173 = list(
    matt = paste0(
      "Andelen medicinska bedömningar i primärvården som genomförts inom tre ",
      "dagar från det att beslut om vård fattats. Besök, distansbesök och ",
      "hembesök ingår."),
    riktning = paste0(
      "Högre andel är bättre. Vårdgarantin ger rätt till medicinsk bedömning ",
      "inom tre dagar vid ett nytt eller försämrat hälsoproblem."),
    avgransning = paste0(
      "Patienter som erbjudits en tid men själva valt att vänta längre räknas ",
      "inte med. Bedömningen ska göras av legitimerad personal i primärvården, ",
      "inte nödvändigtvis av läkare."),
    teori = paste0(
      "Måttet är kärnan i vårdgarantins primärvårdsdel och det led där lagens ",
      "krav är skarpast. Sedan den 1 juli 2022 gäller tre dagar i stället för ",
      "sju, och kravet gäller den vårdgivare patienten är listad hos. Att ",
      "arbetssätten i stor utsträckning fortfarande är byggda för den tidigare ",
      "sjudagarsgarantin är den vanligaste förklaringen till att utfallet ligger ",
      "under målet: omställningen är organisatorisk och tar år, inte månader. ",
      "Att bedömningen får göras av annan legitimerad personal än läkare är ",
      "samtidigt den viktigaste handlingsvägen."),
    faktorer = list(
      list(rubrik = "Regelskiftet 2022", text = paste0(
        "Tre dagar ersatte sju. Verksamheter som planerats för den gamla ",
        "garantin når inte den nya utan att lägga om triagering och tidbok."),
        kalla = K_VARDGARANTI),
      list(rubrik = "Vem som bedömer", text = paste0(
        "Sjuksköterska, fysioterapeut och psykolog kan göra den medicinska ",
        "bedömningen. Regioner som använt hela bredden av professioner når ",
        "högre tal."),
        kalla = K_SOS_3DAGAR),
      list(rubrik = "Uppdragets omfattning", text = paste0(
        "Vad som ligger i primärvården skiljer sig mellan regioner. Ett brett ",
        "uppdrag ger fler och tyngre bedömningar i nämnaren."),
        kalla = K_SOS_3DAGAR),
      list(rubrik = "Bemanning och kontinuitet", text = paste0(
        "Vakanser och beroende av inhyrda läkare minskar antalet tillgängliga ",
        "bedömningstider.")),
      list(rubrik = "Registreringspraxis", text = paste0(
        "Måttet utgår från när beslut om vård registrerats. Skillnader i hur den ",
        "tidpunkten sätts påverkar jämförbarheten mellan regioner."),
        kalla = K_SOS_3DAGAR)
    )
  ),

  # ── Vårdgarantin i specialiserad vård ──────────────────────────────
  N79221 = list(
    matt = paste0(
      "Andelen av dem som står i kö till första kontakt i specialiserad vård ",
      "som har väntat högst 90 dagar. Alla specialiteter, yrkesgrupper och ",
      "kontaktformer ingår."),
    riktning = paste0(
      "Högre andel är bättre. Vårdgarantin ger rätt till första besök i ",
      "specialiserad vård inom 90 dagar efter remiss, även egenremiss."),
    avgransning = paste0(
      "Ett kömått: det beskriver dem som fortfarande väntar, inte dem som fått ",
      "vård. Den som avbokat eller valt en annan vårdgivare försvinner ur kön."),
    teori = paste0(
      "Väntandemåttet och det genomförda måttet är ett par som måste läsas ",
      "tillsammans, och skillnaden mellan dem är själva poängen. Väntandemåttet ",
      "är en ögonblicksbild av kön och kan förbättras genom att färre släpps in ",
      "i den, till exempel genom striktare remissbedömning. Det genomförda ",
      "måttet visar i stället vad de som faktiskt fick vård fick vänta. En ",
      "region kan ha en kort kö och långa genomförda väntetider samtidigt, och ",
      "tvärtom. Först tillsammans beskriver de tillgängligheten."),
    faktorer = list(
      list(rubrik = "Remissflödets storlek", text = paste0(
        "Antalet remisser som släpps in styr kölängden lika mycket som ",
        "produktionen gör. Striktare remissbedömning förbättrar måttet utan att ",
        "vården blivit mer tillgänglig."),
        kalla = K_VARDGARANTI),
      list(rubrik = "Kösammansättning", text = paste0(
        "Ögonsjukvård och ortopedi dominerar volymmässigt i de flesta regioner. ",
        "Totalen är därför känslig för hur några få specialiteter går."),
        kalla = K_VANTETIDER),
      list(rubrik = "Journalsystembyten", text = paste0(
        "Flera regioner har bytt vårdinformationssystem från 2024, vilket ",
        "påverkar rapportering och datakvalitet. Berörda regioner streckas i ",
        "Kolada, vilket samtidigt minskar antalet jämförbara regioner."),
        kalla = K_VANTETIDER),
      list(rubrik = "Kösanering", text = paste0(
        "Rensning av inaktuella väntelistor ger språng i serien som handlar om ",
        "administration och inte om vård."),
        kalla = K_ORDLISTA)
    )
  ),

  N79222 = list(
    matt = paste0(
      "Andelen genomförda första kontakter i specialiserad vård där kontakten ",
      "skedde inom 90 dagar, av samtliga genomförda första kontakter."),
    riktning = "Högre andel är bättre. Vårdgarantins gräns är 90 dagar.",
    avgransning = paste0(
      "Beskriver dem som fick vård under perioden. Den som fortfarande väntar ",
      "syns inte här utan i väntandemåttet."),
    teori = paste0(
      "Det genomförda måttet är facit för dem som togs om hand, men det bär en ",
      "inbyggd skevhet: om en region prioriterar att beta av de längst väntande ",
      "sjunker måttet tillfälligt, trots att kön förbättras. Ett stigande ",
      "genomfört mått samtidigt som väntandemåttet faller är därför ett ",
      "varningstecken snarare än en framgång, eftersom det tyder på att de korta ",
      "väntetiderna prioriteras och de långa lämnas kvar."),
    faktorer = list(
      list(rubrik = "Prioriteringsordning", text = paste0(
        "Att ta de äldsta ärendena först sänker måttet på kort sikt och höjer ",
        "väntandemåttet. Effekten är önskvärd men ser ut som en försämring.")),
      list(rubrik = "Produktionskapacitet", text = paste0(
        "Mottagningskapaciteten, i sin tur beroende av bemanning och lokaler, ",
        "sätter taket för hur många som ryms inom gränsen.")),
      list(rubrik = "Distanskontakter", text = paste0(
        "Telefon- och distanskontakter räknas som första kontakt. Regioner som ",
        "använder dem aktivt når gränsen lättare."),
        kalla = K_ORDLISTA),
      list(rubrik = "Journalsystembyten", text = paste0(
        "Samma datakvalitetsproblem som för väntandemåttet gäller här, med ",
        "streckade regioner från 2024."),
        kalla = K_VANTETIDER)
    )
  ),

  N79223 = list(
    matt = paste0(
      "Andelen av dem som står i kö till operation eller åtgärd i specialiserad ",
      "vård som har väntat högst 90 dagar."),
    riktning = paste0(
      "Högre andel är bättre. Vårdgarantin ger rätt till operation eller åtgärd ",
      "inom 90 dagar efter beslut om behandling."),
    avgransning = paste0(
      "Ett kömått. Patienter som av medicinska skäl inte kan opereras ännu, ",
      "eller som valt att vänta, ingår ändå i kön så snart beslut fattats."),
    teori = paste0(
      "Operationskön är det led i vårdgarantin där uppfyllelsen är lägst i hela ",
      "landet, och skälet är strukturellt: en operation kräver samtidig tillgång ",
      "till operationssal, anestesipersonal, kirurg och en vårdplats efteråt. ",
      "Vilken som helst av dem kan bli den begränsande faktorn, och vårdplatsen ",
      "är oftast den. Måttet är därför i praktiken lika mycket ett mått på ",
      "slutenvårdens kapacitet som på kirurgins."),
    faktorer = list(
      list(rubrik = "Vårdplatstillgång", text = paste0(
        "En operation kan inte genomföras utan en plats efteråt. Stängda ",
        "vårdplatser slår igenom i operationskön före allt annat.")),
      list(rubrik = "Operations- och anestesibemanning", text = paste0(
        "Salar står outnyttjade utan personal. Semesterperioder ger därför en ",
        "tydlig säsongsprofil i kön.")),
      list(rubrik = "Akut tränger undan planerat", text = paste0(
        "Akuta operationer går före planerade. Hög akutbelastning förlänger den ",
        "planerade kön utan att något beslut fattats om det.")),
      list(rubrik = "Kösammansättning", text = paste0(
        "Höft- och knäplastiker samt kataraktoperationer utgör stora volymer och ",
        "påverkar totalen kraftigt."),
        kalla = K_VANTETIDER)
    )
  ),

  N79224 = list(
    matt = paste0(
      "Andelen genomförda operationer och åtgärder i specialiserad vård som ",
      "utfördes inom 90 dagar från beslut, av samtliga genomförda."),
    riktning = "Högre andel är bättre. Vårdgarantins gräns är 90 dagar.",
    avgransning = paste0(
      "Avser dem som opererats under perioden. Säger ingenting om hur många som ",
      "väntar eller hur länge de som fortfarande väntar har väntat."),
    teori = paste0(
      "Motsvarigheten på operationssidan till det genomförda besöksmåttet, med ",
      "samma tolkningsfälla: måttet kan förbättras genom att köns korta ärenden ",
      "prioriteras. Skillnaden mot väntandemåttet är här större än på ",
      "besökssidan, vilket är väntat. En operationskö innehåller ingrepp av ",
      "mycket olika tyngd, och de tunga tar längre tid både att vänta på och ",
      "att genomföra."),
    faktorer = list(
      list(rubrik = "Ingreppens tyngd", text = paste0(
        "En region med större andel högspecialiserad kirurgi har längre ",
        "ledtider av medicinska skäl, inte av kapacitetsskäl.")),
      list(rubrik = "Prioriteringsordning", text = paste0(
        "Att beta av de längst väntande sänker måttet tillfälligt samtidigt som ",
        "kön förbättras.")),
      list(rubrik = "Sammanhållen planering", text = paste0(
        "Att sal, personal och vårdplats planeras ihop är det som praktiskt ",
        "avgör hur många som ryms inom gränsen.")),
      list(rubrik = "Journalsystembyten", text = paste0(
        "Rapporteringen påverkas från 2024 i flera regioner, vilket minskar ",
        "antalet jämförbara regioner i rankingen."),
        kalla = K_VANTETIDER)
    )
  ),

  # ── Psykiatrisk vård ───────────────────────────────────────────────
  U79049 = list(
    matt = paste0(
      "Andelen genomförda första besök i allmänpsykiatrisk vård som skedde inom ",
      "90 dagar, av samtliga genomförda första besök."),
    riktning = paste0(
      "Högre andel är bättre. Vårdgarantins gräns om 90 dagar gäller även den ",
      "psykiatriska vården."),
    avgransning = paste0(
      "Avser vuxenpsykiatrin. Barn- och ungdomspsykiatrin följs separat och har ",
      "en egen, strängare gräns."),
    teori = paste0(
      "Psykiatrin lyder under samma vårdgaranti som den somatiska ",
      "specialistvården, men förutsättningarna skiljer sig. Efterfrågan har ökat ",
      "kraftigt under ett decennium, samtidigt som tillgången på specialistläkare ",
      "och psykologer är bland de svåraste i vården. Måttet mäter dessutom bara ",
      "det första besöket, medan psykiatrisk vård till sin natur är en längre ",
      "kontakt. En god siffra här utesluter därför inte långa väntetider längre ",
      "in i förloppet."),
    faktorer = list(
      list(rubrik = "Efterfrågeutveckling", text = paste0(
        "Antalet som söker för psykisk ohälsa har ökat under lång tid. Ökad ",
        "tillströmning kan sänka måttet trots att produktionen ökat.")),
      list(rubrik = "Specialistbemanning", text = paste0(
        "Tillgången på psykiatrer och psykologer är den bindande restriktionen i ",
        "de flesta regioner.")),
      list(rubrik = "Gränsen mot primärvården", text = paste0(
        "Var lindrig och medelsvår psykisk ohälsa hanteras skiljer sig mellan ",
        "regioner och avgör vilka ärenden som hamnar i psykiatrins nämnare.")),
      list(rubrik = "Bara första besöket", text = paste0(
        "Väntan på utredning och behandling efter det första besöket fångas inte ",
        "av indikatorn."),
        kalla = K_VARDGARANTI)
    )
  ),

  U79119 = list(
    matt = paste0(
      "Andelen påbörjade fördjupade utredningar och behandlingar inom barn- och ",
      "ungdomspsykiatrin som startat inom 30 dagar."),
    riktning = paste0(
      "Högre andel är bättre. Den förstärkta vårdgarantin för BUP anger 30 ",
      "dagar, alltså en betydligt strängare gräns än den allmänna vårdgarantins ",
      "90 dagar."),
    avgransning = paste0(
      "Avser steget efter den första bedömningen, alltså start av fördjupad ",
      "utredning eller behandling. Väntan till första bedömningen mäts separat."),
    teori = paste0(
      "Det här är ett av rapportens lägsta tal, och delvis är det konstruktionen ",
      "som gör det. Gränsen är 30 dagar i stället för 90, och den avser det andra ",
      "ledet i BUP:s förlopp, där kapaciteten är som mest ansträngd. ",
      "Neuropsykiatriska utredningar dominerar volymen och kräver team av flera ",
      "professioner samtidigt, vilket gör dem svåra att skala upp. Låga tal är ",
      "därför normen i hela landet, och skillnader mellan regioner speglar i hög ",
      "grad hur mycket utredningskapacitet som byggts och var gränsen mot första ",
      "linjen dragits."),
    faktorer = list(
      list(rubrik = "Strängare gräns", text = paste0(
        "30 dagar mot vårdgarantins 90 gör måttet svårare per definition. Nivån ",
        "ska inte jämföras rakt av med övriga tillgänglighetsmått."),
        kalla = K_BUP),
      list(rubrik = "Neuropsykiatriska utredningar", text = paste0(
        "Utredningarna kräver läkare, psykolog och ofta fler professioner ",
        "samtidigt. Kapaciteten begränsas av den knappaste av dem.")),
      list(rubrik = "Första linjens uppdrag", text = paste0(
        "Regioner som byggt ut en första linje för barn och unga får färre men ",
        "tyngre ärenden till BUP, vilket kan sänka måttet trots bättre vård ",
        "totalt sett.")),
      list(rubrik = "Efterfrågeökning", text = paste0(
        "Antalet remisser till BUP har ökat kraftigt. Resurstillskott har på ",
        "många håll ätits upp av ökad tillströmning."),
        kalla = K_BUP),
      list(rubrik = "Nationella satsningar", text = paste0(
        "Staten och SKR har återkommande överenskommelser med riktade medel till ",
        "BUP. Effekterna syns med fördröjning och ojämnt mellan regioner."),
        kalla = K_OVERENSK)
    )
  ),

  # ── Standardiserade vårdförlopp vid cancer ─────────────────────────
  N70643 = list(
    matt = paste0(
      "Andelen patienter som utreds inom ett standardiserat vårdförlopp, av det ",
      "totala antal personer som beräknas få en cancerdiagnos under året. ",
      "Nämnaren skattas utifrån cancerregistrets tre senaste år."),
    riktning = paste0(
      "Högre andel är bättre. Det nationella inklusionsmålet är 70 procent."),
    avgransning = paste0(
      "Mäter om patienten kom in i ett förlopp, inte hur snabbt förloppet gick. ",
      "Ledtiden mäts av en egen indikator."),
    teori = paste0(
      "Inklusionsmåttet beskriver spridningen av ett arbetssätt, inte dess ",
      "resultat. Ett standardiserat vårdförlopp startar vid välgrundad misstanke ",
      "om cancer, och måttet visar hur stor del av de nya cancerfallen som ",
      "fångats upp den vägen. Konstruktionen är ovanlig: nämnaren är en ",
      "skattning ur cancerregistret och inte ett räknat antal, vilket gör talet ",
      "känsligt för hur väl skattningen stämmer med årets faktiska insjuknande. ",
      "Måltalet 70 procent nås numera av så gott som alla regioner, vilket gör ",
      "att indikatorn snarare bekräftar att arbetssättet är infört än skiljer ",
      "regioner åt."),
    faktorer = list(
      list(rubrik = "Skattad nämnare", text = paste0(
        "Nämnaren bygger på tre års historik ur cancerregistret. Ett år med ",
        "avvikande insjuknande ger utslag som inte handlar om vården."),
        kalla = K_CANCERREG),
      list(rubrik = "Ingången till förloppet", text = paste0(
        "Välgrundad misstanke ställs oftast i primärvården. Kunskapen där avgör ",
        "hur många som kommer in i ett förlopp."),
        kalla = K_SVF),
      list(rubrik = "Diagnosbredd", text = paste0(
        "Antalet vårdförlopp har byggts ut successivt. Vilka diagnoser som ",
        "omfattas påverkar hur stor del av cancerfallen som alls kan inkluderas."),
        kalla = K_SVF),
      list(rubrik = "Takeffekt", text = paste0(
        "Med de flesta regioner över målet är spridningen liten, och placeringen ",
        "kan flytta sig mycket vid små skillnader."),
        kalla = K_SVF)
    )
  ),

  N79198 = list(
    matt = paste0(
      "Andelen patienter i standardiserade vårdförlopp som påbörjat behandling ",
      "inom den ledtid som förloppet anger, räknat från välgrundad misstanke."),
    riktning = paste0(
      "Högre andel är bättre. Det nationella ledtidsmålet är 80 procent."),
    avgransning = paste0(
      "Avser samtliga vårdförlopp och samtliga behandlingar sammanvägt. Enskilda ",
      "diagnoser kan ligga långt från totalen."),
    teori = paste0(
      "Ledtidsmåttet är cancervårdens skarpaste tillgänglighetsmått och det som ",
      "är svårast att nå. Klockan startar vid välgrundad misstanke och stoppar ",
      "när behandlingen inleds, vilket innebär att hela utredningskedjan ryms i ",
      "måttet: radiologi, patologi, multidisciplinär konferens och ",
      "behandlingsplanering. Det räcker att ett led är överbelastat för att ",
      "ledtiden ska brista, och patologin är oftast den flaskhalsen. Måttet ",
      "mäter därför hur väl hela vårdkedjan är synkroniserad snarare än hur en ",
      "enskild verksamhet presterar."),
    faktorer = list(
      list(rubrik = "Patologi och radiologi", text = paste0(
        "Svarstiderna från diagnostiken är den vanligaste orsaken till att ",
        "ledtiden överskrids. Bemanningen där är nationellt ansträngd.")),
      list(rubrik = "Multidisciplinär konferens", text = paste0(
        "Konferensen ska hållas innan behandlingsbeslut fattas. Hur ofta den går ",
        "att sammankalla styr en stor del av ledtiden."),
        kalla = K_SVF),
      list(rubrik = "Diagnosblandning", text = paste0(
        "Ledtidsmålen skiljer sig mellan förlopp. En region med annan ",
        "diagnosfördelning har delvis andra förutsättningar."),
        kalla = K_SVF),
      list(rubrik = "Målets nivå", text = paste0(
        "Ingen region når 80-procentsmålet. En hög placering betyder att ",
        "regionen ligger nära de bästa, inte att målet är uppfyllt."),
        kalla = K_SVF)
    )
  )
)

# Faktaunderlag för en indikator, eller NULL när posten saknas.
indikatorfakta_for <- function(kpi_id) INDIKATORFAKTA[[kpi_id]]
