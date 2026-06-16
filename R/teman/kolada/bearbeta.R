# bearbeta.R — Kolada: Hälso- och sjukvårdsrapporten (SKR)
# Läser data/kolada-hos.rds och bygger EN sektion ("skr") med sex tematiska
# delar (SKR-rapportens indelning, se config.R). Varje del får en egen
# översiktsanalys. Halland är fokus; ranking-baserade kvartilsignaler,
# kontext_serier (övriga regioner) och riket_serie per indikator.
# Returnerar en lista med en sektion (samma kontrakt som övriga teman).
# Kräver: kolada_tema (R/teman/kolada/config.R), dplyr

bearbeta_kolada <- function() {
  fil <- kolada_tema$datakalla
  if (!file.exists(fil)) {
    cat("OBS: Kolada-data (", fil, ") saknas — hoppar över\n")
    return(NULL)
  }

  cat("Bygger Hälso- och sjukvårdsrapporten (SKR)...\n")
  kol <- readRDS(fil)
  fokus <- kolada_tema$fokus_region
  riket <- kolada_tema$riket_id

  # Totalvärden (kön = T), begränsade tidsserier, utan saknade värden
  dat <- kol$data |>
    filter(kon == "T", !is.na(varde), ar >= kolada_tema$min_ar)

  riktning_for <- function(kpi_id) {
    if (kpi_id %in% kolada_tema$riktning_lag) "lag"
    else if (kpi_id %in% kolada_tema$riktning_neutral) "neutral"
    else "hog"
  }

  # Rank för fokusregionen ett givet år, bland regioner med värde (ej Riket).
  # Returnerar list(rank, n) eller NULL om fokus saknar värde/neutral riktning.
  rank_ar <- function(df_ar, riktning) {
    df_r <- df_ar |> filter(region_id != riket)
    i <- which(df_r$region_id == fokus)
    if (length(i) == 0 || riktning == "neutral") return(NULL)
    v <- if (riktning == "lag") df_r$varde else -df_r$varde
    list(rank = rank(v, ties.method = "min")[i], n = nrow(df_r))
  }

  # Rankingsignal: i fas = topp 3, bevaka = plats 4–7, avvikelse = plats 8+
  g_gron <- kolada_tema$ranking$grans_gron
  g_gul  <- kolada_tema$ranking$grans_gul
  sig_fn <- function(rank, n) {
    if (is.null(rank)) return("gron")
    if (rank <= g_gron) "gron" else if (rank <= g_gul) "gul" else "rod"
  }

  # Kort visningsnamn: manuellt kortnamn om satt, annars regex-trimmade
  # enhets-/årssuffix. Fullständig titel flyttas till beskrivningen.
  kort_namn <- function(kpi_id, titel) {
    manuell <- kolada_tema$kortnamn[kpi_id]
    if (!is.na(manuell)) return(unname(manuell))
    t <- titel
    t <- sub("\\s*\\(-\\d{4}\\)\\s*$", "", t)            # "(-2023)"-markör
    t <- sub(",?\\s*andel\\s*\\(%\\)\\.?\\s*$", "", t)   # ", andel (%)"
    t <- sub(",?\\s*\\(%\\)\\s*$", "", t)                # ", (%)"
    t <- sub(",?\\s*index\\s*$", "", t)                  # ", index"
    t <- sub(",\\s*antal[^,]*", "", t)                   # ", antal/100 000 inv"
    t <- sub(",\\s*kr/[^,]*", "", t)                     # ", kr/inv"
    trimws(t)
  }

  bygg_kpi <- function(kpi_id) {
    meta <- kol$indikatorer |> filter(id == kpi_id)
    if (nrow(meta) == 0) return(NULL)
    d <- dat |> filter(kpi == kpi_id)
    d_fokus <- d |> filter(region_id == fokus) |> arrange(ar)
    if (nrow(d_fokus) < 1) return(NULL)

    riktning <- riktning_for(kpi_id)
    enhet <- if (grepl("\\(%\\)|andel", meta$title, ignore.case = TRUE)) "procent" else "antal"
    dec <- 1
    namn <- kort_namn(kpi_id, meta$title)

    # Rank + signal per år (fokusregionens år)
    rank_per_ar <- lapply(d_fokus$ar, function(a) rank_ar(d |> filter(ar == a), riktning))
    signaler <- vapply(rank_per_ar, function(r) sig_fn(r$rank, r$n), character(1))

    tidsserie <- lapply(seq_len(nrow(d_fokus)), function(j) {
      list(period  = paste0(d_fokus$ar[j], "-01-01"),
           etikett = as.character(d_fokus$ar[j]),
           varde   = round(d_fokus$varde[j], dec),
           signal  = signaler[j])
    })

    senaste_ar  <- max(d_fokus$ar)
    senaste_val <- d_fokus$varde[d_fokus$ar == senaste_ar]
    senaste_rk  <- rank_per_ar[[length(rank_per_ar)]]
    status      <- signaler[length(signaler)]
    forandring  <- if (nrow(d_fokus) >= 2) {
      round(senaste_val - d_fokus$varde[nrow(d_fokus) - 1], dec)
    } else 0

    # Riket: streckad referenslinje + referensobjekt
    d_riket <- d |> filter(region_id == riket) |> arrange(ar)
    riket_serie <- if (nrow(d_riket) > 0) {
      lapply(seq_len(nrow(d_riket)), function(j) {
        list(period  = paste0(d_riket$ar[j], "-01-01"),
             etikett = as.character(d_riket$ar[j]),
             varde   = round(d_riket$varde[j], dec))
      })
    } else NULL
    riket_senaste <- if (nrow(d_riket) > 0) tail(d_riket$varde, 1) else NA

    referens <- if (!is.na(riket_senaste)) {
      list(period  = paste0(senaste_ar, "-01-01"),
           etikett = paste0("Riket ", max(d_riket$ar)),
           varde   = round(riket_senaste, dec),
           forandring = round(senaste_val - riket_senaste, dec))
    } else NULL

    # Topp 3-band: spannet mellan bästa och tredje bästa regionvärdet per år
    # (riktningsmedvetet). Ritas som grönt band i grafen — "i fas"-zonen.
    topp3_band <- if (riktning == "neutral") NULL else {
      d_reg <- d |> filter(region_id != riket)
      ar_lista <- sort(unique(d_reg$ar))
      rader <- lapply(ar_lista, function(a) {
        v <- d_reg$varde[d_reg$ar == a]
        if (length(v) < 2) return(NULL)
        sorterat <- sort(v, decreasing = (riktning == "hog"))
        tredje <- sorterat[min(3, length(sorterat))]
        list(period  = paste0(a, "-01-01"),
             etikett = as.character(a),
             lo = round(min(sorterat[1], tredje), dec),
             hi = round(max(sorterat[1], tredje), dec))
      })
      rader <- Filter(Negate(is.null), rader)
      if (length(rader) >= 2) rader else NULL
    }

    # Kontextlinjer: alla övriga regioner
    kontext_serier <- d |>
      filter(!region_id %in% c(fokus, riket)) |>
      arrange(region, ar) |>
      group_by(region_id, region) |>
      group_map(function(g, key) {
        list(id   = key$region_id,
             namn = sub("^Region ", "", key$region),
             tidsserie = lapply(seq_len(nrow(g)), function(j) {
               list(period  = paste0(g$ar[j], "-01-01"),
                    etikett = as.character(g$ar[j]),
                    varde   = round(g$varde[j], dec))
             }))
      })

    # Status föregående år — underlag för utvecklingsbedömning i del/sektion
    status_fg <- if (length(signaler) >= 2) signaler[length(signaler) - 1] else status

    # ── Analystext: nuläge → riketrelation → utveckling → positionering ──
    fmt_v <- function(x) format(round(x, dec), big.mark = " ", decimal.mark = ",",
                                trim = TRUE, scientific = FALSE)
    suffix <- if (enhet == "procent") " procent" else ""

    # Utvecklingsfönster: upp till ~5 år bakåt
    i0 <- max(1, nrow(d_fokus) - 5)
    v0 <- d_fokus$varde[i0]; ar0 <- d_fokus$ar[i0]

    analystext <- if (riktning == "neutral") {
      utv <- if (nrow(d_fokus) >= 4) {
        rel <- abs(senaste_val - v0) / max(abs(v0), 1e-9)
        if (rel < 0.03) paste0(" Nivån har varit i huvudsak stabil sedan ", ar0, ".")
        else paste0(" Sedan ", ar0, " har nivån ",
                    if (senaste_val > v0) "ökat" else "minskat",
                    " från ", fmt_v(v0), " till ", fmt_v(senaste_val), ".")
      } else ""
      paste0(namn, " ligger på ", fmt_v(senaste_val), suffix, " (", senaste_ar, ").",
             utv, " Måttet är ett volym-/strukturmått utan målriktning och färgsätts därför inte.")
    } else {
      r <- senaste_rk$rank; m <- senaste_rk$n

      # Nuläge — formuleringen följer status så att texterna inte blir likformiga
      nulage <- if (status == "gron") {
        paste0("Halland är i fas: ", fmt_v(senaste_val), suffix,
               " placerar regionen på plats ", r, " av ", m, " (", senaste_ar, ").")
      } else if (status == "gul") {
        paste0("Halland ligger på ", fmt_v(senaste_val), suffix, ", plats ", r,
               " av ", m, " (", senaste_ar,
               ") — under bevakning, utanför topp 3 men i det övre skiktet.")
      } else {
        paste0("Halland ligger på ", fmt_v(senaste_val), suffix, ", plats ", r,
               " av ", m, " (", senaste_ar, ") — en avvikelse mot målet topp 3.")
      }

      # Relation till riket (riktningsmedveten: "bättre/sämre", inte "över/under")
      riket_txt <- if (is.na(riket_senaste)) "" else {
        diff <- senaste_val - riket_senaste
        battre <- if (riktning == "lag") diff < 0 else diff > 0
        if (abs(diff) < 0.01 * max(abs(riket_senaste), 1e-9)) {
          paste0(" Nivån är i paritet med rikssnittet (", fmt_v(riket_senaste), suffix, ").")
        } else if (battre) {
          paste0(" Det är bättre än rikssnittet på ", fmt_v(riket_senaste), suffix, ".")
        } else {
          paste0(" Det är sämre än rikssnittet på ", fmt_v(riket_senaste), suffix, ".")
        }
      }

      # Utveckling i utfall över fönstret (förbättring = rörelse i rätt riktning)
      utv_txt <- if (nrow(d_fokus) >= 4) {
        f <- if (riktning == "lag") v0 - senaste_val else senaste_val - v0
        rel <- abs(f) / max(abs(v0), 1e-9)
        if (rel < 0.03) paste0(" Utvecklingen sedan ", ar0, " är i huvudsak stabil.")
        else if (f > 0) paste0(" Sedan ", ar0, " har utfallet förbättrats, från ",
                               fmt_v(v0), " till ", fmt_v(senaste_val), ".")
        else paste0(" Sedan ", ar0, " har utfallet försämrats, från ",
                    fmt_v(v0), " till ", fmt_v(senaste_val), ".")
      } else ""

      # Positionering över tid — nämns bara vid tydlig förflyttning (≥2 platser)
      pos_txt <- {
        i0r <- max(1, length(rank_per_ar) - 5)
        r0 <- rank_per_ar[[i0r]]$rank
        if (!is.null(r0) && length(rank_per_ar) >= 4) {
          d_r <- r0 - r
          if (d_r >= 2) paste0(" Positioneringen bland regionerna har samtidigt stärkts, från plats ",
                               r0, " till plats ", r, ".")
          else if (d_r <= -2) paste0(" Positioneringen bland regionerna har samtidigt försvagats, från plats ",
                                     r0, " till plats ", r, ".")
          else ""
        } else ""
      }

      paste0(nulage, riket_txt, utv_txt, pos_txt)
    }

    kpi_obj <- list(
      id          = paste0("kolada-", tolower(kpi_id)),
      namn        = namn,
      enhet       = enhet,
      inverterad  = riktning == "lag",
      senaste     = round(senaste_val, dec),
      forandring  = forandring,
      forandringar = list(list(etikett = "år", varde = forandring)),
      status      = status,
      status_fg   = status_fg,
      analystext  = analystext,
      # Infoknappen: fullständig Kolada-titel + definition
      beskrivning = paste0(meta$title, " — ", meta$description),
      tidsserie   = tidsserie,
      kontext_serier = kontext_serier
    )
    if (!is.null(riket_serie)) kpi_obj$riket_serie <- riket_serie
    if (!is.null(referens))    kpi_obj$referens    <- referens
    if (!is.null(topp3_band))  kpi_obj$topp3_band  <- topp3_band
    kpi_obj
  }

  # ── Översiktsbedömningar: konstaterande av läget + bedömning av nuläge
  #    och utveckling — ingen uppräkning av enskilda indikatorer. ──
  bedom_nulage <- function(n_gron, n_rod, n) {
    if (n_rod == 0 && n_gron >= n / 2) "ett starkt läge"
    else if (n_gron >= 0.4 * n) "ett förhållandevis starkt läge"
    else if (n_rod > n_gron) "ett ansträngt läge"
    else "ett blandat läge"
  }
  bedom_utveckling <- function(d_gron, d_rod) {
    if (d_gron > 0) paste0("en förbättring jämfört med föregående år (", d_gron, " fler i fas)")
    else if (d_gron < 0) paste0("en försvagning jämfört med föregående år (", abs(d_gron), " färre i fas)")
    else if (d_rod < 0) "en viss förbättring jämfört med föregående år (färre utanför)"
    else if (d_rod > 0) "en viss försvagning jämfört med föregående år (fler utanför)"
    else "ett i stort sett oförändrat läge jämfört med föregående år"
  }

  del_analys <- function(namn, kpier) {
    statusar <- vapply(kpier, function(k) k$status, character(1))
    fg       <- vapply(kpier, function(k) k$status_fg %||% k$status, character(1))
    n <- length(kpier)
    n_gron <- sum(statusar == "gron"); n_gul <- sum(statusar == "gul"); n_rod <- sum(statusar == "rod")
    d_gron <- n_gron - sum(fg == "gron"); d_rod <- n_rod - sum(fg == "rod")
    paste0(namn, " omfattar ", n, " indikatorer: ", n_gron, " är i fas (topp ", g_gron,
           "), ", n_gul, " under bevakning (plats ", g_gron + 1, "–", g_gul,
           ") och ", n_rod, " utanför (plats ", g_gul + 1, " eller lägre). Sammantaget ",
           bedom_nulage(n_gron, n_rod, n), ", och ", bedom_utveckling(d_gron, d_rod), ".")
  }

  # ── Bygg delar i konfigurerad ordning + fånga oklassade ──
  klassade <- unlist(lapply(kolada_tema$delar, function(d) d$kpier))
  oklassade <- setdiff(kol$indikatorer$id, klassade)
  del_lista <- kolada_tema$delar
  if (length(oklassade) > 0) {
    cat("  OBS: ", length(oklassade), " oklassade KPI:er läggs i Övrigt: ",
        paste(oklassade, collapse = ", "), "\n", sep = "")
    del_lista <- c(del_lista, list(list(id = "ovrigt", namn = "Övrigt",
                                        kpier = oklassade)))
  }

  alla_kpier <- list()
  delar <- list()
  for (del in del_lista) {
    kpier <- Filter(Negate(is.null), lapply(del$kpier, bygg_kpi))
    if (length(kpier) == 0) next
    statusar <- vapply(kpier, function(k) k$status, character(1))
    delar[[length(delar) + 1]] <- list(
      id      = del$id,
      namn    = del$namn,
      analys  = del_analys(del$namn, kpier),
      # as.list: garantera JSON-array även för en ensam KPI (auto_unbox)
      kpi_ids = as.list(vapply(kpier, function(k) k$id, character(1)))
    )
    alla_kpier <- c(alla_kpier, kpier)
    cat(sprintf("  %s: %d indikatorer (%d grön, %d gul, %d röd)\n",
                del$namn, length(kpier), sum(statusar == "gron"),
                sum(statusar == "gul"), sum(statusar == "rod")))
  }

  # Sektionsövergripande analys — konstaterande + bedömning, ingen uppräkning
  statusar <- vapply(alla_kpier, function(k) k$status, character(1))
  fg_alla  <- vapply(alla_kpier, function(k) k$status_fg %||% k$status, character(1))
  n_gron_t <- sum(statusar == "gron"); n_gul_t <- sum(statusar == "gul"); n_rod_t <- sum(statusar == "rod")
  sek_analys <- paste0(
    "Hälso- och sjukvårdsrapporten jämför ", length(alla_kpier),
    " indikatorer mellan regionerna, indelade i ", length(delar), " delar. ",
    "Halland är i fas (topp ", g_gron, ") för ", n_gron_t,
    " indikatorer, under bevakning för ", n_gul_t, " och utanför för ", n_rod_t,
    ". Sammantaget ", bedom_nulage(n_gron_t, n_rod_t, length(alla_kpier)),
    ", och ", bedom_utveckling(n_gron_t - sum(fg_alla == "gron"),
                               n_rod_t - sum(fg_alla == "rod")), ".")

  cat("Hälso- och sjukvårdsrapporten (SKR) tillagd i årsvyn\n")

  list(list(
    id     = kolada_tema$id,
    namn   = kolada_tema$namn,
    analys = sek_analys,
    kpier  = alla_kpier,
    delar  = delar
  ))
}
