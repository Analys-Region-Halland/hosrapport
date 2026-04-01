# kap04-exportera.R — Exportera bearbetad data till JSON
source("paket.R")

resultat <- readRDS("data/bearbetad-hos.rds")

json_str <- toJSON(resultat, auto_unbox = TRUE, pretty = FALSE,
                   na = "null", force = TRUE)

write(json_str, "data/hos-data.json")

cat("JSON exporterad: data/hos-data.json\n")
cat("Storlek:", round(file.size("data/hos-data.json") / 1024, 1), "KB\n")
