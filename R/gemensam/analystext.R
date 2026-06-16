# analystext.R — Genererar analystext per KPI, sektion och global nivå
# Kräver: kpi_meta (register.R), fmt_varde (formatering.R)

# ── Rubrik för AI-analysen (kort, status-härledd) ──
# Speglas EXAKT av frontend (app/src/utils/analys.ts, analysRubrikForStatus)
# som fallback om fältet saknas i datan. Ändra på båda ställena samtidigt.
analys_rubrik_status <- function(status) {
  switch(status,
    gron = "Inom f\u00f6rv\u00e4ntat",
    gul  = "Att bevaka",
    rod  = "Avvikelse att \u00e5tg\u00e4rda",
    "Analys")
}

# Sektionens rubrik = allvarligaste status bland dess indikatorer (rod>gul>gron).
analys_rubrik_sektion <- function(sid, senaste_df) {
  sek_kpier <- kpi_meta |> filter(sektion_id == sid)
  sek_data  <- senaste_df |> filter(kpi_id %in% sek_kpier$id)
  if (any(sek_data$status == "rod")) return(analys_rubrik_status("rod"))
  if (any(sek_data$status == "gul")) return(analys_rubrik_status("gul"))
  analys_rubrik_status("gron")
}

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
