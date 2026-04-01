# kap01-hamta.R — Generera syntetisk daglig demodata
# I produktion ersätts detta med hämtning från API/databas
#
# Förbättringar:
#   - Autokorrelation (AR1) ger realistisk daglig samvariation
#   - Helgdagseffekter (röda dagar, klämdagar → lägre aktivitet)
#   - Injicerade anomalier för att validera signalsystemet
#   - Se SIGNAL-METODIK.md för parameterdokumentation
source("paket.R")
source("R/gemensam/helgdagar.R")

set.seed(2026)

# Datumintervall: 5+ år för att stödja alla vyer
start_datum <- as.Date("2021-01-01")
slut_datum  <- as.Date("2026-03-31")
datum_seq   <- seq(start_datum, slut_datum, by = "day")
n_dagar     <- length(datum_seq)

# Bygg kalender för helgdagseffekter
kalender <- bygg_kalender(start_datum, slut_datum)

# ══════════════════════════════════════════════
#  GENERATORFUNKTION
# ══════════════════════════════════════════════

# Säsongsfaktor: topp i januari (vintervård), botten i juli
sasong_faktor <- function(datum) {
  cos((yday(datum) - 15) / 365.25 * 2 * pi)
}

# Veckodagseffekt: differentierad per dag
veckodag_faktor <- function(datum) {
  vd <- wday(datum, week_start = 1)
  # mån–fre ≈ 0, lördag ≈ -0.12, söndag ≈ -0.18
  case_when(
    vd == 1 ~ 0.02,   # måndag: lätt förhöjd
    vd == 5 ~ -0.03,  # fredag: lätt sänkt
    vd == 6 ~ -0.12,  # lördag
    vd == 7 ~ -0.18,  # söndag
    TRUE ~ 0
  )
}

# Helgdagseffekt: reducerad aktivitet på röda dagar och klämdagar
helgdag_faktor <- function(datum, kalender_df, helg_amp) {
  kal <- kalender_df |> filter(ds %in% datum) |> arrange(ds)
  effekt <- rep(0, length(datum))
  for (i in seq_along(datum)) {
    rad <- kal |> filter(ds == datum[i])
    if (nrow(rad) == 0) next
    if (rad$rod_dag[1] || rad$afton[1]) {
      effekt[i] <- -helg_amp  # Full helgdagseffekt
    } else if (rad$klamdag[1]) {
      effekt[i] <- -helg_amp * 0.5  # Halv effekt klämdagar
    } else if (rad$halvdag[1]) {
      effekt[i] <- -helg_amp * 0.3  # Svagare halvdagseffekt
    }
  }
  effekt
}

# Generera tidsserie med trend, säsong, veckodagseffekt, helgdagseffekt,
# autokorrelation och brus
generera_serie <- function(datum, bas, trend_ar, sasong_amp, vd_amp, brus_sd,
                            helg_amp = 0, ar1 = 0,
                            min_val = 0, max_val = Inf, decimaler = 0,
                            kalender_df = NULL) {
  n <- length(datum)
  ar_progress <- as.numeric(datum - datum[1]) / 365.25

  # Deterministiska komponenter
  signal <- bas + trend_ar * ar_progress +
    sasong_amp * sasong_faktor(datum) +
    vd_amp * veckodag_faktor(datum)

  # Helgdagseffekt
  if (helg_amp > 0 && !is.null(kalender_df)) {
    signal <- signal + helgdag_faktor(datum, kalender_df, helg_amp)
  }

  # Autokorrelerat brus (AR1)
  brus <- numeric(n)
  brus[1] <- rnorm(1, 0, brus_sd)
  for (i in 2:n) {
    brus[i] <- ar1 * brus[i - 1] + rnorm(1, 0, brus_sd * sqrt(1 - ar1^2))
  }

  v <- signal + brus
  v <- pmax(v, min_val)
  if (is.finite(max_val)) v <- pmin(v, max_val)
  round(v, decimaler)
}

# ══════════════════════════════════════════════
#  TOTAL-KPI:er
# ══════════════════════════════════════════════

radata <- tibble(datum = datum_seq) |>
  mutate(
    belaggning = generera_serie(datum, 86, 1.8, 4.5, 2.5, 1.8,
                                 helg_amp = 5, ar1 = 0.35,
                                 min_val = 60, max_val = 105, decimaler = 1,
                                 kalender_df = kalender),
    akutbesok = generera_serie(datum, 840, 12, 45, 70, 28,
                                helg_amp = 120, ar1 = 0.30,
                                min_val = 500,
                                kalender_df = kalender),
    vantetid = generera_serie(datum, 140, 5, 14, 10, 10,
                               helg_amp = 15, ar1 = 0.25,
                               min_val = 60,
                               kalender_df = kalender),
    ambulans = generera_serie(datum, 50, 1.2, 6, 4, 4,
                               helg_amp = 8, ar1 = 0.20,
                               min_val = 15,
                               kalender_df = kalender),
    inlaggningar = generera_serie(datum, 24, 0.5, 3.5, 5, 2.5,
                                   helg_amp = 8, ar1 = 0.25,
                                   min_val = 5,
                                   kalender_df = kalender),
    utskrivningsklara = generera_serie(datum, 16, 1.2, 3.5, 1.5, 2.0,
                                        helg_amp = 3, ar1 = 0.30,
                                        min_val = 2,
                                        kalender_df = kalender)
  )

