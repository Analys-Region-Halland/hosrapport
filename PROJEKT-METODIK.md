# PROJEKT-METODIK: HoS-rapport

## Syfte

Hälso- och sjukvårdens (HoS) analysrapport för Region Halland: en webbrapport i fristående kapitel som visar läget indikator för indikator, med statistisk avvikelsedetektering (conformal prediction) för de interna måtten och placering bland regionerna för de öppna jämförelserna. Rapporten kan läsas på webben, skrivas ut och exporteras till PowerPoint.

## Projekttyp

**Typ B: React/Vite-app.** R sköter datapipelinen; React och TypeScript (d3 för skalor och linjer) sköter webbrapporten i `app/`.

## R-pipeline — Struktur och moduler

### Mappstruktur

```
R/
├── pipeline.R                    # Orchestrator — kör allt i ordning
├── bearbeta.R                   # Orkestrerar: aggregering + signaler + monterar vyer via bygg-sektion.R
├── exportera.R                  # Validerar kontrakt + skriver split-JSON (manifest + en fil per vy-sektion) → app/public/data/
├── hamta/
│   └── demo-data.R              # Syntetisk demodata (ersätts med API i produktion)
├── teman/                       # En mapp per sektion — här läggs nya sektioner till
│   ├── register.R               # Samlar alla configs → kpi_meta, dept_config
│   ├── akutflode/
│   │   └── config.R             # KPI-definitioner: beläggning, akutbesök, väntetid, ambulans
│   └── kolada/                  # SKR:s HoS-rapport — SEX sektioner, ett kapitel var
│       ├── config.R             # Kapitel, avsnitt, inledningstexter, riktning per KPI
│       ├── kallor.R             # Källregister: primärkälla per indikator + leveranskedja
│       └── bearbeta.R           # Läser data/kolada-hos.rds, rankingsignaler med Halland i fokus
├── arkiv/                       # Temporärt urkopplat — sourcas inte, syns inte
│   ├── README.md                # Vad som ligger här och hur ett tema återinförs
│   ├── teman/{befolkning,folkhalsa,ekonomi,patientenkat,personal,primarvard,slutenvard}/
│   └── hamta/{befolkning-vardbehov,fohm-folkhalsa,kolada-ekonomi}.R
├── gemensam/                    # Delade moduler (inget beroende sinsemellan)
│   ├── helgdagar.R              # Svensk kalender (röda dagar, klämdagar, skollov)
│   ├── signal-modell.R          # GLM + conformal: kor_kpi_signal (produktion), kor_signal (diagnostik)
│   ├── aggregering.R            # aggregera_period, periodfiltrering, referensberäkning
│   ├── formatering.R            # Etiketter (V13, mar 26), fmt_varde, lag_specs
│   ├── analystext.R             # analystext_kpi, _sektion, _global
│   ├── bygg-sektion.R          # Generisk byggare: bygg_vy + generera_undernivaer (via ctx, ingen closure)
│   └── kontrakt.R               # validera_kontrakt — hård grind R→JSON före export
├── test-signal.R                # Fristående signaltest
└── granskningsrapport.R         # Pedagogisk HTML-rapport
```

### Ny sektion — steg för steg

1. Skapa `R/teman/{namn}/config.R` med id, namn, kpier (tibble), avdelningar (lista)
2. Lägg till `source("R/teman/{namn}/config.R")` i `R/teman/register.R`
3. Lägg till temat i `dagliga_teman` (eller som specialfall likt Kolada-temat)
4. Lägg in området i taxonomin: `app/src/taxonomy.ts`, under rätt kategori
5. Klar — bearbeta.R plockar upp nya KPI:er automatiskt via kpi_meta

Att återinföra ett arkiverat tema är samma sak baklänges: se `R/arkiv/README.md`.

### Områdesindelning (taxonomi)

