// stilguide.tsx: den levande stilguiden (docs/arkitektur.md WP7). Renderar
// stilguidens innehåll ur den riktiga koden: tokens ur design/tema.ts och
// rapportens egna komponenter med exempeldata. Körs i dev-servern:
//
//   http://localhost:5173/verktyg/stilguide.html
//
// Sektionerna är filer verktyg/sektioner/*.stilguide.tsx som globbas här; varje
// fil exporterar { id, rubrik, ordning, Sektion } (se sektioner/delar.tsx). Ingen
// delad indexfil: ett paket lägger till sin sektion genom att skapa sin fil.
// Sidan sätter data-stilguide="klar" på <html> när den ritats (bänken och
// a11y väntar på det) och data-lage="desktop|mellan|mobil" på roten.
//
// Ägare: WP7.

import { StrictMode, useEffect, useState, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
// Globala stilar och tokens laddas av stilguide-stil.ts, som stilguide.html kör
// före den här filen (globben nedan lyfts annars före alla andra importer).
import { mediafraga } from "../src/design/tema";
import { Felgrans, type SektionModul } from "./sektioner/delar";
import { laddaExempeldata } from "./sektioner/exempel";
import { stilguideVersion } from "./sektioner/stilguide-md";
import s from "./stilguide.module.css";

// ── Sektionerna ──

const moduler = import.meta.glob<Partial<SektionModul>>("./sektioner/*.stilguide.tsx", { eager: true });

interface Post extends SektionModul { fil: string }

const FEL: string[] = [];
const POSTER: Post[] = Object.entries(moduler)
  .flatMap(([sokvag, m]): Post[] => {
    const fil = sokvag.replace("./sektioner/", "");
    if (typeof m.id !== "string" || typeof m.rubrik !== "string" || typeof m.ordning !== "number" || !m.Sektion) {
      FEL.push(`${fil} exporterar inte id, rubrik, ordning och Sektion`);
      return [];
    }
    return [{ fil, id: m.id, rubrik: m.rubrik, ordning: m.ordning, Sektion: m.Sektion }];
  })
  .sort((a, b) => a.ordning - b.ordning || a.id.localeCompare(b.id));

for (const [i, p] of POSTER.entries()) {
  if (POSTER.findIndex((q) => q.id === p.id) !== i) FEL.push(`${p.fil} har samma id som en annan sektion: ${p.id}`);
}

const IDN = POSTER.map((p) => p.id);

// ── Brytpunkter ur tema.ts ──

type Lage = "desktop" | "mellan" | "mobil";

function lasLage(): Lage {
  if (matchMedia(mediafraga.desktop).matches) return "desktop";
  return matchMedia(mediafraga.mobil).matches ? "mobil" : "mellan";
}

function prenumereraLage(byt: () => void) {
  const fragor = [mediafraga.desktop, mediafraga.mobil].map((q) => matchMedia(q));
  fragor.forEach((m) => m.addEventListener("change", byt));
  return () => fragor.forEach((m) => m.removeEventListener("change", byt));
}

/** Sektionen som läsaren är i: den sista vars överkant passerat 30 % av fönstret. */
function useAktivSektion(): string | null {
  const [aktiv, setAktiv] = useState<string | null>(IDN[0] ?? null);
  useEffect(() => {
    let ram = 0;
    const kolla = () => {
      ram = 0;
      let val = IDN[0] ?? null;
      for (const id of IDN) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top < window.innerHeight * 0.3) val = id;
      }
      setAktiv(val);
    };
    const vidRullning = () => { if (!ram) ram = requestAnimationFrame(kolla); };
    vidRullning();
    window.addEventListener("scroll", vidRullning, { passive: true });
    return () => {
      window.removeEventListener("scroll", vidRullning);
      cancelAnimationFrame(ram);
    };
  }, []);
  return aktiv;
}

function Innehall({ aktiv, lage }: { aktiv: string | null; lage: Lage }) {
  return (
    <nav className={lage === "desktop" ? s.toc : s.tocInline} aria-label="Innehåll">
      <p className={s.tocRubrik}>Innehåll</p>
      <ol className={s.tocLista}>
        {POSTER.map((p, i) => (
          <li key={p.id}>
            <a href={`#${p.id}`} aria-current={lage === "desktop" && aktiv === p.id ? "true" : undefined}>
              <span className={s.nr}>{i + 1}</span>
              {p.rubrik}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function Stilguide({ datafel }: { datafel: string | null }) {
  const lage = useSyncExternalStore(prenumereraLage, lasLage);
  const aktiv = useAktivSektion();

  useEffect(() => {
    document.documentElement.dataset.stilguide = "klar";
  }, []);

  return (
    <div className={s.sidan} data-lage={lage}>
      <div className={s.ram}>
        {lage === "desktop" && <Innehall aktiv={aktiv} lage={lage} />}
        <main className={s.huvud}>
          <header className={s.masthead}>
            <p className={s.kicker}>Region Halland · HoS-rapporten</p>
            <h1 className={s.titel}>Levande stilguide</h1>
            <div className={s.linje} aria-hidden="true" />
            <p className={s.ingress}>
              Så ser rapporten ut, ritat ur koden. Färger, typografi och avstånd läses ur design/tema.ts, och graferna
              ritas med rapportens egna komponenter och data.
            </p>
            <p className={s.meta}>
              {[stilguideVersion, `${POSTER.length} sektioner ur verktyg/sektioner`, "Normerande text: docs/stilguide.md"]
                .filter(Boolean).join(" · ")}
            </p>
          </header>

          {lage !== "desktop" && <Innehall aktiv={aktiv} lage={lage} />}

          {(FEL.length > 0 || datafel) && (
            <div className={s.fel} role="alert">
              <p className={s.felRubrik}>Stilguiden är inte komplett</p>
              <ul>
                {datafel && <li>Rapportkapitlet kunde inte laddas, så översikten och typografin visar SKR-utdraget: {datafel}</li>}
                {FEL.map((f) => <li key={f}>{f}</li>)}
              </ul>
            </div>
          )}

          {POSTER.map((p, i) => (
            <section key={p.id} id={p.id} className={s.sektion} data-sektion={p.id} data-bank-bild={p.id}
              aria-labelledby={`${p.id}-rubrik`}>
              <h2 id={`${p.id}-rubrik`} className={s.avsnitt}>
                <span className={s.nr}>{i + 1}</span>
                {p.rubrik}
              </h2>
              <Felgrans namn={p.fil}>
                <p.Sektion />
              </Felgrans>
            </section>
          ))}
        </main>
      </div>
    </div>
  );
}

const rot = createRoot(document.getElementById("root")!);
laddaExempeldata()
  .then(() => null, (fel: unknown) => (fel instanceof Error ? fel.message : String(fel)))
  .then((datafel) => {
    rot.render(
      <StrictMode>
        <Stilguide datafel={datafel} />
      </StrictMode>,
    );
  });
