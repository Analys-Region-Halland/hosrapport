// figur/fasta.ts: regler för fästa serier, delade av Figur och JamforRad
// (stilguiden 6.8: högst fyra, den femte ersätter den äldsta). Ägare: WP4.

import type { ChartSpec } from "../charts/spec";
import { tema } from "../design/tema";

const MAX = tema.diagram.maxFasta;

/** Högst `max` fästa; blir de fler försvinner de äldsta (först i listan). Inga dubbletter. */
export function begransaFasta(ids: string[], max = MAX): string[] {
  const unika = ids.filter((id, i) => ids.indexOf(id) === i);
  return unika.length > max ? unika.slice(unika.length - max) : unika;
}

/** Kryssa i eller ur: ur om den redan är fäst, annars sist (och den äldsta ut vid fler än `max`). */
export function vaxlaFast(fasta: string[], id: string, max = MAX): string[] {
  return fasta.includes(id) ? fasta.filter((f) => f !== id) : begransaFasta([...fasta, id], max);
}

/** Index i farg.diagram.markering: seriens eget markeringIndex om spec har det, annars plats i `fasta`. */
export function markeringsIndex(spec: ChartSpec, fasta: string[], id: string): number {
  const serie = spec.serier.find((s) => (s.enhetId ?? s.id) === id && s.markeringIndex !== undefined);
  const i = serie?.markeringIndex ?? fasta.indexOf(id);
  const antal = tema.farg.diagram.markering.length;
  return ((i % antal) + antal) % antal;
}

/** Namnet på en jämförbar enhet. */
export function jamforNamn(spec: ChartSpec, id: string): string {
  return spec.jamforbara?.find((j) => j.enhetId === id)?.namn
    ?? spec.serier.find((s) => (s.enhetId ?? s.id) === id)?.namn
    ?? id;
}
