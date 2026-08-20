# kontrakt.R — Kontraktsvalidering R → JSON
#
# Verifierar att den bearbetade list-strukturen matchar det kontrakt som
# frontend (app/src/types.ts) förväntar sig, INNAN JSON skrivs. Körs som en
# hård grind i exportera.R: vid brott avbryts pipelinen med exakt sökväg till
# felet, så att en tyst trasig JSON aldrig kan produceras.
#
# Kärninvariant mot jsonlite::toJSON(auto_unbox = TRUE): fält som ska bli
# JSON-arrayer MÅSTE vara listor eller data.frames i R. auto_unbox kollapsar
# bara atomära vektorer av längd 1 — listor och data.frames förblir arrayer.
# Därför är is.list()-kontrollen nedan själva array-stabilitetsgarantin
# (is.list(data.frame) == TRUE, så den täcker båda formerna).

KONTRAKT_VYER   <- c("dag", "vecka", "manad", "kvartal", "ar")
KONTRAKT_STATUS <- c("gron", "gul", "rod")
KONTRAKT_ENHET  <- c("procent", "minuter", "antal")

# Är x en icke-NA skalär (längd 1)? Används för obligatoriska skalärfält.
.kontrakt_skalar <- function(x) !is.null(x) && length(x) == 1 && !is.na(x)

# Hämta fältnamn för en "array-av-objekt": kolumnnamn om data.frame,
# annars namn på första radobjektet om list-av-listor.
.kontrakt_radfalt <- function(x) {
  if (is.data.frame(x)) return(names(x))
  if (is.list(x) && length(x) > 0 && is.list(x[[1]])) return(names(x[[1]]))
  character(0)
}
.kontrakt_radantal <- function(x) if (is.data.frame(x)) nrow(x) else length(x)

