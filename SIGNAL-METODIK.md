# Signalsystem — Metodik och specifikation

> Denna fil definierar hur signalsystemet i HoS-rapporten fungerar.
> All kod i `R/gemensam/signal-modell.R`, `R/kap01-hamta.R` och `R/kap02-bearbeta.R`
> följer denna specifikation. Ändringar i metodik görs här först, sedan i koden.

---

## 1. Indikatorer

### 1.1 Definitioner

| ID | Namn | Enhet | Datatyp | Aggregering | Inverterad | Sektion |
|----|------|-------|---------|-------------|------------|---------|
| `belaggning` | Beläggningsgrad | procent | Kontinuerlig (60–105) | Medel | Ja | Akutflöde |
| `akutbesok` | Besök akutmottagning | antal | Räknedata (500–1 200) | Summa | Nej | Akutflöde |
| `vantetid` | Medianväntetid akut | minuter | Positiv kontinuerlig (60–200) | Medel | Ja | Akutflöde |
| `ambulans` | Ambulansuppdrag | antal | Räknedata (15–80) | Summa | Nej | Akutflöde |
| `inlaggningar` | Inläggningar | antal | Räknedata (5–40) | Summa | Nej | Slutenvård |
| `utskrivningsklara` | Utskrivningsklara patienter | antal | Småtal (2–30) | Medel | Ja | Slutenvård |

**Inverterad** innebär att ett *högre* värde är *sämre* (pilriktning i UI).

**Aggregering** styr hur dagliga värden sammanslås till vecka/månad/kvartal/år:
- **Summa**: Dagsvärden summeras (t.ex. 7 dagars akutbesök = veckans total)
- **Medel**: Dagsvärden medelvärdesbildas (t.ex. veckans medelbeläggning)

### 1.2 Underavdelningar

Varje indikator har 2–3 underavdelningar som aggregeras till totalen:

| Indikator | Underavdelningar | Relation till total |
|-----------|-----------------|---------------------|
| belaggning | Halmstad, Varberg, Kungsbacka | Medel — varje sjukhus har egen nivå |
| akutbesok | Halmstad, Varberg, Kungsbacka | Summa — 47/30/23 % av totalen |
| vantetid | Halmstad, Varberg, Kungsbacka | Medel — varje sjukhus har egen nivå |
| ambulans | Nord, Syd | Summa — 55/45 % av totalen |
| inlaggningar | Kirurgi, Medicin, Ortopedi | Summa — 40/38/22 % av totalen |
| utskrivningsklara | Halmstad, Varberg, Kungsbacka | Medel — varje sjukhus har egen nivå |

**Aggregeringsregel**: Signalmodellen körs separat på varje underavdelning
med samma modelltyp som totalen. Underavdelningarnas signaler är oberoende
av totalens signal — en avdelning kan vara röd medan totalen är grön.

---

## 2. Modellval per indikator

### 2.1 GLM-familj och motivering

Varje indikator modelleras med en GLM (Generaliserad Linjär Modell) vars
familj väljs utifrån datatypens statistiska egenskaper:

| Indikator | GLM-familj | Länkfunktion | Motivering |
|-----------|-----------|--------------|------------|
| belaggning | `gaussian` | identity | Procent/andel, approximativt normalfördelad, kan ta värden runt 60–105 |
| akutbesok | `negative.binomial` | log | Räknedata med överdispersion (varians > medel). Poisson räcker inte — NB fångar den extra variabiliteten |
| vantetid | `Gamma` | log | Strikt positiv, höger-skev fördelning. Gamma hanterar detta naturligt via log-länk |
| ambulans | `negative.binomial` | log | Räknedata med måttlig överdispersion. NB ger flexibel varians-funktion |
| inlaggningar | `negative.binomial` | log | Räknedata, typiskt 15–40/dag. NB hanterar dag-till-dag-variation bättre än Poisson |
| utskrivningsklara | `negative.binomial` | log | Småtal (2–30) med stor relativ variation. NB tolererar nollnära värden bättre än Gamma |

