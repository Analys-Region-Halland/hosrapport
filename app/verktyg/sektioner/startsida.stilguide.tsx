// sektioner/startsida.stilguide.tsx: stilguidens sektion för startsidan
// (stilguiden 4.1): kapitelraden och statusmätaren. Ägare: WP11.
// Globbas av stilguide.tsx (WP7), som läser { id, rubrik, ordning, Sektion }.
//
// Raderna byggs med startsidans egen modell (byggStartModell) ur ett litet
// fast manifest och kapitelinfos riktiga texter, så att bänkens bilder står
// still när R kör om. Länkarna navigerar inte i stilguiden (klicken fångas).

import type { CSSProperties, MouseEvent, ReactNode } from "react";
import type { RaManifest, RaSektionSummering } from "../../src/data/kontrakt";
import { TEMAN } from "../../src/data/kapitelinfo";
import { tema } from "../../src/design/tema";
import Kapitelrad from "../../src/start/Kapitelrad";
import Statusmatare from "../../src/start/Statusmatare";
import { byggStartModell, type StatusRakning } from "../../src/start/startModell";
import { Dek, Kod, Not, Prosa, Underrubrik } from "./delar";

export const id = "startsida";
export const rubrik = "Startsida";
export const ordning = 80;

const stil = {
  exempel: { marginTop: "var(--rum-5)", background: "var(--farg-papper)" },
  lista: { display: "grid", rowGap: "var(--rum-6)", margin: 0, padding: 0, listStyle: "none" },
  matare: { display: "grid", rowGap: "var(--rum-5)" },
  smal: { width: "calc(var(--rum-10) + var(--rum-8))", maxWidth: "100%" },
} satisfies Record<string, CSSProperties>;

function sektion(id: string, namn: string, n_kpier: number, n_delar: number, status: StatusRakning): RaSektionSummering {
  return { id, namn, n_kpier, n_delar, status };
}

// Siffrorna som i rapportens årsvy 2025 (public/data/index.json, 5 oktober 2026).
const MANIFEST: RaManifest = {
  ar: {
    vy: "ar", etikett: "Årsöversikt", period: "2025", datum: "2026-03-31", uppdaterad: "", jmf_etikett: "föreg. år", analys: "",
    sektioner: [
      sektion("skr-syn-pa-varden", "Patienters och befolkningens syn på vården", 14, 4, { gron: 4, gul: 6, rod: 4 }),
      sektion("akutflode", "Akutflöde", 4, 0, { gron: 2, gul: 0, rod: 2 }),
    ],
  },
};

const RADER = byggStartModell(MANIFEST, TEMAN).teman.flatMap((t) => t.kapitel);

function Exempel({ bild, children }: { bild: string; children: ReactNode }) {
  return <div style={stil.exempel} data-bank-bild={`startsida-${bild}`}>{children}</div>;
}

export function Sektion() {
  // Länkar navigerar inte i stilguiden.
  const fanga = (e: MouseEvent) => {
    if ((e.target as Element).closest("a")) e.preventDefault();
  };

  return (
    <div onClickCapture={fanga} data-stilguide-startsida="">
      <Dek>
        Startsidan är en lugn innehållsförteckning: brandlist, masthead, Läget just nu, kapitlen per tema och en
        sidfot. Här visas dess två egna delar.
      </Dek>

      <Underrubrik>Kapitelrad</Underrubrik>
      <Prosa>
        Nummer i fokusgrönt, namnet som indikatorrubrik, en mening som dek, metaraden och vid behov en notis. Hela
        raden är en länk; hover stryker under namnet och tangentbordsfokus ritar ringen runt raden. Från 640 px står
        mätaren i en egen spalt, i mobil under texten.
      </Prosa>
      <Exempel bild="kapitelrad">
        <ol style={stil.lista}>
          {RADER.map((k) => <Kapitelrad key={k.id} kapitel={k} rubrikniva={4} />)}
        </ol>
      </Exempel>
      <Not>
        Dek och temamening är första meningen i <Kod>data/kapitelinfo.ts</Kod>. Metaraden: antal indikatorer, takt och
        källa. Kapitel utan indikatorer med status visar ingen mätare.
      </Not>

      <Underrubrik>Statusmätare</Underrubrik>
      <Prosa>
        Ett segment per status i statusmarkörens färger, {tema.komponent.statusmatare.hojd} px högt med{" "}
        {tema.komponent.statusmatare.mellanrum} px mellanrum (<Kod>komponent.statusmatare</Kod>), och alltid räkningen i
        text under. Stapeln är dold för skärmläsare; texten bär innehållet. Segment med noll ritas inte.
      </Prosa>
      <Exempel bild="matare">
        <div style={stil.matare}>
          <Not>Läget just nu (alla indikatorer med status i årsvyn)</Not>
          <Statusmatare status={{ gron: 29, gul: 20, rod: 31 }} storlek="lage" />
          <Not>Kapitelrad</Not>
          <div style={stil.smal}>
            <Statusmatare status={{ gron: 4, gul: 6, rod: 4 }} />
          </div>
          <Not>Kapitelrad med en tom status</Not>
          <div style={stil.smal}>
            <Statusmatare status={{ gron: 2, gul: 0, rod: 2 }} />
          </div>
        </div>
      </Exempel>
    </div>
  );
}