Rapportens kategorier och områden definieras i `app/src/taxonomy.ts` —
startsidans avdelningsrubriker, rapportens kategorietiketter och
TOC-grupperingen läser alla därifrån. **Taxonomin innehåller bara områden med
faktisk data:** ett område i taxonomin som saknas i manifestet visas inte, och
ett område i manifestet utan taxonomipost hamnar under "Övrigt" (säkerhetsnät i
`StartScreen.tsx`). Sedan 2026-08-19 är indelningen fyra kategorier: Patienten
och tillgängligheten, Vårdens kvalitet och säkerhet, Resultat och resurser samt
Interna analysexempel. De tre första rymmer SKR-rapportens sex kapitel
parvis, den fjärde akutflödet. Researchunderlag till den tidigare, bredare
indelningen: `docs/omradesindelning.md`.

### Pipeline-flöde

```
source("R/pipeline.R")
  │
  ├── R/hamta/demo-data.R       → data/radata-hos.rds, data/radata-dept.rds
  ├── R/bearbeta.R              → data/bearbetad-hos.rds
  └── R/exportera.R             → app/public/data/index.json + {vy}-{sektion}.json
```

### Metadata — en enda källa

`R/teman/register.R` bygger `kpi_meta` och `dept_config` från tema-configs.
Alla filer som behöver KPI-metadata sourcar `register.R` — ingen duplicering.

## Datapipeline

R-skripten i `R/` hämtar data, bearbetar, kör conformal prediction och exporterar till JSON.
Webbrapporten laddar data per vy (`app/src/data/laddning.ts`, som normaliserar och cachar): ett manifest (`app/public/data/index.json` med vymetadata och kapitellista) och en fil per `{vy}-{kapitel}.json`. Bara de kapitel som visas hämtas, och datan bakas inte in i JS-bunten. Fälten nedan är kontrakt v1, som appen läser via `app/src/data/kontrakt.ts` och `normalisera.ts` (docs/arkitektur.md 4.1 och 5).

### Tidsupplösningar (vyer)

| Vy | Id | Aggregerad tidsserie | Dagsnivå (toggle) | Etikett-format |
|----|-----|---------------------|-------------------|----------------|
| Dag | `dag` | 14 dagar | — | `18 mar` |
| Vecka | `vecka` | Alla kompletta veckor (~274) | 7 dagar (senaste hela vecka) | `V13` |
| Månad | `manad` | Alla kompletta månader (~63) | ~30 dagar (senaste hela månad) | `mar 26` |
| Kvartal | `kvartal` | Alla kompletta kvartal (~21) | ~90 dagar (senaste hela kvartal) | `Q1 26` |
| År | `ar` | Alla kompletta år (~5) | ~365 dagar (senaste hela år) | `2025` |

### Periodhantering

- **Bara kompletta perioder** visas i aggregerade vyer. Inkompletta perioder exkluderas.
- **Dagsnivå** (dag-toggle) visar alltid senaste *kompletta* period — inte den pågående.
- **Referens**: Varje KPI har `referens` (samma period föregående år) med värde och förändring.
- **Dagsammanfattning** (`dagar_sammanfattning`): antal dagar i fas vs avvikelse per KPI per vy.
- **Dag-vyn** (standalone): 14 dagar + `referens_serie` (samma 14 dagar föregående år, visas som streckad linje).

### Datastruktur (per KPI)

Fältnamnen nedan är verifierade mot `data/hos-data.json` och `app/src/types.ts`. Varje tidsseriepunkt bär **två** conformal-band: ett inre 80 %-band (`*_80`) och ett yttre 95 %-band.

