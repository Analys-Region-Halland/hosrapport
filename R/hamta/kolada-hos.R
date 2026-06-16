# kolada-hos.R — Hämtar samtliga indikatorer i Koladas KPI-grupp
# "Hälso- och sjukvårdsrapporten" (G2KPI138906, report=138906 i Jämföraren)
# för alla regioner, alla tillgängliga år, via rKolada (Kolada API v3).
#
# Resultat: data/kolada-hos.rds — en lista med:
#   $grupp       : info om KPI-gruppen (id, titel, antal indikatorer)
#   $indikatorer : metadata per KPI inkl. Koladas indelning
#                  (operating_area = verksamhetsområde, perspective = perspektiv)
#   $regioner    : id + namn för samtliga regioner
#   $data        : långt format — kpi, region-id, regionnamn, år, kön, värde
#   $hamtad      : tidsstämpel
#
# Användning: source("R/hamta/kolada-hos.R")

library(rKolada)
library(dplyr)
library(purrr)

GRUPP_ID <- "G2KPI138906"

# --- 1. KPI-gruppen och dess medlemmar -------------------------------------
cat("Hämtar KPI-grupp", GRUPP_ID, "...\n")
grupper <- get_kpi_groups()
hos_grupp <- grupper %>% filter(id == GRUPP_ID)
stopifnot(nrow(hos_grupp) > 0)

medlemmar <- hos_grupp %>% kpi_grp_unnest()
kpi_ids <- medlemmar %>% pull(id) %>% unique()
cat("  ", length(kpi_ids), "indikatorer i gruppen\n")

# --- 2. Metadata per indikator (inkl. Koladas indelning) -------------------
cat("Hämtar indikator-metadata...\n")
kpi_meta <- get_kpi(id = kpi_ids) %>%
  select(any_of(c("id", "title", "description", "operating_area",
                  "perspective", "is_divided_by_gender", "municipality_type",
                  "auspice", "publ_period", "publication_date"))) %>%
  arrange(operating_area, perspective, id)

# --- 3. Alla regioner -------------------------------------------------------
cat("Hämtar regioner...\n")
kommuner <- get_municipality()
regioner <- kommuner %>%
  filter(type == "L") %>%        # L = landsting/region i Kolada
  select(id, title) %>%
  rename(region_id = id, region = title)
cat("  ", nrow(regioner), "regioner\n")

# --- 4. Värden: alla KPI:er, alla regioner, alla år ------------------------
cat("Hämtar värden (", length(kpi_ids), "indikatorer)...\n", sep = "")
hamta_kpi <- function(id) {
  tryCatch(
    get_values(kpi = id, municipality = regioner$region_id, simplify = TRUE),
    error = function(e) {
      message("  FEL för ", id, ": ", conditionMessage(e))
      NULL
    }
  )
}
varden <- map(kpi_ids, \(id) { cat("  ", id, "\n"); hamta_kpi(id) }) %>%
  compact() %>%
  bind_rows()

# --- 5. Sätt samman och spara ----------------------------------------------
data_lang <- varden %>%
  rename(any_of(c(region_id = "municipality_id", region = "municipality",
                  ar = "year", kon = "gender", varde = "value"))) %>%
  left_join(kpi_meta %>% select(id, title, operating_area, perspective),
            by = c("kpi" = "id")) %>%
  arrange(operating_area, perspective, kpi, region, ar, kon)

resultat <- list(
  grupp = list(id = GRUPP_ID,
               titel = "Hälso- och sjukvårdsrapporten",
               antal_indikatorer = length(kpi_ids)),
  indikatorer = kpi_meta,
  regioner = regioner,
  data = data_lang,
  hamtad = Sys.time()
)

saveRDS(resultat, "data/kolada-hos.rds")
cat("\nSparat: data/kolada-hos.rds —", nrow(data_lang), "rader\n")
