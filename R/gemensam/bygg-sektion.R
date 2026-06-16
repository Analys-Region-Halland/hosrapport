# bygg-sektion.R — Generisk, KPI-agnostisk byggare av vy/sektion/KPI-strukturen
#
# Flyttad ut ur bearbeta.R för att (a) krympa monoliten och (b) ta bort
# closure-beroenden: all run-specifik indata skickas explicit via `ctx` i
# stället för att läsas från yttre scope. Det gör byggaren återanvändbar och
# testbar, och eliminerar risken att t.ex. avdelningsdata tyst försvinner.
#
# ctx <- list(
#   kpi_meta      = <tibble från register.R>,
#   dept_radata   = <långformat avdelningsdata>,
#   dept_pred     = <list(dag, vecka, manad, kvartal, ar) med avd-prediktioner>,
#   rapport_datum = <Date>,
#   kor_tidpunkt  = <"HH:MM">
# )
#
# Förutsätter att gemensam-funktionerna är sourcade (formatering.R med
# lag_specs/etikett_*, aggregering.R med dagar_for_period/dagar_sammanfattning/
# berakna_referens, analystext.R med analystext_*).

# ── Underavdelningar för en KPI ──
generera_undernivaer <- function(total_ts, km, etikett_fn, vy_id, dept_pred_vy,
                                 ctx, dagar_per = NULL) {
  dept_radata <- ctx$dept_radata
  dept_namn <- unique(dept_radata |> filter(kpi_id == km$id) |> pull(dept))
  if (length(dept_namn) == 0) return(list())
  agg_fn <- if (km$aggregering == "summa") sum else mean
  dec <- if (km$enhet == "procent") 1 else 0

  perioder_i_vy <- total_ts$period

  lapply(dept_namn, function(d) {
    dept_id <- paste0(km$id, "-", tolower(gsub(" ", "", d)))

    pfn <- switch(vy_id,
      dag     = identity,
      vecka   = \(x) floor_date(x, "week", week_start = 1),
      manad   = \(x) floor_date(x, "month"),
      kvartal = \(x) floor_date(x, "quarter"),
      ar      = \(x) floor_date(x, "year")
    )

    dept_agg <- dept_radata |>
      filter(kpi_id == km$id, dept == d) |>
      mutate(period = pfn(datum)) |>
      group_by(period) |>
      summarise(varde = round(agg_fn(varde), dec), .groups = "drop") |>
      filter(period %in% perioder_i_vy) |>
      arrange(period)

    dp <- dept_pred_vy |> filter(kpi_id == dept_id) |> select(-kpi_id)

    ts_dept <- dept_agg |>
      left_join(dp, by = "period") |>
      mutate(
        etikett = etikett_fn(period),
        period  = format(period, "%Y-%m-%d"),
        across(starts_with("yhat"), ~ round(.x, dec))
      ) |>
      select(period, etikett, varde, yhat,
             yhat_lower_80, yhat_upper_80,
             yhat_lower, yhat_upper, signal) |>
      as.data.frame()

    senaste_val <- tail(dept_agg$varde, 1)
    prev_val <- if (nrow(dept_agg) >= 2) dept_agg$varde[nrow(dept_agg) - 1] else senaste_val
    forandr <- round(senaste_val - prev_val, dec)

    senaste_signal <- tail(ts_dept$signal, 1)
    if (is.na(senaste_signal) || length(senaste_signal) == 0) senaste_signal <- "gron"

    dept_output <- list(
      id         = dept_id,
      namn       = d,
      senaste    = senaste_val,
      forandring = forandr,
      status     = senaste_signal,
      tidsserie  = ts_dept
    )

    # Dagdata för avdelningen
    if (!is.null(dagar_per) && vy_id != "dag") {
      period_col <- switch(vy_id,
        vecka   = "vecka_start",
        manad   = "manad_start",
        kvartal = "kvartal_start",
        ar      = "ar_start"
      )

      dept_dag <- dept_radata |>
        filter(kpi_id == km$id, dept == d) |>
        mutate(.period_col = floor_date(datum, switch(vy_id,
          vecka = "week", manad = "month", kvartal = "quarter", ar = "year"),
          week_start = if (vy_id == "vecka") 1 else 7)) |>
        filter(.period_col == dagar_per) |>
        arrange(datum)

      if (nrow(dept_dag) > 0) {
        dept_dag_pred <- ctx$dept_pred$dag |>
          filter(kpi_id == dept_id) |> select(-kpi_id)

        dept_dagar <- dept_dag |>
          left_join(dept_dag_pred, by = c("datum" = "period")) |>
          transmute(
            period        = format(datum, "%Y-%m-%d"),
            etikett       = etikett_dag(datum),
            varde         = round(varde, dec),
            yhat          = round(yhat, dec),
            yhat_lower_80 = round(yhat_lower_80, dec),
            yhat_upper_80 = round(yhat_upper_80, dec),
            yhat_lower    = round(yhat_lower, dec),
            yhat_upper    = round(yhat_upper, dec),
            signal
          ) |>
          as.data.frame()

        if (nrow(dept_dagar) > 0) {
          dept_output$dagar <- dept_dagar
        }
      }
    }

    dept_output
  })
}

