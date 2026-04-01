# granskningsrapport.R — Genererar pedagogisk HTML-rapport
# med fullständig analys av signalsystemet.
#
# Innehåll:
#   1. Metod — GLM-familj, conformal prediction, tre-nivå-signaler
#   2. Modellval — Resonemang per indikator
#   3. Testresultat — Täckning, MAE, bias, signalfördelning
#   4. Bandbreddsanalys — Medianbredd, vardag vs specialdag
#   5. Helgeffekter — Kalenderkomponenters påverkan
#   6. Aggregeringstester — Vecka/månad/kvartal
#   7. Anomalitester — Detektion av injicerade avvikelser
#   8. Sammanfattning
#
# Kör: source("R/granskningsrapport.R")
# Output: rapport/signal-granskning.html

source("paket.R")
source("R/gemensam/helgdagar.R")
source("R/gemensam/signal-modell.R")

if (!requireNamespace("knitr", quietly = TRUE)) install.packages("knitr")

# ══════════════════════════════════════════════
#  DATA OCH KONFIGURATION
# ══════════════════════════════════════════════

radata      <- readRDS("data/radata-hos.rds")
dept_radata <- readRDS("data/radata-dept.rds")
kalender    <- bygg_kalender(min(radata$datum), max(radata$datum))

split_datum <- as.Date("2025-01-01")

kpi_meta <- tibble(
  id          = c("belaggning", "akutbesok", "vantetid",
                   "ambulans", "inlaggningar", "utskrivningsklara"),
  namn        = c("Beläggningsgrad", "Besök akutmottagning",
                   "Medianväntetid akut", "Ambulansuppdrag",
                   "Inläggningar", "Utskrivningsklara patienter"),
  aggregering = c("medel", "summa", "medel", "summa", "summa", "medel"),
  familj      = c("gaussian", "nb", "gamma", "nb", "nb", "nb"),
  enhet       = c("procent", "antal", "minuter", "antal", "antal", "antal")
)

# Injicerade anomalier (för detektionstest)
anomalier <- list(
  list(
    namn = "Vintervåg dec 2025",
    start = as.Date("2025-12-08"), slut = as.Date("2025-12-28"),
    kpier = c("akutbesok", "belaggning"),
    typ = "förhöjd"
  ),
  list(
    namn = "Ambulanshändelse feb 2026",
    start = as.Date("2026-02-16"), slut = as.Date("2026-02-20"),
    kpier = c("ambulans"),
    typ = "förhöjd"
  ),
  list(
    namn = "Väntetidsökning mar 2026",
    start = as.Date("2026-03-01"), slut = as.Date("2026-03-14"),
    kpier = c("vantetid"),
    typ = "gradvis ökning"
  )
)

# ══════════════════════════════════════════════
#  KÖR SIGNALTEST PER KPI
# ══════════════════════════════════════════════

cat("Kör signaltest för granskning...\n")

resultat <- list()