```json
{
  "id": "belaggning",
  "namn": "Beläggningsgrad",
  "enhet": "procent",
  "inverterad": true,
  "senaste": 96.3,
  "forandring": -2.3,
  "forandringar": [{ "etikett": "vecka", "varde": -2.3 }, { "etikett": "månad", "varde": 1.1 }],
  "status": "gron",
  "analystext": "Beläggningsgraden ligger på 96,3 procent ...",
  "beskrivning": "Andel disponibla vårdplatser som är belagda ...",
  "tidsserie": [{ "period": "2026-03-31", "etikett": "31 mar", "varde": 96.3, "yhat": 96.5,
                  "yhat_lower_80": 94.1, "yhat_upper_80": 98.9,
                  "yhat_lower": 92.4, "yhat_upper": 100.6, "signal": "gron" }],
  "dagar": [{ "period": "2026-03-23", "etikett": "23 mar", "varde": 94.7, "...": "samma fält som tidsserie" }],
  "dagar_sammanfattning": { "n_dagar": 7, "n_i_fas": 5, "n_bevaka": 1, "n_avvikelse": 1 },
  "referens": { "period": "2025-03-24", "etikett": "V13", "varde": 95.9, "forandring": -2.3 },
  "referens_serie": [{ "period": "2025-03-18", "etikett": "18 mar", "varde": 95.1, "...": "dag-vy: samma 14 dagar föreg. år" }],
  "kontext_serier": [{ "id": "vastra_gotaland", "namn": "Västra Götaland", "tidsserie": [...] }],
  "riket_serie": [{ "period": "2024-01-01", "etikett": "2024", "varde": 83.5 }],
  "undernivaer": [{ "id": "belaggning-halmstad", "namn": "Halmstad", "senaste": 88.5, "forandring": 1.2, "status": "gron", "tidsserie": [...], "dagar": [...] }]
}
```

- `yhat_lower_80` / `yhat_upper_80`: **inre** 80 %-band (målläge / "i fas").
- `yhat_lower` / `yhat_upper`: **yttre** 95 %-band (gräns mot avvikelse).
- `signal`: `"gron"` (inom 80 %), `"gul"` (mellan 80–95 %), `"rod"` (utanför 95 %).
- `kontext_serier` / `riket_serie` finns bara för jämförelseindikatorer (Patientenkäten).

### VyData-metadata

```json
{
  "vy": "vecka",
  "etikett": "Veckoöversikt",
  "period": "vecka 13, 2026",
  "dagar_period": { "start": "2026-03-23", "slut": "2026-03-29", "etikett": "V13" },
  "nasta_period": { "datum": "2026-04-05", "etikett": "5 apr 2026" }
}
```

### Särskilda årsindikatorer (SKR-kapitlen)

Vissa indikatorer har bara årsdata och saknar dygnsunderlag. Sedan 2026-06 är det **Koladas Hälso- och sjukvårdsrapport** (KPI-grupp `G2KPI138906`, 76 indikatorer) som utgör helårsdelen. **Sedan 2026-08-19 ÄR den rapporten:** dess sex kapitel är uppdelade i sex egna sektioner som ersatte de tidigare områdena (befolkning, folkhälsa, ekonomi → `R/arkiv/`). Dessa indikatorer:

- Finns bara i **årsvyn** (`ar`), som **SEX sektioner** (en kapitelrad var på
  startsidan): `skr-syn-pa-varden`, `skr-tillganglighet`, `skr-saker-vard`,
  `skr-kunskapsbaserad`, `skr-sjukdomsforekomst`, `skr-kostnader`. Akutflödet
  ligger sist i sektionsordningen som enda interna område.
- Varje kapitel har **tematiska avsnitt** via sektionsfältet `delar` (2–5 per
  kapitel: stroke, hjärta, diabetes, cancer och så vidare), var och en med egen
  bedömning (`delar[].analys`).
- Varje kapitel har dessutom tre redaktionella fält som kontraktet validerar:
  - `inledning`: array av stycken. Byggs i `bearbeta.R` som
    `SKR_RAM` + kapitlets egna stycken + `SKR_LASANVISNING` (de två gemensamma
    ligger i `config.R`). Visas sist i kapitlet, under Om statistiken.
  - `kallor` — primärkällorna kapitlet vilar på, en post per källa med antal
    indikatorer, från `kallforteckning()` i `kallor.R`.
  - `leverans` — leveranskedjan (Vården i siffror, Kolada), samma form.
