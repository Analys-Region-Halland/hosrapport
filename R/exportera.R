# exportera.R — Exportera bearbetad data till JSON, DELAT per (vy, sektion).
#
# Frontend lazy-laddar bara den aktiva vyns sektioner. Vi skriver därför:
#   app/public/data/index.json          — manifest: vy-metadata + sektionslista
#   app/public/data/{vy}-{sektion}.json  — en sektions fulla innehåll
# (app/public/ serveras av Vite i både dev och build.)
source("paket.R")
source("R/gemensam/kontrakt.R")

resultat <- readRDS("data/bearbetad-hos.rds")

# Hård grind: avbryt med exakt sökväg om strukturen bryter kontraktet
# (frontend i app/src/types.ts). Förhindrar tyst trasig JSON.
validera_kontrakt(resultat)

out_dir <- "app/public/data"
dir.create(out_dir, recursive = TRUE, showWarnings = FALSE)

# Rensa gamla genererade filer så inget inaktuellt blir kvar
gamla <- list.files(out_dir, pattern = "\\.json$", full.names = TRUE)
if (length(gamla) > 0) invisible(file.remove(gamla))

skriv_json <- function(obj, fil) {
  write(
    toJSON(obj, auto_unbox = TRUE, pretty = FALSE, na = "null", force = TRUE),
    file.path(out_dir, fil)
  )
}

vyer <- c("dag", "vecka", "manad", "kvartal", "ar")
manifest <- list()
n_filer <- 0L

for (vyn in vyer) {
  v <- resultat[[vyn]]
  # Vy-metadata = allt utom sektioner; sektionslista (id+namn) för manifestet
  meta <- v[setdiff(names(v), "sektioner")]
  meta$sektioner <- lapply(v$sektioner, function(s) list(id = s$id, namn = s$namn))
  manifest[[vyn]] <- meta

  # En fil per sektion
  for (s in v$sektioner) {
    skriv_json(s, paste0(vyn, "-", s$id, ".json"))
    n_filer <- n_filer + 1L
  }
}

skriv_json(manifest, "index.json")

cat(sprintf("JSON exporterad till %s: index.json + %d sektionsfiler\n", out_dir, n_filer))
total_kb <- round(sum(file.info(list.files(out_dir, pattern = "\\.json$", full.names = TRUE))$size) / 1024, 1)
cat("Total storlek:", total_kb, "KB\n")
