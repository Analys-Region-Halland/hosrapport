# kap02-bearbeta.R — Aggregera daglig data till alla tidsvyer
# Dag / Vecka / Manad / Kvartal / Ar
source("paket.R")
source("R/gemensam/helgdagar.R")
source("R/gemensam/signal-modell.R")

radata <- readRDS("data/radata-hos.rds")
rapport_datum <- max(radata$datum)
start_datum   <- min(radata$datum)
slut_datum    <- rapport_datum

# ── Svenska manadsnamn ──
sv_man <- c("januari", "februari", "mars", "april", "maj", "juni",
            "juli", "augusti", "september", "oktober", "november", "december")
sv_man_kort <- c("jan", "feb", "mar", "apr", "maj", "jun",
                  "jul", "aug", "sep", "okt", "nov", "dec")

# ══════════════════════════════════════════════
#  KPI-METADATA
# ══════════════════════════════════════════════

kpi_meta <- tibble(
  id            = c("belaggning", "akutbesok", "vantetid",
                     "ambulans", "inlaggningar", "utskrivningsklara"),
  namn          = c("Bel\u00e4ggningsgrad", "Bes\u00f6k akutmottagning", "Medianv\u00e4ntetid akut",
                     "Ambulansuppdrag", "Inl\u00e4ggningar", "Utskrivningsklara patienter"),
  enhet         = c("procent", "antal", "minuter", "antal", "antal", "antal"),
  aggregering   = c("medel", "summa", "medel", "summa", "summa", "medel"),
  inverterad    = c(TRUE, FALSE, TRUE, FALSE, FALSE, TRUE),
  sektion_id    = c("akutflode", "akutflode", "akutflode",
                     "akutflode", "slutenvard", "slutenvard"),
  sektion_namn  = c("Akutfl\u00f6de & kapacitet", "Akutfl\u00f6de & kapacitet",
                     "Akutfl\u00f6de & kapacitet", "Akutfl\u00f6de & kapacitet",
                     "Slutenv\u00e5rd", "Slutenv\u00e5rd"),
  gul_grans     = c(90, NA, 150, NA, NA, 15),
  rod_grans     = c(95, NA, 180, NA, NA, 25),
  familj        = c("gaussian", "nb", "gamma", "nb", "nb", "nb")
)

# ══════════════════════════════════════════════
#  PIVOTISERA OCH FORBERED
# ══════════════════════════════════════════════

dag_full <- radata |>
  pivot_longer(-datum, names_to = "kpi_id", values_to = "varde") |>
  left_join(kpi_meta |> select(id, aggregering, enhet), by = c("kpi_id" = "id")) |>
  mutate(
    vecka_start   = floor_date(datum, "week", week_start = 1),
    manad_start   = floor_date(datum, "month"),
    kvartal_start = floor_date(datum, "quarter"),
    ar_start      = floor_date(datum, "year")
  )

# ══════════════════════════════════════════════
#  AGGREGERING
# ══════════════════════════════════════════════

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

agg_dag     <- aggregera_period(dag_full, "datum")
agg_vecka   <- aggregera_period(dag_full, "vecka_start")
agg_manad   <- aggregera_period(dag_full, "manad_start")
agg_kvartal <- aggregera_period(dag_full, "kvartal_start")
agg_ar      <- aggregera_period(dag_full, "ar_start")

# ══════════════════════════════════════════════
#  FILTRERA: BARA KOMPLETTA PERIODER
# ══════════════════════════════════════════════

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

agg_vecka   <- agg_vecka   |> filter(period <= max_vecka)
agg_manad   <- agg_manad   |> filter(period <= max_manad)
agg_kvartal <- agg_kvartal |> filter(period <= max_kvartal)
agg_ar      <- agg_ar      |> filter(period <= max_ar)

# Senaste kompletta period per vy
senaste_komplett <- list(
  vecka = max_vecka, manad = max_manad,
  kvartal = max_kvartal, ar = max_ar
)

# N\u00e4sta kompletta period (n\u00e4r den \u00e4r klar)
nasta_komplett <- list(
  vecka   = max_vecka + 13,
  manad   = ceiling_date(max_manad %m+% months(1), "month") - 1,
  kvartal = ceiling_date(max_kvartal %m+% months(3), "quarter") - 1,
  ar      = ceiling_date(max_ar + years(1), "year") - 1
)

# ══════════════════════════════════════════════
#  SIGNALBERÄKNING — GLM + Conformal Prediction
# ══════════════════════════════════════════════

kalender <- bygg_kalender(start_datum, slut_datum)
dept_radata <- readRDS("data/radata-dept.rds")
cat("K\u00f6r signalmodeller...\n")

