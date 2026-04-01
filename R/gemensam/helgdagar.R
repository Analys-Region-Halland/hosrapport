# helgdagar.R — Komplett svensk kalender utan externa beroenden
#
# Beräknar röda dagar, helgdagsaftnar, halvdagar, klämdagar och skollov.
# Alla rörliga helgdagar härleds från påskdagen via Meeus/Jones/Butcher.
#
# Funktioner:
#   paskdagen(ar)                  Påskdagen (Date) för givet år
#   svenska_helgdagar(ar_vektor)   Röda dagar + helgdagsaftnar
#   svenska_halvdagar(ar_vektor)   Halvdagar (skärtorsdag, valborg m.fl.)
#   svenska_klamdagar(ar_vektor)   Klämdagar (vardagar inklämda helgdag-helg)
#   svenska_skollov(ar_vektor)     Skollov Halland (sportlov v8 etc.)
#   bygg_kalender(start, slut)     Komplett dagskalender med alla flaggor

# ══════════════════════════════════════════════════════════
#  PÅSKBERÄKNING — Meeus/Jones/Butcher-algoritmen
# ══════════════════════════════════════════════════════════

paskdagen <- function(ar) {
  # Vektoriserad: tar en vektor av år, returnerar vektor av Date
  a <- ar %% 19
  b <- ar %/% 100
  c <- ar %% 100
  d <- b %/% 4
  e <- b %% 4
  f <- (b + 8) %/% 25
  g <- (b - f + 1) %/% 3
  h <- (19 * a + b - d - g + 15) %% 30
  i <- c %/% 4
  k <- c %% 4
  l <- (32 + 2 * e + 2 * i - h - k) %% 7
  m <- (a + 11 * h + 22 * l) %/% 451
  manad <- (h + l - 7 * m + 114) %/% 31
  dag   <- ((h + l - 7 * m + 114) %% 31) + 1
  as.Date(paste(ar, manad, dag, sep = "-"))
}

# ══════════════════════════════════════════════════════════
#  HJÄLPFUNKTIONER
# ══════════════════════════════════════════════════════════

forsta_lordag <- function(datum) {
  # Första lördagen på eller efter givet datum
  # Lördag = 6 i ISO-veckodagar (%u)
  vd <- as.integer(format(datum, "%u"))
  datum + (6L - vd) %% 7L
}

iso_mandag <- function(ar, vecka) {
  # Måndagen i ISO-vecka `vecka` av år `ar`
  # 4 januari tillhör alltid ISO-vecka 1
  jan4 <- as.Date(paste0(ar, "-01-04"))
  vd   <- as.integer(format(jan4, "%u"))
  mandag_v1 <- jan4 - (vd - 1)
  mandag_v1 + (vecka - 1) * 7
}

# ══════════════════════════════════════════════════════════
#  HELGDAGAR — Röda dagar + helgdagsaftnar
# ══════════════════════════════════════════════════════════

svenska_helgdagar <- function(ar_vektor) {
  bind_rows(lapply(ar_vektor, function(ar) {
    pask <- paskdagen(ar)
    mids <- forsta_lordag(as.Date(paste0(ar, "-06-20")))
    ahd  <- forsta_lordag(as.Date(paste0(ar, "-10-31")))

    tibble(
      ds = c(
        as.Date(paste0(ar, "-01-01")),   # Nyårsdagen
        as.Date(paste0(ar, "-01-06")),   # Trettondedag jul
        pask - 2,                         # Långfredagen
        pask,                             # Påskdagen
        pask + 1,                         # Annandag påsk
        as.Date(paste0(ar, "-05-01")),   # Första maj
        pask + 39,                        # Kristi himmelsfärdsdag
        pask + 49,                        # Pingstdagen
        as.Date(paste0(ar, "-06-06")),   # Nationaldagen
        mids - 1,                         # Midsommarafton
        mids,                             # Midsommardagen
        ahd,                              # Alla helgons dag
        as.Date(paste0(ar, "-12-24")),   # Julafton
        as.Date(paste0(ar, "-12-25")),   # Juldagen
        as.Date(paste0(ar, "-12-26")),   # Annandag jul
        as.Date(paste0(ar, "-12-31"))    # Nyårsafton
      ),
      helgdag = c(
        "nyarsdagen", "trettondedag_jul",
        "langfredagen", "paskdagen", "annandag_pask",
        "forsta_maj", "kristi_himmelsfardsdag", "pingstdagen",
        "nationaldagen", "midsommarafton", "midsommardagen",
        "alla_helgons_dag",
        "julafton", "juldagen", "annandag_jul", "nyarsafton"
      ),
      typ = c(
        "rod_dag", "rod_dag",
        "rod_dag", "rod_dag", "rod_dag",
        "rod_dag", "rod_dag", "rod_dag",
        "rod_dag", "afton", "rod_dag",
        "rod_dag",
        "afton", "rod_dag", "rod_dag", "afton"
      )
    )
  }))
}

# ══════════════════════════════════════════════════════════
#  HALVDAGAR — Skärtorsdag, valborg m.fl.
# ══════════════════════════════════════════════════════════