- Varje indikator har `kalla`: primärkälla (namn, huvudman, typ, `om`, url) plus
  `kolada_kalla`, Koladas egen källformulering **ordagrant**. Attributionen går
  därmed alltid att granska mot ursprungstexten. Tilldelningarna finns i
  `SKR_KPI_KALLA` (`R/teman/kolada/kallor.R`), där de som går utöver Koladas
  text är märkta `TOLKAD`.
- Webbrapporten visar kapitlet enligt `docs/stilguide.md` 4.3: Det viktigaste,
  Läget i korthet (översiktstabellen grupperad per avsnitt), avsnitten med sina
  indikatorer och sist Om statistiken med inledningen, källorna och
  leveranskedjan. Innehållsförteckningen följer avsnitten.
- Indikatornamn förkortas för visning (enhets-/årssuffix trimmas i
  `kort_namn()`, manuella undantag i config `kortnamn`); fullständig
  Kolada-titel + definition ligger i `beskrivning` (fördjupningen under figuren)
- Jämförarens grupperingsträd är **inte** åtkomligt via öppna API:t (403) —
  tilldelningen indikator → kapitel och avsnitt underhålls manuellt i
  `R/teman/kolada/config.R`; oklassade indikatorer hamnar i ett automatiskt
  kapitel `skr-ovrigt` i stället för att tyst försvinna, och kontraktet
  validerar att `delar[].kpi_ids` refererar befintliga KPI:er
- Har **ingen** conformal prediction — signalen baseras på Hallands ranking
  bland regionerna per år: **i fas = topp 3**, bevaka = plats 4–7, avvikelse =
  plats 8 eller lägre (trösklar i config `ranking$grans_gron`/`grans_gul`)
- Riktning (högre/lägre är bättre, eller neutral) saknas i Kolada-API:t och
  underhålls manuellt i `R/teman/kolada/config.R` (`riktning_lag`, `riktning_neutral`);
  neutrala volymmått färgsätts inte (alltid grön + förklarande analystext)
- Har `kontext_serier` med övriga 20 regioners tidsserier (gråa linjer) och
  `riket_serie` med rikssnittet (streckad linje); tidsserier från 2016 (`min_ar`)
- Datakälla: `data/kolada-hos.rds`, hämtas med `R/hamta/kolada-hos.R`
  (rKolada 0.3.1 mot Kolada API v3 — v2-API:t är nedstängt)

## Webbrapporten (frontend)

Webbrapporten i `app/` är omgjord 2026 (omtaget, arbetspaketen WP0 till WP12b). Hur koden hänger ihop (moduler, typer, adresser, verktyg och arbetspaket) står i `docs/arkitektur.md`. Hur rapporten ska se ut och skrivas (färger, typografi, sidmallar, komponenter, diagram och tillgänglighet) står i `docs/stilguide.md`; den levande stilguiden `app/verktyg/stilguide.html` visar allt ur koden.

| Del | Var | Vad |
|---|---|---|
| Startsida | `app/src/start/` | Läget just nu och kapitlen per tema, med statusmätare och länk till kapitlet |
| Kapitel | `app/src/rapport/KapitelSida.tsx` | Masthead, Det viktigaste, Läget i korthet, avsnitt med indikatorer, Om statistiken |
| Indikator | `app/src/rapport/Indikator.tsx` | Rubrikrad med status, nyckeltalsrad, AI-analys, figur, fördjupning och verksamhetens kommentar |
| Sammanfattning | `app/src/rapport/Sammanfattning.tsx` | Det viktigaste över alla kapitel och kapitel för kapitel |
| Textsidor | `app/src/begrepp/BegreppSida.tsx`, `rapport/SaLaserDu.tsx`, `rapport/OmRapporten.tsx` | Begrepp, Så läser du rapporten, Om rapporten |
| Ram | `app/src/rapport/Ram.tsx` med flera | Verktygsrad med positionsrad och Exportera, innehållsförteckning |
| Grafer | `app/src/charts/`, `app/src/figur/` | `kpiTillSpec` gör en `ChartSpec` av en indikator, en renderare per graftyp (linje, rangordning, stapel, små multiplar, minidiagram) ritar den och `Figur` ger titel, flikar, jämförelse, noter, källa, tabell, nedladdning och förstoring |
| Adresser | `app/src/nav/` | Varje kapitel, indikator och begrepp har en adress (`#/kapitel/{id}?vy=…&i=…`); gamla `#rapport-{x}` skrivs om |
| PowerPoint | `app/src/export/` | Kapitlet eller hela rapporten med nativa diagram ur samma `ChartSpec` och tema som webben; laddas vid klick i Exportera |
| Design | `app/src/design/tema.ts`, `app/src/styles/` | Alla färger, typsnitt och mått som tokens; CSS-variablerna genereras därifrån |

