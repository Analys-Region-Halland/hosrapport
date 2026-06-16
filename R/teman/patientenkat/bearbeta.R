# bearbeta.R — Patientenkäten (NPE)
# Läser Excel, beräknar ranking-baserade signaler, returnerar en sektion.
# Kräver: readxl, patientenkat-config (register.R)

bearbeta_patientenkat <- function() {
  npe_fil <- patientenkat$datakalla

  if (!file.exists(npe_fil)) {
    cat("OBS: Patientenk\u00e4ten (", npe_fil, ") saknas \u2014 hoppar \u00f6ver\n")
    return(NULL)
  }

  cat("L\u00e4ser Patientenk\u00e4ten...\n")
  npe_meta <- patientenkat$dimensioner
  npe_kpier <- list()

  # Målnivå (demo-mål, % positiva svar) per dimension — byts mot riktiga mål.
  mal_niva <- c(
    npe_helhetsintryck = 85,
    npe_respekt        = 90,
    npe_delaktighet    = 85,
    npe_tillganglighet = 86
  )

  # Ranking-tr\u00f6sklar fr\u00e5n config (signal_typ = "ranking")
  g_gron <- patientenkat$ranking$grans_gron
  g_gul  <- patientenkat$ranking$grans_gul
  sig_fn <- function(r) if (r <= g_gron) "gron" else if (r <= g_gul) "gul" else "rod"

  for (i in seq_len(nrow(npe_meta))) {
    df_raw <- readxl::read_excel(npe_fil, sheet = npe_meta$flik[i],
                                  col_names = FALSE)

    # Rad 4 = header med \u00e5rtal, rad 5\u201325 = regioner, rad 26 = Riket
    ar_vec <- as.numeric(df_raw[4, -1, drop = TRUE])
    regioner <- as.character(df_raw[5:25, 1, drop = TRUE])
    n_regioner <- length(regioner)
    riket_rad <- as.numeric(df_raw[26, -1, drop = TRUE])

    # Matris med regionv\u00e4rden
    val_mat <- as.data.frame(df_raw[5:25, -1])
    for (j in seq_along(val_mat)) val_mat[[j]] <- as.numeric(val_mat[[j]])
    names(val_mat) <- ar_vec

    # Hitta Halland
    halland_idx <- which(regioner == "Halland")
    halland_vals <- as.numeric(val_mat[halland_idx, ])

    # Ranking per \u00e5r (rank 1 = h\u00f6gst)
    ranker <- sapply(seq_along(ar_vec), function(j) {
      vals <- as.numeric(val_mat[, j])
      rank(-vals, ties.method = "min")[halland_idx]
    })

    senaste_rank <- tail(ranker, 1)
    senaste_val  <- tail(halland_vals, 1)
    senaste_riket <- tail(riket_rad, 1)

    # Signal baserad p\u00e5 senaste ranking (config-styrda tr\u00f6sklar)
    signal <- sig_fn(senaste_rank)

    # F\u00f6r\u00e4ndring mot f\u00f6reg\u00e5ende m\u00e4tning
    forandring <- if (length(halland_vals) >= 2) {
      round(senaste_val - halland_vals[length(halland_vals) - 1], 1)
    } else 0

    # Tidsserie
    tidsserie <- lapply(seq_along(ar_vec), function(j) {
      sig_j <- sig_fn(ranker[j])
      list(
        period  = paste0(ar_vec[j], "-01-01"),
        etikett = as.character(ar_vec[j]),
        varde   = round(halland_vals[j], 1),
        yhat    = round(riket_rad[j], 1),
        signal  = sig_j
      )
    })

    # Referens: Riket senaste \u00e5r
    referens <- list(
      period     = paste0(tail(ar_vec, 1), "-01-01"),
      etikett    = paste0("Riket ", tail(ar_vec, 1)),
      varde      = round(senaste_riket, 1),
      forandring = round(senaste_val - senaste_riket, 1)
    )

    # Analystext
    rank_text <- paste0("plats ", senaste_rank, " av ", n_regioner, " regioner")
    rikt <- if (forandring > 0) "en \u00f6kning" else if (forandring < 0) "en minskning" else "of\u00f6r\u00e4ndrat"
    f_str <- paste0(abs(forandring), " procentenheter")
    jmf_riket <- if (senaste_val > senaste_riket) {
      paste0(round(senaste_val - senaste_riket, 1), " procentenheter \u00f6ver rikssnittet")
    } else if (senaste_val < senaste_riket) {
      paste0(round(senaste_riket - senaste_val, 1), " procentenheter under rikssnittet")
    } else "i niv\u00e5 med rikssnittet"

    analystext <- paste0(
      npe_meta$namn[i], " ligger p\u00e5 ", round(senaste_val, 1),
      " procent positiva svar (", rank_text, "), ",
      jmf_riket, "."
    )
    if (forandring != 0) {
      analystext <- paste0(analystext, " J\u00e4mf\u00f6rt med f\u00f6reg\u00e5ende m\u00e4tning \u00e4r det ",
                           rikt, " med ", f_str, ".")
    }

    # Riket-serie (streckad referenslinje)
    riket_serie <- lapply(seq_along(ar_vec), function(j) {
      list(
        period  = paste0(ar_vec[j], "-01-01"),
        etikett = as.character(ar_vec[j]),
        varde   = round(riket_rad[j], 1)
      )
    })

    npe_kpier[[i]] <- list(
      id          = npe_meta$id[i],
      namn        = npe_meta$namn[i],
      enhet       = "procent",
      inverterad  = FALSE,
      senaste     = round(senaste_val, 1),
      forandring  = forandring,
      forandringar = list(
        list(etikett = "m\u00e4tning", varde = forandring)
      ),
      status      = signal,
      analystext  = analystext,
      tidsserie   = tidsserie,
      referens    = referens,
      riket_serie    = riket_serie,
      malniva        = mal_niva[[npe_meta$id[i]]]
    )

    cat(sprintf("  %s: %.1f%% (rank %d \u2192 %s)\n",
                npe_meta$namn[i], senaste_val, senaste_rank, signal))
  }

  # Sammanfattande analys f\u00f6r sektionen
  n_rod <- sum(sapply(npe_kpier, \(k) k$status == "rod"))
  n_gul <- sum(sapply(npe_kpier, \(k) k$status == "gul"))
  sek_analys <- if (n_rod == 0 && n_gul == 0) {
    "Patientenk\u00e4ten visar att Region Halland ligger bland de tre b\u00e4sta regionerna i samtliga dimensioner."
  } else if (n_rod == 0) {
    "Patientenk\u00e4ten visar goda resultat \u00f6verlag, men enstaka dimensioner ligger utanf\u00f6r topp tre."
  } else {
    avvik_namn <- sapply(npe_kpier[sapply(npe_kpier, \(k) k$status == "rod")], \(k) k$namn)
    paste0("Patientenk\u00e4ten visar att ", paste(avvik_namn, collapse = " och "),
           " kr\u00e4ver uppm\u00e4rksamhet \u2014 Halland hamnar utanf\u00f6r topp sju bland regionerna.")
  }

  cat("Patientenk\u00e4ten tillagd i \u00e5rsvyn\n")

  list(
    id     = patientenkat$id,
    namn   = patientenkat$namn,
    analys = sek_analys,
    kpier  = npe_kpier
  )
}