### 2.2 Modellspecifikation

Samtliga indikatorer delar samma formel med kalendermedvetna prediktorer:

```
y ~ t + sin_ar + cos_ar + sin_ar2 + cos_ar2 +
    veckodag_f + helgdag_flag + halvdag_flag + klamdag_flag + skollov_flag
```

| Prediktor | Typ | Beskrivning |
|-----------|-----|-------------|
| `t` | Numerisk | Dagar sedan seriens start. Fångar linjär trend |
| `sin_ar`, `cos_ar` | Numerisk | Fourier-termer, period 365,25 dagar. Årssäsonglighet |
| `sin_ar2`, `cos_ar2` | Numerisk | Fourier-termer, period 182,6 dagar. Halvårsharmonik (fångar asymmetrisk säsong) |
| `veckodag_f` | Faktor (7 nivåer) | Mån=1 till sön=7. Fångar veckodagsmönstret |
| `helgdag_flag` | Boolesk | Röd dag eller helgdagsafton. Kraftig effekt på alla indikatorer |
| `halvdag_flag` | Boolesk | Skärtorsdag, valborgsmässoafton m.fl. Partiell effekt |
| `klamdag_flag` | Boolesk | Vardagar inklämda mellan helgdag och helg. Lägre aktivitet |
| `skollov_flag` | Boolesk | Sportlov, påsklov, sommarlov, höstlov, jullov (Halland) |

### 2.3 Varför inte Prophet eller ARIMA?

- **Prophet**: Kräver extra beroende, svårare att kontrollera exakt vilka features
  som används. GLM + conformal ger samma flexibilitet med full transparens.
- **ARIMA/SARIMA**: Kräver stationäritet, hanterar kalendereffekter sämre,
  prediktionsintervall bygger på normalantagande.
- **GLM + Conformal**: Fördelningsfritt, garanterad täckning, transparent
  feature-ingenjörskonst, enkel att inspektera och förklara.

---

## 3. Signalsystem — tre nivåer

### 3.1 Nivådefinitioner

Signalsystemet använder tre nivåer baserade på conformal prediction:

| Signal | Namn | Betydelse | Intervall |
|--------|------|-----------|-----------|
| **grön** | I fas | Värdet ligger inom det förväntade bandet | Inom 80 %-intervallet |
| **gul** | Bevaka | Värdet ligger i ytterzonen men inte extremt | Mellan 80 %- och 95 %-intervallet |
| **röd** | Avvikelse | Värdet avviker signifikant från förväntat | Utanför 95 %-intervallet |

### 3.2 Förväntad fördelning av signaler

Under normala förhållanden (ingen verklig avvikelse) förväntas:
- **Grön**: ~80 % av dagarna (≈ 5,6 av 7 dagar per vecka)
- **Gul**: ~15 % av dagarna (≈ 1 dag per vecka)
- **Röd**: ~5 % av dagarna (≈ 1 dag varannan vecka)

Om andelen röda signaler överstiger 10 % under en längre period tyder det
på ett systematiskt skifte snarare än slumpmässig variation.

### 3.3 Conformal prediction — metod

**Steg 1 — Datasplit (temporal):**
```
Träningsdata (alla dagar före split_datum)
  ├── Proper training (80 %) — GLM tränas här
  └── Kalibrering (20 %, minst 60 dagar) — conformal scores beräknas här
```

**Steg 2 — Nonconformity scores:**

För varje kalibreringsdag beräknas ett normaliserat avstånd:

```
score_i = |y_i - ŷ_i| / σ̂_i
```

där `σ̂_i` är modellens predikterade standardavvikelse:
- NB: `σ̂ = √(μ + μ²/θ)`
- Gamma: `σ̂ = μ · √φ`
- Gaussian: `σ̂ = √(residual variance)`

