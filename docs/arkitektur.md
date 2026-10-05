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

Nya rapporten är standard sedan WP12b. Gamla appen finns kvar bakom `?gammal` tills användaren har granskat den nya; den raderas i ett senare paket (8, WP12c).

| Del | Hur det är byggt |
|---|---|
| Val av app | `App.tsx` läser `location.search`. Utan parametrar renderas nya appen (`NyApp`), även för gamla bokmärken utan hash. `?gammal` visar gamla appen oförändrad. Gamla ankare `#rapport-{x}` skrivs om till kapiteladresser (4.6). |
| Gamla appen | `GammalApp.tsx` (StartScreen och ReportShell) laddas med `lazy(() => import("./GammalApp"))` och ligger med `components/*`, `utils/*`, `charts/{tidsserie,constants,types}.ts`, `types.ts`, `taxonomy.ts`, `data/load.ts` och `stores/position.ts` i en egen bit av bygget. Ny kod importerar aldrig därifrån (undantag: `stores/blocks.ts` och `stores/dirty.ts` för redigeringsläget). |
| Gamla stilar | Gamla `index.css`, inslagen i `@layer legacy`, importeras av `GammalApp.tsx` och laddas bara med gamla appen. Lagerordningen deklareras i `index.html`, så att stilarna hamnar under de nya lagren fast de laddas sist. Nya appen sätter grundtypsnitt, fokusring och `.visuellt-dold` i `styles/bas.css`; `styles/reset.css` (Tailwinds preflight) ligger kvar för båda. |
| Kontroll | Bänken: gamla vyn på `/?gammal` har 0 avvikande pixlar mot baslinjen från före bytet, och nya vyerna har 0 avvikande pixlar före och efter flytten av `index.css`. |
| Typsnitt | Självhostade i `styles/typsnitt.css`: Source Serif 4 och IBM Plex Sans (`@fontsource-variable/*`, samma filer som Google Fonts serverade). Plex Mono och Lexend Deca används bara av gamla vyn och tas bort med den. |
| Byggets bitar | `index` (nya appen, cirka 300 kB), `react` (React, React DOM, scheduler; egen grupp i `vite.config.ts`), `GammalApp` (gamla appen och dess CSS) och `pptx` + `pptxgen` (PowerPoint-exporten, laddas vid klick). Stilguiden och grafprovet är egna sidor i `verktyg/` som bara dev-servern serverar; de ingår inte i bygget. |

---

## 3. Modulkarta

Filerna som de är efter sammanslagningen av alla paket. Paketet inom parentes byggde delen; varje fil säger sin ägare i huvudkommentaren.

