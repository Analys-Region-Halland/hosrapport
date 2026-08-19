# Arkiv — vilande teman och hämtskript

Här ligger kod som är **temporärt urkopplad**, inte borttagen. Inget i den
här mappen sourcas av `R/teman/register.R` eller `R/bearbeta.R`, och inget av
den syns på startsidan.

## Varför

Rapporten gjordes 2026-08-19 om från "ett område per sakområde" till
**"ett kapitel i SKR:s Hälso- och sjukvårdsrapport = en egen rapport"**.
De sex kapitlen ersatte de tidigare områdena. Akutflödet är kvar i
`R/teman/akutflode/` som enda exempel på ett internt område med dygnsdata.

## Vad som ligger här

| Mapp | Innehåll | Läge när det arkiverades |
| --- | --- | --- |
| `teman/befolkning/` | Befolkning & vårdbehov (SCB, Försäkringskassan, Kolada) | Levande, visades i årsvyn |
| `teman/folkhalsa/` | Folkhälsa & prevention (Folkhälsomyndigheten) | Levande, visades i årsvyn |
| `teman/ekonomi/` | Ekonomi (Kolada, räkenskapssammandrag, KPP/DRG) | Levande, visades i årsvyn |
| `teman/patientenkat/` | Nationell patientenkät | Vilande sedan tidigare |
| `teman/personal/` | Personal (demodata) | Vilande sedan tidigare |
| `teman/primarvard/` | Primärvård (demodata) | Vilande sedan tidigare |
| `teman/slutenvard/` | Slutenvård (demodata) | Vilande sedan tidigare |
| `hamta/befolkning-vardbehov.R` | Hämtskript till `data/befolkning-vardbehov.rds` | |
| `hamta/fohm-folkhalsa.R` | Hämtskript till `data/fohm-folkhalsa.rds` | |
| `hamta/kolada-ekonomi.R` | Hämtskript till `data/kolada-ekonomi.rds` | |

Datafilerna under `data/` är **orörda**. Ett arkiverat tema kan därför
återinföras utan att hämta om något.

## Så återinför du ett tema

1. `git mv R/arkiv/teman/<namn> R/teman/<namn>`
2. Lägg tillbaka `source("R/teman/<namn>/config.R")` i `R/teman/register.R`
   och lägg temat i `alla_teman`.
3. Lägg tillbaka `source("R/teman/<namn>/bearbeta.R")` överst i `R/bearbeta.R`
   och anropet `bearbeta_<namn>()` i avsnittet som fyller på årsvyns sektioner.
4. Lägg tillbaka området i `app/src/taxonomy.ts` under rätt kategori.
5. Kör om pipelinen:
   `Rscript -e "source('R/bearbeta.R'); source('R/exportera.R')"`

Steg 4 är det som faktiskt gör området synligt: ett område utan
taxonomipost hamnar annars under kategorin "Övrigt" på startsidan.