Normaliseringen gör att intervallen **anpassar sig automatiskt**: bredare vid
hög osäkerhet (helger, högsäsong), smalare vid stabila mönster.

**Steg 3 — Kvantilberäkning (finit-sample-korrigerad):**

```
q_80 = ceiling((1 - 0.20) · (n + 1)) / n :e kvantilen av scores
q_95 = ceiling((1 - 0.05) · (n + 1)) / n :e kvantilen av scores
```

**Steg 4 — Prediktionsintervall:**

```
80 %-band: [ŷ - q_80 · σ̂,  ŷ + q_80 · σ̂]
95 %-band: [ŷ - q_95 · σ̂,  ŷ + q_95 · σ̂]
```

**Steg 5 — Signal:**
```
Om y ∈ [ŷ ± q_80 · σ̂]         → grön
Om y ∈ [ŷ ± q_95 · σ̂] \ 80 %  → gul
Om y ∉ [ŷ ± q_95 · σ̂]         → röd
```

### 3.4 Villkorlig kalibrering

Nonconformity scores beräknas **separat** för två dagskategorier:

1. **Vardagar** (mån–fre, ej helgdag/klämdag): Typiskt lägre varians → smalare band
2. **Specialdagar** (lör, sön, röda dagar, helgdagsaftnar, klämdagar): Högre varians → bredare band

Detta ger tätare, mer diskriminerande band på vanliga vardagar utan att
generera falska signaler på helger där variationen naturligt är större.

```
Prediktion på en tisdag i mars:
  → Använd q_80_vardag och q_95_vardag

Prediktion på julafton:
  → Använd q_80_special och q_95_special
```

Om en kategori har färre än 30 kalibreringsdagar faller systemet tillbaka
på den gemensamma (icke-villkorliga) kvantilen.

---

## 4. Aggregering

### 4.1 Fem tidsvyer

| Vy | Period | Aggregering | Komplettregel |
|----|--------|-------------|---------------|
| Dag | Enskild dag | — | Alltid komplett |
| Vecka | Mån–sön | Sum/medel av 7 dagar | Visas först efter söndag |
| Månad | Kalendermånad | Sum/medel av ~30 dagar | Visas först efter månadens sista dag |
| Kvartal | Q1–Q4 | Sum/medel av ~90 dagar | Visas först efter kvartalets sista dag |
| År | Kalenderår | Sum/medel av 365 dagar | Visas först efter 31 december |

Ofullständiga perioder exkluderas. Om rapportdatumet är en onsdag visas
inte innevarande vecka — bara föregående söndags vecka.

### 4.2 Aggregerade signaler

Signaler på aggregerad nivå beräknas via **egen conformal kalibrering**, inte
genom att räkna dagssignaler.

**Process:**
1. Aggregera dagliga prediktioner till periodens nivå (summa eller medel)
2. Aggregera dagliga faktiska värden på samma sätt
3. Beräkna aggregerade conformal scores från kalibreringsdata
4. Tillämpa q_80 och q_95 på aggregerad nivå

```
Vecka: agg_pred = sum(daily_pred) eller mean(daily_pred)
       agg_actual = sum(daily_actual) eller mean(daily_actual)
       residual = agg_actual - agg_pred
       signal baseras på conformal band för aggregerade residualer
```

**Viktigt**: Aggregering minskar brus (central limit theorem-effekt), så
aggregerade band är **proportionellt smalare** än dagliga. En vecka med
7 oberoende dagar har √7 ≈ 2,6 gånger lägre relativ standardavvikelse.
Detta gör att signaler på vecko- och månadsnivå är mer tillförlitliga
indikatorer på faktiska skiften.

### 4.3 Aggregerbarhet — underavdelningar

**Summa-indikatorer** (akutbesök, ambulans, inläggningar):
- Total = Σ underavdelningar. Dagsvärden summeras exakt.
- Aggregering till vecka/månad: sum(dag) per avdelning, sedan sum(avdelningar) = total.

