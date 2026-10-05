// data/fixturer/index.ts: färdiga kapitel för tester, grafprov och galleriet.
// Ägare: WP1.
//
//   skrUtdrag()        utdrag ur verklig SKR-data (år): kolada-n79179 med luckor
//                      2023–2024 och seriebrott 2024, kolada-u70020 i kronor,
//                      kolada-n70808 som beskrivande mått och kolada-u79063 där
//                      Halland delar avrundat värde med en annan region
//   akutflodeUtdrag()  utdrag ur verklig akutflödesdata (månad, 24 månader):
//                      beläggning med förväntat intervall och besök per sjukhus
//   hierarki()         påhittad hierarki region › sjukhus › avdelning med
//                      undertryckta värden (för WP10)

import type { KapitelModell } from "../modell";
import { normalisera } from "../normalisera";
import akutRa from "./akutflode-manad-utdrag.json";
import skrRa from "./skr-utdrag.json";
import { hierarkiKapitel } from "./hierarki";

export { MIN_N } from "./hierarki";

export const skrUtdrag = (): KapitelModell => normalisera(skrRa, "ar");
export const akutflodeUtdrag = (): KapitelModell => normalisera(akutRa, "manad");
export const hierarki = (): KapitelModell => hierarkiKapitel();