```
innehall/begrepp.json ............................ begreppsregistret (WP5)
schema/hos-data.schema.json ...................... v1, oförändrat (WP1 bantat, WP8 parkerat)
docs/stilguide.md, docs/arkitektur.md ............ orkestreraren
R/** ............................................. oförändrat (WP8 parkerat)
app/
  package.json, package-lock.json, eslint.config.js,
  tsconfig*.json, index.html ..................... grund (WP0)
  vite.config.ts ................................. grund (WP0); byggets bitar (WP12b)
  src/
    main.tsx ..................................... globala stilar, tema-CSS, App
    App.tsx ...................................... ny eller gammal app; NyApp: adress → sida
    GammalApp.tsx ................................ gamla appen, lat laddad, med index.css
    design/  tema.ts tema-css.ts format.ts kontrast.ts (+ tester)
    styles/  index.css reset.css typsnitt.css bas.css layout.css utskrift.css
    data/    kontrakt.ts modell.ts normalisera.ts laddning.ts kapitelinfo.ts
             exempelhierarki.ts (påhittad avdelningsnivå, WP10) fixturer/
    charts/  spec.ts kpiTillSpec.ts text.ts underlag.ts (WP1)
             register.ts Diagram.tsx karna/* typer/linje.tsx (WP2)
             typer/{rangordning,stapel,smaMultiplar,minidiagram}*.tsx (WP3)
    figur/   Figur Flikrad JamforRad Noter Kallrad Atgarder Forstoring TabellVy
             nedladdning.ts fasta.ts (WP4)
    ui/      StatusMarkor Knapp Flikar Disclosure Dialog Meny Tabell lager.ts (WP4)
             Popover Ark fokus.ts (WP5)
    begrepp/ register.ts lanka.ts Begrepp.tsx Prosa.tsx BegreppSida.tsx (WP5)
    nav/     route.ts useRoute.ts lager.ts Lank.tsx scroll.ts (WP6) figurlage.ts (WP10)
    rapport/ ramen: Ram Verktygsrad Positionsrad Innehall TidsupplosningVal Laddar
             ramData.ts ramDisposition.ts ramBrytpunkt.ts (WP6)
             sidorna: KapitelSida Sammanfattning (WP9) OmRapporten SaLaserDu
             Textsida.module.css (WP12b)
             kapitlets delar: Masthead DetViktigaste LagetIKorthet Avsnitt Indikator
             Nyckeltal IndikatorFordjupning Kommentar OmStatistiken (WP9)
             logik: rapportText.ts huvudpunkter.ts oversikt.ts fordjupning.ts
             publicering.ts hojder.ts (WP9) nedborrning.ts (WP10)
    start/   StartSida Kapitelrad Statusmatare startModell.ts useStartModell.ts (WP11)
    export/  pptx.ts graf.ts innehall.ts pptxTema.ts (WP12a)
    stores/  blocks.ts dirty.ts (redigeringsläget) position.ts (bara gamla appen)
    components/ utils/ types.ts taxonomy.ts data/load.ts index.css
    charts/{tidsserie,constants,types}.ts ........ gamla appen, raderas med den
  verktyg/
    webblasare.mjs ............................... Vite och headless Edge för verktygen (WP7)
    bank.mjs ..................................... baslinje, pixeldiff och kontaktark (WP0, WP7)
    a11y.mjs ..................................... axe mot stilguiden och alla adresser (WP7)
    stilguide.html stilguide.tsx stilguide-stil.ts levande stilguide (WP7)
    sektioner/*.stilguide.tsx .................... en sektion per paket (globbas)
    grafprov.html grafprov.tsx grafprov-data.ts .. provbänk för en figur (WP2)
    graftyper.mjs ................................ granskning av graftyperna (WP3)
    undernivaer.mjs .............................. granskning av nedborrningen (WP10)
    pptx-smoke.mjs ............................... röktest för PowerPoint-exporten (WP12a)
    skarmdump.mjs ................................ enstaka skärmdump via CDP
```

---

## 4. Typer

### 4.1 Datamodell (`data/modell.ts`)