validera_kontrakt <- function(res) {
  fel <- character()
  lagg <- function(...) fel <<- c(fel, paste0(...))

  krav_vy  <- c("vy", "etikett", "period", "datum", "uppdaterad", "jmf_etikett", "analys")
  krav_kpi <- c("id", "namn", "enhet", "inverterad", "senaste", "forandring", "status", "analystext")
  krav_ts  <- c("period", "etikett", "varde")

  if (!is.list(res)) stop("Kontraktsbrott: toppnivån är inte en lista", call. = FALSE)

  for (vyn in KONTRAKT_VYER) {
    if (is.null(res[[vyn]])) { lagg("saknar vy: ", vyn); next }
    v <- res[[vyn]]
    for (f in krav_vy) if (!.kontrakt_skalar(v[[f]])) lagg(vyn, ".", f, " saknas/NA")
    if (!is.list(v$sektioner)) { lagg(vyn, ".sektioner är inte en lista (auto_unbox-risk)"); next }

    for (si in seq_along(v$sektioner)) {
      s  <- v$sektioner[[si]]
      sp <- paste0(vyn, ".sektioner[", si, "]")
      for (f in c("id", "namn", "analys")) if (!.kontrakt_skalar(s[[f]])) lagg(sp, ".", f, " saknas/NA")
      if (!is.list(s$kpier)) { lagg(sp, ".kpier är inte en lista (auto_unbox-risk)"); next }

      # inledning (valfritt): redaktionell kontext, ETT stycke per element.
      # Måste vara en lista även med ett enda stycke, annars kollapsar
      # auto_unbox arrayen till en sträng och frontend renderar tecken för tecken.
      if (!is.null(s$inledning)) {
        if (!is.list(s$inledning)) {
          lagg(sp, ".inledning är inte en lista (auto_unbox-risk)")
        } else if (length(s$inledning) == 0) {
          lagg(sp, ".inledning är tom")
        } else {
          for (pi in seq_along(s$inledning)) {
            if (!.kontrakt_skalar(s$inledning[[pi]]))
              lagg(sp, ".inledning[", pi, "] är inte ett textstycke")
          }
        }
      }

      # kallor / leverans (valfritt): källförteckning, array-av-objekt.
      for (falt in c("kallor", "leverans")) {
        if (is.null(s[[falt]])) next
        if (!is.list(s[[falt]])) {
          lagg(sp, ".", falt, " är inte en lista (auto_unbox-risk)")
          next
        }
        for (qi in seq_along(s[[falt]])) {
          q  <- s[[falt]][[qi]]
          qp <- paste0(sp, ".", falt, "[", qi, "]")
          for (f in c("namn", "huvudman", "typ", "om"))
            if (!.kontrakt_skalar(q[[f]])) lagg(qp, ".", f, " saknas/NA")
        }
      }

      # delar (valfritt): tematiska undergrupper med egen översikt.
      # kpi_ids måste vara en lista (array-garanti) och referera befintliga KPI:er.
      if (!is.null(s$delar)) {
        if (!is.list(s$delar)) {
          lagg(sp, ".delar är inte en lista (auto_unbox-risk)")
        } else {
          kpi_id_set <- vapply(s$kpier, function(k) k$id %||% NA_character_, character(1))
          for (di in seq_along(s$delar)) {
            d  <- s$delar[[di]]
            dp <- paste0(sp, ".delar[", di, "]")
            for (f in c("id", "namn", "analys")) if (!.kontrakt_skalar(d[[f]])) lagg(dp, ".", f, " saknas/NA")
            if (!is.list(d$kpi_ids)) {
              lagg(dp, ".kpi_ids är inte en lista (auto_unbox-risk)")
            } else {
              okanda <- setdiff(unlist(d$kpi_ids), kpi_id_set)
              if (length(okanda)) lagg(dp, ".kpi_ids refererar okända KPI:er: ", paste(okanda, collapse = ", "))
            }
          }
        }
      }

      for (ki in seq_along(s$kpier)) {
        k  <- s$kpier[[ki]]
        kp <- paste0(sp, ".kpier[", ki, "]")
        for (f in krav_kpi) if (!.kontrakt_skalar(k[[f]])) lagg(kp, ".", f, " saknas/NA")
        if (!is.null(k$status) && !(k$status %in% KONTRAKT_STATUS)) lagg(kp, ".status ogiltig: ", k$status)
        if (!is.null(k$enhet)  && !(k$enhet  %in% KONTRAKT_ENHET))  lagg(kp, ".enhet ogiltig: ", k$enhet)

        # tidsserie: array-av-objekt (data.frame ELLER list), måste ha krav_ts-fält
        if (is.null(k$tidsserie) || !is.list(k$tidsserie)) {
          lagg(kp, ".tidsserie saknas eller är inte en array (auto_unbox-risk)")
        } else {
          saknade <- setdiff(krav_ts, .kontrakt_radfalt(k$tidsserie))
          if (length(saknade)) lagg(kp, ".tidsserie saknar fält: ", paste(saknade, collapse = ", "))
          if (.kontrakt_radantal(k$tidsserie) < 1) lagg(kp, ".tidsserie är tom")
        }

        # forandringar: array om den finns
        if (!is.null(k$forandringar) && !is.list(k$forandringar))
          lagg(kp, ".forandringar är inte en array (auto_unbox-risk)")

        # fakta (valfritt): redaktionellt faktablock per indikator
        # (R/teman/kolada/indikatorfakta.R). Textfälten är obligatoriska när
        # blocket finns, och faktorer måste vara en array-av-objekt så att
        # auto_unbox inte kollapsar en ensam faktor till en sträng.
        if (!is.null(k$fakta)) {
          fp <- paste0(kp, ".fakta")
          for (f in c("matt", "riktning", "avgransning", "teori"))
            if (!.kontrakt_skalar(k$fakta[[f]])) lagg(fp, ".", f, " saknas/NA")
          if (!is.list(k$fakta$faktorer)) {
            lagg(fp, ".faktorer är inte en lista (auto_unbox-risk)")
          } else if (length(k$fakta$faktorer) == 0) {
            lagg(fp, ".faktorer är tom")
          } else {
            for (fi in seq_along(k$fakta$faktorer)) {
              ff <- k$fakta$faktorer[[fi]]
              for (f in c("rubrik", "text"))
                if (!.kontrakt_skalar(ff[[f]])) lagg(fp, ".faktorer[", fi, "].", f, " saknas/NA")
            }
          }
        }

        # undernivaer (valfritt): list av sub-KPI:er
        if (!is.null(k$undernivaer)) {
          if (!is.list(k$undernivaer)) {
            lagg(kp, ".undernivaer är inte en lista (auto_unbox-risk)")
          } else {
            for (ui in seq_along(k$undernivaer)) {
              u  <- k$undernivaer[[ui]]
              up <- paste0(kp, ".undernivaer[", ui, "]")
              for (f in c("id", "namn", "status")) if (!.kontrakt_skalar(u[[f]])) lagg(up, ".", f, " saknas/NA")
              if (is.null(u$tidsserie) || !is.list(u$tidsserie)) lagg(up, ".tidsserie saknas/ej array")
            }
          }
        }
      }
    }
  }

  if (length(fel)) {
    stop("Kontraktsbrott (", length(fel), " fel):\n  ",
         paste(fel, collapse = "\n  "), call. = FALSE)
  }
  cat("Kontraktsvalidering: OK (", length(KONTRAKT_VYER), " vyer)\n", sep = "")
  invisible(TRUE)
}
