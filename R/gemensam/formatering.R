# formatering.R — Etiketter, svenska månadsnamn och värdeformatering
# Används av bearbeta.R och analystext.R.

# ── Svenska månadsnamn ──
sv_man <- c("januari", "februari", "mars", "april", "maj", "juni",
            "juli", "augusti", "september", "oktober", "november", "december")
sv_man_kort <- c("jan", "feb", "mar", "apr", "maj", "jun",
                  "jul", "aug", "sep", "okt", "nov", "dec")

# ── Etikettfunktioner per vy ──
etikett_dag     <- function(d) paste0(day(d), " ", sv_man_kort[month(d)])
etikett_vecka   <- function(d) paste0("V", isoweek(d))
etikett_manad   <- function(d) paste0(sv_man_kort[month(d)], " ", substr(year(d), 3, 4))
etikett_kvartal <- function(d) paste0("Q", quarter(d), " ", substr(year(d), 3, 4))
etikett_ar      <- function(d) as.character(year(d))

# ── Värdeformatering (svenskt format) ──
fmt_varde <- function(v, enhet) {
  if (enhet == "procent") {
    paste0(format(v, nsmall = 1, decimal.mark = ","), " procent")
  } else if (enhet == "minuter") {
    paste0(round(v), " minuter")
  } else {
    format(round(v), big.mark = "\u00a0")
  }
}

# ── Förändringsetiketter per vy (för multipla jämförelseperioder) ──
lag_specs <- list(
  dag     = list(list(e = "dag",     n = 1),  list(e = "vecka",   n = 7),  list(e = "m\u00e5n", n = 30)),
  vecka   = list(list(e = "vecka",   n = 1),  list(e = "m\u00e5n",n = 4),  list(e = "\u00e5r",  n = 52)),
  manad   = list(list(e = "m\u00e5n",n = 1),  list(e = "kvartal", n = 3),  list(e = "\u00e5r",  n = 12)),
  kvartal = list(list(e = "kvartal", n = 1),  list(e = "\u00e5r", n = 4)),
  ar      = list(list(e = "\u00e5r", n = 1))
)
