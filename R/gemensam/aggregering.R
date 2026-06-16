# aggregering.R — Aggregering, periodfiltrering och referensberäkning
# Kräver: lubridate, dplyr, formatering.R (etikett_dag)

# ── Aggregera daglig data till valfri period ──
aggregera_period <- function(df, period_col) {
  df |>
    group_by(kpi_id, aggregering, enhet, period = .data[[period_col]]) |>
    summarise(
      n_dagar = n(),
      varde = if (first(aggregering) == "medel") mean(varde) else sum(varde),
      .groups = "drop"
    ) |>
    mutate(varde = if_else(enhet == "procent", round(varde, 1), round(varde, 0)))
}

# ── Filtrera till bara kompletta perioder ──
filtrera_kompletta_perioder <- function(rapport_datum) {
  komplett_vecka   <- wday(rapport_datum, week_start = 1) == 7
  komplett_manad   <- rapport_datum == (ceiling_date(rapport_datum, "month") - 1)
  komplett_kvartal <- rapport_datum == (ceiling_date(rapport_datum, "quarter") - 1)
  komplett_ar      <- rapport_datum == (ceiling_date(rapport_datum, "year") - 1)

  max_vecka <- floor_date(rapport_datum, "week", week_start = 1)
  if (!komplett_vecka) max_vecka <- max_vecka - 7

  max_manad <- floor_date(rapport_datum, "month")
  if (!komplett_manad) max_manad <- max_manad %m-% months(1)

  max_kvartal <- floor_date(rapport_datum, "quarter")
  if (!komplett_kvartal) max_kvartal <- max_kvartal %m-% months(3)

  max_ar <- floor_date(rapport_datum, "year")
  if (!komplett_ar) max_ar <- max_ar - years(1)

  list(
    max     = list(vecka = max_vecka, manad = max_manad,
                   kvartal = max_kvartal, ar = max_ar),
    nasta   = list(
      vecka   = max_vecka + 13,
      manad   = ceiling_date(max_manad %m+% months(1), "month") - 1,
      kvartal = ceiling_date(max_kvartal %m+% months(3), "quarter") - 1,
      ar      = ceiling_date(max_ar + years(1), "year") - 1
    )
  )
}

# ── Lägg till förändring mot föregående period ──
lagg_till_forandring <- function(df) {
  df |>
    arrange(kpi_id, period) |>
    group_by(kpi_id) |>
    mutate(forandring = varde - lag(varde)) |>
    ungroup() |>
    mutate(forandring = case_when(
      is.na(forandring) ~ NA_real_,
      enhet == "procent" ~ round(forandring, 1),
      TRUE ~ round(forandring, 0)
    ))
}

# ── Lägg till signal från conformal-modellen ──
lagg_till_signal <- function(df, pred_niva) {
  df |>
    left_join(pred_niva |> select(kpi_id, period, signal),
              by = c("kpi_id", "period")) |>
    mutate(status = coalesce(signal, "gron")) |>
    select(-signal)
}

# ── Daglig data med signal för en KPI inom en specifik period ──
dagar_for_period <- function(dag_full_df, pred_dag_df, kid, vy_id,
                             aktuell_per, enhet) {
  if (vy_id == "dag") return(NULL)

  period_col <- switch(vy_id,
    vecka   = "vecka_start",
    manad   = "manad_start",
    kvartal = "kvartal_start",
    ar      = "ar_start"
  )

  dec <- if (enhet == "procent") 1 else 0

  dagar_df <- dag_full_df |>
    filter(kpi_id == kid, .data[[period_col]] == aktuell_per) |>
    arrange(datum) |>
    left_join(
      pred_dag_df |> filter(kpi_id == kid) |> select(-kpi_id),
      by = c("datum" = "period")
    ) |>
    transmute(
      period  = format(datum, "%Y-%m-%d"),
      etikett = etikett_dag(datum),
      varde,
      yhat          = round(yhat, dec),
      yhat_lower_80 = round(yhat_lower_80, dec),
      yhat_upper_80 = round(yhat_upper_80, dec),
      yhat_lower    = round(yhat_lower, dec),
      yhat_upper    = round(yhat_upper, dec),
      signal
    ) |>
    as.data.frame()

  dagar_df
}

# ── Sammanfattning av dagssignaler inom en period ──
dagar_sammanfattning <- function(dagar_df) {
  if (is.null(dagar_df) || nrow(dagar_df) == 0) return(NULL)
  list(
    n_dagar     = nrow(dagar_df),
    n_i_fas     = sum(dagar_df$signal == "gron", na.rm = TRUE),
    n_bevaka    = sum(dagar_df$signal == "gul", na.rm = TRUE),
    n_avvikelse = sum(dagar_df$signal == "rod", na.rm = TRUE)
  )
}

# ── Referens: samma period föregående år ──
berakna_referens <- function(agg_df, kid, aktuell_per, vy_id, etikett_fn, enhet) {
  if (vy_id == "dag") return(NULL)

  ref_period <- switch(vy_id,
    vecka = {
      target_w <- isoweek(aktuell_per)
      target_y <- isoyear(aktuell_per) - 1
      ref_cand <- agg_df |>
        filter(kpi_id == kid,
               isoyear(period) == target_y,
               isoweek(period) == target_w)
      if (nrow(ref_cand) > 0) ref_cand$period[1] else NA_Date_
    },
    manad   = aktuell_per - years(1),
    kvartal = aktuell_per - years(1),
    ar      = aktuell_per - years(1)
  )

  if (is.na(ref_period)) return(NULL)

  ref_data <- agg_df |> filter(kpi_id == kid, period == ref_period)
  aktuell_data <- agg_df |> filter(kpi_id == kid, period == aktuell_per)
  if (nrow(ref_data) == 0 || nrow(aktuell_data) == 0) return(NULL)

  dec <- if (enhet == "procent") 1 else 0
  forandring <- round(aktuell_data$varde[1] - ref_data$varde[1], dec)

  list(
    period     = format(ref_period, "%Y-%m-%d"),
    etikett    = etikett_fn(ref_period),
    varde      = ref_data$varde[1],
    forandring = forandring
  )
}