```ts
export const HALLAND_ID = "0013";   // normalt fokus
export const RIKET_ID = "0000";

export type Status = "gron" | "gul" | "rod";
export type VyId = "dag" | "vecka" | "manad" | "kvartal" | "ar";
export type Niva =
  | "riket" | "region" | "forvaltning" | "sjukhus" | "verksamhet" | "avdelning" | "vardcentral"
  | "ambulansomrade" | "ambulansstation";   // tillägg i WP10

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

`Kalla`, `KallaRef`, `Fakta` och `Paverkansfaktor` är R:s typer, kopierade hit så att ny kod inte importerar från `types.ts`.

`normalisera(raw, vy)` läser kontrakt v1 (WP1 bantat; v2 väntar på WP8). Den härleder `enheter` ur `kontext_serier`, "0000" och `undernivaer`, `serier` ur samma fält, `format` ur `enhet` och `beskrivning` ("kr"), `riktning` ur `inverterad`/`utan_mal`, `jamforelse` ur `referens` och `huvudpunkter` med en regel i TS. Alla serier i en indikator ligger på samma periodrutnät med luckor som `null`. Regioner och riket har `parent_id: null`; underliggande enheter har sin överordnade enhet. För akutflödet lägger `data/exempelhierarki.ts` till en påhittad nivå: avdelningar under sjukhusen, och stationer under ambulansområdena Nord och Syd (som får nivån `ambulansomrade` i stället för `sjukhus`), med `n` och undertryckning under tio fall.

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
  plats?: number;                              // rangordning: radens plats (lika värden samma plats)
  platser?: (number | null)[];                 // linje med regioner: plats per punkt
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
  etiketter: { serieId: string; text: string }[];   // namn vid linjeslut (stilguiden 6.4); inga legender
  jamforbara?: { enhetId: string; namn: string; senaste: number | null }[];   // underlag för "+ Jämför med …"
  jamforNiva?: { id: Niva; etikett: string };  // de jämförbaras nivå: "+ Jämför med region", "… sjukhus" (WP3, WP10)
  serier: SpecSerie[];
  paneler?: { enhetId: string; titel: string; status?: Status }[];
  x: Axel; y: Axel;
  noter: Not[];
  kalla?: { namn: string; url?: string };
  sammanfattning: string;                      // aria-label, 100–200 tecken
  tabell: { caption: string; kolumner: string[]; rader: (string | number | null)[][]; fokusRad?: number };
  hojdklass: "standard" | "rangordning" | "kompakt" | "minidiagram";
  platsAv?: number[];                          // nämnaren i "plats r av n" per period
  period?: { iso: string; vy: VyId; text: string };   // rangordningens period, som i undertiteln (WP3)
  borrbar?: boolean;                           // enheterna ligger under fokus och kan bli fokus (WP10)
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
export function minidiagramSpec(kpi: KpiModell, kap: KapitelModell, ctx: SpecKontext): ChartSpec;
```

**Vad `kpiTillSpec` bestämmer**

| Datan har | Förvald visning | Övriga visningar | Roller |
|---|---|---|---|
| Jämförbara regioner | `tid`: linje ("Över tid") | `rang`: rangordning senaste period ("Rangordning") | fokus Halland, kontext övriga, referens riket, markerad = fästa; i rangordningen även `grans` för topp 3 (ej för neutrala) |
| Förväntat intervall (`yhat`) | `tid`: linje | – | fokus, forvantat (ett band, 80 %), punkter utanför markeras och etiketteras |
| Summamått och ≤ 24 perioder utan regioner | `tid`: stapel | – | fokus, referens föregående period |
| Underliggande enheter | `tid` heter då nivåfliken, t.ex. "Region Halland" | `enheter`: små multiplar ("Per sjukhus"); `enheterRang`: enheterna rangordnade ("Sjukhusen rangordnade") | panelens fokus = enheten; referens = överordnad nivå bara för andel och medel; `borrbar` när enheterna kan bli fokus |
| `dagar` | – | Dagfliken i figuren ("Per dag") | – |
| Översiktstabell | minidiagram (`minidiagramSpec`) | – | fokus |

Den bestämmer också titel och undertitel (stilguiden 6.2), vilka serier som etiketteras vid linjeslut, axlar (delad domän, noll för staplar), luckor som `null` per periodsteg, format, noter (seriebrott, luckor, undertryckt, index), källrad, sammanfattning, tabellrader, `jamforNiva` och rangordningens `period`. Den är en ren funktion utan DOM.

### 4.3 Renderare (`charts/register.ts`)

