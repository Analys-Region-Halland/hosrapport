# bearbeta.R — Hälso- och sjukvårdsrapporten (SKR), ett kapitel per sektion
#
# Läser data/kolada-hos.rds och bygger SEX sektioner, en per kapitel i SKR:s
# rapport (se config.R). Varje sektion är en fristående rapport:
#   inledning  redaktionell kontext (ram + kapitlets egna stycken + läsanvisning)
#   analys     bedömning av kapitlets läge, byggd av statusfördelningen
#   delar      kapitlets tematiska avsnitt, med egen bedömning
#   kallor     kapitlets primärkällor, en post per källa (kallor.R)
#   kpier      indikatorerna, var och en med sin egen källa
#
# Halland är fokus. Rankingbaserade signaler, kontext_serier (övriga regioner)
# och riket_serie per indikator. Returnerar en lista med sektioner (samma
# kontrakt som övriga teman).
#
# Kräver: kolada_tema (config.R), källregistret (kallor.R), dplyr

source("R/teman/kolada/kallor.R")
source("R/teman/kolada/indikatorfakta.R")

bearbeta_kolada <- function() {
  fil <- kolada_tema$datakalla
  if (!file.exists(fil)) {
    cat("OBS: Kolada-data (", fil, ") saknas — hoppar över\n")
    return(NULL)
  }

  cat("Bygger Hälso- och sjukvårdsrapportens kapitel...\n")
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
    enhet <- if (kpi_id %in% kolada_tema$procent_kpier ||
                 grepl("\\(%\\)|andel", meta$title, ignore.case = TRUE)) "procent" else "antal"
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

    # Analystext: position och nivå, målsättning, utveckling, relativt läge.
    # Ordningen är fast och målet för ranking-KPI:er är en placering bland de
    # tre främsta regionerna ("topp 3"). Inga em-streck i den genererade texten.
    fmt_v <- function(x) format(round(x, dec), big.mark = " ", decimal.mark = ",",
                                trim = TRUE, scientific = FALSE)
    suffix <- if (enhet == "procent") " procent" else ""

    # Utvecklingsfönster: upp till ~5 år bakåt
    i0 <- max(1, nrow(d_fokus) - 5)
    v0 <- d_fokus$varde[i0]; ar0 <- d_fokus$ar[i0]

    analystext <- if (riktning == "neutral") {
      # Neutralt mått: nivå, utveckling, konstaterande om utebliven målriktning.
      utv <- if (nrow(d_fokus) >= 4) {
        rel <- abs(senaste_val - v0) / max(abs(v0), 1e-9)
        if (rel < 0.03) paste0(" Nivån har varit i huvudsak stabil sedan ", ar0, ".")
        else paste0(" Sedan ", ar0, " har nivån ",
                    if (senaste_val > v0) "ökat" else "minskat",
                    " från ", fmt_v(v0), " till ", fmt_v(senaste_val), ".")
      } else ""
      paste0(namn, " ligger på ", fmt_v(senaste_val), suffix, " (", senaste_ar, ").",
             utv, " Måttet är ett volym- eller strukturmått utan målriktning och färgsätts därför inte.")
    } else {
      r <- senaste_rk$rank; m <- senaste_rk$n

      # 1. Position och nivå: fastställ Hallands faktiska värde och placering.
      nulage <- paste0("Region Halland redovisar ett utfall på ",
                       fmt_v(senaste_val), suffix, " (", senaste_ar, ")",
                       " och placerar sig på plats ", r, " av ", m,
                       " bland regionerna.")

      # 2. Målsättning: målet är en placering bland de tre främsta (topp 3).
      #    Grön möter målet, gul ligger strax under, röd ligger under målet.
      mal_txt <- if (status == "gron") {
        " Placeringen möter målsättningen om en plats bland de tre främsta regionerna."
      } else if (status == "gul") {
        paste0(" Resultatet ligger strax under målsättningen om en plats bland de tre",
               " främsta: regionen står utanför topp 3 men håller sig i det övre skiktet.")
      } else {
        " Resultatet ligger under målsättningen om en plats bland de tre främsta regionerna."
      }

      # 3. Utveckling i utfallet över fönstret (förbättring = rätt riktning).
      #    Obligatorisk del: produceras så snart minst två mätningar finns
      #    (första-till-senaste-jämförelse), oavsett periodens längd.
      utv_txt <- if (nrow(d_fokus) >= 2) {
        f <- if (riktning == "lag") v0 - senaste_val else senaste_val - v0
        rel <- abs(f) / max(abs(v0), 1e-9)
        if (rel < 0.03) paste0(" Nivån har varit i huvudsak stabil sedan ", ar0, ".")
        else if (f > 0) paste0(" Sedan ", ar0, " har utfallet förbättrats, från ",
                               fmt_v(v0), " till ", fmt_v(senaste_val), ".")
        else paste0(" Sedan ", ar0, " har utfallet försämrats, från ",
                    fmt_v(v0), " till ", fmt_v(senaste_val), ".")
      } else ""

      # 4a. Ranking-utveckling: nämns bara vid tydlig förflyttning (minst 2 platser).
      pos_txt <- {
        i0r <- max(1, length(rank_per_ar) - 5)
        r0 <- rank_per_ar[[i0r]]$rank
        if (!is.null(r0) && length(rank_per_ar) >= 4) {
          d_r <- r0 - r
          if (d_r >= 2) paste0(" Placeringen bland regionerna har samtidigt stärkts, från plats ",
                               r0, " till plats ", r, ".")
          else if (d_r <= -2) paste0(" Placeringen bland regionerna har samtidigt försvagats, från plats ",
                                     r0, " till plats ", r, ".")
          else ""
        } else ""
      }

      # 4b. Relation till rikssnittet (riktningsmedveten: bättre eller sämre).
      riket_txt <- if (is.na(riket_senaste)) "" else {
        diff <- senaste_val - riket_senaste
        battre <- if (riktning == "lag") diff < 0 else diff > 0
        if (abs(diff) < 0.01 * max(abs(riket_senaste), 1e-9)) {
          paste0(" Sett till riket ligger regionen i paritet med rikssnittet på ",
                 fmt_v(riket_senaste), suffix, ".")
        } else if (battre) {
          paste0(" Sett till riket står sig regionen bättre än rikssnittet på ",
                 fmt_v(riket_senaste), suffix, ".")
        } else {
          paste0(" Sett till riket står sig regionen sämre än rikssnittet på ",
                 fmt_v(riket_senaste), suffix, ".")
        }
      }

      # Sammansättning: position och nivå, mål, utveckling, relativt läge.
      paste0(nulage, mal_txt, utv_txt, pos_txt, riket_txt)
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
      # Infoknappen: fullständig Kolada-titel + definition.
      # Em-strecket är separator, inte prosa: kortBeskrivning() i frontend
      # delar på det för att slippa upprepa titeln i undertexten.
      beskrivning = paste0(meta$title, " — ", meta$description),
      # Varifrån siffran faktiskt kommer: primärkälla + Koladas egen
      # formulering ordagrant. Se R/teman/kolada/kallor.R.
      kalla       = kalla_for_kpi(kpi_id, meta$description),
      # Redaktionellt faktaunderlag: vad måttet är, åt vilket håll det ska gå
      # och vad som drar i det. Sätts bara för indikatorer som har en post i
      # R/teman/kolada/indikatorfakta.R (i dag kapitel 1 och 2).
      tidsserie   = tidsserie,
      kontext_serier = kontext_serier
    )
    if (!is.null(riket_serie)) kpi_obj$riket_serie <- riket_serie
    if (!is.null(referens))    kpi_obj$referens    <- referens
    if (!is.null(topp3_band))  kpi_obj$topp3_band  <- topp3_band
    # Placering bland regionerna (saknas för neutrala mått utan rankning).
    if (!is.null(senaste_rk)) {
      kpi_obj$rank    <- senaste_rk$rank
      kpi_obj$rank_av <- senaste_rk$n
    }
    # Volym-/strukturmått utan målriktning visas med neutralt chip i frontend.
    if (riktning == "neutral") kpi_obj$utan_mal <- TRUE
    # Faktablocket (om indikatorn + påverkansfaktorer), när det finns.
    fakta <- indikatorfakta_for(kpi_id)
    if (!is.null(fakta)) kpi_obj$fakta <- fakta
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

  # Räkna status för en uppsättning KPI-objekt.
  rakna <- function(kpier) {
    s  <- vapply(kpier, function(k) k$status, character(1))
    fg <- vapply(kpier, function(k) k$status_fg %||% k$status, character(1))
    list(n = length(kpier),
         gron = sum(s == "gron"), gul = sum(s == "gul"), rod = sum(s == "rod"),
         d_gron = sum(s == "gron") - sum(fg == "gron"),
         d_rod  = sum(s == "rod")  - sum(fg == "rod"))
  }

  # Bedömning av ett avsnitt inom ett kapitel.
  avsnitt_analys <- function(namn, kpier) {
    r <- rakna(kpier)
    paste0(namn, " omfattar ", r$n, " indikatorer. Av dessa är ", r$gron,
           " i fas med målet topp ", g_gron, ", ", r$gul,
           " ligger under bevakning (plats ", g_gron + 1, "–", g_gul,
           ") och ", r$rod, " hamnar utanför (plats ", g_gul + 1,
           " eller lägre). Sammantaget visar avsnittet ",
           bedom_nulage(r$gron, r$rod, r$n), ", och ",
           bedom_utveckling(r$d_gron, r$d_rod), ".")
  }

  # Bedömning av ett helt kapitel.
  kapitel_analys <- function(namn, kpier, n_avsnitt) {
    r <- rakna(kpier)
    paste0(namn, " jämför ", r$n, " indikatorer mellan regionerna, fördelade på ",
           n_avsnitt, " avsnitt. Region Halland är i fas med målet topp ", g_gron,
           " för ", r$gron, " indikatorer, ligger under bevakning för ", r$gul,
           " och utanför för ", r$rod, ". Sammantaget visar kapitlet ",
           bedom_nulage(r$gron, r$rod, r$n), ", och ",
           bedom_utveckling(r$d_gron, r$d_rod), ".")
  }

  # ── Fånga indikatorer som inte placerats i något kapitel ──
  klassade <- unlist(lapply(kolada_tema$kapitel, skr_kapitel_kpier))
  oklassade <- setdiff(kol$indikatorer$id, klassade)
  kapitel_lista <- kolada_tema$kapitel
  if (length(oklassade) > 0) {
    cat("  OBS: ", length(oklassade), " oklassade indikatorer läggs i ett eget kapitel: ",
        paste(oklassade, collapse = ", "), "\n", sep = "")
    kapitel_lista <- c(kapitel_lista, list(list(
      id = "skr-ovrigt",
      namn = "Övriga indikatorer",
      inledning = paste0(
        "Kapitlet samlar de indikatorer i Koladas KPI-grupp som ännu inte ",
        "placerats i något av rapportens kapitel. De visas här i stället för ",
        "att tyst utelämnas, och flyttas när indelningen har uppdaterats."),
      delar = list(list(id = "ovrigt-oklassade", namn = "Oklassade indikatorer",
                        kpier = oklassade))
    )))
  }

  # ── Bygg en sektion per kapitel ──
  sektioner <- list()
  for (kap in kapitel_lista) {
    kap_kpier <- list()
    delar <- list()

    for (avsnitt in kap$delar) {
      kpier <- Filter(Negate(is.null), lapply(avsnitt$kpier, bygg_kpi))
      if (length(kpier) == 0) next
      delar[[length(delar) + 1]] <- list(
        id      = avsnitt$id,
        namn    = avsnitt$namn,
        analys  = avsnitt_analys(avsnitt$namn, kpier),
        # as.list: garantera JSON-array även för ett ensamt id (auto_unbox)
        kpi_ids = as.list(vapply(kpier, function(k) k$id, character(1)))
      )
      kap_kpier <- c(kap_kpier, kpier)
    }
    if (length(kap_kpier) == 0) next

    # Inledning: gemensam ram, kapitlets egna stycken, gemensam läsanvisning.
    # as.list ger en JSON-array även när kapitlet bara har ett eget stycke.
    inledning <- as.list(c(SKR_RAM, kap$inledning, SKR_LASANVISNING))

    r <- rakna(kap_kpier)
    sektioner[[length(sektioner) + 1]] <- list(
      id        = kap$id,
      namn      = kap$namn,
      analys    = kapitel_analys(kap$namn, kap_kpier, length(delar)),
      inledning = inledning,
      kallor    = kallforteckning(skr_kapitel_kpier(kap)),
      leverans  = SKR_VIA,
      kpier     = kap_kpier,
      delar     = delar
    )

    cat(sprintf("  %-24s %2d indikatorer i %d avsnitt (%d grön, %d gul, %d röd)\n",
                kap$id, r$n, length(delar), r$gron, r$gul, r$rod))
  }

  cat("Hälso- och sjukvårdsrapporten: ", length(sektioner),
      " kapitel tillagda i årsvyn\n", sep = "")
  sektioner
}
