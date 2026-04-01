# PROJEKT-METODIK: HoS-rapport

## Syfte

Hälso- och sjukvårdens (HoS) uppföljningsrapport för Region Halland. En React-dashboard som visualiserar nyckeltal (KPI:er) med statistisk anomalidetektering (conformal prediction) i realtid. Verktyget ger beslutsfattare snabb överblick av läget och möjlighet att generera strukturerade rapporter.

## Projekttyp

**Typ B: React/Vite-app** — R sköter datapipeline, React/TypeScript/D3 sköter frontend.

## Datapipeline

R-skripten i `R/` hämtar data, bearbetar, kör conformal prediction och exporterar till JSON.
Frontend läser `app/src/data/hos-data.json` som innehåller alla fem tidsupplösningar.

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

```json
{
  "id": "belaggning",
  "namn": "Beläggningsgrad",
  "enhet": "procent",
  "inverterad": true,
  "senaste": 96.3,
  "status": "gron",
  "tidsserie": [{ "period": "2026-03-31", "etikett": "31 mar", "varde": 96.3, "yhat": 96.5, "yhat_lower": 92.4, "yhat_upper": 100.6, "signal": "gron" }],
  "dagar": [{ "period": "2026-03-23", "etikett": "23 mar", "varde": 94.7, ... }],
  "dagar_sammanfattning": { "n_dagar": 7, "n_i_fas": 6, "n_avvikelse": 1 },
  "referens": { "period": "2025-03-24", "etikett": "V13", "varde": 95.9, "forandring": -2.3 },
  "undernivaer": [{ "id": "belaggning-halmstad", "namn": "Halmstad", "tidsserie": [...], "dagar": [...] }]
}
```

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

## Frontend-arkitektur

### Aggregerat / Dag toggle

En toggle-switch **Aggregerat | Dag** finns på tre platser:

1. **Dashboard** (App.tsx) — under vy-väljaren, visas bara för vecka/månad/kvartal/år
2. **ChartModal** (popup-graf) — i toolbaren
3. **ReportView** (rapport) — per indikator, ovanför FacetedChart

Vid dag-toggle:
- KPI-kort visar `kpi.dagar` istället för `kpi.tidsserie`
- Underavdelningar byter också till `sub.dagar`
- Graferna anpassas automatiskt (tunnare linjer, inga individuella punkter vid >30 datapunkter)

### KPI-kort (KpiCard)

- **Signalband** (3px topp) — grön/röd baserat på conformal signal
- **Titel** med hover-tooltip (indikatorns definition)
- **Hero-värde** (28px, bold mono)
- **Förväntat + intervall** + signal-badge
- **MiniChart** (90px) — D3-graf med prediktionsband, adaptiv linjestyrka
- **Dagsammanfattning** — visas vid dag-toggle: "28/31 i fas, 3 avvikelser"
- **Referens** — jämförelse med samma period föregående år med färgkodad riktning
- **Avdelningar** — expanderbar grid, klick öppnar ChartModal med titel "Indikator, Avdelning"

Dag-vyn (standalone) visar referenslinje från föregående år (streckad grå) med y-domän som inkluderar referensvärden.

### Grafkomponenter

| Komponent | Fil | Beskrivning |
|-----------|-----|-------------|
| **MiniChart** | `KpiCard.tsx` | 90px inline-graf. Referenslinje (dag-vy). Adaptiv: tunn linje vid >60 punkter. |
| **ChartModal** | `ChartModal.tsx` | Popup-graf för enskild KPI. Visar faktiskt + förväntat + referens med slutetiketter och anti-collision. Aggregerat/Dag toggle i toolbar. |
| **FacetedChart** | `FacetedChart.tsx` | Multi-serie i rapport. 2x2 grid. Vy-anpassade x-etiketter (V13, mar 26 etc). Adaptiv linjestyrka. |

### ChartModal design

- **Titel**: KPI-namn + avdelning om tillämpligt (t.ex. "Beläggningsgrad, Halmstad")
- **Undertitel**: Vy + period + Region Halland
- **Slutetiketter** vid linjeslut: "Faktiskt", "Förväntat", "Föreg. år" — med `resolveOverlap` anti-collision (iterativ relaxering, H→V→H connectors)
- **Ingen text under grafen** — analystext och legend borttagna
- **Hover**: crosshair + tooltip med faktiskt/förväntat per tidpunkt

### FacetedChart design

