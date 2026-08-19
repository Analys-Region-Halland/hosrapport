# bearbeta.R — Patientenkäten (NPE)
# Läser Excel, beräknar ranking-baserade signaler, returnerar en sektion.
# Kräver: readxl, patientenkat-config (register.R)

bearbeta_patientenkat <- function() {
  npe_fil <- patientenkat$datakalla

  if (!file.exists(npe_fil)) {
    cat("OBS: Patientenk\u00e4ten (", npe_fil, ") saknas, hoppar \u00f6ver\n")
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

    # Analystext: byggs i fyra steg
    #  1) Position och niv\u00e5  2) M\u00e5ls\u00e4ttning  3) Utveckling  4) Relativt
    namn_i      <- npe_meta$namn[i]
    senaste_ar  <- tail(ar_vec, 1)
    mal_i       <- mal_niva[[npe_meta$id[i]]]
    val_str     <- round(senaste_val, 1)
    rank_text   <- paste0("plats ", senaste_rank, " av ", n_regioner, " regioner")

    # (1) Position och niv\u00e5: niv\u00e5n (% positiva svar) + placering, formulerat efter status.
    del_position <- if (signal == "gron") {
      paste0(namn_i, " ligger p\u00e5 ", val_str,
             " procent positiva svar vid ", senaste_ar, "-\u00e5rs m\u00e4tning och placerar Region Halland p\u00e5 ",
             rank_text, ", vilket f\u00f6r regionen \u00e4r ett starkt utg\u00e5ngsl\u00e4ge.")
    } else if (signal == "gul") {
      paste0(namn_i, " ligger p\u00e5 ", val_str,
             " procent positiva svar vid ", senaste_ar, "-\u00e5rs m\u00e4tning, vilket ger Region Halland ",
             rank_text, ".")
    } else {
      paste0(namn_i, " ligger p\u00e5 ", val_str,
             " procent positiva svar vid ", senaste_ar, "-\u00e5rs m\u00e4tning, en niv\u00e5 som ger Region Halland ",
             rank_text, " och m\u00e5ste l\u00e4sas som ett f\u00f6rb\u00e4ttringsomr\u00e5de.")
    }

    # (2) M\u00e5ls\u00e4ttning: j\u00e4mf\u00f6r niv\u00e5n mot det numeriska m\u00e5let (mal_niva, %).
    del_mal <- if (is.null(mal_i) || is.na(mal_i)) {
      ""
    } else {
      diff_mal <- round(senaste_val - mal_i, 1)
      mal_str  <- paste0("m\u00e5lniv\u00e5n ", mal_i, " procent")
      if (diff_mal >= 1) {
        paste0(" Detta \u00e4r ", abs(diff_mal), " procentenheter \u00f6ver ", mal_str,
               ", och m\u00e5ls\u00e4ttningen \u00e4r d\u00e4rmed uppn\u00e5dd med god marginal.")
      } else if (diff_mal <= -1) {
        paste0(" Detta ligger ", abs(diff_mal), " procentenheter under ", mal_str,
               ", och m\u00e5ls\u00e4ttningen \u00e4r d\u00e4rmed \u00e4nnu inte n\u00e5dd.")
      } else {
        paste0(" Detta \u00e4r i linje med ", mal_str, ", och m\u00e5ls\u00e4ttningen kan betraktas som i allt v\u00e4sentligt uppfylld.")
      }
    }

    # (3) Utveckling: niv\u00e5ns r\u00f6relse \u00f6ver perioden (f\u00f6rsta till senaste m\u00e4tningen),
    #     annars f\u00f6r\u00e4ndring mot f\u00f6reg\u00e5ende m\u00e4tning. H\u00f6gre v\u00e4rde \u00e4r b\u00e4ttre.
    del_utv <- if (length(halland_vals) >= 2) {
      forsta_val <- round(halland_vals[1], 1)
      forsta_ar  <- ar_vec[1]
      diff_period <- round(senaste_val - forsta_val, 1)
      if (abs(diff_period) < 0.5) {
        paste0(" Sett \u00f6ver perioden fr\u00e5n ", forsta_ar, " till ", senaste_ar,
               " har niv\u00e5n varit i huvudsak stabil kring ", val_str, " procent.")
      } else if (diff_period > 0) {
        paste0(" Sett \u00f6ver perioden har niv\u00e5n stigit, fr\u00e5n ", forsta_val, " procent ", forsta_ar,
               " till ", val_str, " procent ", senaste_ar, ", en f\u00f6rb\u00e4ttring med ",
               abs(diff_period), " procentenheter.")
      } else {
        paste0(" Sett \u00f6ver perioden har niv\u00e5n fallit, fr\u00e5n ", forsta_val, " procent ", forsta_ar,
               " till ", val_str, " procent ", senaste_ar, ", en tillbakag\u00e5ng med ",
               abs(diff_period), " procentenheter.")
      }
    } else {
      ""
    }

    # (4) Relativt: relation till rikssnittet samt ranking-kontext bland regionerna.
    diff_riket <- round(senaste_val - senaste_riket, 1)
    jmf_riket <- if (diff_riket > 0) {
      paste0("ligger Region Halland ", abs(diff_riket),
             " procentenheter \u00f6ver rikssnittet p\u00e5 ", round(senaste_riket, 1), " procent")
    } else if (diff_riket < 0) {
      paste0("ligger Region Halland ", abs(diff_riket),
             " procentenheter under rikssnittet p\u00e5 ", round(senaste_riket, 1), " procent")
    } else {
      paste0("ligger Region Halland i niv\u00e5 med rikssnittet p\u00e5 ", round(senaste_riket, 1), " procent")
    }
    rank_kontext <- if (senaste_rank <= g_gron) {
      paste0(" och tillh\u00f6r de fr\u00e4msta regionerna i landet")
    } else if (senaste_rank <= g_gul) {
      paste0(" och placerar sig i det \u00f6vre skiktet bland regionerna")
    } else {
      paste0(" och har flera regioner framf\u00f6r sig i j\u00e4mf\u00f6relsen")
    }
    del_relativt <- paste0(" I en j\u00e4mf\u00f6relse med riket ", jmf_riket, rank_kontext, ".")

    analystext <- paste0(del_position, del_mal, del_utv, del_relativt)

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
    "Patientenk\u00e4ten visar goda resultat \u00f6verlag, \u00e4ven om enstaka dimensioner ligger utanf\u00f6r topp tre."
  } else {
    avvik_namn <- sapply(npe_kpier[sapply(npe_kpier, \(k) k$status == "rod")], \(k) k$namn)
    paste0("Patientenk\u00e4ten visar att ", paste(avvik_namn, collapse = " och "),
           " kr\u00e4ver s\u00e4rskild uppm\u00e4rksamhet, eftersom Region Halland h\u00e4r hamnar utanf\u00f6r topp sju bland regionerna.")
  }

  cat("Patientenk\u00e4ten tillagd i \u00e5rsvyn\n")

  list(
    id     = patientenkat$id,
    namn   = patientenkat$namn,
    analys = sek_analys,
    kpier  = npe_kpier
  )
}
