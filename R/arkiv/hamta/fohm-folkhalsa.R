# fohm-folkhalsa.R — Hämtar folkhälsoindikatorer från Folkhälsomyndighetens
# PxWeb-API (Folkhälsodata, mappen A_Mo8 "Folkhälsan i Sverige" som är
# organiserad efter folkhälsopolitikens åtta målområden + hälsoutfall).
#
# Resultat: data/fohm-folkhalsa.rds — en lista med:
#   $indikatorer : metadata per indikator (id, namn, title, beskrivning,
#                  kalla, enhet, malomrade)
#   $data        : långt format — kpi, region_id, region, ar (periodens
#                  slutår, för sortering), etikett (t.ex. "2021-2024"), varde
#   $hamtad      : tidsstämpel
#
# Datakällor: nationella folkhälsoenkäten (HLV, rullande 4-årsmedelvärden på
# länsnivå) samt registerbaserade tabeller (årsvisa). Saknade värden ("..")
# filtreras bort. Kön: totalt.
#
# Användning: source("R/hamta/fohm-folkhalsa.R")

library(pxweb)
library(dplyr)
library(purrr)

BAS <- "https://fohm-app.folkhalsomyndigheten.se/Folkhalsodata/api/v1/sv/A_Folkhalsodata/A_Mo8"

# Riket + de 21 länen (regionnamn hårdkodade — stabila SCB-länskoder)
REGIONER <- c(
  "00" = "Riket",
  "01" = "Stockholm",       "03" = "Uppsala",         "04" = "Södermanland",
  "05" = "Östergötland",    "06" = "Jönköping",       "07" = "Kronoberg",
  "08" = "Kalmar",          "09" = "Gotland",         "10" = "Blekinge",
  "12" = "Skåne",           "13" = "Halland",         "14" = "Västra Götaland",
  "17" = "Värmland",        "18" = "Örebro",          "19" = "Västmanland",
  "20" = "Dalarna",         "21" = "Gävleborg",       "22" = "Västernorrland",
  "23" = "Jämtland",        "24" = "Västerbotten",    "25" = "Norrbotten"
)
LAN_KODER <- names(REGIONER)