# Hjälpfunktion: kör signal för en tidsserie (total eller avdelning)
# Tre-nivå: grön (inom 80 %), gul (80–95 %), röd (utanför 95 %)
kor_kpi_signal <- function(df, kalender, familj, atyp) {
  agg_fn <- if (atyp == "summa") sum else mean
  m  <- modell_glm(df, kalender, familj = familj)
  p  <- m$predict(tibble(ds = df$ds), kalender)

  dag_pred <- df |>
    inner_join(p, by = "ds") |>
    mutate(signal = case_when(
      y >= yhat_lower_80 & y <= yhat_upper_80 ~ "gron",
      y >= yhat_lower & y <= yhat_upper        ~ "gul",
      TRUE                                      ~ "rod"
    ))

  dag_out <- dag_pred |>
    transmute(period = ds, yhat, yhat_lower_80, yhat_upper_80,
              yhat_lower, yhat_upper, signal)

  niva_spec <- list(
    vecka   = \(d) floor_date(d, "week", week_start = 1),
    manad   = \(d) floor_date(d, "month"),
    kvartal = \(d) floor_date(d, "quarter"),
    ar      = \(d) floor_date(d, "year")
  )

  agg_out <- list()
  for (niva in names(niva_spec)) {
    pfn <- niva_spec[[niva]]
    agg_p <- dag_pred |>
      mutate(period = pfn(ds)) |>
      group_by(period) |>
      summarise(y_a = agg_fn(y), yh_a = agg_fn(yhat), .groups = "drop") |>
      mutate(avv = y_a - yh_a)

    # Conformal band på aggregerad nivå (absolut avvikelse)
    # Försök conformal från kalibrering, annars empirisk från träningsdata
    q80 <- NA_real_; q95 <- NA_real_
    if (!is.null(m$kalibrering) && nrow(m$kalibrering) > 0) {
      cal_p <- m$predict(tibble(ds = m$kalibrering$ds), kalender)
      cal_a <- tibble(ds = m$kalibrering$ds, y = m$kalibrering$y) |>
        inner_join(cal_p |> select(ds, yhat), by = "ds") |>
        mutate(period = pfn(ds)) |>
        group_by(period) |>
        summarise(cy = agg_fn(y), cyh = agg_fn(yhat), .groups = "drop") |>
        mutate(cavv = cy - cyh)
      if (nrow(cal_a) >= 4) {
        cal_scores <- abs(cal_a$cavv)
        q80 <- conformal_kvantil(cal_scores, 0.20)
        q95 <- conformal_kvantil(cal_scores, 0.05)
      }
    }
    # Empirisk fallback från hela tidsseriens aggregerade residualer
    if (is.na(q80) || is.na(q95)) {
      train_agg <- dag_pred |>
        mutate(period = pfn(ds)) |>
        group_by(period) |>
        summarise(ty = agg_fn(y), tyh = agg_fn(yhat), .groups = "drop") |>
        mutate(tavv = ty - tyh)
      train_scores <- abs(train_agg$tavv)
      if (is.na(q80)) q80 <- quantile(train_scores, 0.80, na.rm = TRUE, names = FALSE)
      if (is.na(q95)) q95 <- quantile(train_scores, 0.95, na.rm = TRUE, names = FALSE)
    }

    agg_out[[niva]] <- agg_p |>
      transmute(period, yhat = yh_a,
        yhat_lower_80 = yh_a - q80,
        yhat_upper_80 = yh_a + q80,
        yhat_lower    = yh_a - q95,
        yhat_upper    = yh_a + q95,
        signal = case_when(
          abs(avv) <= q80 ~ "gron",
          abs(avv) <= q95 ~ "gul",
          TRUE            ~ "rod"
        ))
  }

  list(dag = dag_out, vecka = agg_out$vecka, manad = agg_out$manad,
       kvartal = agg_out$kvartal, ar = agg_out$ar, modell_namn = m$namn)
}

# ── Total-KPI signaler ──
pred <- list(dag = tibble(), vecka = tibble(), manad = tibble(),
             kvartal = tibble(), ar = tibble())

for (i in seq_len(nrow(kpi_meta))) {
  kid <- kpi_meta$id[i]
  df  <- radata |> transmute(ds = datum, y = .data[[kid]])
  res <- kor_kpi_signal(df, kalender, kpi_meta$familj[i], kpi_meta$aggregering[i])
  for (niva in names(pred)) {
    pred[[niva]] <- bind_rows(pred[[niva]], res[[niva]] |> mutate(kpi_id = kid))
  }
  cat(sprintf("  %s (%s): klar\n", kid, res$modell_namn))
}

