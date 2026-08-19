# register.R — Samlar alla tema-konfigurationer
# En enda källa för kpi_meta, dept_config och sektioner.
#
# Ny sektion? Lägg till tre rader:
#   1. source("R/teman/{namn}/config.R")
#   2. Lägg till i alla_teman
#   3. Klar.
#
# URVALSPRINCIP (2026-08-19): rapporten är SKR:s Hälso- och sjukvårdsrapport,
# uppdelad så att vart och ett av dess sex kapitel är en egen rapport. Kolada
# bär därmed hela den öppna delen. Akutflödet är kvar som ENDA exempel på ett
# internt område, så att formatet för verksamhetsnära dygnsdata finns att se
# och bygga vidare på, och ligger sist.
#
# Tidigare områden (befolkning, folkhälsa, ekonomi) och sedan länge vilande
# teman (primärvård, slutenvård, personal, patientenkät) ligger i R/arkiv/.
# Se R/arkiv/README.md för hur ett tema återinförs.

source("R/teman/akutflode/config.R")
source("R/teman/kolada/config.R")

# Teman med daglig data (conformal prediction).
# Ordningen här styr visningsordningen i rapporten.
dagliga_teman <- list(akutflode)

# Alla teman (inklusive specialfall som Kolada-årsindikatorerna)
alla_teman <- c(dagliga_teman, list(kolada_tema))

# ── kpi_meta: en rad per KPI med sektion-info ──
kpi_meta <- bind_rows(lapply(dagliga_teman, function(tema) {
  tema$kpier |> mutate(sektion_id = tema$id, sektion_namn = tema$namn)
}))

# ── dept_config: avdelningsnamn per KPI ──
dept_config <- unlist(
  lapply(dagliga_teman, function(tema) tema$avdelningar),
  recursive = FALSE
)