# ══════════════════════════════════════════════
#  INJICERADE ANOMALIER
# ══════════════════════════════════════════════
# Kända avvikelser för att validera signalsystemet.
# Dokumenteras i SIGNAL-METODIK.md.

# Anomali 1: Vintervåg december 2025 (akutbesök + beläggning)
# Vecka 50–52, 2025: +15–20 % över förväntat
vintervag <- radata$datum >= as.Date("2025-12-08") & radata$datum <= as.Date("2025-12-28")
radata$akutbesok[vintervag] <- round(radata$akutbesok[vintervag] * 1.18)
radata$belaggning[vintervag] <- pmin(
  radata$belaggning[vintervag] + 8, 105
)

# Anomali 2: Ambulanshändelse februari 2026
# 16–20 feb: +40 % ambulansuppdrag
ambulans_anomali <- radata$datum >= as.Date("2026-02-16") &
                    radata$datum <= as.Date("2026-02-20")
radata$ambulans[ambulans_anomali] <- round(radata$ambulans[ambulans_anomali] * 1.40)

# Anomali 3: Gradvis ökande väntetid mars 2026
# 1–14 mars: +3 minuter per dag (kumulativt)
vantetid_anomali <- radata$datum >= as.Date("2026-03-01") &
                    radata$datum <= as.Date("2026-03-14")
dagar_i_anomali <- as.numeric(radata$datum[vantetid_anomali] - as.Date("2026-02-28"))
radata$vantetid[vantetid_anomali] <- radata$vantetid[vantetid_anomali] +
  round(dagar_i_anomali * 3)

saveRDS(radata, "data/radata-hos.rds")

# ══════════════════════════════════════════════
#  AVDELNINGSDATA (daglig, långformat)
# ══════════════════════════════════════════════
# Varje avdelning har egen daglig tidsserie.
# Summa-KPI:er: proportionell del av totalen + eget brus
# Medel-KPI:er: offset från totalen + eget brus

dept_config <- list(
  belaggning        = list(dept = c("Halmstad", "Varberg", "Kungsbacka"),
                           typ = "medel",  offsets = c(2, -1.5, -3)),
  akutbesok         = list(dept = c("Halmstad", "Varberg", "Kungsbacka"),
                           typ = "summa",  props = c(0.47, 0.30, 0.23)),
  vantetid          = list(dept = c("Halmstad", "Varberg", "Kungsbacka"),
                           typ = "medel",  offsets = c(5, -3, -8)),
  ambulans          = list(dept = c("Nord", "Syd"),
                           typ = "summa",  props = c(0.55, 0.45)),
  inlaggningar      = list(dept = c("Kirurgi", "Medicin", "Ortopedi"),
                           typ = "summa",  props = c(0.40, 0.38, 0.22)),
  utskrivningsklara = list(dept = c("Halmstad", "Varberg", "Kungsbacka"),
                           typ = "medel",  offsets = c(1.5, -1, -2.5))
)

dept_radata <- bind_rows(lapply(names(dept_config), function(kpi_id) {
  cfg <- dept_config[[kpi_id]]
  total <- radata[[kpi_id]]
  dec <- if (kpi_id == "belaggning") 1 else 0

  bind_rows(lapply(seq_along(cfg$dept), function(di) {
    set.seed(2026 + sum(utf8ToInt(paste0(kpi_id, cfg$dept[di]))))
    n <- length(total)

    if (cfg$typ == "summa") {
      v <- round(total * cfg$props[di] * (1 + rnorm(n, 0, 0.03)), dec)
    } else {
      brus <- if (kpi_id == "belaggning") rnorm(n, 0, 1.2)
              else if (kpi_id == "vantetid") rnorm(n, 0, 6)
              else rnorm(n, 0, 1.5)
      v <- round(total + cfg$offsets[di] + brus, dec)
    }
    v <- pmax(v, 0)

    tibble(datum = datum_seq, kpi_id = kpi_id, dept = cfg$dept[di], varde = v)
  }))
}))

saveRDS(dept_radata, "data/radata-dept.rds")

cat("Rådata genererad:", nrow(radata), "dagar,", ncol(radata) - 1, "KPI:er\n")
cat("Avdelningsdata:", nrow(dept_radata), "rader,",
    length(unique(dept_radata$dept)), "avdelningar\n")
cat("Injicerade anomalier: 3 st (vintervåg, ambulanshändelse, väntetidsökning)\n")
