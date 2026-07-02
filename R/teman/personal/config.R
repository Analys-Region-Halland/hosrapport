# config.R — Personal & bemanning
# Definierar sektionens KPI:er och avdelningsstruktur (förvaltningar).

personal <- list(
  id   = "personal",
  namn = "Personal & bemanning",
  kpier = tibble(
    id          = c("sjukfranvaro", "overtid", "inhyrd"),
    namn        = c("Sjukfrånvaro", "Övertidstimmar",
                     "Inhyrd personal, timmar"),
    enhet       = c("procent", "antal", "antal"),
    aggregering = c("medel", "summa", "summa"),
    inverterad  = c(TRUE, TRUE, TRUE),
    familj      = c("gaussian", "nb", "nb")
  ),
  avdelningar = list(
    sjukfranvaro = c("Hallands sjukhus", "Närsjukvården", "Psykiatrin"),
    overtid      = c("Hallands sjukhus", "Närsjukvården", "Psykiatrin"),
    inhyrd       = c("Hallands sjukhus", "Närsjukvården", "Psykiatrin")
  )
)
