# signal-modell.R — Tre-nivå signalsystem med villkorlig conformal prediction
#
# Arkitektur:
#   1. GLM tränas på historisk daglig data (proper training)
#   2. Conformal prediction kalibreras på hållna data (kalibrering)
#   3. Två intervall beräknas: 80 % och 95 %
#   4. Signal: grön (inom 80 %), gul (mellan 80–95 %), röd (utanför 95 %)
#   5. Villkorlig kalibrering: separata kvantiler för vardagar vs specialdagar
#   6. Dagssignaler aggregeras till vecka/månad/kvartal/år med egna band
#
# Se SIGNAL-METODIK.md för fullständig dokumentation.

# ══════════════════════════════════════════════════════════
#  DELAD FEATURE-BERÄKNING
# ══════════════════════════════════════════════════════════

forbered_features <- function(df, kalender_df, t0 = NULL) {
  if (is.null(t0)) t0 <- min(df$ds)

  df |>
    left_join(
      kalender_df |> select(ds, veckodag, rod_dag, afton, halvdag, klamdag, skollov),
      by = "ds"
    ) |>
    mutate(
      t            = as.numeric(ds - t0),
      veckodag_f   = factor(coalesce(veckodag, wday(ds, week_start = 1)), levels = 1:7),
      helgdag_flag = coalesce(rod_dag | afton, FALSE),
      halvdag_flag = coalesce(halvdag, FALSE),
      klamdag_flag = coalesce(klamdag, FALSE),
      skollov_flag = coalesce(skollov, FALSE),
      sin_ar       = sin(2 * pi * yday(ds) / 365.25),
      cos_ar       = cos(2 * pi * yday(ds) / 365.25),
      sin_ar2      = sin(4 * pi * yday(ds) / 365.25),
      cos_ar2      = cos(4 * pi * yday(ds) / 365.25),
      # Specialdag = helg, röd dag, afton, klämdag
      specialdag   = coalesce(
        as.integer(veckodag) >= 6 | rod_dag | afton | klamdag,
        wday(ds, week_start = 1) >= 6
      )
    )
}

modell_formel <- y ~ t + sin_ar + cos_ar + sin_ar2 + cos_ar2 +
  veckodag_f + helgdag_flag + halvdag_flag + klamdag_flag + skollov_flag

# ══════════════════════════════════════════════════════════
#  CONFORMAL PREDICTION — Hjälpfunktioner
# ══════════════════════════════════════════════════════════

conformal_kvantil <- function(scores, alpha) {
  # Beräknar conformal-kvantilen med finit-sample-korrigering
  # Garanterar >= (1 - alpha) täckning
  n <- length(scores)
  if (n == 0) return(Inf)
  level <- ceiling((1 - alpha) * (n + 1)) / n
  if (level > 1) return(max(scores) * 1.1)
  quantile(scores, probs = level, names = FALSE)
}

predict_sigma <- function(fit, mu) {
  # Beräknar predikterad standardavvikelse beroende på GLM-familj
  if (inherits(fit, "negbin")) {
    sqrt(pmax(mu + mu^2 / fit$theta, 0.01))
  } else if (family(fit)$family == "Gamma") {
    phi <- summary(fit)$dispersion
    pmax(mu, 0.01) * sqrt(phi)
  } else {
    rep(sqrt(summary(fit)$dispersion), length(mu))
  }
}

# ══════════════════════════════════════════════════════════
#  VILLKORLIG KALIBRERING
# ══════════════════════════════════════════════════════════
#
# Beräknar separata conformal-kvantiler för vardagar och specialdagar.
# Ger smalare band på vardagar (lägre varians) och bredare på helger/
# helgdagar (högre varians). Faller tillbaka på gemensam kvantil om
# en kategori har för få observationer.

villkorlig_kalibrering <- function(cal_scores, cal_specialdag, min_n = 30) {
  # Dela scores i två grupper
  vardag_idx  <- !cal_specialdag
  special_idx <- cal_specialdag

  n_vardag  <- sum(vardag_idx)
  n_special <- sum(special_idx)

  # Gemensam kvantil (fallback)
  q80_all <- conformal_kvantil(cal_scores, 0.20)
  q95_all <- conformal_kvantil(cal_scores, 0.05)

  if (n_vardag >= min_n && n_special >= min_n) {
    # Villkorlig kalibrering
    q80_vardag  <- conformal_kvantil(cal_scores[vardag_idx], 0.20)
    q95_vardag  <- conformal_kvantil(cal_scores[vardag_idx], 0.05)
    q80_special <- conformal_kvantil(cal_scores[special_idx], 0.20)
    q95_special <- conformal_kvantil(cal_scores[special_idx], 0.05)

    list(
      typ = "villkorlig",
      n_vardag = n_vardag, n_special = n_special,
      q80_vardag = q80_vardag, q95_vardag = q95_vardag,
      q80_special = q80_special, q95_special = q95_special,
      q80_all = q80_all, q95_all = q95_all
    )
  } else {
    list(
      typ = "gemensam",
      n_vardag = n_vardag, n_special = n_special,
      q80_vardag = q80_all, q95_vardag = q95_all,
      q80_special = q80_all, q95_special = q95_all,
      q80_all = q80_all, q95_all = q95_all
    )
  }
}

