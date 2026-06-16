import type { VyData, Section } from "../types";

// ════════════════════════════════════════════════════════════
//  Datahämtning — lazy per vy, en fil per (vy, sektion).
//
//  R-pipelinen skriver app/public/data/:
//    index.json         — manifest: vy-metadata + sektionslista per vy
//    {vy}-{sektion}.json — en sektions fulla innehåll (id, namn, analys, kpier)
//
//  Frontend hämtar manifestet en gång, sedan endast den aktiva vyns
//  sektioner (parallellt). Allt cachas så att vy-byten blir momentana.
//  Ingen databearbetning sker här — bara hämtning + sammansättning.
// ════════════════════════════════════════════════════════════

const BASE = import.meta.env.BASE_URL;

export interface ManifestEntry extends Omit<VyData, "sektioner"> {
  sektioner: { id: string; namn: string }[];
}
export type Manifest = Record<string, ManifestEntry>;

let manifestPromise: Promise<Manifest> | null = null;
const viewCache = new Map<string, VyData>();

async function fetchJson<T>(file: string): Promise<T> {
  const url = `${BASE}data/${file}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Kunde inte hämta ${file} (HTTP ${r.status})`);
  const text = await r.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    // SPA-fallback ger ofta index.html (HTTP 200) när filen inte hittas på
    // sökvägen → ge ett begripligt fel i stället för "Unexpected token '<'".
    if (text.trimStart().startsWith("<")) {
      throw new Error(
        `Hittade inte ${url} (servern svarade med HTML). Kontrollera att ` +
        `app/public/data/${file} finns och att appen öppnas på basen "${BASE}". ` +
        `Starta om dev-servern och hård-uppdatera; bygger du, kör om "npm run build".`,
      );
    }
    throw new Error(`Ogiltig JSON i ${file}`);
  }
}

export function loadManifest(): Promise<Manifest> {
  if (!manifestPromise) manifestPromise = fetchJson<Manifest>("index.json");
  return manifestPromise;
}

/** Hämta en hel vy: manifest-metadata + alla sektionsfiler (cachat). */
export async function loadView(vy: string): Promise<VyData> {
  const cached = viewCache.get(vy);
  if (cached) return cached;

  const manifest = await loadManifest();
  const meta = manifest[vy];
  if (!meta) throw new Error(`Okänd vy: ${vy}`);

  const sektioner = await Promise.all(
    meta.sektioner.map((s) => fetchJson<Section>(`${vy}-${s.id}.json`)),
  );

  const vyData = { ...meta, sektioner } as VyData;
  viewCache.set(vy, vyData);
  return vyData;
}