Gamla appen (KPI-kort, ChartModal, FacetedChart, ReportView med flera) finns kvar bakom `?gammal` tills användaren har granskat den nya. Den laddas för sig och raderas sedan (docs/arkitektur.md avsnitt 2 och 8, WP12c).

## Anomalidetektering

GLM + **villkorlig** conformal prediction ger ett inre 80 %- och ett yttre 95 %-prediktionsintervall per KPI, tidsvy OCH avdelning. Tre-nivå-signal (sedan 2026-04-01). Full metodik: se `SIGNAL-METODIK.md`.

- `yhat`: förväntat värde (GLM-prediktion)
- `yhat_lower_80` / `yhat_upper_80`: inre 80 %-band
- `yhat_lower` / `yhat_upper`: yttre 95 %-band
- `signal`: `"gron"` (inom 80 %), `"gul"` (80–95 %), `"rod"` (utanför 95 %)
- Kalibrering sker **villkorligt** per dagskategori (vardag vs specialdag/helg) — bredare band på helger.
- Signaler beräknas separat per aggregeringsnivå (egen conformal-kalibrering, inte hopräknade dagssignaler) OCH per avdelning.
- Implementation: `R/gemensam/signal-modell.R` — huvudfunktion `kor_kpi_signal()`.

## Teknikstack

- **Frontend**: React 19, TypeScript, Vite 8, d3 (skalor, linjer och ticks), pptxgenjs (PowerPoint)
- **Datapipeline**: R med tidyverse, lubridate, jsonlite
- **Signalmodell**: GLM (gaussian/nb/gamma) + split conformal prediction
- **Typsnitt**: självhostade (Source Serif 4, IBM Plex Sans), se `docs/stilguide.md` 2.4
- **Lagring**: localStorage för redigeringar (vy-specifik med prefix)
- **Export**: Minifierad JSON (~3 MB) via `jsonlite::toJSON(auto_unbox = TRUE, na = "null", force = TRUE)`

## Bygga och köra

**Datapipeline (R):**
```r
source("R/pipeline.R")   # hela kedjan: demo-data → bearbeta → exportera
```
Producerar **split-JSON** i `app/public/data/` (manifest `index.json` + en fil per vy-sektion), som Vite serverar och frontend lazy-laddar per vy. Genväg: `npm run data:build` (i `app/`) kör hela R-pipelinen från repo-roten.

**Frontend (i `app/`):**
```bash
npm ci
npm run dev          # Vite dev-server; gamla appen på /?gammal, stilguiden på /verktyg/stilguide.html
npm run check        # eslint + tsc + vitest
npm run build        # tsc + vite build → app/dist/
npm run test:pptx    # röktest för PowerPoint-exporten
npm run bank         # skärmdumpar mot baslinjen (verktyg/bank/)
npm run a11y         # axe mot stilguiden och rapportens alla adresser
```
Deploy-bas är `/hosrapport/` (se `app/vite.config.ts`), anpassad för en underkatalog som på GitHub Pages. Verktygen och portarna står i `docs/arkitektur.md` avsnitt 7.