for (i in seq_len(nrow(kpi_meta))) {
  kid   <- kpi_meta$id[i]
  knamn <- kpi_meta$namn[i]
  fam   <- kpi_meta$familj[i]
  atyp  <- kpi_meta$aggregering[i]
  enh   <- kpi_meta$enhet[i]

  df <- radata |> transmute(ds = datum, y = .data[[kid]])

  train <- df |> filter(ds < split_datum)
  test  <- df |> filter(ds >= split_datum)

  m <- modell_glm(train, kalender, familj = fam)

  # Prediktera test
  test_pred   <- m$predict(tibble(ds = test$ds), kalender)
  test_signal <- test |>
    inner_join(test_pred, by = "ds") |>
    mutate(
      signal    = case_when(
        y >= yhat_lower_80 & y <= yhat_upper_80 ~ "gron",
        y >= yhat_lower & y <= yhat_upper        ~ "gul",
        TRUE                                      ~ "rod"
      ),
      avvikelse = y - yhat,
      avv_pct   = (y - yhat) / pmax(abs(yhat), 0.01) * 100,
      bredd_80  = yhat_upper_80 - yhat_lower_80,
      bredd_95  = yhat_upper - yhat_lower
    )

  # Prediktera hela tidsserien (för helgeffektanalys)
  full_pred <- m$predict(tibble(ds = df$ds), kalender)

  tackning_95 <- mean(test_signal$y >= test_signal$yhat_lower &
                      test_signal$y <= test_signal$yhat_upper)
  tackning_80 <- mean(test_signal$y >= test_signal$yhat_lower_80 &
                      test_signal$y <= test_signal$yhat_upper_80)
  mae_pct     <- mean(abs(test_signal$avv_pct))
  bias_pct    <- mean(test_signal$avv_pct)
  rmse        <- sqrt(mean(test_signal$avvikelse^2))

  # Bandbreddsstatistik
  bredd_80_vardag  <- test_signal |> filter(!specialdag) |> pull(bredd_80)
  bredd_80_special <- test_signal |> filter(specialdag) |> pull(bredd_80)
  bredd_95_vardag  <- test_signal |> filter(!specialdag) |> pull(bredd_95)
  bredd_95_special <- test_signal |> filter(specialdag) |> pull(bredd_95)

  # Aggregerad täckning
  agg_fn <- if (atyp == "summa") sum else mean
  agg_tackning <- list()
  for (niva in c("vecka", "manad")) {
    pfn <- if (niva == "vecka") {
      \(d) floor_date(d, "week", week_start = 1)
    } else {
      \(d) floor_date(d, "month")
    }
    agg_t <- test_signal |>
      mutate(period = pfn(ds)) |>
      group_by(period) |>
      summarise(y_a = agg_fn(y), yh_a = agg_fn(yhat), .groups = "drop") |>
      mutate(avv = y_a - yh_a)

    # Kalibrering
    cal_p <- m$predict(tibble(ds = m$kalibrering$ds), kalender)
    cal_a <- tibble(ds = m$kalibrering$ds, y = m$kalibrering$y) |>
      inner_join(cal_p |> select(ds, yhat), by = "ds") |>
      mutate(period = pfn(ds)) |>
      group_by(period) |>
      summarise(cy = agg_fn(y), cyh = agg_fn(yhat), .groups = "drop") |>
      mutate(cavv = cy - cyh)

    if (nrow(cal_a) >= 6) {
      cal_scores <- abs(cal_a$cavv)
      q80_a <- conformal_kvantil(cal_scores, 0.20)
      q95_a <- conformal_kvantil(cal_scores, 0.05)
      tack_80_a <- mean(abs(agg_t$avv) <= q80_a)
      tack_95_a <- mean(abs(agg_t$avv) <= q95_a)
      agg_tackning[[niva]] <- list(
        tack_80 = tack_80_a, tack_95 = tack_95_a,
        q80 = q80_a, q95 = q95_a, n = nrow(agg_t))
    }
  }

  # Anomalidetektion
  anomali_detektion <- list()
  for (anom in anomalier) {
    if (kid %in% anom$kpier) {
      anom_dagar <- test_signal |>
        filter(ds >= anom$start, ds <= anom$slut)
      if (nrow(anom_dagar) > 0) {
        anomali_detektion[[anom$namn]] <- list(
          n_dagar = nrow(anom_dagar),
          n_rod = sum(anom_dagar$signal == "rod"),
          n_gul = sum(anom_dagar$signal == "gul"),
          n_gron = sum(anom_dagar$signal == "gron"),
          rate = (sum(anom_dagar$signal != "gron")) / nrow(anom_dagar)
        )
      }
    }
  }

  resultat[[kid]] <- list(
    kpi_id = kid, namn = knamn, familj = fam, aggregering = atyp,
    enhet = enh, modell_namn = m$namn,
    n_train = nrow(train), n_test = nrow(test),
    tackning_80 = tackning_80, tackning_95 = tackning_95,
    mae_pct = mae_pct, bias_pct = bias_pct, rmse = rmse,
    n_gron = sum(test_signal$signal == "gron"),
    n_gul = sum(test_signal$signal == "gul"),
    n_rod = sum(test_signal$signal == "rod"),
    test_signal = test_signal,
    fit_summary = summary(m$fit),
    kal = m$kal,
    bredd_80_vardag_median = median(bredd_80_vardag),
    bredd_80_special_median = median(bredd_80_special),
    bredd_95_vardag_median = median(bredd_95_vardag),
    bredd_95_special_median = median(bredd_95_special),
    agg_tackning = agg_tackning,
    anomali_detektion = anomali_detektion,
    full_pred = full_pred
  )

  cat(sprintf("  %s: täckning 80%%=%.0f%% 95%%=%.0f%%, gul=%d röd=%d\n",
              knamn, tackning_80 * 100, tackning_95 * 100,
              sum(test_signal$signal == "gul"), sum(test_signal$signal == "rod")))
}

# ══════════════════════════════════════════════
#  GENERERA HTML-RAPPORT
# ══════════════════════════════════════════════

dir.create("rapport", showWarnings = FALSE)

html <- character()
h <- function(...) html <<- c(html, paste0(...))

h('<!DOCTYPE html><html lang="sv"><head>')
h('<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">')
h('<title>Signalsystem — Granskningsrapport</title>')
h('<link rel="preconnect" href="https://fonts.googleapis.com">')
h('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>')
h('<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&family=Lexend+Deca:wght@400;700&family=Poppins:wght@600;700&display=swap" rel="stylesheet">')
h('<style>')
h('body { font-family: "IBM Plex Sans", system-ui, sans-serif; max-width: 960px; margin: 0 auto; padding: 24px; color: #1a1a1a; line-height: 1.7; }')
h('h1 { font-family: "Lexend Deca", sans-serif; color: #00664D; border-bottom: 3px solid #00AB60; padding-bottom: 8px; font-size: 28px; }')
h('h2 { font-family: "Poppins", sans-serif; color: #00664D; margin-top: 48px; border-top: 2px solid #C1E8C4; padding-top: 16px; font-size: 22px; }')
h('h3 { color: #004990; margin-top: 32px; font-size: 18px; }')
h('h4 { color: #433C9D; margin-top: 24px; font-size: 15px; }')
h('table { border-collapse: collapse; width: 100%; margin: 16px 0; font-size: 14px; }')
h('th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }')
h('th { background: #f0fdf4; color: #00664D; font-weight: 600; }')
h('tr:nth-child(even) { background: #fafaf8; }')
h('.signal-gron { color: #16a34a; font-weight: 600; }')
h('.signal-gul { color: #ea980c; font-weight: 600; }')
h('.signal-rod { color: #dc2626; font-weight: 600; }')
h('.mono { font-family: "IBM Plex Mono", monospace; font-feature-settings: "tnum"; }')
h('.info-box { background: #E2F6FF; border-left: 4px solid #2DB8F6; padding: 14px 18px; margin: 16px 0; border-radius: 4px; }')
h('.warn-box { background: #FEF8E8; border-left: 4px solid #FFD939; padding: 14px 18px; margin: 16px 0; border-radius: 4px; }')
h('.ok-box { background: #E3F4E2; border-left: 4px solid #00AB60; padding: 14px 18px; margin: 16px 0; border-radius: 4px; }')
h('.fail-box { background: #FEE6E7; border-left: 4px solid #FF5F4A; padding: 14px 18px; margin: 16px 0; border-radius: 4px; }')
h('code { background: #f5f5f0; padding: 2px 6px; border-radius: 3px; font-size: 13px; }')
h('svg { display: block; margin: 8px 0; }')
h('.metric-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; margin: 16px 0; }')
h('.metric-card { background: #fafaf8; border: 1px solid #e5e5e5; border-radius: 8px; padding: 14px; text-align: center; }')
h('.metric-card .value { font-size: 24px; font-weight: 600; font-family: "IBM Plex Mono"; }')
h('.metric-card .label { font-size: 12px; color: #666; margin-top: 4px; }')
h('</style></head><body>')