```ts
export interface Scen {
  bredd: number; hojd: number;
  plot: { x: number; y: number; b: number; h: number };
  xTicks: { v: number | string; x: number; text: string }[];
  yTicks: { v: number; y: number; text: string }[];
  lager: Lager[];             // ritordning: axel, zon, band, kontext, mal, referens, markerad, fokus, punkter
  etiketter: Etikett[];       // färdigplacerade efter kollisionslösning
  stopp: Stopp[];             // pekar- och tangentbordsmål per period och serie
  paneler?: ScenPanel[];      // små multiplar: panelerna i visningsordning (WP3)
}
export interface Renderare {
  typ: DiagramTyp;
  minstaBredd: number;
  hojd(bredd: number, spec: ChartSpec): number;
  layout(spec: ChartSpec, storlek: { bredd: number; hojd: number }, tema: Tema): Scen;   // ren funktion
  Rita: React.ComponentType<{ scen: Scen; spec: ChartSpec; aktiv: AktivPunkt | null; fasta: string[] }>;
  interaktion?: Interaktion;  // typens träffregel, tangentbord och tooltip (WP3); saknas = ingen interaktion
}
export const RENDERARE: Record<DiagramTyp, Renderare>;
```

`Diagram.tsx` mäter bredd (efter `document.fonts.ready`), anropar `layout`, renderar `Rita` och äger interaktionslagret: pekare, tangentbord, tooltip och fästa serier. Själva reglerna kommer från renderarens `interaktion` (`charts/karna/interaktion.ts`): tidsinteraktion för linje och stapel, radinteraktion för rangordning (i enheternas rangordning borrar klick och Enter ned när `spec.borrbar` och figuren har `onFokus`) och panelinteraktion för små multiplar (synkroniserad hjälplinje, Enter borrar ned). Minidiagrammet saknar interaktion och är en bild utan fokus. Hovring ritar bara överlägget; de statiska lagren är memoiserade på scenen. Tooltipen registrerar sig i lagerstapeln (4.6), så att Escape stänger den först. d3 används bara för skalor, `line`/`area` med `.defined()` och ticks.

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
  indikatornamn?: string;                              // kicker i förstoring och nedladdning
}
```

Plotytan klipper i sidled men ger svg:ns fokusring plats: ytan breddas med negativ marginal och lika mycket utfyllnad (fokusringens bredd och avstånd), så att diagrammets mätta bredd är oförändrad. `overflow-clip-margin` räcker inte, eftersom Chromium bara tillämpar den när båda axlarna klipps.

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
export interface BegreppPost extends Begrepp { granskad: boolean }
export const BEGREPP: BegreppPost[];          // innehall/begrepp.json, formkontrollerad
export function lankaBegrepp(text: string, reg: Begrepp[], redan: Set<string>):
  (string | { id: string; text: string })[];
```

Länkning: explicit `[[id|text]]` först, sedan längsta matchning först, ordgränser med `\p{L}`, skiftlägesokänslig, bara första förekomsten per omfång (`redan` delas inom en indikator eller en del av en textsida), aldrig i rubriker, knappar eller tabeller. `Prosa` delar text i stycken och länkar; `Begrepp` är toggletipen (popover från 640 px, annars ark).

### 4.6 Adresser, lager och läsposition (`nav/*`)

| Adress | Visar |
|---|---|
| `#/` | Startsidan |
| `#/sammanfattning?vy=ar` | Sammanfattningen |
| `#/kapitel/{id}?vy=manad&i={blockId}` | Kapitel, rullat till block |
| `…&v={visning}&e={enhetId}` | Figurens visning och fokusenhet i blocket `i` |
| `…&red=1` | Redigeringsläge |
| `#/begrepp` · `#/begrepp/{id}` | Begreppslistan |
| `#/las` | Så läser du rapporten |
| `#/om` | Om rapporten |
| `#rapport-{x}` (gammalt) | Skrivs om till motsvarande `#/kapitel/…?i=x` |

`parse`/`format` är rena och testade; okända adresser blir startsidan och ogiltiga parametrar faller bort. Kapitel- och vybyten använder `pushState`; läspositionen `i` uppdateras med fördröjd `replaceState`. Efter laddning och `document.fonts.ready` rullas sidan till `[data-block="{i}"]`.