hamta_kvantiler <- function(kal, specialdag_vektor) {
  # Returnerar q80 och q95 vektorer matchande specialdag-vektor
  q80 <- if_else(specialdag_vektor, kal$q80_special, kal$q80_vardag)
  q95 <- if_else(specialdag_vektor, kal$q95_special, kal$q95_vardag)
  list(q80 = q80, q95 = q95)
}

# ══════════════════════════════════════════════════════════
#  GLM + CONFORMAL PREDICTION (tre-nivå)
# ══════════════════════════════════════════════════════════

modell_glm <- function(train_df, kalender_df, familj = "auto",
                       cal_andel = 0.2, ...) {

  # ── 1. Split: proper training + kalibrering (temporal) ──
  n <- nrow(train_df)
  n_cal <- max(60, round(n * cal_andel))
  proper_train <- train_df |> slice_head(n = n - n_cal)
  cal_data     <- train_df |> slice_tail(n = n_cal)

  # ── 2. Välj familj ──
  if (familj == "auto") {
    heltal <- all(train_df$y == round(train_df$y, 0))
    familj <- if (heltal && min(train_df$y) >= 0) "nb"
              else if (min(train_df$y) > 0)        "gamma"
              else                                  "gaussian"
    cat(sprintf("  Auto-familj: %s\n", familj))
  }

  if (familj == "gamma" && any(proper_train$y <= 0)) {
    cat("  OBS: Gamma kräver y > 0, byter till gaussian\n")
    familj <- "gaussian"
  }

  # ── 3. Fitta GLM på proper training ──
  t0 <- min(proper_train$ds)
  df <- forbered_features(proper_train, kalender_df, t0 = t0)

  fit <- switch(familj,
    nb       = MASS::glm.nb(modell_formel, data = df),
    gamma    = glm(modell_formel, data = df, family = Gamma(link = "log")),
    gaussian = glm(modell_formel, data = df, family = gaussian())
  )

  # ── 4. Conformal kalibrering (villkorlig) ──
  cal_feat <- forbered_features(cal_data, kalender_df, t0 = t0)
  cal_mu   <- as.numeric(predict(fit, newdata = cal_feat, type = "response"))
  cal_sig  <- predict_sigma(fit, cal_mu)

  # Normaliserade nonconformity scores
  cal_scores     <- abs(cal_data$y - cal_mu) / cal_sig
  cal_specialdag <- cal_feat$specialdag

  # Villkorlig kalibrering
  kal <- villkorlig_kalibrering(cal_scores, cal_specialdag)

  cat(sprintf("  Kalibrering (%s): vardag q80=%.2f q95=%.2f | special q80=%.2f q95=%.2f\n",
              kal$typ, kal$q80_vardag, kal$q95_vardag,
              kal$q80_special, kal$q95_special))

  list(
    namn   = paste0("glm_", familj),
    fit    = fit,
    familj = familj,
    kalibrering = tibble(
      ds         = cal_data$ds,
      y          = cal_data$y,
      yhat       = cal_mu,
      specialdag = cal_specialdag
    ),
    kal = kal,
    predict = function(new_df, kalender_df) {
      pred_df <- forbered_features(new_df, kalender_df, t0 = t0)
      mu  <- as.numeric(predict(fit, newdata = pred_df, type = "response"))
      sig <- predict_sigma(fit, mu)
      kv  <- hamta_kvantiler(kal, pred_df$specialdag)

      tibble(
        ds             = pred_df$ds,
        yhat           = mu,
        yhat_lower_80  = mu - kv$q80 * sig,
        yhat_upper_80  = mu + kv$q80 * sig,
        yhat_lower     = mu - kv$q95 * sig,
        yhat_upper     = mu + kv$q95 * sig,
        specialdag     = pred_df$specialdag
      )
    }
  )
}

# ══════════════════════════════════════════════════════════
#  SIGNALBERÄKNING — Dagsnivå (tre nivåer)
# ══════════════════════════════════════════════════════════

