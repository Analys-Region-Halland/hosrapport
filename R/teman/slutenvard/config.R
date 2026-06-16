# config.R — Slutenvård
# Definierar sektionens KPI:er och avdelningsstruktur.

slutenvard <- list(
  id   = "slutenvard",
  namn = "Slutenv\u00e5rd",
  kpier = tibble(
    id          = c("inlaggningar", "utskrivningsklara"),
    namn        = c("Inl\u00e4ggningar", "Utskrivningsklara patienter"),
    enhet       = c("antal", "antal"),
    aggregering = c("summa", "medel"),
    inverterad  = c(FALSE, TRUE),
    familj      = c("nb", "nb")
  ),
  avdelningar = list(
    inlaggningar      = c("Kirurgi", "Medicin", "Ortopedi"),
    utskrivningsklara = c("Halmstad", "Varberg", "Kungsbacka")
  )
)