# ── Indikatordefinitioner ──────────────────────────────────────────────
# id        : internt kpi-id (blir "fohm-<id>" i rapporten)
# path      : tabellens sökväg under A_Mo8
# query     : PxWeb-selektion utöver Region (kön totalt, måttval osv.)
#             Tidsdimensionen utelämnas → alla perioder.
# namn      : kort visningsnamn i rapporten
# beskrivning/kalla : infoknappens text respektive källangivelse
# enhet     : "procent" eller "antal"
# riktning  : "hog" = högre är bättre, "lag" = lägre är bättre
# malomrade : del-id (se teman/folkhalsa/config.R)
INDIKATORER <- list(

  # ── 1 Det tidiga livets villkor ──
  list(id = "tobak_graviditet",
       path = "1_Tidigalivet/01MhvBhv/01.02tobmhv/tobmhvReg.px",
       query = list(),   # ingen könsdimension (gravida)
       namn = "Tobaksanvändning under tidig graviditet",
       title = "Tobaksanvändning under tidig graviditet, andel (%)",
       beskrivning = "Andel gravida som använde tobak vid inskrivning till mödrahälsovården. Årsvis registerstatistik.",
       kalla = "Socialstyrelsen, medicinska födelseregistret",
       enhet = "procent", riktning = "lag", malomrade = "mo1"),

  list(id = "forskola",
       path = "1_Tidigalivet/02Forskola/01.07InskForsk/InskForskReg.px",
       query = list("Kön" = "1+2"),
       namn = "Barn inskrivna i förskola",
       title = "Inskrivna i förskola, andel (%)",
       beskrivning = "Andel barn 3-5 år som är inskrivna i förskola. Årsvis registerstatistik.",
       kalla = "SCB via Folkhälsomyndigheten",
       enhet = "procent", riktning = "hog", malomrade = "mo1"),

  # ── 2 Kunskaper, kompetenser och utbildning ──
  list(id = "gymnasiebehorighet",
       path = "2_Kompetens/02Lutbsyss/02.11Behgymn/BehgymnReg.px",
       query = list("Kön" = "1+2"),
       namn = "Behörighet till gymnasiet",
       title = "Gymnasiebehörighet, andel (%)",
       beskrivning = "Andel elever i årskurs 9 som är behöriga till gymnasieskolans yrkesprogram. Årsvis registerstatistik.",
       kalla = "SCB via Folkhälsomyndigheten",
       enhet = "procent", riktning = "hog", malomrade = "mo2"),

  # ── 3 Arbete, arbetsförhållanden och arbetsmiljö ──
  list(id = "arbetsloshet",
       path = "3_Arbete/01Arbete/03.02alos/alosReg.px",
       query = list("Enhet" = "2", "Ålder" = "15-74", "Kön" = "1+2"),
       namn = "Arbetslöshet 15-74 år",
       title = "Arbetslöshet, andel (%)",
       beskrivning = "Andel arbetslösa av arbetskraften 15-74 år enligt arbetskraftsundersökningarna (AKU). Årsmedelvärden.",
       kalla = "SCB (AKU) via Folkhälsomyndigheten",
       enhet = "procent", riktning = "lag", malomrade = "mo3"),

  list(id = "sysselsattning",
       path = "3_Arbete/01Arbete/03.01Syssgr/SyssgrReg.px",
       query = list("Enhet" = "2", "Ålder" = "20-64", "Kön" = "1+2"),
       namn = "Sysselsättningsgrad 20-64 år",
       title = "Sysselsättning, andel (%)",
       beskrivning = "Andel sysselsatta av befolkningen 20-64 år enligt arbetskraftsundersökningarna (AKU). Årsmedelvärden.",
       kalla = "SCB (AKU) via Folkhälsomyndigheten",
       enhet = "procent", riktning = "hog", malomrade = "mo3"),

  # ── 4 Inkomster och försörjningsmöjligheter ──
  list(id = "lag_ek_standard",
       path = "4_Inkomst/02ResursEk/04.05.02EkVux/EkVuxReg.px",
       query = list("Åldersstandardisering" = "1", "Kön" = "1+2"),
       namn = "Låg ekonomisk standard",
       title = "Låg ekonomisk standard (relativ), andel (%)",
       beskrivning = "Andel invånare med disponibel inkomst under 60 procent av medianen (relativ låg ekonomisk standard). Årsvis registerstatistik.",
       kalla = "SCB via Folkhälsomyndigheten",
       enhet = "procent", riktning = "lag", malomrade = "mo4"),

  list(id = "barnfattigdom",
       path = "4_Inkomst/02ResursEk/04.05.01EkBarn/EkBarnReg.px",
       query = list("Åldersstandardisering" = "1", "Kön" = "1+2"),
       namn = "Barn i hushåll med låg ekonomisk standard",
       title = "Låg ekonomisk standard (relativ), barn och unga, andel (%)",
       beskrivning = "Andel barn och unga 0-19 år i hushåll med disponibel inkomst under 60 procent av medianen. Årsvis registerstatistik.",
       kalla = "SCB via Folkhälsomyndigheten",
       enhet = "procent", riktning = "lag", malomrade = "mo4"),

  # ── 5 Boende och närmiljö ──
  list(id = "radsla_ute",
       path = "5_Boende/02Bomrade/05.07raddens/raddensyreg.px",
       query = list("Rädd att gå ut ensam" = "01",
                    "Andel och konfidensintervall" = "01",
                    "Kön" = "00"),
       namn = "Avstått från att gå ut ensam av rädsla",
       title = "Avstått från att gå ut ensam av rädsla, andel (%)",
       beskrivning = "Andel invånare 16-84 år som avstått från att gå ut ensamma av rädsla för att bli överfallna, rånade eller ofredade. Fyraårsmedelvärden.",
       kalla = "nationella folkhälsoenkäten HLV",
       enhet = "procent", riktning = "lag", malomrade = "mo5"),

  # ── 6 Levnadsvanor ──
  list(id = "rokning",
       path = "6_Levanor/01Begrans/06.01tobakdag/tobakdagyreg.px",
       query = list("Användning av tobaks- och nikotinprodukter" = "01",
                    "Andel och konfidensintervall" = "01",
                    "Kön" = "00"),
       namn = "Daglig tobaksrökning",
       title = "Tobaksrökning, daglig, andel (%)",
       beskrivning = "Andel invånare 16-84 år som uppger att de röker tobak dagligen. Fyraårsmedelvärden.",
       kalla = "nationella folkhälsoenkäten HLV",
       enhet = "procent", riktning = "lag", malomrade = "mo6"),

  list(id = "fysisk_aktivitet",
       path = "6_Levanor/02Okad/06.18fysak/fysakyreg.px",
       query = list("Fysisk aktivitet" = "01",
                    "Andel och konfidensintervall" = "01",
                    "Kön" = "00"),
       namn = "Fysiskt aktiva minst 150 min/vecka",
       title = "Fysisk aktivitet minst 150 minuter per vecka, andel (%)",
       beskrivning = "Andel invånare 16-84 år som är fysiskt aktiva minst 150 minuter per vecka. Fyraårsmedelvärden.",
       kalla = "nationella folkhälsoenkäten HLV",
       enhet = "procent", riktning = "hog", malomrade = "mo6"),

  # ── 7 Kontroll, inflytande och delaktighet ──
  list(id = "lag_tillit",
       path = "7_Kontroll/02Civil/07.05lita/litaYreg.px",
       query = list("Tillit" = "40",
                    "Andel och konfidensintervall" = "01",
                    "Kön" = "00"),
       namn = "Låg tillit till andra",
       title = "Svårt att lita på andra människor, andel (%)",
       beskrivning = "Andel invånare 16-84 år som uppger att de i allmänhet har svårt att lita på andra människor. Fyraårsmedelvärden.",
       kalla = "nationella folkhälsoenkäten HLV",
       enhet = "procent", riktning = "lag", malomrade = "mo7"),

  # ── 8 En jämlik och hälsofrämjande hälso- och sjukvård ──
  list(id = "avstatt_tandvard",
       path = "8_Sjukvard/04Tandvard/08.14tlejsok/tlejsokyreg.px",
       query = list("Avstått tandläkarvård" = "04",
                    "Andel och konfidensintervall" = "01",
                    "Kön" = "00"),
       namn = "Avstått tandvård av ekonomiska skäl",
       title = "Avstått tandvård av ekonomiska skäl trots behov, andel (%)",
       beskrivning = "Andel invånare 16-84 år som avstått från att söka tandläkarvård av ekonomiska skäl trots upplevt behov. Fyraårsmedelvärden.",
       kalla = "nationella folkhälsoenkäten HLV",
       enhet = "procent", riktning = "lag", malomrade = "mo8"),

  # ── Hälsa (utfall) ──
  list(id = "sjalvskattad_halsa",
       path = "Halsoutfall/01Overgrip/01.01halsgod/halsgodyreg.px",
       query = list("Hälsotillstånd" = "01",
                    "Andel och konfidensintervall" = "01",
                    "Kön" = "00"),
       namn = "Bra eller mycket bra självskattad hälsa",
       title = "Självskattad hälsa, bra eller mycket bra, andel (%)",
       beskrivning = "Andel invånare 16-84 år som skattar sitt allmänna hälsotillstånd som bra eller mycket bra. Fyraårsmedelvärden.",
       kalla = "nationella folkhälsoenkäten HLV",
       enhet = "procent", riktning = "hog", malomrade = "halsa"),

  list(id = "medellivslangd",
       path = "Halsoutfall/01Overgrip/01.03medlivs/MedlivsXReg.px",
       query = list("Återstående medellivslängd" = "0",
                    "Kön" = "1+2"),
       namn = "Medellivslängd vid födseln",
       title = "Återstående medellivslängd vid födseln, år",
       beskrivning = "Förväntad återstående medellivslängd vid födseln, båda könen. Registerbaserad årsstatistik.",
       kalla = "SCB via Folkhälsomyndigheten",
       enhet = "antal", riktning = "hog", malomrade = "halsa")
)

