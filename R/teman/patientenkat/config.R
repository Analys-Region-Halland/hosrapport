# config.R — Patientenkäten (NPE)
# Årsindikatorer utan dygnsdata, med ranking mot andra regioner.
# Visas bara i årsvyn.

patientenkat <- list(
  id          = "patientenkat",
  namn        = "Patientenk\u00e4ten",
  bara_arsvyn = TRUE,
  # Signalstrategi: "ranking" (mot andra regioner) i st\u00e4llet f\u00f6r conformal.
  # Antal regioner h\u00e4rleds fr\u00e5n datan; tr\u00f6sklarna styr gr\u00f6n/gul/r\u00f6d.
  signal_typ  = "ranking",
  ranking     = list(grans_gron = 3, grans_gul = 7),
  datakalla   = "data/npe_primarvard.xlsx",
  dimensioner = tibble(
    flik = c("Helhetsintryck", "Respekt och bem\u00f6tande",
             "Delaktighet och involvering", "Tillg\u00e4nglighet"),
    id   = c("npe_helhetsintryck", "npe_respekt",
             "npe_delaktighet", "npe_tillganglighet"),
    namn = c("Helhetsintryck", "Respekt och bem\u00f6tande",
             "Delaktighet och involvering", "Tillg\u00e4nglighet")
  )
)