# ── Avdelningssignaler ──
dept_pred <- list(dag = tibble(), vecka = tibble(), manad = tibble(),
                  kvartal = tibble(), ar = tibble())

for (i in seq_len(nrow(kpi_meta))) {
  kid  <- kpi_meta$id[i]
  fam  <- kpi_meta$familj[i]
  atyp <- kpi_meta$aggregering[i]
  depts <- dept_radata |> filter(kpi_id == kid) |> pull(dept) |> unique()

  for (d in depts) {
    dept_id <- paste0(kid, "-", tolower(gsub(" ", "", d)))
    df <- dept_radata |>
      filter(kpi_id == kid, dept == d) |>
      transmute(ds = datum, y = varde)
    res <- kor_kpi_signal(df, kalender, fam, atyp)
    for (niva in names(dept_pred)) {
      dept_pred[[niva]] <- bind_rows(dept_pred[[niva]],
        res[[niva]] |> mutate(kpi_id = dept_id))
    }
  }
  cat(sprintf("  %s avdelningar: klar\n", kid))
}

# ══════════════════════════════════════════════
#  FORANDRING OCH STATUS
# ══════════════════════════════════════════════

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

# Signal fran conformal-modellen
lagg_till_signal <- function(df, pred_niva) {
  df |>
    left_join(pred_niva |> select(kpi_id, period, signal),
              by = c("kpi_id", "period")) |>
    mutate(status = coalesce(signal, "gron")) |>
    select(-signal)
}

agg_dag     <- agg_dag     |> lagg_till_forandring() |> lagg_till_signal(pred$dag)
agg_vecka   <- agg_vecka   |> lagg_till_forandring() |> lagg_till_signal(pred$vecka)
agg_manad   <- agg_manad   |> lagg_till_forandring() |> lagg_till_signal(pred$manad)
agg_kvartal <- agg_kvartal |> lagg_till_forandring() |> lagg_till_signal(pred$kvartal)
agg_ar      <- agg_ar      |> lagg_till_forandring() |> lagg_till_signal(pred$ar)

# ══════════════════════════════════════════════
#  ETIKETTFUNKTIONER
# ══════════════════════════════════════════════

etikett_dag     <- function(d) paste0(day(d), " ", sv_man_kort[month(d)])
etikett_vecka   <- function(d) paste0("V", isoweek(d))
etikett_manad   <- function(d) paste0(sv_man_kort[month(d)], " ", substr(year(d), 3, 4))
etikett_kvartal <- function(d) paste0("Q", quarter(d), " ", substr(year(d), 3, 4))
etikett_ar      <- function(d) as.character(year(d))

# ══════════════════════════════════════════════
#  FORMATERING
# ══════════════════════════════════════════════

fmt_varde <- function(v, enhet) {
  if (enhet == "procent") {
    paste0(format(v, nsmall = 1, decimal.mark = ","), " procent")
  } else if (enhet == "minuter") {
    paste0(round(v), " minuter")
  } else {
    format(round(v), big.mark = "\u00a0")
  }
}

# ══════════════════════════════════════════════
#  ANALYSTEXT
# ══════════════════════════════════════════════