# ── Hämtning ───────────────────────────────────────────────────────────

# PxWeb-svar → långt format. Året i etiketten kan vara "2021-2024" (rullande
# fönster) eller "2024" (årsvis); `ar` sätts till periodens slutår.
hamta_indikator <- function(ind) {
  cat("  ", ind$id, "...\n", sep = "")
  url <- paste0(BAS, "/", ind$path)

  qlist <- c(list("Region" = LAN_KODER), ind$query)
  px <- tryCatch(
    pxweb_get(url, query = pxweb_query(qlist)),
    error = function(e) {
      message("  FEL för ", ind$id, ": ", conditionMessage(e))
      NULL
    }
  )
  if (is.null(px)) return(NULL)

  # Två parallella ramar: koder (region-id) och klartext (etiketter/värden)
  d_kod  <- as.data.frame(px, column.name.type = "text", variable.value.type = "code")
  d_text <- as.data.frame(px, column.name.type = "text", variable.value.type = "text")

  reg_kol <- grep("^Region$", names(d_kod), ignore.case = TRUE, value = TRUE)[1]
  ar_kol  <- grep("^År$", names(d_kod), ignore.case = TRUE, value = TRUE)[1]
  stopifnot(!is.na(reg_kol), !is.na(ar_kol))
  # Värdekolumnen är den sista (mätvärdet ligger alltid efter dimensionerna)
  varde <- suppressWarnings(as.numeric(d_kod[[ncol(d_kod)]]))

  etikett <- as.character(d_text[[ar_kol]])
  # Periodens slutår: "2021-2024" → 2024, "2024" → 2024
  slutar <- vapply(strsplit(etikett, "-"), function(p) as.integer(tail(p, 1)), integer(1))

  tibble(
    kpi       = ind$id,
    region_id = as.character(d_kod[[reg_kol]]),
    region    = unname(REGIONER[as.character(d_kod[[reg_kol]])]),
    ar        = slutar,
    etikett   = etikett,
    varde     = varde
  ) |>
    filter(!is.na(varde), region_id %in% LAN_KODER)
}

cat("Hämtar", length(INDIKATORER), "indikatorer från Folkhälsomyndigheten...\n")
data_lang <- map(INDIKATORER, hamta_indikator) |> compact() |> bind_rows()

indikatorer_meta <- bind_rows(lapply(INDIKATORER, function(ind) {
  tibble(id = ind$id, namn = ind$namn, title = ind$title,
         beskrivning = ind$beskrivning, kalla = ind$kalla,
         enhet = ind$enhet, riktning = ind$riktning, malomrade = ind$malomrade)
}))

resultat <- list(
  indikatorer = indikatorer_meta,
  data        = data_lang,
  hamtad      = Sys.time()
)

saveRDS(resultat, "data/fohm-folkhalsa.rds")
cat("\nSparat: data/fohm-folkhalsa.rds —", nrow(data_lang), "rader,",
    n_distinct(data_lang$kpi), "indikatorer\n")
