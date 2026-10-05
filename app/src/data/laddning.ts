// data/laddning.ts: hämtar manifest och kapitel och normaliserar dem.
// Ägare: WP1. Samma URL:er som gamla data/load.ts: {BASE}data/index.json och
// {BASE}data/{vy}-{kapitel}.json. Allt cachas, så byte av vy eller kapitel
// efter första hämtningen är momentant.

import type { RaManifest } from "./kontrakt";
import type { KapitelModell, VyId } from "./modell";
import { normalisera } from "./normalisera";

const BAS = import.meta.env.BASE_URL;

async function hamtaJson(fil: string): Promise<unknown> {
  const url = `${BAS}data/${fil}`;
  const svar = await fetch(url);
  if (!svar.ok) throw new Error(`Kunde inte hämta ${fil} (HTTP ${svar.status})`);
  const text = await svar.text();
  try {
    return JSON.parse(text);
  } catch {
    // En SPA-reserv svarar ofta med index.html (HTTP 200) när filen saknas.
    if (text.trimStart().startsWith("<")) {
      throw new Error(`Hittade inte ${url} (servern svarade med HTML). Kontrollera att app/public/data/${fil} finns och att appen öppnas på basen "${BAS}".`);
    }
    throw new Error(`Ogiltig JSON i ${fil}`);
  }
}

let manifest: Promise<RaManifest> | null = null;
const kapitel = new Map<string, Promise<KapitelModell>>();

/** Manifestet: tidsupplösningar och kapitel per upplösning. */
export function laddaManifest(): Promise<RaManifest> {
  if (!manifest) {
    manifest = hamtaJson("index.json") as Promise<RaManifest>;
    manifest.catch(() => { manifest = null; });
  }
  return manifest;
}

/** Ett kapitel i en tidsupplösning, normaliserat till KapitelModell. */
export function laddaKapitel(vy: VyId, kapitelId: string): Promise<KapitelModell> {
  const nyckel = `${vy}-${kapitelId}`;
  let p = kapitel.get(nyckel);
  if (!p) {
    p = hamtaJson(`${nyckel}.json`).then((raw) => normalisera(raw, vy));
    p.catch(() => kapitel.delete(nyckel));
    kapitel.set(nyckel, p);
  }
  return p;
}