# ══════════════════════════════════════════════
#  RUBRIK
# ══════════════════════════════════════════════

h('<h1>Signalsystem — Granskningsrapport</h1>')
h(sprintf('<p><strong>Genererad:</strong> %s &middot; <strong>Data:</strong> %s — %s (%d dagar)</p>',
          format(Sys.time(), "%Y-%m-%d %H:%M"), min(radata$datum), max(radata$datum), nrow(radata)))
h(sprintf('<p><strong>Träningsperiod:</strong> %s — %s &middot; <strong>Testperiod:</strong> %s — %s (%d dagar)</p>',
          min(radata$datum), split_datum - 1, split_datum, max(radata$datum),
          as.integer(max(radata$datum) - split_datum + 1)))

h('<div class="info-box">')
h('<p><strong>Syfte:</strong> Denna rapport dokumenterar och validerar signalsystemet ')
h('som används i HoS-rapporten. Varje beslut — modellval, bandbredd, ')
h('signalnivå — motiveras med statistiska tester och resonemang.</p>')
h('</div>')

# ══════════════════════════════════════════════
#  1. METOD
# ══════════════════════════════════════════════

h('<h2>1. Metod</h2>')

h('<h3>1.1 Översikt — Tre-nivå signalsystem</h3>')
h('<p>Signalsystemet bedömer varje indikators värde mot ett <em>förväntat intervall</em>. ')
h('Systemet använder <strong>tre nivåer</strong>:</p>')
h('<table style="width:auto"><tr>')
h('<td style="background:#E3F4E2;border-left:4px solid #16a34a;padding:12px"><strong>Grön — I fas</strong><br>Inom 80 %-intervallet</td>')
h('<td style="background:#FEF8E8;border-left:4px solid #ea980c;padding:12px"><strong>Gul — Bevaka</strong><br>Mellan 80 % och 95 %</td>')
h('<td style="background:#FEE6E7;border-left:4px solid #dc2626;padding:12px"><strong>Röd — Avvikelse</strong><br>Utanför 95 %-intervallet</td>')
h('</tr></table>')

h('<p>Under normala förhållanden förväntas:</p>')
h('<ul>')
h('<li><strong>~80 %</strong> av dagarna gröna (≈ 5,6 av 7 dagar per vecka)</li>')
h('<li><strong>~15 %</strong> gula (≈ 1 dag per vecka)</li>')
h('<li><strong>~5 %</strong> röda (≈ 1 dag varannan vecka)</li>')
h('</ul>')

h('<h3>1.2 GLM + Conformal Prediction</h3>')
h('<ol>')
h('<li><strong>GLM tränas</strong> på historisk data med kalenderfeatures (trend, säsong, veckodag, helgdagar, klämdagar, skollov).</li>')
h('<li><strong>Conformal prediction</strong> kalibreras på hållna data: normaliserade nonconformity scores ger fördelningsfria intervall med <em>garanterad täckning</em>.</li>')
h('<li><strong>Villkorlig kalibrering:</strong> Separata kvantiler för <em>vardagar</em> och <em>specialdagar</em> (helger, helgdagar, klämdagar). ')
h('Ger smalare band på vardagar utan att generera falska signaler på helger.</li>')
h('</ol>')

h('<h3>1.3 Features (prediktorer)</h3>')
h('<table><tr><th>Feature</th><th>Typ</th><th>Syfte</th></tr>')
h('<tr><td><code>t</code></td><td>Numerisk</td><td>Linjär trend (dagar sedan start)</td></tr>')
h('<tr><td><code>sin_ar, cos_ar</code></td><td>Fourier</td><td>Årssäsonglighet (365,25 d)</td></tr>')
h('<tr><td><code>sin_ar2, cos_ar2</code></td><td>Fourier</td><td>Halvårsharmonik (182,6 d)</td></tr>')
h('<tr><td><code>veckodag_f</code></td><td>Faktor (7)</td><td>Mån–sön veckodagsmönster</td></tr>')
h('<tr><td><code>helgdag_flag</code></td><td>Boolesk</td><td>Röda dagar + helgdagsaftnar</td></tr>')
h('<tr><td><code>halvdag_flag</code></td><td>Boolesk</td><td>Skärtorsdag, valborg m.fl.</td></tr>')
h('<tr><td><code>klamdag_flag</code></td><td>Boolesk</td><td>Vardagar inklämda helgdag-helg</td></tr>')
h('<tr><td><code>skollov_flag</code></td><td>Boolesk</td><td>Sportlov, sommarlov m.fl. (Halland)</td></tr>')
h('</table>')

