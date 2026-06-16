# pipeline.R — Kör hela datapipelinen i ordning
#
# Användning: source("R/pipeline.R")
#
# Steg:
#   1. Generera/hämta data
#   2. Bearbeta (aggregera, signaler, JSON-struktur)
#   3. Exportera till JSON

cat("=== HoS-rapport: datapipeline ===\n\n")

cat("Steg 1: Generera demodata...\n")
source("R/hamta/demo-data.R")

cat("\nSteg 2: Bearbeta...\n")
source("R/bearbeta.R")

cat("\nSteg 3: Exportera JSON...\n")
source("R/exportera.R")

cat("\n=== Pipeline klar ===\n")