- **2x2 grid** med individuella y-axlar per panel
- **Panelrubrik**: serienamn i färg (inget värde)
- **Vy-etiketter** på x-axeln: använder `etikett`-fältet från data (V1, jan 21, Q1 21 etc.)
- **Adaptiv**: inga individuella punkter vid >30 datapunkter, tunnare linje
- **Aggregerat/Dag toggle** per indikator i rapporten

### Vyer och rapporter

| Komponent | Fil | Beskrivning |
|-----------|-----|-------------|
| **App** | `App.tsx` | Huvudvy med vy-väljare + Aggregerat/Dag toggle + stats-bar |
| **Section** | `Section.tsx` | Sektionsblock med KpiCard-grid + "Generera delrapport" |
| **ReportView** | `ReportView.tsx` | Fullskärmsrapport. Används för BÅDE huvudrapport och delrapport (med `sectionId`-prop). |

### Huvudrapport vs Delrapport

Samma komponent (`ReportView`) — delrapport filtreras med `sectionId`:

- **Huvudrapport**: alla sektioner, innehållsförteckning, global analys, titel "Hälso- och sjukvården"
- **Delrapport**: en sektion, titel = sektionsnamn, ingen TOC, ingen global analys, inget "Kapitel X"

Redigeringar delas via samma `localStorage`-nycklar (`${vy}:${targetId}`).

### Rapportens dokumentstruktur

```
Logo (Region Halland)
VY-ETIKETT (Daglig uppföljning)
Hälso- och sjukvården / Sektionsnamn     ← h1, Source Serif 4, 36px
Dagsöversikt — 31 mars 2026              ← undertitel
──── (accentlinje 48px)

[Sammanfattning: antal indikatorer, inom/utanför förväntat]
[Innehållsförteckning]                    ← bara huvudrapport
[Global AI-analys + kommentarer]          ← bara huvudrapport

KAPITEL 1                                 ← bara huvudrapport
Kapacitet och flöden                      ← h2, Source Serif 4, 28px
[Sektionsanalys]

Beläggningsgrad                           ← h3, Source Serif 4, 20px
────────────────────────── (tunn linje)
96,3% · förväntat 96,5% · V1 2021–V13 2026
[AI-analys + kommentarer]
┌────────────────────────────────────┐
│ [Aggregerat | Dag]  toggle         │
│ [FacetedChart — 2x2 grid]          │
└────────────────────────────────────┘
```

### Anti-collision (slutetiketter)

Används i ChartModal. Baserat på kommundata-projektets `resolveOverlap`:

```typescript
function resolveOverlap(labels, minGap, yMin, yMax) {
  // Iterativ relaxering (max 20 iterationer)
  // Symmetrisk shift: (minGap - gap) / 2
  // Boundary clamp: [yMin + 6, yMax - 6]
  // Connector: H→V→H linje från naturalY till yPos
}
```

## Anomalidetektering

GLM + conformal prediction ger 95%-prediktionsintervall per KPI och tidsvy.

- `yhat`: förväntat värde
- `yhat_lower` / `yhat_upper`: 95% konfidensintervall
- `signal`: `"gron"` (inom) eller `"rod"` (utanför)
- Signaler beräknas separat per aggregeringsnivå OCH per avdelning

## Typsnitt

| Typsnitt | Användning |
|----------|-----------|
| Source Serif 4 | Rapportrubriker (h1–h3), graftitlar, ChartModal-titel |
| IBM Plex Sans | Brödtext, etiketter, tooltip-text |
| IBM Plex Mono | Siffervärden, hero-värden i KPI-kort |
| Lexend Deca | App-rubrik (topbar), sektionsrubriker i dashboard |

## Färger

Conformal signal:
- Grön (#16a34a): Inom förväntat intervall
- Röd (#dc2626): Utanför förväntat intervall

Accent:
- #00664D (Grön 1): Rubriker, accentlinjer
- #00AB60 (Grön 2): Vy-etiketter, kapitel-overlines

Avdelningsfärger: `#2DB8F6`, `#6473D9`, `#FF5F4A`, `#FFD939`, `#895B42`, `#00AB60`

## Teknikstack

- **Frontend**: React 19, TypeScript, Vite, D3.js
- **Datapipeline**: R med tidyverse, lubridate, jsonlite
- **Signalmodell**: GLM (gaussian/nb/gamma) + split conformal prediction
- **Typsnitt**: Google Fonts
- **Lagring**: localStorage för redigeringar (vy-specifik med prefix)
- **Export**: Minifierad JSON (~1–2 MB)
