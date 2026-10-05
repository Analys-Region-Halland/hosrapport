// charts/karna/fasta.ts: fästa serier (stilguiden 6.8). Fästa serier är ett
// tillstånd som figuren äger och delar med jämför-raden och rangordningen;
// diagrammet får dem som `fasta` (enhets-id i fästordning). Ägare: WP2.

import { tema } from "../../design/tema";
import type { ChartSpec, SpecSerie } from "../spec";

/** Nyckeln som fästa serier anges med: enhetens id, annars seriens id. */
export function fastNyckel(s: Pick<SpecSerie, "id" | "enhetId">): string {
  return s.enhetId ?? s.id;
}

/** Om serien får lyftas och fästas: kontext och markerad, om inte specen säger annat. */
export function arFastbar(s: SpecSerie): boolean {
  if (s.interaktiv !== undefined) return s.interaktiv && (s.roll === "kontext" || s.roll === "markerad");
  return s.roll === "kontext" || s.roll === "markerad";
}

/**
 * Lägger till eller tar bort en fäst enhet. Högst `max` (fyra); den femte
 * ersätter den äldsta (stilguiden 6.8).
 */
export function vaxlaFast(fasta: readonly string[], id: string, max: number = tema.diagram.maxFasta): string[] {
  if (fasta.includes(id)) return fasta.filter((f) => f !== id);
  const ny = [...fasta, id];
  return ny.length > max ? ny.slice(ny.length - max) : ny;
}

/**
 * Specen med fästa serier tillämpade: fästa fästbara serier får rollen
 * "markerad" med färg efter fästordningen och en etikett vid linjeslutet;
 * markerade serier som inte längre är fästa blir kontext igen. Är specen
 * redan byggd med samma fästa serier (kpiTillSpec med ctx.fasta) ändras inget.
 */
export function tillampaFasta(spec: ChartSpec, fasta: readonly string[]): ChartSpec {
  let andrad = false;
  const serier = spec.serier.map((s) => {
    if (!arFastbar(s)) return s;
    const i = fasta.indexOf(fastNyckel(s));
    if (i >= 0 && i < tema.diagram.maxFasta) {
      if (s.roll === "markerad" && s.markeringIndex === i) return s;
      andrad = true;
      return { ...s, roll: "markerad" as const, markeringIndex: i };
    }
    if (s.roll === "markerad") {
      andrad = true;
      return { ...s, roll: "kontext" as const, markeringIndex: undefined };
    }
    return s;
  });
  const markerade = serier.filter((s) => s.roll === "markerad");
  const saknas = markerade.filter((s) => !spec.etiketter.some((e) => e.serieId === s.id));
  if (!andrad && saknas.length === 0) return spec;
  return {
    ...spec,
    serier,
    etiketter: [...spec.etiketter, ...saknas.map((s) => ({ serieId: s.id, text: s.namn }))],
  };
}
