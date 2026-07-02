# config.R — Primärvård & nära vård
# Definierar sektionens KPI:er och avdelningsstruktur (närsjukvårdsområden).

primarvard <- list(
  id   = "primarvard",
  namn = "Primärvård & nära vård",
  kpier = tibble(
    id          = c("pv_besok", "digital_kontakt", "telefon_svar"),
    namn        = c("Läkarbesök vårdcentral", "Digitala vårdkontakter",
                     "Telefonsamtal besvarade samma dag"),
    enhet       = c("antal", "antal", "procent"),
    aggregering = c("summa", "summa", "medel"),
    inverterad  = c(FALSE, FALSE, FALSE),
    familj      = c("nb", "nb", "gaussian")
  ),
  avdelningar = list(
    pv_besok        = c("Halmstad", "Varberg", "Kungsbacka"),
    digital_kontakt = c("Halmstad", "Varberg", "Kungsbacka"),
    telefon_svar    = c("Halmstad", "Varberg", "Kungsbacka")
  )
)