berakna_signal_dag <- function(faktiskt_df, prediktion_df) {
  faktiskt_df |>
    inner_join(prediktion_df, by = "ds") |>
    mutate(
      avvikelse     = y - yhat,
      avvikelse_pct = if_else(
        abs(yhat) < 0.01, 0,
        (y - yhat) / abs(yhat) * 100
      ),
      signal = case_when(
        y >= yhat_lower_80 & y <= yhat_upper_80 ~ "gron",
        y >= yhat_lower & y <= yhat_upper        ~ "gul",
        TRUE                                      ~ "rod"
      ),
      vecka_start   = floor_date(ds, "week", week_start = 1),
      manad_start   = floor_date(ds, "month"),
      kvartal_start = floor_date(ds, "quarter"),
      ar_start      = floor_date(ds, "year")
    )
}

# ══════════════════════════════════════════════════════════
#  AGGREGERING — Med egna conformal band per nivå
# ══════════════════════════════════════════════════════════

aggregera_prediktion <- function(signal_dag_df, period_col, agg_typ) {
  agg_fn <- if (agg_typ == "summa") sum else mean

  signal_dag_df |>
    group_by(period = .data[[period_col]]) |>
    summarise(
      n_dagar  = n(),
      y_agg    = agg_fn(y),
      yhat_agg = agg_fn(yhat),
      .groups  = "drop"
    ) |>
    mutate(
      avvikelse     = y_agg - yhat_agg,
      avvikelse_pct = if_else(
        abs(yhat_agg) < 0.01, 0,
        (y_agg - yhat_agg) / abs(yhat_agg) * 100
      )
    )
}

# ══════════════════════════════════════════════════════════
#  TRÖSKLAR — Conformal på aggregerad nivå
# ══════════════════════════════════════════════════════════

# Conformal trösklar (absolut avvikelse) för aggregerade perioder
berakna_troesklar_conformal_abs <- function(cal_agg_df) {
  residualer <- cal_agg_df$avvikelse
  scores <- abs(residualer)
  q80 <- conformal_kvantil(scores, 0.20)
  q95 <- conformal_kvantil(scores, 0.05)
  list(q80 = q80, q95 = q95, metod = "conformal_abs")
}

# Empiriska trösklar (fallback)
berakna_troesklar_empirisk <- function(agg_df) {
  residualer <- agg_df$avvikelse
  scores <- abs(residualer)
  q80 <- quantile(scores, 0.80, na.rm = TRUE, names = FALSE)
  q95 <- quantile(scores, 0.95, na.rm = TRUE, names = FALSE)
  list(q80 = q80, q95 = q95, metod = "empirisk")
}

applicera_signal_agg <- function(agg_df, troesklar) {
  agg_df |>
    mutate(
      yhat_lower_80 = yhat_agg - troesklar$q80,
      yhat_upper_80 = yhat_agg + troesklar$q80,
      yhat_lower    = yhat_agg - troesklar$q95,
      yhat_upper    = yhat_agg + troesklar$q95,
      signal = case_when(
        abs(avvikelse) <= troesklar$q80 ~ "gron",
        abs(avvikelse) <= troesklar$q95 ~ "gul",
        TRUE                            ~ "rod"
      )
    )
}

# ══════════════════════════════════════════════════════════
#  HUVUDFUNKTION — Kör hela signalpipelinen per KPI
# ══════════════════════════════════════════════════════════