| Del | Hur |
|---|---|
| Vy saknas | `parse` ger `STANDARDVY` (årsvyn) när adressen saknar vy, och `harVy(hash)` säger om den hade en. Routern för vidare det som `RouteTillstand.utanVy`. Saknade adressen vy öppnar appen kapitlet enligt `KAPITELVY` (månadsvyn om kapitlet finns där, annars en vy som har det) med `vyForKapitel` och skriver om adressen med `replaceState`. Startsidans kapitelrader länkar till samma vy och räknar sina statussiffror där. |
| Gamla ankare | Löses synkront bland laddade kapitel, annars genom att kapitlen laddas (årsvyn först). Kapitlet öppnas sedan enligt `KAPITELVY`. |
| Figurens läge | Indikatorn skriver `v` och `e` med `replaceState` när läsaren byter flik eller nivå, och läser dem när kapitlet öppnas och vid bakåt och framåt. Registret `nav/figurlage.ts` håller varje blocks läge, så att läspositionen, länkar till indikatorn och "Kopiera länk till här" tar med det. |
| Lagerstapel | `nav/lager.ts` är rapportens enda stapel (popover, ark, dialog, meny, innehållsförteckningens ark, tooltip). Den har den enda Escape-lyssnaren: `keydown` på `window` i fångstfasen. Escape stänger bara det översta lagret och navigerar aldrig. `arOverst(stang)` gör att klick utanför bara stänger det översta. Kroken `useLager` i `ui/lager.ts` registrerar exakt den funktion den får, så den ska vara stabil. |
| Landmärken | Ramen (`rapport/Ram.tsx`) ger varje sida verktygsrad (`header`), innehållsförteckning och `main`. Startsidan har ingen verktygsrad och ritar själv `header` (brandlisten), `main` och `footer` (sidfoten). |

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
| `npm run build` | produktionsbygge (bitarna i avsnitt 2) |
| `npm run test:pptx` | röktest för PowerPoint-exporten: ett deck per kapitel och vy, hela rapporten och en bild per graftyp, uppackade och kontrollerade |
| `npm run bank -- --baslinje` | tar baslinjebilder (sparas i `verktyg/bank/baslinje/`, gitignorerad) |
| `npm run bank` | tar nya bilder, pixeldiff mot baslinjen, skriver `verktyg/bank/rapport.html` (kontaktark) |
| `npm run a11y` | axe-core mot stilguiden och rapportens alla adresser (startsidan, sammanfattningen per vy, varje kapitel per vy, begrepp, `#/las`, `#/om`), 1440 och 390 px; avslutskod 1 vid serious eller critical |
| `node verktyg/graftyper.mjs` | graftyperna i stilguiden med riktiga mus-, tangent- och pekskärmshändelser |
| `node verktyg/undernivaer.mjs` | nedborrningen i akutflödet: mus, tangentbord, adressens `v` och `e`, Kopiera länk |

**Bänkens grupper:** `ny` (nya rapporten utan parametrar: startsidan, kapitel 2 Tillgänglighet och väntetider, akutflödet utan vy, sammanfattningen, `#/las` och `#/om`), `gammal` (gamla vyn på `/?gammal`; den saknar adresser, så bänken klickar sig fram med `button.start-area`), `grafprov` (`verktyg/grafprov.html`) och `stilguide` (en bild per sektion och galleriexempel). Selektorer i nya vyer använder `data-*`-attribut eftersom CSS Modules hashar klassnamnen.

**Processer:** verktygen startar egen Vite och egen headless Edge (`webblasare.mjs`, profilmapp i temp) och avslutar bara det de startat. Portar via `BANK_PORT` (Vite) och `CDP_PORT` (Edge), så att flera agenter kan köra samtidigt. `BANK_URL` pekar mot en server som redan kör, till exempel `vite preview` av ett bygge (bygg då med `BASE_PATH=/`, eftersom preview serverar från roten).

---

## 8. Arbetspaket

