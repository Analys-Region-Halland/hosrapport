# config.R — Kolada: Hälso- och sjukvårdsrapporten (G2KPI138906)
# Årsindikatorer från Kolada API v3. EN sektion (ett kort på huvudsidan):
# "Hälso- och sjukvårdsrapporten (SKR)". Inne i rapporten delas indikatorerna
# i sex tematiska delar (samma indelning som SKR:s rapport i Jämföraren,
# report=138906), var och en med egen översikt.
#
# OBS: Jämförarens grupperingsträd är inte åtkomligt via öppna API:t (403),
# så tilldelningen KPI → del underhålls manuellt här. Oklassade KPI:er
# hamnar i en "Övrigt"-del av bearbeta.R i stället för att tyst försvinna.
#
# Halland highlightas; övriga regioner blir kontextlinjer, Riket streckad.
# Visas bara i årsvyn. Signal: ranking bland regionerna —
# "i fas" = topp 3, "bevaka" = plats 4–7, "avvikelse" = plats 8 eller lägre.

kolada_tema <- list(
  id          = "skr",
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

  # Delar = SKR-rapportens tematiska indelning, i visningsordning.
  delar = list(
    list(id = "syn-pa-varden",
         namn = "Patienters och befolkningens syn på vården",
         kpier = c("U70447", "U70446", "U71458", "U70449", "U70448", "U70450",
                   "U71451", "N79171", "N79174", "N79521", "N79178",
                   "N70465", "N70466", "N70467")),
    list(id = "tillganglighet",
         namn = "Tillgänglighet och väntetider",
         kpier = c("N79179", "N79173", "N79221", "N79222", "N79223", "N79224",
                   "U79049", "U79119", "N70643", "N79198")),
    list(id = "saker-vard",
         namn = "Säker vård",
         kpier = c("N70641", "N70642", "U70418", "N79181", "N79180", "U79093",
                   "U79132", "N79175", "U70425", "U79149", "U79134")),
    list(id = "kunskapsbaserad",
         namn = "Kunskapsbaserad vård och måluppfyllelse",
         kpier = c("U70495", "N79187", "U70513", "U70514", "U70486", "U70530",
                   "U70477", "N79189", "U70479", "U70481", "U70483",
                   "U70465", "U79062", "U79063", "U79071", "U79073")),
    list(id = "sjukdomsforekomst",
         namn = "Sjukdomsförekomst och resultat",
         kpier = c("N70341", "N70346", "N70351", "N70352", "N61603", "N79190",
                   "N79196", "N79184", "U20462", "U79092", "U79133")),
    list(id = "kostnader",
         namn = "Kostnader och produktivitet",
         kpier = c("U70020", "U79065", "U79066", "N70808", "N70845", "N79176",
                   "U79135", "U79029", "N63125", "N63133", "N63135", "N63144",
                   "N63146", "N63147"))
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