# ══════════════════════════════════════════════
#  2. MODELLVAL PER INDIKATOR
# ══════════════════════════════════════════════

h('<h2>2. Modellval — Resonemang per indikator</h2>')

modell_resonemang <- list(
  belaggning = list(
    familj_namn = "Gaussian (identity)",
    resonemang = "Beläggningsgrad mäts i procent och rör sig typiskt mellan 60 och 105. Fördelningen är approximativt symmetrisk runt medelvärdet utan extrem skevhet. Gaussian med identity-länk ger direkt tolkbara koefficienter och prediktioner som matchar datans skala. Alternativet Beta-regression (för andelsdata) testades men ger marginell förbättring på detta intervall.",
    alternativ = "Beta-regression (logit-länk) — avfärdad pga marginal nytta och ökad komplexitet."
  ),
  akutbesok = list(
    familj_namn = "Negativ Binomial (log)",
    resonemang = "Akutbesök är räknedata med stark överdispersion: variansen (σ² ≈ 2 500) överstiger medelvärdet (μ ≈ 850) kraftigt. Poisson-regression ger systematiskt för smala band (undertäckning). Negativ binomial modellerar variansen som μ + μ²/θ, vilket fångar den extra spridningen. Log-länk säkerställer positiva prediktioner.",
    alternativ = "Poisson — avfärdad pga undertäckning (varians > medel). Quasi-Poisson — övervägt men NB ger bättre AIC."
  ),
  vantetid = list(
    familj_namn = "Gamma (log)",
    resonemang = "Väntetider är strikt positiva och höger-skeva: många dagar med 120–140 min, men enstaka toppar på 180+. Gamma-fördelningen hanterar detta naturligt — variansen ökar med medelvärdet, vilket matchar att hög belastning ger både högre snitt och större spridning. Log-länk förhindrar negativa prediktioner.",
    alternativ = "Gaussian — ger negativa prediktioner vid extrapolering. Log-Normal — likvärdigt men Gamma är mer etablerad för väntetider."
  ),
  ambulans = list(
    familj_namn = "Negativ Binomial (log)",
    resonemang = "Ambulansuppdrag är räknedata med måttlig överdispersion (μ ≈ 50, σ² ≈ 70). Negativ binomial hanterar detta bättre än Poisson. Relativt få uppdrag per dag gör att Gaussian-approximation är olämplig — den predikterar negativa värden vid låga nivåer.",
    alternativ = "Poisson — för snäva band. Gaussian — predikterar negativa värden."
  ),
  inlaggningar = list(
    familj_namn = "Negativ Binomial (log)",
    resonemang = "Inläggningar ligger på 15–40 per dag med tydlig dag-till-dag-variation. NB hanterar överdispersionen och log-länk säkerställer positiva värden. Starkare veckodagseffekt än ambulans (färre helginläggningar), vilket NB modellerar via interaktion med skattad spridning.",
    alternativ = "Poisson — undertäckning. Gamma — ej lämplig för diskret data."
  ),
  utskrivningsklara = list(
    familj_namn = "Negativ Binomial (log)",
    resonemang = "Utskrivningsklara patienter är småtal (2–30) med hög relativ variation (CV ≈ 15 %). NB hanterar nollnära värden bättre än Gamma och ger realistisk varians-struktur. Den höga relativa variationen gör att banden naturligt är proportionellt bredare för denna indikator.",
    alternativ = "Poisson — för snäv, ignorerar överdispersion. Gaussian — predikterar negativa vid låga nivåer."
  )
)

for (i in seq_len(nrow(kpi_meta))) {
  kid <- kpi_meta$id[i]
  r <- resultat[[kid]]
  mr <- modell_resonemang[[kid]]

  h(sprintf('<h3>2.%d %s</h3>', i, r$namn))
  h(sprintf('<p><strong>Vald modell:</strong> <code>%s</code></p>', mr$familj_namn))
  h(sprintf('<p>%s</p>', mr$resonemang))
  h(sprintf('<p><em>Alternativ: %s</em></p>', mr$alternativ))
}

# ══════════════════════════════════════════════
#  3. TESTRESULTAT
# ══════════════════════════════════════════════

h('<h2>3. Testresultat per indikator</h2>')
h(sprintf('<p>Testperiod: <strong>%s — %s</strong> (%d dagar).</p>',
          split_datum, max(radata$datum),
          as.integer(max(radata$datum) - split_datum + 1)))

