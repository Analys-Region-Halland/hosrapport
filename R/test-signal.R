# test-signal.R — Fristående test av signalsystemet (tre-nivå)
#
# Kör detta skript separat för att granska signalresultat
# INNAN integration i huvudpipelinen.
#
# Användning:
#   source("R/test-signal.R")

source("paket.R")
source("R/gemensam/helgdagar.R")
source("R/gemensam/signal-modell.R")

# ══════════════════════════════════════════════════════════
#  KONFIGURATION
# ══════════════════════════════════════════════════════════

split_datum  <- as.Date("2025-01-01")   # Träning före, test efter

# ══════════════════════════════════════════════════════════
#  KPI-METADATA — Inklusive GLM-familj per KPI
# ══════════════════════════════════════════════════════════

kpi_meta <- tibble(
  id          = c("belaggning", "akutbesok", "vantetid",
                   "ambulans", "inlaggningar", "utskrivningsklara"),
  namn        = c("Beläggningsgrad", "Besök akutmottagning",
                   "Medianväntetid akut", "Ambulansuppdrag",
                   "Inläggningar", "Utskrivningsklara patienter"),
  aggregering = c("medel", "summa", "medel", "summa", "summa", "medel"),
  familj      = c("gaussian", "nb", "gamma", "nb", "nb", "nb")
)

# ══════════════════════════════════════════════════════════
#  LADDA DATA OCH BYGG KALENDER
# ══════════════════════════════════════════════════════════

cat("Laddar rådata...\n")
radata <- readRDS("data/radata-hos.rds")
cat(sprintf("  %d dagar, %s — %s\n", nrow(radata), min(radata$datum), max(radata$datum)))

cat("Bygger svensk kalender...\n")
kalender <- bygg_kalender(min(radata$datum), max(radata$datum))
cat(sprintf("  %d dagar | %d röda dagar | %d klämdagar | %d skollovsdagar\n\n",
            nrow(kalender),
            sum(kalender$rod_dag),
            sum(kalender$klamdag),
            sum(kalender$skollov)))

# ══════════════════════════════════════════════════════════
#  KÖR SIGNAL PER KPI
# ══════════════════════════════════════════════════════════

resultat <- list()

for (i in seq_len(nrow(kpi_meta))) {
  kpi_id   <- kpi_meta$id[i]
  kpi_namn <- kpi_meta$namn[i]
  agg_typ  <- kpi_meta$aggregering[i]
  familj   <- kpi_meta$familj[i]

  cat(sprintf("── %s (%s, %s) ──\n", kpi_namn, agg_typ, familj))

  df <- radata |>
    transmute(ds = datum, y = .data[[kpi_id]])

  modell_fn_kpi <- \(train, kal) modell_glm(train, kal, familj = familj)

  res <- kor_signal(
    dagdata     = df,
    kalender    = kalender,
    modell_fn   = modell_fn_kpi,
    agg_typ     = agg_typ,
    split_datum = split_datum,
    kpi_namn    = kpi_namn
  )

  resultat[[kpi_id]] <- res

  d <- res$diagnostik
  cat(sprintf("  MAE: %.1f%% | RMSE: %.1f | Bias: %+.1f%%\n",
              d$mae_pct, d$rmse, d$medel_avv))
  cat(sprintf("  Täckning: 80%% = %.0f%% | 95%% = %.0f%%\n",
              d$tackning_80 * 100, d$tackning_95 * 100))
  cat(sprintf("  Bandbredd: 80%% rel = %.1f%% | 95%% rel = %.1f%%\n",
              d$rel_bredd_80 * 100, d$rel_bredd_95 * 100))
  cat(sprintf("  Dag: %s\n", signal_tabell(res$dag$signal)))
  cat(sprintf("  Vecka: %s\n", signal_tabell(res$vecka$signal)))
  cat(sprintf("  Månad: %s\n", signal_tabell(res$manad$signal)))
  cat("\n")
}

# ══════════════════════════════════════════════════════════
#  SAMMANFATTNING
# ══════════════════════════════════════════════════════════

skriv_sammanfattning(resultat)

# ══════════════════════════════════════════════════════════
#  DETALJEXEMPEL
# ══════════════════════════════════════════════════════════

cat("── DETALJEXEMPEL: Beläggningsgrad, senaste 14 dagarna ──\n\n")

ex <- resultat$belaggning$dag |>
  slice_tail(n = 14) |>
  mutate(
    ds = format(ds, "%Y-%m-%d"),
    across(c(y, yhat), ~ round(.x, 1)),
    intervall_80 = sprintf("[%.1f, %.1f]", round(yhat_lower_80, 1), round(yhat_upper_80, 1)),
    intervall_95 = sprintf("[%.1f, %.1f]", round(yhat_lower, 1), round(yhat_upper, 1)),
    avvikelse_pct = round(avvikelse_pct, 1)
  ) |>
  select(ds, faktiskt = y, forvantad = yhat, int_80 = intervall_80, int_95 = intervall_95, signal)

print(as.data.frame(ex), row.names = FALSE)

# ══════════════════════════════════════════════════════════
#  SPARA RESULTAT
# ══════════════════════════════════════════════════════════

saveRDS(resultat, "data/signal-test-resultat.rds")
cat("\nResultat sparat: data/signal-test-resultat.rds\n")