kor_signal <- function(dagdata, kalender, modell_fn, agg_typ,
                       split_datum, kpi_namn = "") {

  train <- dagdata |> filter(ds < split_datum)
  test  <- dagdata |> filter(ds >= split_datum)

  cat(sprintf("  Träning: %s — %s (%d dagar)\n",
              min(train$ds), max(train$ds), nrow(train)))
  cat(sprintf("  Test:    %s — %s (%d dagar)\n",
              min(test$ds), max(test$ds), nrow(test)))

  # 1. Träna modell
  m <- modell_fn(train, kalender)
  cat(sprintf("  Modell:  %s\n", m$namn))

  # 2. Prediktera på träningsdata
  train_pred   <- m$predict(tibble(ds = train$ds), kalender)
  train_signal <- berakna_signal_dag(train, train_pred)

  # 3. Prediktera på testdata
  test_pred   <- m$predict(tibble(ds = test$ds), kalender)
  test_signal <- berakna_signal_dag(test, test_pred)

  # 4. Kalibreringsdata (conformal)
  har_cal <- !is.null(m$kalibrering) && nrow(m$kalibrering) > 0
  if (har_cal) {
    cal_pred   <- m$predict(tibble(ds = m$kalibrering$ds), kalender)
    cal_signal <- berakna_signal_dag(
      m$kalibrering |> select(ds, y),
      cal_pred
    )
  }

  # 5. Aggregera per nivå med egna conformal-trösklar
  nivaer     <- c("vecka_start", "manad_start", "kvartal_start", "ar_start")
  niva_namn  <- c("vecka", "manad", "kvartal", "ar")
  min_cal_n  <- 8

  agg_resultat <- list(dag = test_signal)

  for (i in seq_along(nivaer)) {
    if (har_cal) {
      cal_agg <- aggregera_prediktion(cal_signal, nivaer[i], agg_typ)
    }

    if (har_cal && nrow(cal_agg) >= min_cal_n) {
      troesklar <- berakna_troesklar_conformal_abs(cal_agg)
    } else {
      train_agg <- aggregera_prediktion(train_signal, nivaer[i], agg_typ)
      troesklar <- berakna_troesklar_empirisk(train_agg)
    }

    test_agg <- aggregera_prediktion(test_signal, nivaer[i], agg_typ)
    test_agg <- applicera_signal_agg(test_agg, troesklar)

    agg_resultat[[niva_namn[i]]]                       <- test_agg
    agg_resultat[[paste0(niva_namn[i], "_troesklar")]] <- troesklar
  }

  # 6. Diagnostik med täckningsgrad (80 % och 95 %)
  tackning_95 <- mean(
    test_signal$y >= test_signal$yhat_lower &
    test_signal$y <= test_signal$yhat_upper, na.rm = TRUE
  )
  tackning_80 <- mean(
    test_signal$y >= test_signal$yhat_lower_80 &
    test_signal$y <= test_signal$yhat_upper_80, na.rm = TRUE
  )

  # Bandbreddsstatistik
  bredd_80 <- test_signal$yhat_upper_80 - test_signal$yhat_lower_80
  bredd_95 <- test_signal$yhat_upper - test_signal$yhat_lower
  rel_bredd_80 <- median(bredd_80 / pmax(abs(test_signal$yhat), 0.01), na.rm = TRUE)
  rel_bredd_95 <- median(bredd_95 / pmax(abs(test_signal$yhat), 0.01), na.rm = TRUE)

  # Kalibreringsinformation
  kal_info <- if (!is.null(m$kal)) m$kal else list(typ = "ingen")

  agg_resultat$diagnostik <- list(
    kpi         = kpi_namn,
    modell      = m$namn,
    agg_typ     = agg_typ,
    n_train     = nrow(train),
    n_test      = nrow(test),
    mae_pct     = mean(abs(test_signal$avvikelse_pct), na.rm = TRUE),
    rmse        = sqrt(mean(test_signal$avvikelse^2, na.rm = TRUE)),
    medel_avv   = mean(test_signal$avvikelse_pct, na.rm = TRUE),
    tackning_80 = tackning_80,
    tackning_95 = tackning_95,
    rel_bredd_80 = rel_bredd_80,
    rel_bredd_95 = rel_bredd_95,
    median_bredd_80 = median(bredd_80, na.rm = TRUE),
    median_bredd_95 = median(bredd_95, na.rm = TRUE),
    n_gron      = sum(test_signal$signal == "gron", na.rm = TRUE),
    n_gul       = sum(test_signal$signal == "gul", na.rm = TRUE),
    n_rod       = sum(test_signal$signal == "rod", na.rm = TRUE),
    kalibrering = kal_info
  )

  agg_resultat
}

# ══════════════════════════════════════════════════════════
#  HJÄLPFUNKTIONER FÖR UTSKRIFT
# ══════════════════════════════════════════════════════════

signal_tabell <- function(signal_vec) {
  t <- table(factor(signal_vec, levels = c("gron", "gul", "rod")))
  sprintf("grön=%d  gul=%d  röd=%d", t["gron"], t["gul"], t["rod"])
}

skriv_sammanfattning <- function(resultat_lista) {
  cat("\n")
  cat(paste(rep("\u2550", 120), collapse = ""), "\n")
  cat("  SAMMANFATTNING — SIGNALSYSTEM (tre-nivå)\n")
  cat(paste(rep("\u2550", 120), collapse = ""), "\n\n")

  cat(sprintf("  %-25s %6s %6s %7s %7s %7s %7s   %-30s\n",
              "KPI", "MAE%", "Bias%", "Täck80", "Täck95",
              "Br80%", "Br95%", "Dag (grön/gul/röd)"))
  cat(paste(rep("\u2500", 120), collapse = ""), "\n")

  for (r in resultat_lista) {
    d <- r$diagnostik
    cat(sprintf("  %-25s %5.1f%% %+5.1f%% %5.0f%%  %5.0f%%  %5.1f%%  %5.1f%%   %-30s\n",
                d$kpi,
                d$mae_pct,
                d$medel_avv,
                d$tackning_80 * 100,
                d$tackning_95 * 100,
                d$rel_bredd_80 * 100,
                d$rel_bredd_95 * 100,
                signal_tabell(r$dag$signal)))
  }
  cat("\n  Täck80/95 = andel testdagar inom 80/95 %-intervallet.\n")
  cat("  Br80/95 = relativ medianbredd (band / förväntat). Lägre = smalare.\n")
  cat("  Mål: Täck80 ≈ 80 %, Täck95 ≈ 95 %, Br80 < 15 %, Br95 < 25 %.\n\n")
}