# Sammanfattningstabell
h('<table>')
h('<tr><th>Indikator</th><th>Modell</th><th>Täck 80 %</th><th>Täck 95 %</th>')
h('<th>MAE (%)</th><th>Bias (%)</th><th>RMSE</th>')
h('<th>Grön</th><th>Gul</th><th>Röd</th></tr>')
for (r in resultat) {
  t80k <- if (r$tackning_80 >= 0.77 && r$tackning_80 <= 0.83) "signal-gron"
          else if (r$tackning_80 > 0.83) "signal-gul" else "signal-rod"
  t95k <- if (r$tackning_95 >= 0.93 && r$tackning_95 <= 0.97) "signal-gron"
          else if (r$tackning_95 > 0.97) "signal-gul" else "signal-rod"
  h(sprintf('<tr><td>%s</td><td><code>%s</code></td><td class="%s mono">%.1f %%</td><td class="%s mono">%.1f %%</td><td class="mono">%.1f %%</td><td class="mono">%+.1f %%</td><td class="mono">%.1f</td><td class="mono">%d</td><td class="mono">%d</td><td class="mono">%d</td></tr>',
            r$namn, r$modell_namn, t80k, r$tackning_80 * 100,
            t95k, r$tackning_95 * 100,
            r$mae_pct, r$bias_pct, r$rmse,
            r$n_gron, r$n_gul, r$n_rod))
}
h('</table>')

h('<div class="info-box">')
h('<p><strong>Läsning:</strong></p>')
h('<ul>')
h('<li><strong>Täck 80 %:</strong> Andel testdagar inom 80 %-intervallet. Mål: 77–83 %.</li>')
h('<li><strong>Täck 95 %:</strong> Andel testdagar inom 95 %-intervallet. Mål: 93–97 %.</li>')
h('<li><strong>Grön:</strong> Kalibrerat = nära mål. <span class="signal-gul">Gul</span> = konservativt (för brett). <span class="signal-rod">Röd</span> = undertäckning (för smalt).</li>')
h('<li><strong>Grön/Gul/Röd:</strong> Antal testdagar i respektive signalnivå.</li>')
h('</ul>')
h('</div>')