svenska_halvdagar <- function(ar_vektor) {
  bind_rows(lapply(ar_vektor, function(ar) {
    pask <- paskdagen(ar)
    ahd  <- forsta_lordag(as.Date(paste0(ar, "-10-31")))

    tibble(
      ds = c(
        as.Date(paste0(ar, "-01-05")),   # Trettondagsafton
        pask - 3,                         # Skärtorsdagen
        as.Date(paste0(ar, "-04-30")),   # Valborgsmässoafton
        pask + 38,                        # Dagen före Kristi himmelsfärdsdag
        ahd - 1                           # Alla helgons afton
      ),
      halvdag_namn = c(
        "trettondagsafton", "skartorsdagen", "valborgsmassafton",
        "fore_kristi_himmelsfardsdag", "alla_helgons_afton"
      )
    )
  }))
}

# ══════════════════════════════════════════════════════════
#  KLÄMDAGAR — Vardagar inklämda mellan helgdag och helg
# ══════════════════════════════════════════════════════════

svenska_klamdagar <- function(ar_vektor) {
  helgdagar <- svenska_helgdagar(ar_vektor)
  fria_datum <- helgdagar$ds

  klamdagar <- c()
  for (d in as.numeric(fria_datum)) {
    d <- as.Date(d, origin = "1970-01-01")
    vd <- as.integer(format(d, "%u"))

    # Helgdag på tisdag -> måndagen före är klämdag
    if (vd == 2) klamdagar <- c(klamdagar, as.numeric(d - 1))
    # Helgdag på torsdag -> fredagen efter är klämdag
    if (vd == 4) klamdagar <- c(klamdagar, as.numeric(d + 1))
  }

  if (length(klamdagar) == 0) {
    return(tibble(ds = as.Date(character(0)), klamdag_namn = character(0)))
  }

  tibble(ds = as.Date(unique(klamdagar), origin = "1970-01-01")) |>
    filter(!ds %in% fria_datum) |>
    mutate(klamdag_namn = "klamdag") |>
    arrange(ds)
}

# ══════════════════════════════════════════════════════════
#  SKOLLOV — Typiska perioder för Halland
# ══════════════════════════════════════════════════════════

svenska_skollov <- function(ar_vektor, sportlov_vecka = 8) {
  # Ungefärliga lovperioder baserade på Hallands kommuner.
  # Exakta datum varierar per kommun och år men veckorna är stabila.

  bind_rows(lapply(ar_vektor, function(ar) {
    pask <- paskdagen(ar)

    lov_perioder <- list(
      sportlov = {
        man <- iso_mandag(ar, sportlov_vecka)
        seq(man, man + 4, by = 1)
      },
      pasklov = {
        # Veckan som innehåller annandag påsk (tisdag-fredag)
        # Långfredag och annandag påsk är redan helgdagar
        annandag <- pask + 1  # alltid måndag
        seq(annandag + 1, annandag + 4, by = 1)  # tis-fre
      },
      sommarlov = {
        start <- as.Date(paste0(ar, "-06-10"))
        slut  <- as.Date(paste0(ar, "-08-15"))
        alla  <- seq(start, slut, by = 1)
        alla[as.integer(format(alla, "%u")) <= 5]  # bara vardagar
      },
      hostlov = {
        man <- iso_mandag(ar, 44)
        seq(man, man + 4, by = 1)
      },
      jullov = {
        start <- as.Date(paste0(ar, "-12-18"))
        slut  <- as.Date(paste0(ar + 1, "-01-06"))
        alla  <- seq(start, slut, by = 1)
        alla[as.integer(format(alla, "%u")) <= 5]
      }
    )

    bind_rows(lapply(names(lov_perioder), function(namn) {
      tibble(ds = lov_perioder[[namn]], lov = namn)
    }))
  })) |>
    distinct(ds, .keep_all = TRUE) |>
    arrange(ds)
}

# ══════════════════════════════════════════════════════════
#  BYGG KALENDER — Komplett dagskalender
# ══════════════════════════════════════════════════════════

bygg_kalender <- function(start_datum, slut_datum) {
  ar_vektor <- year(start_datum):year(slut_datum)

  helgdagar  <- svenska_helgdagar(ar_vektor)
  halvdagar  <- svenska_halvdagar(ar_vektor)
  klamdagar  <- svenska_klamdagar(ar_vektor)
  skollov_df <- svenska_skollov(ar_vektor)

  # Skapa huvudtabell med alla dagar
  kal <- tibble(ds = seq(start_datum, slut_datum, by = "day")) |>
    mutate(
      veckodag = wday(ds, week_start = 1),   # 1=mån, 7=sön
      vecka    = isoweek(ds),
      manad    = month(ds),
      ar       = year(ds),
      helg     = veckodag >= 6
    )

  # Booleska flaggor via %in%
  rod_datum   <- helgdagar |> filter(typ == "rod_dag") |> pull(ds)
  afton_datum <- helgdagar |> filter(typ == "afton") |> pull(ds)

  kal <- kal |>
    mutate(
      rod_dag   = ds %in% rod_datum,
      afton     = ds %in% afton_datum,
      halvdag   = ds %in% halvdagar$ds,
      klamdag   = ds %in% klamdagar$ds,
      skollov   = ds %in% skollov_df$ds,
      arbetsdag = !helg & !rod_dag & !afton
    )

  # Lägg till helgdagsnamn och lovnamn (för diagnostik)
  kal <- kal |>
    left_join(helgdagar |> select(ds, helgdag), by = "ds") |>
    left_join(skollov_df |> select(ds, lov), by = "ds")

  kal
}