analystext_kpi <- function(kpi_id, s_rad, vy_id,
                           dagar_sammanfattning = NULL, referens = NULL) {
  km <- kpi_meta |> filter(id == kpi_id)
  v_str <- fmt_varde(s_rad$varde, km$enhet)

  # Del 1: Aggregerat v\u00e4rde + f\u00f6r\u00e4ndring mot f\u00f6reg\u00e5ende period
  jmf <- switch(vy_id,
    dag     = "f\u00f6reg\u00e5ende dag",
    vecka   = "f\u00f6reg\u00e5ende vecka",
    manad   = "f\u00f6reg\u00e5ende m\u00e5nad",
    kvartal = "f\u00f6reg\u00e5ende kvartal",
    ar      = "f\u00f6reg\u00e5ende \u00e5r"
  )

  f <- s_rad$forandring
  if (is.na(f) || f == 0) {
    del1 <- paste0(km$namn, " ligger p\u00e5 ", v_str,
                   ", of\u00f6r\u00e4ndrat j\u00e4mf\u00f6rt med ", jmf, ".")
  } else {
    rikt <- if (f > 0) "en \u00f6kning" else "en minskning"
    f_str <- fmt_varde(abs(f), km$enhet)
    del1 <- paste0(km$namn, " ligger p\u00e5 ", v_str, ", ", rikt, " med ", f_str,
                   " j\u00e4mf\u00f6rt med ", jmf, ".")
  }

  # Del 2: Referens mot samma period f\u00f6reg\u00e5ende \u00e5r
  del2 <- ""
  if (!is.null(referens)) {
    ref_f <- referens$forandring
    if (!is.na(ref_f) && ref_f != 0) {
      ref_rikt <- if (ref_f > 0) "h\u00f6gre" else "l\u00e4gre"
      ref_str <- fmt_varde(abs(ref_f), km$enhet)
      del2 <- paste0(" J\u00e4mf\u00f6rt med motsvarande period f\u00f6reg\u00e5ende \u00e5r \u00e4r niv\u00e5n ",
                     ref_str, " ", ref_rikt, ".")
    }
  }

  # Del 3: Dagsniv\u00e5 — andel dagar i fas
  del3 <- ""
  if (!is.null(dagar_sammanfattning)) {
    ds <- dagar_sammanfattning
    del3 <- paste0(" Under perioden var ", ds$n_i_fas, " av ", ds$n_dagar,
                   " dagar inom f\u00f6rv\u00e4ntat intervall")
    delar <- c()
    if (ds$n_bevaka > 0) delar <- c(delar, paste0(ds$n_bevaka, " bevakade"))
    if (ds$n_avvikelse > 0) delar <- c(delar, paste0(ds$n_avvikelse, " avvek"))
    if (length(delar) > 0) {
      del3 <- paste0(del3, ", ", paste(delar, collapse = " och "), ".")
    } else {
      del3 <- paste0(del3, ".")
    }
  }

  paste0(del1, del2, del3)
}

analystext_sektion <- function(sid, senaste_df, vy_id) {
  sek_kpier <- kpi_meta |> filter(sektion_id == sid)
  sek_data <- senaste_df |> filter(kpi_id %in% sek_kpier$id)
  n_rod    <- sum(sek_data$status == "rod")
  n_gul    <- sum(sek_data$status == "gul")
  snamn    <- sek_kpier$sektion_namn[1]

  status_str <- if (n_rod == 0 && n_gul == 0) "en stabil situation"
                else if (n_rod == 0 && n_gul > 0) "en i huvudsak stabil situation med indikatorer att bevaka"
                else if (n_rod == 1) "en anstr\u00e4ngd men hanterbar situation"
                else "en anstr\u00e4ngd situation"

  avvik_text <- ""
  if (n_rod > 0) {
    rod_namn <- sek_data |>
      filter(status == "rod") |>
      left_join(kpi_meta |> select(id, namn), by = c("kpi_id" = "id")) |>
      pull(namn)
    avvik_text <- paste0("\n\n", paste(rod_namn, collapse = " och "), " avviker och kr\u00e4ver \u00e5tg\u00e4rd.")
  }
  if (n_gul > 0) {
    gul_namn <- sek_data |>
      filter(status == "gul") |>
      left_join(kpi_meta |> select(id, namn), by = c("kpi_id" = "id")) |>
      pull(namn)
    avvik_text <- paste0(avvik_text, "\n\n", paste(gul_namn, collapse = " och "), " b\u00f6r bevakas.")
  }

  paste0(snamn, " visar ", status_str, ".", avvik_text)
}

analystext_global <- function(senaste_df, period_str) {
  n_rod <- sum(senaste_df$status == "rod")
  n_gul <- sum(senaste_df$status == "gul")

  status_str <- if (n_rod == 0 && n_gul == 0) "en stabil situation utan avvikelser"
                else if (n_rod == 0 && n_gul > 0) "en i huvudsak stabil situation"
                else if (n_rod <= 2) "en anstr\u00e4ngd men hanterbar situation"
                else "en anstr\u00e4ngd situation med flera avvikelser"

  avvik_text <- ""
  if (n_rod > 0) {
    rod_data <- senaste_df |>
      filter(status == "rod") |>
      left_join(kpi_meta |> select(id, namn), by = c("kpi_id" = "id"))
    avvik_text <- paste0("\n\n", paste(rod_data$namn, collapse = ", "),
           " ligger i avvikelse och kr\u00e4ver \u00e5tg\u00e4rd.")
  }
  if (n_gul > 0) {
    gul_data <- senaste_df |>
      filter(status == "gul") |>
      left_join(kpi_meta |> select(id, namn), by = c("kpi_id" = "id"))
    avvik_text <- paste0(avvik_text, "\n\n",
           paste(gul_data$namn, collapse = ", "), " b\u00f6r bevakas.")
  }

  paste0("H\u00e4lso- och sjukv\u00e5rden i Region Halland uppvisar ", status_str,
         " under ", tolower(period_str), ".", avvik_text)
}