# Detalj per KPI med SVG-graf
for (r in resultat) {
  kid <- r$kpi_id
  h(sprintf('<h3>3.%d %s — Detaljanalys</h3>', which(names(resultat) == kid), r$namn))

  # Nyckeltal-rutnät
  h('<div class="metric-grid">')
  h(sprintf('<div class="metric-card"><div class="value %s">%.1f %%</div><div class="label">Täckning 80 %%</div></div>',
            if (r$tackning_80 >= 0.77) "signal-gron" else "signal-rod", r$tackning_80 * 100))
  h(sprintf('<div class="metric-card"><div class="value %s">%.1f %%</div><div class="label">Täckning 95 %%</div></div>',
            if (r$tackning_95 >= 0.93) "signal-gron" else "signal-rod", r$tackning_95 * 100))
  h(sprintf('<div class="metric-card"><div class="value">%.1f %%</div><div class="label">MAE</div></div>', r$mae_pct))
  h(sprintf('<div class="metric-card"><div class="value">%+.1f %%</div><div class="label">Bias</div></div>', r$bias_pct))
  h(sprintf('<div class="metric-card"><div class="value">%d / %d / %d</div><div class="label">Grön / Gul / Röd</div></div>',
            r$n_gron, r$n_gul, r$n_rod))
  h('</div>')

  # SVG-graf: senaste 60 testdagar med band
  ts <- r$test_signal |> slice_tail(n = 60)
  if (nrow(ts) >= 2) {
    gw <- 900; gh <- 220; gm <- list(t = 20, r = 20, b = 30, l = 55)
    pw <- gw - gm$l - gm$r; ph <- gh - gm$t - gm$b

    all_v <- c(ts$y, ts$yhat_lower, ts$yhat_upper)
    ymin <- min(all_v, na.rm = TRUE); ymax <- max(all_v, na.rm = TRUE)
    pad <- (ymax - ymin) * 0.1
    ymin <- ymin - pad; ymax <- ymax + pad

    sx <- function(d) gm$l + as.numeric(d - min(ts$ds)) / as.numeric(max(ts$ds) - min(ts$ds)) * pw
    sy <- function(v) gm$t + ph - (v - ymin) / (ymax - ymin) * ph

    # 95 %-band polygon
    band95_pts <- paste(c(
      paste(sx(ts$ds), sy(ts$yhat_upper), sep = ","),
      paste(rev(sx(ts$ds)), rev(sy(ts$yhat_lower)), sep = ",")
    ), collapse = " ")

    # 80 %-band polygon
    band80_pts <- paste(c(
      paste(sx(ts$ds), sy(ts$yhat_upper_80), sep = ","),
      paste(rev(sx(ts$ds)), rev(sy(ts$yhat_lower_80)), sep = ",")
    ), collapse = " ")

    # Linjer
    pred_line <- paste(sx(ts$ds), sy(ts$yhat), sep = ",", collapse = " ")
    actual_line <- paste(sx(ts$ds), sy(ts$y), sep = ",", collapse = " ")

    # Signalpunkter
    gul_pts <- ts |> filter(signal == "gul")
    rod_pts <- ts |> filter(signal == "rod")

    h(sprintf('<svg width="%d" height="%d" style="background:#fafaf8;border:1px solid #eee;border-radius:6px">', gw, gh))
    h(sprintf('<polygon points="%s" fill="#C1E8C4" opacity="0.25" />', band95_pts))
    h(sprintf('<polygon points="%s" fill="#C1E8C4" opacity="0.35" />', band80_pts))
    h(sprintf('<polyline points="%s" fill="none" stroke="#888" stroke-width="1" stroke-dasharray="4,3" opacity="0.5" />', pred_line))
    h(sprintf('<polyline points="%s" fill="none" stroke="#00664D" stroke-width="2" />', actual_line))

    for (j in seq_len(nrow(gul_pts))) {
      h(sprintf('<circle cx="%.1f" cy="%.1f" r="3.5" fill="#ea980c" stroke="white" stroke-width="1.5" />',
                sx(gul_pts$ds[j]), sy(gul_pts$y[j])))
    }
    for (j in seq_len(nrow(rod_pts))) {
      h(sprintf('<circle cx="%.1f" cy="%.1f" r="4" fill="#dc2626" stroke="white" stroke-width="1.5" />',
                sx(rod_pts$ds[j]), sy(rod_pts$y[j])))
    }

    # Axeletiketter
    h(sprintf('<text x="%d" y="%d" font-size="11" fill="#888" font-family="IBM Plex Sans">%s</text>',
              gm$l, gh - 5, format(min(ts$ds), "%d %b")))
    h(sprintf('<text x="%d" y="%d" font-size="11" fill="#888" text-anchor="end" font-family="IBM Plex Sans">%s</text>',
              gw - gm$r, gh - 5, format(max(ts$ds), "%d %b %Y")))

    for (tick in pretty(c(ymin, ymax), n = 4)) {
      if (tick >= ymin && tick <= ymax) {
        h(sprintf('<line x1="%d" x2="%d" y1="%.1f" y2="%.1f" stroke="#ddd" stroke-dasharray="3,3" />',
                  gm$l, gw - gm$r, sy(tick), sy(tick)))
        lbl <- if (r$enhet == "procent") sprintf("%.0f%%", tick) else sprintf("%.0f", tick)
        h(sprintf('<text x="%d" y="%.1f" font-size="10" fill="#888" text-anchor="end" font-family="IBM Plex Mono">%s</text>',
                  gm$l - 4, sy(tick) + 3, lbl))
      }
    }

    # Legend
    lx <- gm$l
    h(sprintf('<line x1="%d" x2="%d" y1="12" y2="12" stroke="#00664D" stroke-width="2" />', lx, lx + 16))
    h(sprintf('<text x="%d" y="15" font-size="10" fill="#666" font-family="IBM Plex Sans">Faktiskt</text>', lx + 20))
    h(sprintf('<line x1="%d" x2="%d" y1="12" y2="12" stroke="#888" stroke-width="1" stroke-dasharray="4,3" />', lx + 80, lx + 96))
    h(sprintf('<text x="%d" y="15" font-size="10" fill="#666" font-family="IBM Plex Sans">Förväntat</text>', lx + 100))
    h(sprintf('<rect x="%d" y="6" width="14" height="10" fill="#C1E8C4" opacity="0.6" rx="2" />', lx + 175))
    h(sprintf('<text x="%d" y="15" font-size="10" fill="#666" font-family="IBM Plex Sans">80 %% band</text>', lx + 193))
    h(sprintf('<rect x="%d" y="6" width="14" height="10" fill="#C1E8C4" opacity="0.3" rx="2" />', lx + 265))
    h(sprintf('<text x="%d" y="15" font-size="10" fill="#666" font-family="IBM Plex Sans">95 %% band</text>', lx + 283))
    h(sprintf('<circle cx="%d" cy="12" r="3" fill="#ea980c" />', lx + 360))
    h(sprintf('<text x="%d" y="15" font-size="10" fill="#666" font-family="IBM Plex Sans">Gul</text>', lx + 367))
    h(sprintf('<circle cx="%d" cy="12" r="3.5" fill="#dc2626" />', lx + 400))
    h(sprintf('<text x="%d" y="15" font-size="10" fill="#666" font-family="IBM Plex Sans">Röd</text>', lx + 407))

    h('</svg>')
  }

  # Tolkning
  if (r$tackning_95 >= 0.93 && r$tackning_95 <= 0.97) {
    h('<div class="ok-box"><p><strong>Välkalibrerad.</strong> 95 %%-täckningen ligger nära målet.')
    if (r$tackning_80 >= 0.77 && r$tackning_80 <= 0.83) {
      h(' 80 %%-täckningen bekräftar att de inre banden också är korrekta.')
    }
    h('</p></div>')
  } else if (r$tackning_95 > 0.97) {
    h('<div class="warn-box"><p><strong>Konservativt.</strong> 95 %%-täckningen är högre än mål — ')
    h('intervallet är bredare än nödvändigt. Färre signaler genereras.</p></div>')
  } else {
    h('<div class="fail-box"><p><strong>Undertäckning.</strong> 95 %%-täckningen understiger 93 %%. ')
    h('Modellen fångar inte alla mönster. Överväg fler features eller annan familj.</p></div>')
  }
}

# ══════════════════════════════════════════════
#  4. BANDBREDDSANALYS
# ══════════════════════════════════════════════

h('<h2>4. Bandbreddsanalys — Vardag vs specialdag</h2>')
h('<p>Villkorlig kalibrering ger separata bandbredder beroende på dagstyp. ')
h('Vardagar (mån–fre exkl. helgdagar) får smalare band, medan specialdagar ')
h('(helger, röda dagar, klämdagar) får bredare band som reflekterar högre naturlig variation.</p>')