> **Prioritering 2026-10-05:** all data är än så länge exempeldata. Fokus ligger på det läsaren ser: grafer, rapportsidan, startsidan och begreppen. **WP8 är parkerat** tills riktig data kopplas in. **WP1 är bantat**: bara typerna, `normalisera` för dagens JSON (v1) och `kpiTillSpec`; inget v2-schema, ingen ajv. **WP10** byggs med en påhittad hierarki i appen, inte via R.

| Paket | Status |
|---|---|
| WP0 Grund | sammanslaget |
| WP1 Datamodell och spec (bantat) | sammanslaget |
| WP2 Diagramkärna och linje | sammanslaget |
| WP3 Fler graftyper | sammanslaget |
| WP4 Figur och UI-delar | sammanslaget |
| WP5 Begrepp | sammanslaget |
| WP6 Navigering och ram | sammanslaget |
| WP7 Levande stilguide och bänk | sammanslaget |
| WP8 R-kontrakt v2 | **parkerat** |
| WP9 Rapportsidan | sammanslaget |
| WP10 Undernivåer | sammanslaget |
| WP11 Startsida | sammanslaget |
| WP12a PowerPoint | sammanslaget |
| WP12b Bytet och städningen | levererat, väntar på granskning |
| WP12c Radering | efter användarens granskning av nya appen |

Varje paket: mål, levererar, godkänt när.

### WP0 Grund
- **Mål:** verktyg, tokens och struktur utan synlig ändring av gamla vyn.
- **Levererade:** devberoenden (vitest, ajv, pixelmatch, pngjs, axe-core, @fontsource-paket); Tailwind bort med preflight ersatt i `styles/reset.css`; `design/tema.ts` med alla värden ur stilguiden; `tema-css.ts` + vite-plugin `virtual:tema.css`; `design/format.ts`; `kontrast.test.ts`; ESLint-regel mot hex-literaler utanför `design/` (varning, frysta filer undantagna); `styles/*`; självhostade typsnitt; `?ny`-flaggan (ersatt av `?gammal` i WP12b); stubbar för alla nya filer; `bank.mjs` med baslinje och diff.
- **Godkänt när (G0):** `npm run check` och `build` gröna; banken visar 0 avvikande pixlar för gamla vyn; `test:pptx` gick.

### WP1 Datamodell och spec (bantat)
- **Mål:** rena typer och funktioner från JSON till `ChartSpec`.
- **Levererade:** `data/*` enligt 4.1 med `normalisera` för v1; `charts/spec.ts`, `kpiTillSpec.ts`, `text.ts`, `underlag.ts`; fixturer (utdrag ur verklig data och påhittad hierarki).
- **Godkänt när (G1):** vitest för `normalisera` över alla datafiler; snapshots av `kpiTillSpec`; inga em dash i genererade titlar; undertitlar ≤ 2 meningar; varje serieroll har färg, bredd och streckning i `tema.ts`.

### WP2 Diagramkärna och linje
- **Mål:** gemensamma delar och linjediagrammet enligt stilguiden 6.3–6.5 och 6.8.
- **Levererade:** `charts/karna/*`, `typer/linje.tsx`, `Diagram.tsx`, `register.ts`, omskriven `grafprov`, stilguidesektion.
- **Godkänt när (G2):** layout- och träfftester (lyft inom 8 px, släpp efter 14 px, byte vid 4 px närmare); hovring ritar bara överlägget; tangentbord, pekare och pekskärm; tooltip med `aria-live`.

### WP3 Fler graftyper
- **Mål:** rangordning, stapel, små multiplar och minidiagram enligt stilguiden 6.6.
- **Levererade:** typerna med `Renderare.interaktion`, `Scen.paneler`, `jamforNiva` och `period` i specen, `graftyper.mjs`.
- **Godkänt när:** rangordningens ordning = `rank`; lika värden samma plats; staplar från noll; delad skala i små multiplar; hovring, tangentbord och pekskärm i varje typ; allt fungerar från 320 px.