**Medel-indikatorer** (beläggning, väntetid, utskrivningsklara):
- Totalen är INTE nödvändigtvis medelvärdet av underavdelningarnas medelvärden
  (kräver viktning). Totalen beräknas direkt från den totala tidsserien.
- Underavdelningarnas signaler är oberoende av totalen.

### 4.4 Dag-toggle

I veckovy och uppåt kan användaren växla mellan "Aggregerat" och "Dag":
- **Aggregerat**: Visar tidsserie av aggregerade perioder med aggregerade band
- **Dag**: Visar de enskilda dagarna inom senaste kompletta period med dagliga band

Dagvyn inom en vecka visar alltså 7 punkter med dagliga conformal-band.
Användaren kan se *vilka dagar* som drev en aggregerad signal.

---

## 5. Kalender

### 5.1 Svenska helgdagar

**Fasta röda dagar:**
Nyårsdagen (1/1), Trettondedag jul (6/1), Första maj (1/5),
Nationaldagen (6/6), Julafton* (24/12), Juldagen (25/12),
Annandag jul (26/12), Nyårsafton* (31/12).

*Julafton, midsommarafton och nyårsafton klassas som `afton` (de facto röda dagar men formellt inte).

**Rörliga röda dagar** (beräknas från påskdagen):
Långfredagen (påsk−2), Påskdagen, Annandag påsk (påsk+1),
Kristi himmelsfärdsdag (påsk+39), Pingstdagen (påsk+49),
Midsommarafton/dag (första lör ≥ 20 juni), Alla helgons dag (första lör ≥ 31 okt).

### 5.2 Halvdagar

Trettondagsafton, Skärtorsdag, Valborgsmässoafton, Dagen före Kristi himmelsfärd,
Alla helgons afton. Reducerad verksamhet eftermiddagen.

### 5.3 Klämdagar

Vardag inklämda mellan helgdag och helg:
- Helgdag på tisdag → måndagen klämdag
- Helgdag på torsdag → fredagen klämdag

### 5.4 Skollov (Region Halland)

| Lov | Period |
|-----|--------|
| Sportlov | Vecka 8 |
| Påsklov | Veckan efter påsk (tis–fre) |
| Sommarlov | 10 juni – 15 augusti (vardagar) |
| Höstlov | Vecka 44 |
| Jullov | 18 december – 6 januari (vardagar) |

### 5.5 Effekt på signalmodellen

Alla kalenderkomponenter ingår som binära features i GLM:en.
Modellen lär sig att t.ex. julafton har 40 % färre akutbesök än en normal
tisdag i december. Conformal prediction skapar bredare band runt dessa
dagar via den villkorliga kalibreringen.

---

## 6. Syntetisk data

### 6.1 Genereringsmodell

Varje indikator genereras som:

```
y(t) = baslinjenivå
     + trend · år_sedan_start
     + säsong · cos(2π · dag/365.25)
     + veckodagseffekt(dag)
     + helgdagseffekt(dag)
     + autokorrelation · residual(t−1)
     + brus
```

**Komponenter:**

| Parameter | Beskrivning |
|-----------|-------------|
| `bas` | Grundnivå (medelvärde) |
| `trend_ar` | Linjär förändring per år (kan vara positiv eller negativ) |
| `sasong_amp` | Amplitud för årssäsonglighet (vintertopp) |
| `vd_amp` | Veckodagseffekt: lägre på lör/sön |
| `helg_amp` | Helgdagseffekt: ytterligare sänkning på röda dagar |
| `ar1` | Autokorrelationskoefficient (0–0,4). Gårdagens residual påverkar idag |
| `brus_sd` | Standardavvikelse för slumpmässigt brus |
| `min_val`, `max_val` | Hårda gränser (t.ex. beläggning ≤ 105 %) |

### 6.2 Parametrar per indikator

