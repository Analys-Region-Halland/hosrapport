# Arkitektur för omtaget 2026

Version 1.0 · 2026-10-05. Tekniskt underlag för arbetspaketen (WP0–WP12). Utseende och regler står i `docs/stilguide.md`; detta dokument säger var koden bor, vem som äger vad och hur delarna talar med varandra. Båda dokumenten ändras bara av orkestreraren.

---

## 1. Regler för alla agenter

| Regel | Spec |
|---|---|
| Arbetskatalog | Egen git worktree utanför OneDrive: `C:\dev\hos-wt\wpN` (gren `wp/N-kortnamn`, utgår från integrationsgrenen `omtag`). `npm ci` i `app/` efter skapandet. |
| Ägarskap | Ändra bara filer som ditt paket äger (avsnitt 3). Behöver du något i en annan fil: skriv det i din slutrapport, ändra inte. |
| Gammal kod | `app/src/components/*`, `app/src/charts/{tidsserie,constants,types}.ts`, `app/src/types.ts`, `app/src/utils/*`, `app/src/theme/*` och `app/src/index.css` är **frysta** tills WP12b (enda undantaget: WP0:s lagerinslagning av `index.css`, avsnitt 6). Ny kod importerar aldrig från dem (undantag: `stores/*`). |
| Beroenden | Bara WP0 ändrar `package.json` och låsfilen. |
| Färger och mått | Aldrig hex, px-storlekar eller typsnittsnamn direkt i komponenter. Allt via `design/tema.ts` (TS) eller CSS-variabler `--…` som genereras från den. ESLint stoppar hex-literaler utanför `design/`. |
| CSS | CSS Modules per komponent (`Komponent.module.css`). Globala regler bara i `styles/` (WP0). |
| Text | Svenska i all UI-text och alla kommentarer. Inga em dash (—) i någon text. Skrivregler enligt stilguiden 3. |
| Data | Bara WP8 och WP10 ändrar `R/**` och checkar in `app/public/data/**`. R-körning: `"C:\Program Files\R\R-4.5.2\bin\x64\Rscript.exe" -e "source('R/bearbeta.R'); source('R/exportera.R')"` från repo-roten. `data/*.rds` är gitignorerad: kör R i huvudkatalogen eller kopiera in rds-filerna. |
| Kontroller före överlämning | `npm run check` (lint + tsc + vitest) och `npm run build` i `app/`. Paketets egen grind (avsnitt 8). |
| Commit | Svenska, beskrivande rubrik i samma stil som historiken, avslutas med `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Ingen push. |
| Slutrapport | Vad som gjorts, vad som avviker från spec och varför, öppna frågor, skärmdumpar (sökväg) där det är visuellt. |

---

## 2. Gammalt och nytt sida vid sida

Det nya byggs bredvid det gamla och slås på med en flagga tills bytet.

| Steg | Hur |
|---|---|
| Flagga | `App.tsx` renderar den nya appen när adressen har `?ny` (`location.search`), annars den gamla. WP0 lägger in flaggan, WP6 äger den nya grenen. |
| Byte | När WP9 och WP11 är godkända blir den nya appen standard och `?gammal` visar den gamla. |
| Radering | WP12b raderar den gamla appen, flaggan, v1-kontraktet och frysta filer. |
| CSS | Gamla `index.css` importeras i `@layer legacy` (under alla nya lager) så att nya lager alltid vinner. Tailwinds preflight ersätts av `styles/reset.css` med samma regler, så att gamla vyn är pixelidentisk. |
| Typsnitt | Självhostade via `@fontsource-variable/source-serif-4` och `@fontsource/ibm-plex-sans` (400, 600). Plex Mono och Lexend Deca självhostas också tills WP12b eftersom gamla vyn använder dem. Google Fonts-länken i `App.tsx` tas bort. Avvikelse (WP0): Plex Sans och Lexend Deca kommer från `@fontsource-variable/*`, som är samma filer som Google Fonts serverade; de statiska paketen gav upp till 1,7 % avvikande pixlar i banken. |

---

## 3. Modulkarta och ägarskap

```
innehall/begrepp.json ............................ WP5
schema/hos-data.schema.json ...................... WP1 (v1 + v2)
docs/stilguide.md, docs/arkitektur.md ............ orkestreraren
R/** ............................................. WP8, sedan WP10
app/
  package.json, package-lock.json, vite.config.ts,
  eslint.config.js, tsconfig*.json, index.html ... WP0
  src/
    main.tsx ..................................... WP0
    App.tsx ...................................... WP0 (flagga), WP6 (ny gren)
    design/  tema.ts tema-css.ts format.ts
             kontrast.test.ts format.test.ts ..... WP0 (värden ur stilguiden); WP7 får justera värden
    styles/  index.css reset.css bas.css layout.css
             typsnitt.css utskrift.css ........... WP0
    data/    kontrakt.ts modell.ts normalisera.ts
             laddning.ts fixturer/ *.test.ts ..... WP1
    charts/  spec.ts kpiTillSpec.ts text.ts *.test.ts ... WP1
             register.ts Diagram.tsx karna/* typer/linje.tsx ... WP2
             typer/{rangordning,stapel,smaMultiplar,minidiagram}.tsx ... WP3
    figur/   Figur.tsx Nyckel.tsx Flikrad.tsx Noter.tsx Kallrad.tsx
             Atgarder.tsx Forstoring.tsx TabellVy.tsx nedladdning.ts ... WP4
    ui/      StatusMarkor Knapp Flikar Disclosure Dialog Meny Tabell ... WP4
             Popover Ark ......................... WP5
    begrepp/ register.ts lanka.ts Begrepp.tsx Prosa.tsx BegreppSida.tsx ... WP5
    nav/     route.ts useRoute.ts lager.ts Lank.tsx scroll.ts ... WP6
    rapport/ Ram.tsx Verktygsrad.tsx Positionsrad.tsx
             Innehall.tsx TidsupplosningVal.tsx .. WP6
             KapitelSida.tsx Sammanfattning.tsx Masthead.tsx DetViktigaste.tsx
             LagetIKorthet.tsx Avsnitt.tsx Indikator.tsx Nyckeltal.tsx
             IndikatorFordjupning.tsx Kommentar.tsx OmStatistiken.tsx ... WP9
    start/   StartSida.tsx ....................... WP11
    export/  pptx.ts ............................. WP12a
    stores/  blocks.ts dirty.ts position.ts ...... oförändrade (nycklar `${vy}:${targetId}` behålls)
  verktyg/
    bank.mjs (baslinje + pixeldiff) .............. WP0; WP7 bygger ut (kontaktark)
    stilguide.html stilguide.tsx a11y.mjs ........ WP7
    sektioner/{wp}.stilguide.tsx ................. varje WP sin egen fil (globbas)
    grafprov.html grafprov.tsx ................... WP2 skriver om
```

WP0 skapar varje ny fil som en stubb med slutlig exportsignatur (typer enligt avsnitt 4) så att alla paket kompilerar mot varandra från dag ett.

---

## 4. Typer

### 4.1 Datamodell (`data/modell.ts`)

```ts
export type Status = "gron" | "gul" | "rod";
export type VyId = "dag" | "vecka" | "manad" | "kvartal" | "ar";
export type Niva = "riket" | "region" | "forvaltning" | "sjukhus" | "verksamhet" | "avdelning" | "vardcentral";

export interface Enhet {
  id: string;              // Kolada-kod för regioner ("0013" = Region Halland, "0000" = riket), annars slug
  namn: string;
  kortnamn?: string;       // för etiketter under 520 px
  niva: Niva;
  parent_id: string | null;
  ordning?: number;        // naturlig ordning när den är meningsbärande
}

export interface Punkt {
  period: string;          // ISO-datum för periodens början
  etikett: string;
  varde: number | null;    // null = saknas eller undertryckt
  n?: number;
  undertryckt?: boolean;
  yhat?: number; lo80?: number; hi80?: number; lo95?: number; hi95?: number;
  signal?: Status;
}

export interface EnhetSerie {
  enhet_id: string;
  senaste: number | null;
  forandring?: number;
  status?: Status;
  rank?: number;
  rank_av?: number;
  tidsserie: Punkt[];
  dagar?: Punkt[];
}

export interface TalFormat {
  enhet: "procent" | "minuter" | "antal" | "kronor" | "kvot" | "per_invanare";
  decimaler: number;
  etikett: string;         // "%", "min", "kr", "per 100 000 inv."
}

export interface Not {
  typ: "seriebrott" | "fotnot" | "lucka" | "undertryckt" | "skala";
  period?: string;
  text: string;
  begrepp_id?: string;
}

export interface Huvudpunkt { text: string; kpi_id?: string; ton: "positiv" | "negativ" | "neutral" }

export interface KpiModell {
  id: string;
  namn: string;
  format: TalFormat;
  aggregering: "medel" | "summa" | "andel";
  riktning: "hog" | "lag" | "neutral";      // ersätter inverterad + utan_mal
  status: Status | null;                      // null för beskrivande mått
  status_fg?: Status;
  fokus: string;                              // enhet_id, normalt "0013"
  serier: Record<string, EnhetSerie>;         // fokus, jämförbara (regioner, riket) och underliggande
  jamforelse?: { typ: "riket" | "foregaende_period"; varde: number; etikett: string; period: string };
  topp3_band?: { period: string; lo: number; hi: number }[];
  analystext: string;
  fakta?: Fakta;                              // oförändrad typ från R
  kalla?: Kalla;                              // oförändrad typ från R
  beskrivning?: string;
  noter: Not[];
  dagar_sammanfattning?: { n_dagar: number; n_i_fas: number; n_bevaka: number; n_avvikelse: number };
}

export interface AvsnittModell { id: string; namn: string; dek?: string; kpi_ids: string[] }

export interface KapitelModell {
  id: string; namn: string; dek?: string;
  huvudpunkter: Huvudpunkt[];
  enheter: Enhet[];
  avsnitt: AvsnittModell[];                   // tom = kapitel utan avsnitt
  kpier: KpiModell[];
  om_statistiken: string[];                   // dagens `inledning`
  kallor: KallaRef[]; leverans: KallaRef[];
}
```

`normalisera(raw: unknown, vy: VyId): KapitelModell` läser både v1 och v2. För v1 härleds `enheter` ur `kontext_serier`-id:n, "0000" och `undernivaer`, `serier` ur samma fält, `format` ur `enhet` + `beskrivning` ("kr"), `riktning` ur `inverterad`/`utan_mal`, `jamforelse` ur `referens` (riket när `kontext_serier` finns, annars föregående period), och `huvudpunkter` med en enkel TS-regel tills R levererar dem.

### 4.2 Diagramspec (`charts/spec.ts`)

```ts
export type DiagramTyp = "linje" | "rangordning" | "stapel" | "smaMultiplar" | "minidiagram";
export type SerieRoll = "fokus" | "referens" | "kontext" | "markerad" | "forvantat" | "grans" | "mal";
export type VisningId = "tid" | "rang" | "enheter" | "enheterRang";

export interface SpecSerie {
  id: string; namn: string; roll: SerieRoll;
  enhetId?: string; markeringIndex?: number;   // index i farg.diagram.markering
  punkter?: Punkt[];
  intervall?: { x: string; lo: number; hi: number; lo2?: number; hi2?: number }[];
  varde?: number;                              // för rangordning och mål
  interaktiv?: boolean;                        // får lyftas och fästas
}

export interface Axel {
  typ: "tid" | "kategori" | "linjar";
  doman?: [number, number];                    // delad domän för små multiplar
  noll: boolean;
  format: TalFormat;
}

export interface ChartSpec {
  id: string;
  typ: DiagramTyp;
  kicker?: string;                             // indikatornamn, bara fristående
  titel: string;                               // stilguiden 6.2
  undertitel: string;                          // ≤ 2 meningar
  etiketter: { serieId: string; text: string }[];   // vilka serier som får namn vid linjeslut (stilguiden 6.4); inga legender
  jamforbara?: { enhetId: string; namn: string; senaste: number | null }[];   // underlag för "+ Jämför med …"
  serier: SpecSerie[];
  paneler?: { enhetId: string; titel: string; status?: Status }[];
  x: Axel; y: Axel;
  noter: Not[];
  kalla?: { namn: string; url?: string };
  sammanfattning: string;                      // aria-label, 100–200 tecken
  tabell: { caption: string; kolumner: string[]; rader: (string | number | null)[][]; fokusRad?: number };
  hojdklass: "standard" | "rangordning" | "kompakt" | "minidiagram";
}

export interface SpecKontext {
  vy: VyId;
  fokus?: string;           // enhet_id; nedborrning byter fokus
  fasta?: string[];         // fästa enheter
  dagar?: boolean;          // dagsdata i stället för perioddata
  fristaende?: boolean;     // ger kicker
}

export function visningar(kpi: KpiModell, kap: KapitelModell, ctx: SpecKontext): { id: VisningId; etikett: string }[];
export function kpiTillSpec(kpi: KpiModell, kap: KapitelModell, ctx: SpecKontext, visning: VisningId): ChartSpec;
```

**Vad `kpiTillSpec` bestämmer**

| Datan har | Förvald visning | Övriga visningar | Roller |
|---|---|---|---|
| Jämförbara regioner | `tid`: linje | `rang`: rangordning senaste period | fokus Halland, kontext övriga, referens riket, markerad = fästa; i rangordningen även `grans` för topp 3 (ej för neutrala) |
| Förväntat intervall (`yhat`) | `tid`: linje | – | fokus, forvantat (ett band, 80 %), punkter utanför markeras och etiketteras |
| Summamått och ≤ 24 perioder utan regioner | `tid`: stapel | – | fokus, referens föregående period |
| Underliggande enheter | – | `enheter`: små multiplar; `enheterRang`: rangordning av enheterna | panelens fokus = enheten; referens = överordnad nivå bara för andel och medel |
| `dagar` | – | Dagfliken i figuren | – |
| Översiktstabell | minidiagram | – | fokus |

Den bestämmer också titel och undertitel (stilguiden 6.2), vilka serier som etiketteras vid linjeslut, axlar (delad domän, noll för staplar), luckor som `null` per periodsteg, format, noter (seriebrott, luckor, undertryckt, index), källrad, sammanfattning och tabellrader. Den är en ren funktion utan DOM.

### 4.3 Renderare (`charts/register.ts`)

```ts
export interface Scen {
  bredd: number; hojd: number;
  plot: { x: number; y: number; b: number; h: number };
  xTicks: { v: number | string; x: number; text: string }[];
  yTicks: { v: number; y: number; text: string }[];
  lager: Lager[];             // ritordning: zon, band, kontext, referens, markerad, fokus, punkter
  etiketter: Etikett[];       // färdigplacerade efter kollisionslösning
  stopp: Stopp[];             // pekar- och tangentbordsmål per period och serie
}
export interface Renderare {
  typ: DiagramTyp;
  minstaBredd: number;
  hojd(bredd: number, spec: ChartSpec): number;
  layout(spec: ChartSpec, storlek: { bredd: number; hojd: number }, tema: Tema): Scen;   // ren funktion
  Rita: React.ComponentType<{ scen: Scen; spec: ChartSpec; aktiv: AktivPunkt | null; fasta: string[] }>;
}
export const RENDERARE: Record<DiagramTyp, Renderare>;
```

`Diagram.tsx` mäter bredd (efter `document.fonts.ready`), anropar `layout`, renderar `Rita` och äger interaktionslagret (pekare, tangentbord, tooltip, fästa). d3 används bara för skalor, `line`/`area` med `.defined()`, och ticks.

### 4.4 Figur (`figur/Figur.tsx`)

```ts
export interface FigurProps {
  spec: ChartSpec;
  rubrikniva?: 3 | 4;                                  // 4 i indikatorn
  visningar?: { id: VisningId; etikett: string }[]; visning?: VisningId; onVisning?(v: VisningId): void;
  dagFlik?: { pa: boolean; onByt(pa: boolean): void };
  brodsmula?: { id: string; namn: string }[]; onFokus?(enhetId: string): void;
  fasta?: string[]; onFasta?(ids: string[]): void;
  atgarder?: ("tabell" | "ladda" | "forstora")[];      // förval alla tre
}
```

### 4.5 Begrepp (`begrepp/register.ts`)

```ts
export interface Begrepp {
  id: string; term: string;
  former: string[];          // böjningsformer och synonymer som ska länkas
  kort: string;              // ≤ 25 ord
  lang?: string;             // ≤ 80 ord
  kalla?: { namn: string; url?: string };
  se_aven?: string[];
  kategori: "metod" | "statistik" | "vard" | "ekonomi" | "rapport";
  undantag?: string[];       // fraser där termen inte ska länkas
}
export function lankaBegrepp(text: string, reg: Begrepp[], redan: Set<string>):
  (string | { id: string; text: string })[];
```

Länkning: explicit `[[id|text]]` först, sedan längsta matchning först, ordgränser med `\p{L}`, skiftlägesokänslig, bara första förekomsten per omfång (`redan` delas inom en indikator), aldrig i rubriker, knappar eller tabeller.

### 4.6 Adresser (`nav/route.ts`)

| Adress | Visar |
|---|---|
| `#/` | Startsidan |
| `#/sammanfattning?vy=ar` | Sammanfattningen |
| `#/kapitel/{id}?vy=manad&i={blockId}` | Kapitel, rullat till block |
| `…&v={visning}&e={enhetId}` | Figurens visning och fokusenhet (bara via "Kopiera länk") |
| `…&red=1` | Redigeringsläge |
| `#/begrepp` · `#/begrepp/{id}` | Begreppslistan |
| `#/las` | Så läser du rapporten |
| `#rapport-{x}` (gammalt) | Skrivs om till motsvarande `#/kapitel/…?i=x` |

`parse`/`format` är rena och testade. Kapitel- och vybyten använder `pushState`; läspositionen `i` uppdateras med fördröjd `replaceState`. Efter laddning och `document.fonts.ready` rullas sidan till `[data-block="{i}"]`. Escape hanteras av `nav/lager.ts` (en stapel av öppna lager); ingen komponent lyssnar på Escape på `document` för egen räkning.

---

## 5. Datakontrakt v2

R skriver v1-fälten oförändrade **och** v2-fälten (dubbelskrivning) tills WP12b. Manifestet får `kontrakt_version: 2`.

| Fält | Nivå | Innehåll | Producent i R |
|---|---|---|---|
| `kontrakt_version` | manifest | `2` | `exportera.R` |
| `huvudpunkter` | manifest per vy | ≤ 6 över alla kapitel | `analystext.R` |
| `sektioner[].dek`, `sektioner[].huvudpunkter` | manifest | dek + ≤ 3 punkter per kapitel (för sammanfattningen) | `exportera.R` |
| `dek` | sektion | 1–2 meningar | tema-config eller `analystext.R` |
| `huvudpunkter` | sektion | ≤ 6 `Huvudpunkt` | `analystext.R` |
| `enheter` | sektion | `Enhet[]` för alla enheter som förekommer | `kolada/bearbeta.R` (regioner, riket), `akutflode/config.R` (hierarki) |
| `delar[].dek` | sektion | avsnittets dek | `analystext.R` (ersätter statusräkningen i `del_analys`) |
| `fokus_enhet` | kpi | `"0013"` | båda teman |
| `serier` | kpi | `Record<enhet_id, EnhetSerie>` | `bygg-sektion.R` (`generera_undernivaer` → `bygg_enhetsserier`), `kolada/bearbeta.R` |
| `format` | kpi | `TalFormat`; kronor rätt (idag "antal") | `kolada/config.R` (överstyrning per KPI) |
| `aggregering` | kpi | finns i `kpi_meta`, exporteras | `akutflode/config.R`, Kolada standard "andel" |
| `riktning` | kpi | `hog`/`lag`/`neutral` | båda |
| `jamforelse` | kpi | delar upp `referens` | `aggregering.R`, `kolada/bearbeta.R` |
| `noter` | kpi | seriebrott m.m. (t.ex. N79179 källbyte 2024) | `kolada/config.R` |
| `status_fg` | kpi | finns redan, typas | – |
| `n`, `undertryckt` | punkt | antal fall; `varde: null` under tröskeln | `bygg-sektion.R`, `demo-data.R` |
| `min_n` | tema-config | tröskel för undertryckning | `akutflode/config.R` |

Validering: `R/gemensam/kontrakt.R` (R-sidan, båda versionerna), `schema/hos-data.schema.json` (ajv i vitest, båda versionerna), ny `R/gemensam/begrepp.R` som läser `innehall/begrepp.json` och stoppar okända `[[id]]` i genererad text, samt en R-kontroll att genererad text saknar em dash. `app/src/utils/validateContract.ts` tas bort i WP12b.

---

## 6. CSS-arkitektur

```css
/* styles/index.css (importeras först i main.tsx) */
@layer reset, legacy, tema, bas, layout, komponent, utskrift;
@import "./reset.css" layer(reset);
@import "./typsnitt.css";
@import "./bas.css" layer(bas);
@import "./layout.css" layer(layout);
@import "./utskrift.css" layer(utskrift);
```

- Avvikelse (WP0): `reset` ligger under `legacy`, som preflight låg under gamla `index.css`; ovanför skulle återställningen vinna över gamla vyns regler.
- `main.tsx` importerar i ordning: `styles/index.css`, `virtual:tema.css` (genereras av vite-pluginet i `design/tema-css.ts`; innehållet är redan inslaget i `@layer tema { :root { … } }`), gamla `index.css`.
- Gamla `index.css`: raden `@import "tailwindcss";` tas bort och resten av filen slås in i `@layer legacy { … }`. Det är den enda ändring WP0 gör i den frysta filen. Fungerar `@import … layer()` i Vite 8 utan omskrivning får WP0 välja den vägen i stället; kontrollera i byggd CSS att lagerordningen blev rätt.

CSS-variablerna heter som tokens med bindestreck: `farg.diagram.fokus` → `--farg-diagram-fokus`, `typ.roll.brod` → `--typ-brod-storlek`, `--typ-brod-radhojd`, `--typ-brod-vikt`, `rum.5` → `--rum-5`. Komponenternas `.module.css` läggs automatiskt i lagret `komponent` via `@layer komponent { … }` i varje fil.

---

## 7. Verktyg och tester

| Kommando (i `app/`) | Gör |
|---|---|
| `npm run check` | eslint + `tsc -b` + `vitest run` |
| `npm run build` | produktionsbygge |
| `npm run bank -- --baslinje` | tar baslinjebilder (sparas i `verktyg/bank/baslinje/`, gitignorerad) |
| `npm run bank` | tar nya bilder, pixeldiff mot baslinjen, skriver `verktyg/bank/rapport.html` (kontaktark) |
| `npm run a11y` | axe-core via CDP mot stilguiden och alla adresser |
| `npm run test:pptx` | befintligt röktest för PowerPoint |

`bank.mjs` startar egen headless Edge (`--user-data-dir` i temp, port 9222) och avslutar bara den processen. Gamla vyn saknar adresser; banken klickar sig fram (startsidan → kapitel med `button.start-area`). Selektorer i nya vyer använder `data-*`-attribut eftersom CSS Modules hashar klassnamn.

---

## 8. Arbetspaket

Varje paket: mål, äger, beror på, levererar, godkänt när. Ägarskap enligt avsnitt 3.

### WP0 Grund
- **Mål:** verktyg, tokens och struktur utan synlig ändring av gamla vyn.
- **Levererar:** devberoenden (vitest, ajv, pixelmatch, pngjs, axe-core, @fontsource-paket); Tailwind bort med preflight ersatt i `styles/reset.css`; `design/tema.ts` med alla värden ur stilguiden 2.1–2.6 och diagramvärden ur 6.4–6.5; `tema-css.ts` + vite-plugin `virtual:tema.css`; `design/format.ts` (svensk talformatering enligt stilguiden 3.2, ersätter senare `utils/format.ts`); `kontrast.test.ts` som prövar varje textpar ≥ 4,5:1 och varje budskapsbärande diagramfärg ≥ 3:1 mot `yta`; ESLint-regel mot hex-literaler utanför `design/` (varning, frysta filer undantagna); `styles/*`; självhostade typsnitt; `?ny`-flaggan som visar en tom ny ram; stubbar för alla nya filer i avsnitt 3; `bank.mjs` med baslinje och diff; npm-skript enligt avsnitt 7; borttagning av död kod som inte påverkar gamla vyn (`theme/tokens.ts`, oanvända konstanter, `.kpi-grid*`, `.board-row`, Merriweather).
- **Godkänt när (G0):** `npm run check` och `build` gröna; banken visar 0 avvikande pixlar (tolerans 0,1 % för typsnittskantutjämning) för startsidan, kapitel 2 och Akutflöde i 1440 och 390 px; `test:pptx` 7/7.

### WP1 Datamodell och spec
- **Mål:** rena typer och funktioner från JSON till `ChartSpec`.
- **Levererar:** `data/*` enligt 4.1 med `normalisera` för v1 och v2; `charts/spec.ts`, `kpiTillSpec.ts`, `text.ts` (titlar, undertitlar, sammanfattningar, enligt stilguiden 6.2 och 3.2); `schema/hos-data.schema.json` för v1 och v2; fixturer (utdrag ur verklig data + syntetiska fall: luckor, seriebrott, tre nivåer, undertryckt, kronor, neutralt mått). **Checka in typerna först** (egen commit) så WP8 kan börja.
- **Godkänt när (G1):** vitest: `normalisera` över alla 12 datafiler (varje serie har en enhet, perioder sorterade, luckor `null`, inga `NaN`); snapshots av `kpiTillSpec` för alla indikatorer och visningar; inga em dash i genererade titlar; undertitlar ≤ 2 meningar; varje serieroll har färg, bredd och streckning i `tema.ts`; ingen spec har legend eller zon i linjediagram; schema validerar all data.

### WP2 Diagramkärna och linje
- **Mål:** gemensamma delar och linjediagrammet enligt stilguiden 6.3–6.5 och 6.8.
- **Levererar:** `charts/karna/*` (skalor, axlar, rutnät, etikettkollision, klipp, interaktionslager, tooltip), `typer/linje.tsx` (fokus, referens, kontext, markerad, förväntat, zon, mål, seriebrott), `Diagram.tsx`, `register.ts`, omskriven `grafprov` som renderar `Figur` + spec för valfri indikator, stilguidesektion `sektioner/diagram.stilguide.tsx`.
- **Godkänt när (G2):** SSR-rendering av alla fixturer; layouttester (luckor bryter linjen, inget utanför plotytan, etiketterna i en kolumn utan krockar, ticks omsluter datan); träfftest mot verkligt avstånd till linjesegment med tröghet (lyft inom 8 px, släpp efter 14 px, byte först vid 4 px närmare) enligt stilguiden 6.8; hovring ritar bara överlägget, aldrig de statiska lagren (test: antalet `path` i statiska lagret oförändrat under en pekarsekvens); musklick ger inte fokus; tangentbord (← → ↑ ↓ Enter Escape), pekare och pekskärm fungerar; tooltip i plotytans överkant med `aria-live`; skärmdump av fem SKR-indikatorer och två akutflödesindikatorer i vila, med hovring och med två fästa regioner. Referens för utseende och beteende: linjediagrammet i granskningssidan för stilguiden (version 2).

### WP3 Fler graftyper
- **Mål:** rangordning, stapel, små multiplar, minidiagram enligt stilguiden 6.6.
- **Godkänt när:** rangordningens ordning = `rank` för alla SKR-indikatorer; lika värden får samma plats; staplar börjar på noll; små multiplar delar skala och följer kolumnreglerna; varje typ har hovring, tangentbord och pekskärm enligt tabellen "Alla graftyper är interaktiva" i stilguiden 6.8 (små multiplar med synkroniserad hjälplinje över panelerna, rangordning med fästa regioner delade med linjevyn); allt fungerar från 320 px; stilguidesektion per typ.

### WP4 Figur och UI-delar
- **Mål:** en figurram överallt (stilguiden 6.1, 6.8) och grundkomponenter (5.1–5.5, 5.9).
- **Levererar:** `figur/*`, `ui/{StatusMarkor,Knapp,Flikar,Disclosure,Dialog,Meny,Tabell}`. Kan börja mot en stubbrenderare innan WP2 är klar.
- **Godkänt när:** tabellvyn är en riktig `<table>` med `<caption>`; CSV öppnas rätt i svensk Excel; SVG och PNG har titel, undertitel och källa inbakade och rätt typsnitt; förstoringen är en dialog med fokusfälla; jämför-listan och chipsen byggs ur spec och delar tillstånd med grafen; axe utan allvarliga fel.

### WP5 Begrepp
- **Mål:** begreppsregister och toggletips enligt stilguiden 5.7.
- **Levererar:** `innehall/begrepp.json` med ~25 begrepp skrivna enligt stilguiden 5.7 och märkta `"granskad": false` tills sakkunnig granskat. Startlista: AI-analys, förväntat intervall, I fas, Bevaka, Avvikelse, topp 3, plats bland regionerna, rikssnitt, procentenhet, median, seriebrott, aggregat och enheter, vårdgaranti, tillgänglighetsgaranti, standardiserat vårdförlopp (SVF), DRG, KPP, strukturjusterad kostnad, behovsjusterad jämförelse, beläggningsgrad, medianväntetid, Kolada, Vården i siffror, nationellt kvalitetsregister, beskrivande mått. Dessutom `begrepp/*`, `ui/{Popover,Ark}`, `BegreppSida` för `#/begrepp`.
- **Godkänt när:** tester för länkning (böjningsformer, ordgränser, bara första förekomsten, undantag, explicit `[[id|text]]`); alla `kort` ≤ 25 ord; popover och ark fungerar med mus, tangentbord och pekskärm; Escape stänger bara popovern.

### WP6 Navigering och ram
- **Mål:** adresser och rapportens ram enligt stilguiden 4.5 och arkitektur 4.6.
- **Levererar:** `nav/*`, ny gren i `App.tsx`, `rapport/{Ram,Verktygsrad,Positionsrad,Innehall,TidsupplosningVal}`.
- **Godkänt när:** route-tester; uppdatera, bakåt, framåt och djuplänk fungerar; gamla ankare skrivs om; Escape-stapeln; ingen nedtoning; verktygsraden ryms i 360 px; innehållsförteckning som spalt ≥ 1200 px och ark under.

### WP7 Levande stilguide och bänk
- **Mål:** `verktyg/stilguide.html` som visar allt i stilguiden ur koden.
- **Levererar:** sidor för färger (med kontrastvärden), typografi, avstånd, komponenter (globbar `sektioner/*.stilguide.tsx` från övriga paket), kontaktark och diffrapport i `bank.mjs`, `a11y.mjs`. Får justera värden i `tema.ts` om stilguiden och rendering visar sig skilja (rapporteras).
- **Galleriet ska innehålla** varje graftyp med riktig data och full interaktion, minst: linje med alla 21 regioner och riket (spaghettigraf, t.ex. `kolada-n79179` med luckor och seriebrott, och en indikator utan luckor), linje med två fästa regioner, rangordning, linje mot förväntat (akutflöde, månad), stapel över tid, små multiplar per sjukhus, minidiagram i översiktstabell. Varje exempel i 1440 och 390 px.
- **Godkänt när:** inga listor är hårdkodade (allt läses ur `tema.ts`); galleriet ovan finns och går att hovra; axe-körning ren; diffrapporten fungerar.

### WP8 R-kontrakt v2
- **Mål:** dubbelskrivning av v1 och v2 enligt avsnitt 5.
- **Levererar:** fälten i avsnitt 5; `huvudpunkter` och dekar med regler enligt stilguiden 3.4; seriebrottsnoter; kronor och per invånare rätt; undertryckning i demodata med `n`; verifiering och rättning av de tre kända bristerna i `kolada/bearbeta.R` (plats av antal med värde, jämförelseår över tomma år och källbyte, 3 %-klippan) med samtidig uppdatering av exemplet i `docs/tillganglighet-intern-kort.html`; `R/gemensam/begrepp.R`; em dash-kontroll; död R-kod bort (`ranking-tema.R` om oanvänd, `dept_config`, `avdelningar`).
- **Godkänt när (G3):** R-körningen ger "kontrakt OK"; vitest (WP1:s schema och `normalisera`) passerar mot nya JSON; banken för gamla vyn är oförändrad.

### WP9 Rapportsidan
- **Mål:** kapitel, indikator och sammanfattning enligt stilguiden 4.2–4.4 och 5.6–5.8.
- **Levererar:** filerna i `rapport/` som ägs av WP9; `content-visibility: auto` och lat montering av figurer utanför skärmen.
- **Godkänt när (G4):** indikator ≤ 1,3 skärmhöjder i 1440 × 900 med stängd fördjupning; status en gång per indikator; sammanfattningen ≤ 3 skärmhöjder; djuplänk till varje indikator; bänk och axe för alla adresser i 1440 och 390 px.

### WP10 Undernivåer
- **Mål:** nedborrning hela vägen enligt stilguiden 6.7.
- **Levererar:** demohierarki i R (region › sjukhus › avdelning, med `n` och undertryckning), nivåfliken, brödsmula, `e=` i adressen.
- **Godkänt när:** Region Halland / Per sjukhus / Per avdelning fungerar för alla akutflödesindikatorer; undertryckta värden visas som `..` med not; djuplänk med `e=` fungerar.

### WP11 Startsida
- **Mål:** startsidan enligt stilguiden 4.1.
- **Godkänt när:** inga ramar, linjer, taggar eller versala etiketter utom kickern; en metarad och en statusmätare per kapitel; länkar till sammanfattning, begrepp och läsanvisning; fungerar i 360 px; axe ren.

### WP12a PowerPoint
- **Mål:** exporten byggd på `ChartSpec` och `tema.ts` enligt stilguiden 6.9.
- **Godkänt när:** `test:pptx` 7/7; riket har samma färg som på webben; varje graftyp har en definierad återgivning.

### WP12b Städning
- **Mål:** en kodbas.
- **Levererar:** radering av frysta filer, `?ny`-flaggan, v1-fälten i R, v1-grenen i `normalisera` och schemat, Plex Mono och Lexend; hex-regeln på felnivå; uppdaterad `PROJEKT-METODIK.md`.
- **Godkänt när (G5):** inga importer av raderade moduler; alla grindar ovan gröna.

---

## 9. Ordning

```
Steg 0  stilguide.md + arkitektur.md (orkestreraren) ── du granskar
Steg 1  WP0 ── G0
Steg 2  WP1 (typer först) │ WP5 │ WP6 │ WP7 │ WP8 (efter WP1:s typer)
Steg 3  WP2 → WP3 │ WP4 │ WP11 ── du granskar graferna i levande stilguiden
Steg 4  WP9 │ WP12a ── du granskar rapportsidan och startsidan
Steg 5  WP10 → WP12b
```

Sammanslagning i ordningen WP0, WP1, WP5, WP6, WP7, WP8, WP2, WP4, WP3, WP11, WP9, WP12a, WP10, WP12b. Orkestreraren granskar varje paket (tester, skärmdumpar, kod) före sammanslagning.
