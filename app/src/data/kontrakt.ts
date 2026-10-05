// data/kontrakt.ts: rå JSON från R (kontrakt v1 och v2, docs/arkitektur.md avsnitt 5)
// och kontroll av versionen. Ägare: WP1. Stubb från WP0; signaturerna är
// preliminära tills WP1 skrivit ut fälten.

export type KontraktVersion = 1 | 2;

/** Manifestet (index.json) som R skriver. */
export interface RaManifest {
  kontrakt_version?: KontraktVersion;
  [falt: string]: unknown;
}

/** En sektionsfil ({vy}-{kapitel}.json) som R skriver. */
export type RaSektion = Record<string, unknown>;

/** Vilken kontraktsversion en sektion eller ett manifest följer. */
export function kontraktVersion(_raw: unknown): KontraktVersion {
  throw new Error("Ej byggd: WP1");
}

/** Kontrollerar rå JSON mot kontraktet. Tom lista = giltig. */
export function valideraKontrakt(_raw: unknown): string[] {
  throw new Error("Ej byggd: WP1");
}