### WP4 Figur och UI-delar
- **Mål:** en figurram överallt (stilguiden 6.1, 6.8) och grundkomponenter (5.1–5.5, 5.9).
- **Levererade:** `figur/*`, `ui/{StatusMarkor,Knapp,Flikar,Disclosure,Dialog,Meny,Tabell,lager}`. Menyn fick ikonläge och kryssval i WP12b.
- **Godkänt när:** tabellvyn är en riktig `<table>` med `<caption>`; CSV öppnas rätt i svensk Excel; SVG och PNG med titel, undertitel och källa; förstoringen är en dialog med fokusfälla; axe utan allvarliga fel.

### WP5 Begrepp
- **Mål:** begreppsregister och toggletips enligt stilguiden 5.7.
- **Levererade:** `innehall/begrepp.json` (26 begrepp, `"granskad": false` tills sakkunnig granskat), `begrepp/*`, `ui/{Popover,Ark}`, `BegreppSida` för `#/begrepp`.
- **Godkänt när:** tester för länkning; alla `kort` ≤ 25 ord; popover och ark med mus, tangentbord och pekskärm; Escape stänger bara popovern.

### WP6 Navigering och ram
- **Mål:** adresser och rapportens ram enligt stilguiden 4.5 och avsnitt 4.6.
- **Levererade:** `nav/*`, `NyApp` i `App.tsx`, `rapport/{Ram,Verktygsrad,Positionsrad,Innehall,TidsupplosningVal,ramData,ramDisposition}`.
- **Godkänt när:** route-tester; uppdatera, bakåt, framåt och djuplänk; gamla ankare skrivs om; Escape-stapeln; verktygsraden ryms i 360 px; innehållsförteckning som spalt från 1200 px och ark under.

### WP7 Levande stilguide och bänk
- **Mål:** `verktyg/stilguide.html` som visar allt i stilguiden ur koden.
- **Levererade:** sektioner för färger, typografi, avstånd och komponenter (globbar `sektioner/*.stilguide.tsx`), galleriet, kontaktark och diffrapport i `bank.mjs`, `a11y.mjs`, `webblasare.mjs`.
- **Godkänt när:** inga listor hårdkodade (allt ur `tema.ts`); galleriet går att hovra; axe ren; diffrapporten fungerar.

### WP8 R-kontrakt v2 (parkerat)
- **Mål:** dubbelskrivning av v1 och v2 enligt avsnitt 5.
- **Levererar när det tas upp:** fälten i avsnitt 5; `huvudpunkter` och dekar enligt stilguiden 3.4; seriebrottsnoter; kronor och per invånare rätt; undertryckning i demodata med `n`; rättning av de tre kända bristerna i `kolada/bearbeta.R` (plats av antal med värde, jämförelseår över tomma år och källbyte, 3 %-klippan) med samtidig uppdatering av exemplet i `docs/tillganglighet-intern-kort.html`; `R/gemensam/begrepp.R`; em dash-kontroll; död R-kod bort.
- **Godkänt när (G3):** R-körningen ger "kontrakt OK"; vitest passerar mot nya JSON; banken för gamla vyn oförändrad.

### WP9 Rapportsidan
- **Mål:** kapitel, indikator och sammanfattning enligt stilguiden 4.2–4.4 och 5.6–5.8.
- **Levererade:** filerna i `rapport/` för sidorna och kapitlets delar; `content-visibility: auto` och lat montering av figurer utanför skärmen.
- **Godkänt när (G4):** indikator ≤ 1,3 skärmhöjder i 1440 × 900 med stängd fördjupning; status en gång per indikator; sammanfattningen ≤ 3 skärmhöjder; djuplänk till varje indikator; bänk och axe för alla adresser.

### WP10 Undernivåer
- **Mål:** nedborrning hela vägen enligt stilguiden 6.7.
- **Levererade:** `data/exempelhierarki.ts` (påhittade avdelningar och ambulansstationer, `n` och undertryckning), nivåerna `ambulansomrade` och `ambulansstation`, `ChartSpec.borrbar`, nivåfliken, brödsmulan, `rapport/nedborrning.ts`, `nav/figurlage.ts`, `v` och `e` i adressen, `undernivaer.mjs`.
- **Godkänt när:** Region Halland / Per sjukhus / Per avdelning fungerar för alla akutflödesindikatorer; undertryckta värden som `..` med not; djuplänk med `e=` fungerar.