# ── Bygg en hel vy (sektioner → KPI:er) ──
bygg_vy <- function(agg_df, vy_id, titel, period_str, jmf_etikett,
                    etikett_fn, n_perioder = 999, pred_vy = NULL,
                    dag_full_df = NULL, pred_dag_df = NULL,
                    dagar_period = NULL, nasta_datum = NULL, ctx = NULL) {

  kpi_meta      <- ctx$kpi_meta
  rapport_datum <- ctx$rapport_datum
  kor_tidpunkt  <- ctx$kor_tidpunkt

  ts_df <- agg_df |>
    group_by(kpi_id) |>
    slice_tail(n = n_perioder) |>
    ungroup()

  senaste_df <- agg_df |>
    group_by(kpi_id) |>
    filter(period == max(period)) |>
    ungroup()

  aktuell_per <- max(agg_df$period)

  # Bygg sektioner från tema-konfigurationer
  sektioner_def <- kpi_meta |> distinct(sektion_id, sektion_namn)

  sektioner <- lapply(seq_len(nrow(sektioner_def)), function(i) {
    sid   <- sektioner_def$sektion_id[i]
    snamn <- sektioner_def$sektion_namn[i]
    sek_kpier <- kpi_meta |> filter(sektion_id == sid)

    kpier <- lapply(seq_len(nrow(sek_kpier)), function(j) {
      km <- sek_kpier[j, ]
      s  <- senaste_df |> filter(kpi_id == km$id)
      ts <- ts_df |> filter(kpi_id == km$id) |> arrange(period)

      dec <- if (km$enhet == "procent") 1 else 0

      tidsserie <- ts |>
        left_join(
          pred_vy |> filter(kpi_id == km$id) |> select(-kpi_id),
          by = "period"
        ) |>
        mutate(
          etikett  = etikett_fn(period),
          period   = format(period, "%Y-%m-%d"),
          across(starts_with("yhat"), ~ round(.x, dec))
        ) |>
        select(period, etikett, varde, yhat,
               yhat_lower_80, yhat_upper_80,
               yhat_lower, yhat_upper, signal) |>
        as.data.frame()

      # Multipla förändringar
      kpi_alla <- agg_df |> filter(kpi_id == km$id) |> arrange(period)
      senaste_idx <- which(kpi_alla$period == s$period[1])
      lags <- lag_specs[[vy_id]]
      forandringar <- lapply(lags, function(ls) {
        ref_idx <- senaste_idx - ls$n
        if (ref_idx < 1) return(NULL)
        diff <- s$varde[1] - kpi_alla$varde[ref_idx]
        diff <- if (km$enhet == "procent") round(diff, 1) else round(diff, 0)
        list(etikett = ls$e, varde = diff)
      })
      forandringar <- Filter(Negate(is.null), forandringar)

      # Dagsnivådata
      dp <- if (!is.null(dagar_period)) dagar_period else aktuell_per
      kpi_dagar <- NULL
      kpi_dagar_sammanf <- NULL
      if (!is.null(dag_full_df) && vy_id != "dag") {
        kpi_dagar <- dagar_for_period(
          dag_full_df, pred_dag_df, km$id, vy_id, dp, km$enhet)
        kpi_dagar_sammanf <- dagar_sammanfattning(kpi_dagar)
      }

      # Referens
      kpi_referens <- berakna_referens(
        agg_df, km$id, dp, vy_id, etikett_fn, km$enhet)

      # Underavdelningar
      dept_pred_niva <- switch(vy_id,
        dag = ctx$dept_pred$dag, vecka = ctx$dept_pred$vecka,
        manad = ctx$dept_pred$manad, kvartal = ctx$dept_pred$kvartal,
        ar = ctx$dept_pred$ar)
      under <- generera_undernivaer(ts, km, etikett_fn, vy_id, dept_pred_niva, ctx, dp)

      kpi_output <- list(
        id                  = km$id,
        namn                = km$namn,
        enhet               = km$enhet,
        inverterad          = km$inverterad,
        senaste             = s$varde[1],
        forandring          = ifelse(is.na(s$forandring[1]), 0, s$forandring[1]),
        forandringar        = forandringar,
        status              = s$status[1],
        analystext          = analystext_kpi(km$id, s[1, ], vy_id,
                                            kpi_dagar_sammanf, kpi_referens),
        analys_rubrik       = analys_rubrik_status(s$status[1]),
        tidsserie           = tidsserie,
        undernivaer         = under
      )
      if (!is.null(kpi_dagar) && nrow(kpi_dagar) > 0) {
        kpi_output$dagar <- kpi_dagar
      }
      if (!is.null(kpi_dagar_sammanf)) {
        kpi_output$dagar_sammanfattning <- kpi_dagar_sammanf
      }
      if (!is.null(kpi_referens)) {
        kpi_output$referens <- kpi_referens
      }
      kpi_output
    })

    list(
      id            = sid,
      namn          = snamn,
      analys        = analystext_sektion(sid, senaste_df, vy_id),
      analys_rubrik = analys_rubrik_sektion(sid, senaste_df),
      kpier         = kpier
    )
  })

  vy_output <- list(
    vy              = vy_id,
    etikett         = titel,
    period          = period_str,
    datum           = format(rapport_datum, "%Y-%m-%d"),
    uppdaterad      = kor_tidpunkt,
    jmf_etikett     = jmf_etikett,
    analys          = analystext_global(senaste_df, period_str),
    analys_rubrik   = "Sammanfattning",
    sektioner       = sektioner
  )
  if (!is.null(dagar_period) && vy_id != "dag") {
    dp_slut <- switch(vy_id,
      vecka   = dagar_period + 6,
      manad   = ceiling_date(dagar_period, "month") - 1,
      kvartal = ceiling_date(dagar_period, "quarter") - 1,
      ar      = ceiling_date(dagar_period, "year") - 1
    )
    vy_output$dagar_period <- list(
      start   = format(dagar_period, "%Y-%m-%d"),
      slut    = format(dp_slut, "%Y-%m-%d"),
      etikett = etikett_fn(dagar_period)
    )
  }
  if (!is.null(nasta_datum) && vy_id != "dag") {
    vy_output$nasta_period <- list(
      datum   = format(nasta_datum, "%Y-%m-%d"),
      etikett = paste0(etikett_dag(nasta_datum), " ", year(nasta_datum))
    )
  }
  vy_output
}
