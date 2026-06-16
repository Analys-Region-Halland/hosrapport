# config.R — Akutflöde & kapacitet
# Definierar sektionens KPI:er och avdelningsstruktur.

akutflode <- list(
  id   = "akutflode",
  namn = "Akutfl\u00f6de & kapacitet",
  kpier = tibble(
    id          = c("belaggning", "akutbesok", "vantetid", "ambulans"),
    namn        = c("Bel\u00e4ggningsgrad", "Bes\u00f6k akutmottagning",
                     "Medianv\u00e4ntetid akut", "Ambulansuppdrag"),
    enhet       = c("procent", "antal", "minuter", "antal"),
    aggregering = c("medel", "summa", "medel", "summa"),
    inverterad  = c(TRUE, FALSE, TRUE, FALSE),
    familj      = c("gaussian", "nb", "gamma", "nb")
  ),
  avdelningar = list(
    belaggning = c("Halmstad", "Varberg", "Kungsbacka"),
    akutbesok  = c("Halmstad", "Varberg", "Kungsbacka"),
    vantetid   = c("Halmstad", "Varberg", "Kungsbacka"),
    ambulans   = c("Nord", "Syd")
  )
)