**Lokal hostning (stabil, utanför OneDrive):**
```powershell
powershell -ExecutionPolicy Bypass -File .\verktyg\hosta-lokalt.ps1
```
Bygger appen, speglar `app/dist` till `%LOCALAPPDATA%\hosrapport-site` och startar
en fristående node-server (`verktyg/server.mjs`) på http://localhost:8137/hosrapport/.
Servern överlever terminalen (PID i `server.pid`; skriptet stoppar/ersätter tidigare
instans). Varför kopian: OneDrive-synk kan låsa filer i repomappen och ge sporadiska
404 från servrar som läser direkt därifrån — kör om skriptet efter varje ny build/dataexport.
`vite preview` fungerar för snabbtitt men dör med terminalen och läser ur OneDrive.

**Publik hostning:** `.github/workflows/deploy.yml` bygger och deployar till GitHub
Pages vid push till `master`. JSON-datan i `app/public/data/` är spårad i git och
måste committas efter pipelinekörning för att följa med deployen.

**Validering av signalmodellen:**
```r
source("R/granskningsrapport.R")  # → rapport/signal-granskning.html (manuell, ej i pipeline)
source("R/test-signal.R")         # fristående signaltest → data/signal-test-resultat.rds
```

## Utvecklingsanteckningar — förbättrings- och utvecklingsområden

> Denna sektion är till för att underlätta omfattande vidareutveckling. Den fångar känd teknisk skuld, konventioner och fallgropar som inte syns i koden. Verifierad mot källkoden 2026-05-29.

### Konventioner (följ dessa vid ändringar)

- **All KPI-metadata har EN källa**: `R/teman/register.R` bygger `kpi_meta`. Lägg aldrig till KPI-fält genom att duplicera — utöka tema-config + register.
- **Metodik före kod**: ändringar i signalmetodik dokumenteras i `SIGNAL-METODIK.md` först, sedan i `R/gemensam/signal-modell.R`.
- **Utseende ur tokens**: inga hex-färger, px-storlekar eller typsnittsnamn i komponenter; allt ur `app/src/design/tema.ts` eller CSS-variablerna därifrån (`docs/stilguide.md`, `docs/arkitektur.md` 1 och 6).
- **En väg till grafen**: indikator, `kpiTillSpec`, `ChartSpec`, renderare i `app/src/charts/typer/`, `Figur`. En ny graftyp blir en renderare, inte en egen komponent (`docs/arkitektur.md` 4.2–4.4).
- **Språk**: kod, kommentarer och UI är på svenska. Inga em dash i någon text (`docs/stilguide.md` 3.1).

### Känd dokumentations-drift (åtgärda gärna)

- `SIGNAL-METODIK.md` rad 4–5 refererar `R/kap01-hamta.R` och `R/kap02-bearbeta.R` — dessa filer **finns inte längre**. De heter nu `R/hamta/demo-data.R` och `R/bearbeta.R`. (Övrig metodik i den filen är korrekt.)

### Känd teknisk skuld (R)

- ✅ **Åtgärdat (Fas 0):** ~~Manuell JSON-synk~~ — frontend läser nu kanoniska `data/hos-data.json` via Vite-aliaset `@data`; dubbletten i `app/src/data/` är borttagen.
- ✅ **Åtgärdat (Fas 0):** ~~Hårdkodad tidsstämpel `uppdaterad = "08:00"`~~ — nu `format(Sys.time(), "%H:%M")` i `R/bearbeta.R`.
- ✅ **Åtgärdat (Fas 2):** ~~Två signalpipelines~~ — `kor_kpi_signal()` (produktion) och `kor_signal()` (diagnostik) är nu tydligt avgränsade och dokumenterade i `signal-modell.R`; delar samma kärna.
- ✅ **Åtgärdat (Fas 2):** ~~`bearbeta.R`-monolit~~ — generisk bygg-logik utbruten till `R/gemensam/bygg-sektion.R` (ctx-mönster, inga closure-beroenden).
- ✅ **Åtgärdat (Fas 2):** ~~NPE-ranking hårdkodad för 21 regioner~~ — antal regioner härleds från datan; trösklar i `patientenkat`-config (`signal_typ="ranking"`).
- **NPE-ranking hårdkodad** för 21 regioner (grön ≤3, gul ≤7, röd >7) i `R/arkiv/teman/patientenkat/bearbeta.R`. Temat är arkiverat och sourcas inte; gäller igen om det återinförs.
- **Patientenkäten faller tyst bort** om `data/npe_primarvard.xlsx` saknas (returnerar `NULL`, ingen markering i JSON).
- **Ingen modell-persistens**: alla GLM:er tränas om från grunden varje körning. För produktion med riktigt API behövs omträningsstrategi och ev. sparade modeller.
- **Demodata är syntetisk** (`R/hamta/demo-data.R`) — ska ersättas med riktig API-/datakälla i produktion. Injicerade anomalier (se `SIGNAL-METODIK.md` §6.3) finns för att validera signalsystemet.