| Indikator | bas | trend | säsong | vd_amp | helg_amp | ar1 | brus_sd | min | max |
|-----------|-----|-------|--------|--------|----------|-----|---------|-----|-----|
| belaggning | 86 | +1,8/år | 4,5 | 2,5 | 5,0 | 0,35 | 1,8 | 60 | 105 |
| akutbesok | 840 | +12/år | 45 | 70 | 120 | 0,30 | 28 | 500 | — |
| vantetid | 140 | +5/år | 14 | 10 | 15 | 0,25 | 10 | 60 | — |
| ambulans | 50 | +1,2/år | 6 | 4 | 8 | 0,20 | 4 | 15 | — |
| inlaggningar | 24 | +0,5/år | 3,5 | 5 | 8 | 0,25 | 2,5 | 5 | — |
| utskrivningsklara | 16 | +1,2/år | 3,5 | 1,5 | 3,0 | 0,30 | 2,0 | 2 | — |

### 6.3 Inbyggda anomalier

För att validera signalsystemet injiceras kända anomalier i den syntetiska datan:

| Period | Typ | Indikator | Storlek | Syfte |
|--------|-----|-----------|---------|-------|
| 2025-W50 till W52 | Vintervåg | akutbesök, beläggning | +15–20 % | Testa säsongsöverlappning |
| 2026-02-16 till 02-20 | Punkthändelse | ambulans | +40 % | Testa daglig signaldetektion |
| 2026-03-01 till 03-14 | Gradvis ökning | väntetid | +3 min/dag | Testa trendendektion |

Anomalierna dokumenteras i `kap01-hamta.R` och förväntas flaggas av signalsystemet.

### 6.4 Underavdelningar

**Summa-indikatorer**: Underavdelningar genereras som proportionella delar
av totalen med eget brus: `dept_i = total · prop_i · (1 + N(0, 0.03))`.

**Medel-indikatorer**: Underavdelningar genereras som offset från totalen
med eget brus: `dept_i = total + offset_i + N(0, σ_dept)`.

---

## 7. Granskningsrapport

### 7.1 Syfte

`rapport/signal-granskning.html` är en pedagogisk rapport som dokumenterar:

1. **Modellval**: Varför vald GLM-familj är korrekt för varje indikator
2. **Kalibrering**: Conformal prediction-resultat med täckningsgrad
3. **Bandbreddsanalys**: Medianbredd och variation i prediktionsband
4. **Helgeffekter**: Hur kalenderfeatures påverkar prediktioner
5. **Aggregeringstester**: Täckning på vecko-/månads-/kvartalsnivå
6. **Anomalitester**: Detekteras injicerade anomalier korrekt?
7. **Signalfördelning**: Andel grön/gul/röd per indikator och vy

### 7.2 Kvalitetskrav

| Mått | Mål | Tolerans |
|------|-----|----------|
| Täckning 95 % (dagsnivå) | 95 % | 93–97 % |
| Täckning 80 % (dagsnivå) | 80 % | 77–83 % |
| MAE (dagsnivå) | < 5 % | — |
| Bias | ≈ 0 % | ±1 % |
| Medianbredd 80 % (relativ) | < 15 % | — |
| Medianbredd 95 % (relativ) | < 25 % | — |
| Anomali-detektionsrate | > 80 % | — |

### 7.3 Generering

```r
source("R/granskningsrapport.R")
# → rapport/signal-granskning.html
```

---

## 8. Ändringslogg

| Datum | Ändring |
|-------|---------|
| 2026-04-01 | Tre-nivå-signalsystem (grön/gul/röd) ersätter binärt (grön/röd) |
| 2026-04-01 | Villkorlig conformal kalibrering (vardag/specialdag) |
| 2026-04-01 | Autokorrelation i syntetisk data |
| 2026-04-01 | Helgdagseffekter i syntetisk data |
| 2026-04-01 | Injicerade anomalier för validering |
| 2026-04-01 | Granskningsrapport utökad med bandbreddsanalys och anomalitester |