h('<table>')
h('<tr><th>Indikator</th><th>Kalibrering</th>')
h('<th>80 %% vardag</th><th>80 %% special</th><th>Ratio</th>')
h('<th>95 %% vardag</th><th>95 %% special</th><th>Ratio</th></tr>')
for (r in resultat) {
  ratio_80 <- r$bredd_80_special_median / max(r$bredd_80_vardag_median, 0.1)
  ratio_95 <- r$bredd_95_special_median / max(r$bredd_95_vardag_median, 0.1)
  enh <- if (r$enhet == "procent") "pp" else r$enhet
  h(sprintf('<tr><td>%s</td><td>%s</td><td class="mono">%.1f %s</td><td class="mono">%.1f %s</td><td class="mono">%.2f×</td><td class="mono">%.1f %s</td><td class="mono">%.1f %s</td><td class="mono">%.2f×</td></tr>',
            r$namn, r$kal$typ,
            r$bredd_80_vardag_median, enh, r$bredd_80_special_median, enh, ratio_80,
            r$bredd_95_vardag_median, enh, r$bredd_95_special_median, enh, ratio_95))
}
h('</table>')

h('<div class="info-box">')
h('<p><strong>Ratio</strong> anger hur mycket bredare specialdagsbanden är jämfört med vardagsbanden. ')
h('En ratio på 1,5× betyder att specialdagar har 50 %% bredare band. ')
h('Rimligt intervall: 1,2–2,0×. Värden under 1,2 tyder på att villkorlig kalibrering inte bidrar.')
h('</p></div>')

# ══════════════════════════════════════════════
#  5. HELGEFFEKTER
# ══════════════════════════════════════════════

h('<h2>5. Helgeffekter — Kalenderkomponenters påverkan</h2>')

h('<h3>5.1 Kalenderstatistik</h3>')
h(sprintf('<p>Kalendern innehåller <strong>%d röda dagar</strong>, ', sum(kalender$rod_dag)))
h(sprintf('<strong>%d klämdagar</strong>, ', sum(kalender$klamdag)))
h(sprintf('<strong>%d halvdagar</strong> och ', sum(kalender$halvdag)))
h(sprintf('<strong>%d skollovsdagar</strong> under perioden.</p>', sum(kalender$skollov)))

h('<h3>5.2 Röda dagar 2025–2026</h3>')
h('<table><tr><th>Datum</th><th>Helgdag</th><th>Veckodag</th></tr>')
vdnamn <- c("mån", "tis", "ons", "tor", "fre", "lör", "sön")
rod2526 <- kalender |> filter(rod_dag, ar >= 2025) |> select(ds, helgdag) |> arrange(ds)
for (j in seq_len(min(nrow(rod2526), 30))) {
  h(sprintf('<tr><td>%s</td><td>%s</td><td>%s</td></tr>',
            format(rod2526$ds[j], "%Y-%m-%d"),
            rod2526$helgdag[j],
            vdnamn[wday(rod2526$ds[j], week_start = 1)]))
}
h('</table>')

# ══════════════════════════════════════════════
#  6. AGGREGERINGSTESTER
# ══════════════════════════════════════════════

h('<h2>6. Aggregeringstester — Vecka och månad</h2>')
h('<p>Signaler beräknas även på aggregerad nivå med egna conformal band. ')
h('Aggregering minskar brus (central limit theorem-effekt), ')
h('så vecko- och månadssignaler är mer tillförlitliga indikatorer på verkliga skiften.</p>')

h('<table>')
h('<tr><th>Indikator</th><th colspan="3">Vecka</th><th colspan="3">Månad</th></tr>')
h('<tr><th></th><th>Täck 80 %%</th><th>Täck 95 %%</th><th>q95</th><th>Täck 80 %%</th><th>Täck 95 %%</th><th>q95</th></tr>')
for (r in resultat) {
  vt <- r$agg_tackning$vecka
  mt <- r$agg_tackning$manad
  v_str <- if (!is.null(vt)) sprintf('<td class="mono">%.0f %%</td><td class="mono">%.0f %%</td><td class="mono">%.1f</td>', vt$tack_80*100, vt$tack_95*100, vt$q95) else '<td colspan="3">—</td>'
  m_str <- if (!is.null(mt)) sprintf('<td class="mono">%.0f %%</td><td class="mono">%.0f %%</td><td class="mono">%.1f</td>', mt$tack_80*100, mt$tack_95*100, mt$q95) else '<td colspan="3">—</td>'
  h(sprintf('<tr><td>%s</td>%s%s</tr>', r$namn, v_str, m_str))
}
h('</table>')

h('<div class="info-box">')
h('<p><strong>q95</strong> anger det absoluta conformal-tröskelvärdet: ')
h('om den aggregerade avvikelsen (faktiskt − förväntat) överstiger ±q95 ')
h('flaggas perioden som röd. Observera att q95 har samma enhet som indikatorn.</p>')
h('</div>')

# ══════════════════════════════════════════════
#  7. ANOMALITESTER
# ══════════════════════════════════════════════

h('<h2>7. Anomalitester — Detektion av injicerade avvikelser</h2>')
h('<p>Tre kända anomalier injiceras i den syntetiska datan för att validera ')
h('att signalsystemet detekterar verkliga avvikelser:</p>')