### Känd teknisk skuld (frontend)

- **Gamla appen** ligger kvar bakom `?gammal` med sina frysta filer (`app/src/components/*`, `utils/*` med flera) tills användaren har granskat den nya; raderas i WP12c (`docs/arkitektur.md` 8).
- **Begreppen** i `innehall/begrepp.json` är märkta `"granskad": false` tills en sakkunnig har läst dem.
- **Exempeldata**: akutflödet är syntetiskt, och avdelningar och ambulansstationer skapas i `app/src/data/exempelhierarki.ts` tills R levererar riktiga enheter.
- **Kontrakt v2 (WP8) är parkerat**: appen läser v1-fälten.
- **Generisk README**: `app/README.md` är fortfarande Vite-mallen.

### Naturliga utvecklingsspår

1. **Riktig datakälla** — ersätt `R/hamta/demo-data.R` med API/databas; behåll samma `radata-hos.rds`/`radata-dept.rds`-kontrakt så resten av pipelinen är oförändrad.
2. **Målläge frikopplat från statistik** — i dag härleds både "förväntat läge" (95 %) och "målläge" (80 %) ur conformal-modellen. Verksamhetens egna riktvärden kan läggas som separat fält per indikator.
3. **Fler sektioner/KPI:er** — följ "Ny sektion — steg för steg" ovan.
4. **Automatiserad validering** — koppla `granskningsrapport.R`-kvalitetskrav (se `SIGNAL-METODIK.md` §7.2) till ett test som failar pipelinen vid otillräcklig täckning.
5. **Persistens av redigeringar** — i dag `localStorage` per webbläsare (`hos-rapport-content-blocks`, nyckel `${vy}:${targetId}`). För delning mellan användare krävs backend.

### Filkartor (snabbreferens)

| Vill ändra... | Gå till |
|---------------|---------|
| Signalmetodik / conformal | `R/gemensam/signal-modell.R` + `SIGNAL-METODIK.md` |
| Lägg till KPI/sektion | `R/teman/{namn}/config.R` + `R/teman/register.R` |
| Kalender (helgdagar/lov) | `R/gemensam/helgdagar.R` |
| Aggregering/perioder | `R/gemensam/aggregering.R` |
| Etiketter/talformat | `R/gemensam/formatering.R` |
| Analystexter | `R/gemensam/analystext.R` |
| Grafernas innehåll (titlar, roller, visningar) | `app/src/charts/kpiTillSpec.ts`, `charts/text.ts` |
| Grafernas ritning | `app/src/charts/typer/*`, `charts/karna/*` |
| Kapitel och indikator | `app/src/rapport/KapitelSida.tsx`, `rapport/Indikator.tsx` |
| Startsidan | `app/src/start/StartSida.tsx` |
| Färger, typsnitt, mått | `app/src/design/tema.ts` |
| Datatyper (kontrakt R↔TS) | `app/src/data/kontrakt.ts` (JSON), `app/src/data/modell.ts` (efter normalisering) |