### WP11 Startsida
- **Mål:** startsidan enligt stilguiden 4.1.
- **Levererade:** `start/*`. Kapitelraderna leder sedan WP12b till vyn en adress utan vy öppnar (`KAPITELVY`) och Läget just nu är summan av raderna.
- **Godkänt när:** inga ramar, linjer, taggar eller versala etiketter utom kickern; en metarad och en statusmätare per kapitel; länkar till sammanfattning, begrepp, läsanvisning och Om rapporten; fungerar i 360 px; axe ren.

### WP12a PowerPoint
- **Mål:** exporten byggd på `ChartSpec` och `tema.ts` enligt stilguiden 6.9.
- **Levererade:** `export/*`, laddas vid klick i Exportera-menyn; `pptx-smoke.mjs`.
- **Godkänt när:** `test:pptx` grönt; riket har samma färg som på webben; varje graftyp har en definierad återgivning.

### WP12b Bytet och städningen
- **Mål:** nya appen som standard och en kodbas för det nya, med gamla appen kvar för granskning.
- **Levererade:** nya appen utan parametrar och gamla bakom `?gammal` (lat laddad med sina stilar); bänken med grupperna `ny` och `gammal`; sidorna `#/las` och `#/om` med adress och test; en lagerstapel (`nav/lager.ts`, `ui/lagerLokal.ts` bort, `useLager` lindar inte stängfunktionen); `ui/Meny` med ikonläge, kryssval och högerjustering i verktygsraden; `.visuellt-dold` i `styles/bas.css`; `komponent.statusmatare` i `tema.ts`; figurens fokusring utanför svg:n; startsidans kapitelrader enligt `KAPITELVY` och landmärken; React i egen byggbit; denna arkitekturbeskrivning och `PROJEKT-METODIK.md`.
- **Godkänt när:** `check`, `build` utan chunkvarning, `test:pptx` och `a11y` (0 serious eller critical) gröna; `/` visar nya startsidan och `/?gammal` gamla appen oförändrad (bänken mot baslinjen).

### WP12c Radering (efter granskningen)
- **Mål:** en kodbas.
- **Levererar:** radering av `GammalApp.tsx`, `?gammal`, gamla `index.css` och lagret `legacy`, frysta filer (`components/*`, `utils/*`, `charts/{tidsserie,constants,types}.ts`, `types.ts`, `taxonomy.ts`, `data/load.ts`, `stores/position.ts`), Plex Mono och Lexend Deca, gruppen `gammal` i bänken; hex-regeln på felnivå; v1-fälten i R, v1-grenen i `normalisera` och schemat när WP8 är gjort.
- **Godkänt när (G5):** inga importer av raderade moduler; alla grindar ovan gröna.

---

## 9. Ordning

```
Steg 0  stilguide.md + arkitektur.md (orkestreraren) ── du granskar
Steg 1  WP0 ── G0
Steg 2  WP1 (bantat) │ WP2 │ WP4 │ WP5 │ WP6 │ WP7
Steg 3  WP3 │ WP11 ── du granskar graferna i levande stilguiden
Steg 4  WP9 │ WP12a ── du granskar rapportsidan och startsidan
Steg 5  WP10 → WP12b ── du granskar nya appen (gamla finns bakom ?gammal)
Steg 6  WP12c (radering)
```

Sammanslaget i ordningen WP0, WP1, WP5, WP7, WP4, WP2, WP6, WP11, WP9, WP3, WP12a, WP10. WP12b väntar på granskning; WP8 är parkerat. Orkestreraren granskar varje paket (tester, skärmdumpar, kod) före sammanslagning.