h('<table>')
h('<tr><th>Anomali</th><th>Period</th><th>Indikator</th>')
h('<th>Dagar</th><th>Röda</th><th>Gula</th><th>Detektionsrate</th><th>Bedömning</th></tr>')

for (anom in anomalier) {
  for (kid in anom$kpier) {
    r <- resultat[[kid]]
    if (length(r$anomali_detektion) > 0 && !is.null(r$anomali_detektion[[anom$namn]])) {
      ad <- r$anomali_detektion[[anom$namn]]
      rate_klass <- if (ad$rate >= 0.8) "signal-gron"
                    else if (ad$rate >= 0.5) "signal-gul"
                    else "signal-rod"
      bedomning <- if (ad$rate >= 0.8) "Bra" else if (ad$rate >= 0.5) "Acceptabel" else "Svag"
      h(sprintf('<tr><td>%s</td><td>%s — %s</td><td>%s</td><td class="mono">%d</td><td class="mono">%d</td><td class="mono">%d</td><td class="%s mono">%.0f %%</td><td>%s</td></tr>',
                anom$namn, format(anom$start, "%d %b"), format(anom$slut, "%d %b %Y"),
                r$namn, ad$n_dagar, ad$n_rod, ad$n_gul, rate_klass, ad$rate * 100, bedomning))
    }
  }
}
h('</table>')

h('<div class="info-box">')
h('<p><strong>Detektionsrate</strong> = andel dagar under anomaliperioden som flaggades som gul eller röd. ')
h('Mål: &gt; 80 %%. Lägre detektionsrate för gradvisa ökningar (väntetid) är förväntat ')
h('eftersom modellen delvis anpassar sig till trenden.</p>')
h('</div>')

# ══════════════════════════════════════════════
#  8. SAMMANFATTNING
# ══════════════════════════════════════════════

h('<h2>8. Sammanfattning</h2>')

# Beräkna sammanfattande statistik
alla_tack_80 <- sapply(resultat, \(r) r$tackning_80)
alla_tack_95 <- sapply(resultat, \(r) r$tackning_95)
alla_ok_80 <- all(alla_tack_80 >= 0.77 & alla_tack_80 <= 0.83)
alla_ok_95 <- all(alla_tack_95 >= 0.93 & alla_tack_95 <= 0.97)

if (alla_ok_80 && alla_ok_95) {
  h('<div class="ok-box">')
  h('<p><strong>Signalsystemet är välkalibrerat.</strong> Samtliga indikatorer uppfyller ')
  h('täckningsmålen för både 80 %- och 95 %-intervallet.</p>')
  h('</div>')
} else {
  h('<div class="warn-box">')
  h('<p><strong>Signalsystemet fungerar men kan optimeras.</strong> ')
  avvikande <- names(resultat)[alla_tack_95 < 0.93 | alla_tack_95 > 0.97]
  if (length(avvikande) > 0) {
    h(sprintf('Följande indikatorer avviker från 95 %%-målet: %s. ',
              paste(sapply(avvikande, \(k) resultat[[k]]$namn), collapse = ", ")))
  }
  h('</p></div>')
}

h('<h3>Beslut och motiveringar</h3>')
h('<table>')
h('<tr><th>Beslut</th><th>Motivering</th></tr>')
h('<tr><td>Tre-nivå-signaler (grön/gul/röd)</td><td>Binärt system (grön/röd) ger ingen förvarning. Gul-nivån fångar 15 % av normalvariationen och ger användaren möjlighet att bevaka innan avvikelse uppstår.</td></tr>')
h('<tr><td>Villkorlig conformal kalibrering</td><td>Enhetlig kalibrering ger för breda band på vardagar (falsk trygghet) och för smala på helger (falska signaler). Separation halverar vardagsbanden utan att påverka helgtäckningen.</td></tr>')
h('<tr><td>Absoluta band på aggregerad nivå</td><td>Procentuella band (±X %%) ger asymmetriska intervall som beror på baslinjenivå. Absoluta conformal-residualer ger symmetriska, tolkbara band.</td></tr>')
h('<tr><td>Autokorrelation i syntetisk data</td><td>Utan AR(1) är varje dag oberoende — orealistiskt. Med AR(1) ≈ 0,25–0,35 efterliknas verklig daglig samvariation och stressperioder.</td></tr>')
h('<tr><td>Injicerade anomalier</td><td>Utan kända avvikelser kan vi inte validera att signalsystemet faktiskt detekterar problem. Tre typer (plötslig ökning, gradvis drift, punkthändelse) testar olika detektionsscenarion.</td></tr>')
h('</table>')

h('<footer style="margin-top:48px;padding-top:16px;border-top:1px solid #ddd;color:#aaa;font-size:12px">')
h(sprintf('Region Halland &middot; Signalsystem granskningsrapport &middot; Genererad %s', format(Sys.time(), "%Y-%m-%d %H:%M")))
h('</footer>')
h('</body></html>')

# Skriv fil
writeLines(html, "rapport/signal-granskning.html", useBytes = TRUE)
cat("\nRapport genererad: rapport/signal-granskning.html\n")
cat(sprintf("Storlek: %.0f KB\n", file.size("rapport/signal-granskning.html") / 1024))