# ══════════════════════════════════════════════
#  HJÄLPFUNKTIONER: DAGDATA + REFERENS
# ══════════════════════════════════════════════

# Hämta daglig data med signal för en KPI inom en specifik period
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

# Sammanfattning av dagssignaler inom en period
dagar_sammanfattning <- function(dagar_df) {
  if (is.null(dagar_df) || nrow(dagar_df) == 0) return(NULL)
  list(
    n_dagar     = nrow(dagar_df),
    n_i_fas     = sum(dagar_df$signal == "gron", na.rm = TRUE),
    n_bevaka    = sum(dagar_df$signal == "gul", na.rm = TRUE),
    n_avvikelse = sum(dagar_df$signal == "rod", na.rm = TRUE)
  )
}

# Referens: samma period föregående år
berakna_referens <- function(agg_df, kid, aktuell_per, vy_id, etikett_fn, enhet) {
  if (vy_id == "dag") return(NULL)

  # Hitta motsvarande period föregående år
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

# ══════════════════════════════════════════════
#  BYGG VY-STRUKTUR
# ══════════════════════════════════════════════

# ── Underavdelningar per KPI ──
dept_config <- list(
  belaggning        = c("Halmstad", "Varberg", "Kungsbacka"),
  akutbesok         = c("Halmstad", "Varberg", "Kungsbacka"),
  vantetid          = c("Halmstad", "Varberg", "Kungsbacka"),
  ambulans          = c("Nord", "Syd"),
  inlaggningar      = c("Kirurgi", "Medicin", "Ortopedi"),
  utskrivningsklara = c("Halmstad", "Varberg", "Kungsbacka")
)

generera_undernivaer <- function(total_ts, km, etikett_fn, vy_id, dept_pred_vy,
                                 dagar_per = NULL) {
  # Hämta avdelningsnamn
  dept_namn <- unique(dept_radata |> filter(kpi_id == km$id) |> pull(dept))
  if (length(dept_namn) == 0) return(list())
  agg_fn <- if (km$aggregering == "summa") sum else mean
  dec <- if (km$enhet == "procent") 1 else 0

  # Perioder i total-tidsserien
  perioder_i_vy <- total_ts$period

  lapply(dept_namn, function(d) {
    dept_id <- paste0(km$id, "-", tolower(gsub(" ", "", d)))

    # Aggregera daglig avdelningsdata till vy-nivå
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

    # Hämta prediktion
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

    # Signal från conformal
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

    # Dagdata f\u00f6r avdelningen (om dagar_per anges)
    if (!is.null(dagar_per) && vy_id != "dag") {
      period_col <- switch(vy_id,
        vecka   = "vecka_start",
        manad   = "manad_start",
        kvartal = "kvartal_start",
        ar      = "ar_start"
      )
      # H\u00e4r anv\u00e4nder vi dag_full-logik men f\u00f6r avdelningar
      dept_dag <- dept_radata |>
        filter(kpi_id == km$id, dept == d) |>
        mutate(.period_col = floor_date(datum, switch(vy_id,
          vecka = "week", manad = "month", kvartal = "quarter", ar = "year"),
          week_start = if (vy_id == "vecka") 1 else 7)) |>
        filter(.period_col == dagar_per) |>
        arrange(datum)

      if (nrow(dept_dag) > 0) {
        dept_dag_pred <- dept_pred$dag |>
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

# ── Lag-konfiguration per vy (for multipla forandringar) ──
lag_specs <- list(
  dag     = list(list(e = "dag",     n = 1),  list(e = "vecka",   n = 7),  list(e = "m\u00e5n", n = 30)),
  vecka   = list(list(e = "vecka",   n = 1),  list(e = "m\u00e5n",n = 4),  list(e = "\u00e5r",  n = 52)),
  manad   = list(list(e = "m\u00e5n",n = 1),  list(e = "kvartal", n = 3),  list(e = "\u00e5r",  n = 12)),
  kvartal = list(list(e = "kvartal", n = 1),  list(e = "\u00e5r", n = 4)),
  ar      = list(list(e = "\u00e5r", n = 1))
)

bygg_vy <- function(agg_df, vy_id, titel, period_str, jmf_etikett,
                    etikett_fn, n_perioder = 999, pred_vy = NULL,
                    dag_full_df = NULL, pred_dag_df = NULL,
                    dagar_period = NULL, nasta_datum = NULL) {

  # Begr\u00e4nsa till senaste N perioder
  ts_df <- agg_df |>
    group_by(kpi_id) |>
    slice_tail(n = n_perioder) |>
    ungroup()

  # Senaste enskilda period per KPI
  senaste_df <- agg_df |>
    group_by(kpi_id) |>
    filter(period == max(period)) |>
    ungroup()

  # Aktuell period (senaste i denna vy)
  aktuell_per <- max(agg_df$period)

  # Bygg sektioner
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

      # Multipla f\u00f6r\u00e4ndringar (olika tidshorisont)
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

      # Dagsniv\u00e5data f\u00f6r senaste KOMPLETTA period (ej f\u00f6r dag-vy)
      dp <- if (!is.null(dagar_period)) dagar_period else aktuell_per
      kpi_dagar <- NULL
      kpi_dagar_sammanf <- NULL
      if (!is.null(dag_full_df) && vy_id != "dag") {
        kpi_dagar <- dagar_for_period(
          dag_full_df, pred_dag_df, km$id, vy_id, dp, km$enhet)
        kpi_dagar_sammanf <- dagar_sammanfattning(kpi_dagar)
      }

      # Referens: samma period f\u00f6reg\u00e5ende \u00e5r (baserat p\u00e5 senaste kompletta)
      kpi_referens <- berakna_referens(
        agg_df, km$id, dp, vy_id, etikett_fn, km$enhet)

      # Underavdelningar (med egna signalmodeller)
      dept_pred_niva <- switch(vy_id,
        dag = dept_pred$dag, vecka = dept_pred$vecka,
        manad = dept_pred$manad, kvartal = dept_pred$kvartal,
        ar = dept_pred$ar)
      under <- generera_undernivaer(ts, km, etikett_fn, vy_id, dept_pred_niva, dp)

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
        tidsserie           = tidsserie,
        undernivaer         = under
      )
      # L\u00e4gg bara till f\u00e4lt om de har data (undvik tomma {} i JSON)
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
      id     = sid,
      namn   = snamn,
      analys = analystext_sektion(sid, senaste_df, vy_id),
      kpier  = kpier
    )
  })

  vy_output <- list(
    vy              = vy_id,
    etikett         = titel,
    period          = period_str,
    datum           = format(rapport_datum, "%Y-%m-%d"),
    uppdaterad      = "08:00",
    jmf_etikett     = jmf_etikett,
    analys          = analystext_global(senaste_df, period_str),
    sektioner       = sektioner
  )
  # Senaste kompletta periods info
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

# ══════════════════════════════════════════════
#  PERIODETIKETTER
# ══════════════════════════════════════════════

period_dag <- paste0(day(rapport_datum), " ", sv_man[month(rapport_datum)],
                     " ", year(rapport_datum))

senaste_vecka_d <- max(agg_vecka$period)
period_vecka <- paste0("vecka ", isoweek(senaste_vecka_d), ", ",
                       isoyear(senaste_vecka_d))

senaste_manad_d <- max(agg_manad$period)
period_manad <- paste0(sv_man[month(senaste_manad_d)], " ",
                       year(senaste_manad_d)) |>
  str_to_sentence()

senaste_kvartal_d <- max(agg_kvartal$period)
period_kvartal <- paste0("kvartal ", quarter(senaste_kvartal_d), ", ",
                         year(senaste_kvartal_d))

senaste_ar_d <- max(agg_ar$period)
period_ar <- as.character(year(senaste_ar_d))

# ══════════════════════════════════════════════
#  GENERERA ALLA VYER
# ══════════════════════════════════════════════

# ── Dag-vy: begr\u00e4nsa till 14 dagar ──
agg_dag_14 <- agg_dag |>
  group_by(kpi_id) |>
  slice_tail(n = 14) |>
  ungroup()

resultat <- list(
  dag     = bygg_vy(agg_dag_14,  "dag",     "Dags\u00f6versikt",      period_dag,
                    "f\u00f6reg. dag",     etikett_dag,     14, pred$dag),
  vecka   = bygg_vy(agg_vecka,   "vecka",   "Vecko\u00f6versikt",     period_vecka,
                    "f\u00f6reg. vecka",   etikett_vecka,   999, pred$vecka,
                    dag_full, pred$dag,
                    senaste_komplett$vecka, nasta_komplett$vecka),
  manad   = bygg_vy(agg_manad,   "manad",   "M\u00e5nads\u00f6versikt",    period_manad,
                    "f\u00f6reg. m\u00e5nad",   etikett_manad,   999, pred$manad,
                    dag_full, pred$dag,
                    senaste_komplett$manad, nasta_komplett$manad),
  kvartal = bygg_vy(agg_kvartal, "kvartal", "Kvartals\u00f6versikt",  period_kvartal,
                    "f\u00f6reg. kvartal", etikett_kvartal, 999, pred$kvartal,
                    dag_full, pred$dag,
                    senaste_komplett$kvartal, nasta_komplett$kvartal),
  ar      = bygg_vy(agg_ar,      "ar",      "\u00c5rs\u00f6versikt",       period_ar,
                    "f\u00f6reg. \u00e5r",      etikett_ar,      999, pred$ar,
                    dag_full, pred$dag,
                    senaste_komplett$ar, nasta_komplett$ar)
)

# ── Dag-vy: referensserie (samma 14 dagar f\u00f6reg\u00e5ende \u00e5r) ──
dag14_start <- min(agg_dag_14$period)
dag14_slut  <- max(agg_dag_14$period)
ref_start   <- dag14_start - years(1)
ref_slut    <- dag14_slut - years(1)

agg_dag_ref <- agg_dag |>
  filter(period >= ref_start, period <= ref_slut)

for (si in seq_along(resultat$dag$sektioner)) {
  for (ki in seq_along(resultat$dag$sektioner[[si]]$kpier)) {
    kid <- resultat$dag$sektioner[[si]]$kpier[[ki]]$id
    km  <- kpi_meta |> filter(id == kid)
    dec <- if (km$enhet == "procent") 1 else 0

    ref_df <- agg_dag_ref |>
      filter(kpi_id == kid) |>
      arrange(period) |>
      left_join(
        pred$dag |> filter(kpi_id == kid) |> select(-kpi_id),
        by = "period"
      ) |>
      transmute(
        period  = format(period, "%Y-%m-%d"),
        etikett = etikett_dag(period),
        varde,
        yhat          = round(yhat, dec),
        yhat_lower_80 = round(yhat_lower_80, dec),
        yhat_upper_80 = round(yhat_upper_80, dec),
        yhat_lower    = round(yhat_lower, dec),
        yhat_upper    = round(yhat_upper, dec),
        signal
      ) |>
      as.data.frame()

    if (nrow(ref_df) > 0) {
      resultat$dag$sektioner[[si]]$kpier[[ki]]$referens_serie <- ref_df
    }
  }
}

# ══════════════════════════════════════════════
#  PATIENTENKÄTEN — Enbart i årsvyn
# ══════════════════════════════════════════════
# Ranking-baserad signal: topp 3 = grön, 4–7 = gul, 8+ = röd

npe_fil <- "data/npe_primarvard.xlsx"
if (file.exists(npe_fil)) {
  cat("Läser Patientenkäten...\n")

  npe_meta <- tibble(
    flik = c("Helhetsintryck", "Respekt och bemötande",
             "Delaktighet och involvering", "Tillgänglighet"),
    id   = c("npe_helhetsintryck", "npe_respekt",
             "npe_delaktighet", "npe_tillganglighet"),
    namn = c("Helhetsintryck", "Respekt och bemötande",
             "Delaktighet och involvering", "Tillgänglighet")
  )

  npe_kpier <- list()

  for (i in seq_len(nrow(npe_meta))) {
    df_raw <- readxl::read_excel(npe_fil, sheet = npe_meta$flik[i],
                                  col_names = FALSE)

    # Rad 4 = header med årtal, rad 5–25 = regioner, rad 26 = Riket
    ar_vec <- as.numeric(df_raw[4, -1, drop = TRUE])
    regioner <- as.character(df_raw[5:25, 1, drop = TRUE])
    riket_rad <- as.numeric(df_raw[26, -1, drop = TRUE])

    # Matris med regionvärden
    val_mat <- as.data.frame(df_raw[5:25, -1])
    for (j in seq_along(val_mat)) val_mat[[j]] <- as.numeric(val_mat[[j]])
    names(val_mat) <- ar_vec

    # Hitta Halland
    halland_idx <- which(regioner == "Halland")
    halland_vals <- as.numeric(val_mat[halland_idx, ])

    # Ranking per år (rank 1 = högst)
    ranker <- sapply(seq_along(ar_vec), function(j) {
      vals <- as.numeric(val_mat[, j])
      rank(-vals, ties.method = "min")[halland_idx]
    })

    senaste_rank <- tail(ranker, 1)
    senaste_val  <- tail(halland_vals, 1)
    senaste_riket <- tail(riket_rad, 1)

    # Signal baserad på senaste ranking
    signal <- if (senaste_rank <= 3) "gron"
              else if (senaste_rank <= 7) "gul"
              else "rod"

    # Förändring mot föregående mätning
    forandring <- if (length(halland_vals) >= 2) {
      round(senaste_val - halland_vals[length(halland_vals) - 1], 1)
    } else 0

    # Tidsserie
    tidsserie <- lapply(seq_along(ar_vec), function(j) {
      sig_j <- if (ranker[j] <= 3) "gron"
               else if (ranker[j] <= 7) "gul"
               else "rod"
      list(
        period  = paste0(ar_vec[j], "-01-01"),
        etikett = as.character(ar_vec[j]),
        varde   = round(halland_vals[j], 1),
        yhat    = round(riket_rad[j], 1),
        signal  = sig_j
      )
    })

    # Referens: Riket senaste år
    referens <- list(
      period     = paste0(tail(ar_vec, 1), "-01-01"),
      etikett    = paste0("Riket ", tail(ar_vec, 1)),
      varde      = round(senaste_riket, 1),
      forandring = round(senaste_val - senaste_riket, 1)
    )

    # Analystext
    rank_text <- paste0("plats ", senaste_rank, " av 21 regioner")
    rikt <- if (forandring > 0) "en ökning" else if (forandring < 0) "en minskning" else "oförändrat"
    f_str <- paste0(abs(forandring), " procentenheter")
    jmf_riket <- if (senaste_val > senaste_riket) {
      paste0(round(senaste_val - senaste_riket, 1), " procentenheter över rikssnittet")
    } else if (senaste_val < senaste_riket) {
      paste0(round(senaste_riket - senaste_val, 1), " procentenheter under rikssnittet")
    } else "i nivå med rikssnittet"

    analystext <- paste0(
      npe_meta$namn[i], " ligger på ", round(senaste_val, 1),
      " procent positiva svar (", rank_text, "), ",
      jmf_riket, "."
    )
    if (forandring != 0) {
      analystext <- paste0(analystext, " Jämfört med föregående mätning är det ",
                           rikt, " med ", f_str, ".")
    }

    npe_kpier[[i]] <- list(
      id          = npe_meta$id[i],
      namn        = npe_meta$namn[i],
      enhet       = "procent",
      inverterad  = FALSE,
      senaste     = round(senaste_val, 1),
      forandring  = forandring,
      forandringar = list(
        list(etikett = "mätning", varde = forandring)
      ),
      status      = signal,
      analystext  = analystext,
      tidsserie   = tidsserie,
      referens    = referens
    )

    cat(sprintf("  %s: %.1f%% (rank %d → %s)\n",
                npe_meta$namn[i], senaste_val, senaste_rank, signal))
  }

  # Sammanfattande analys för sektionen
  n_rod <- sum(sapply(npe_kpier, \(k) k$status == "rod"))
  n_gul <- sum(sapply(npe_kpier, \(k) k$status == "gul"))
  sek_analys <- if (n_rod == 0 && n_gul == 0) {
    "Patientenkäten visar att Region Halland ligger bland de tre bästa regionerna i samtliga dimensioner."
  } else if (n_rod == 0) {
    "Patientenkäten visar goda resultat överlag, men enstaka dimensioner ligger utanför topp tre."
  } else {
    avvik_namn <- sapply(npe_kpier[sapply(npe_kpier, \(k) k$status == "rod")], \(k) k$namn)
    paste0("Patientenkäten visar att ", paste(avvik_namn, collapse = " och "),
           " kräver uppmärksamhet — Halland hamnar utanför topp sju bland regionerna.")
  }

  # Injicera NPE-sektionen i årsvyn
  npe_sektion <- list(
    id     = "patientenkat",
    namn   = "Patientenkäten",
    analys = sek_analys,
    kpier  = npe_kpier
  )

  resultat$ar$sektioner <- c(resultat$ar$sektioner, list(npe_sektion))

  # Uppdatera global analys för årsvyn med NPE
  alla_kpier_ar <- unlist(lapply(resultat$ar$sektioner, \(s) lapply(s$kpier, \(k) k$status)), use.names = FALSE)
  n_rod_total <- sum(alla_kpier_ar == "rod")
  n_gul_total <- sum(alla_kpier_ar == "gul")
  status_str <- if (n_rod_total == 0 && n_gul_total == 0) "en stabil situation utan avvikelser"
                else if (n_rod_total == 0) "en i huvudsak stabil situation"
                else if (n_rod_total <= 2) "en ansträngd men hanterbar situation"
                else "en ansträngd situation med flera avvikelser"
  resultat$ar$analys <- paste0(
    "Hälso- och sjukvården i Region Halland uppvisar ", status_str,
    " under ", tolower(period_ar), ".")

  cat("Patientenkäten tillagd i årsvyn\n")
} else {
  cat("OBS: Patientenkäten (data/npe_primarvard.xlsx) saknas — hoppar över\n")
}

saveRDS(resultat, "data/bearbetad-hos.rds")
cat("Bearbetning klar: 5 vyer genererade\n")
