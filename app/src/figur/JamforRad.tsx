// figur/JamforRad.tsx: jämförraden under plotytan, "+ Jämför med …" och chips för fästa serier (stilguiden 6.1).
// Ägare: WP4.
//
// - Knappen öppnar WP5:s ui/Popover med kryssrutor i alfabetisk ordning och
//   senaste värde till höger (rad 34 px). Listan står öppen medan man kryssar.
//   Popovern sköter Escape (lagerstapeln, fokus tillbaka till knappen), klick
//   utanför, Tab ut ur listan och portalen (klipps inte av content-visibility).
// - Första kryssrutan får fokus när listan öppnas.
// - Högst fyra fästa; den femte ersätter den äldsta (figur/fasta.ts).
// - Chips i fästordning: färgstreck i markeringsfärgen, namn och ×. "Rensa"
//   när fler än en är vald. Fokus flyttas till nästa chip (eller knappen) när
//   ett chip tas bort.
// - Visas bara när spec har jämförbara serier. Listan byggs ur spec.jamforbara
//   (redan alfabetisk från WP1, sorteras ändå); tillståndet (fasta) ägs av Figur
//   och delas med diagrammet.

import { useEffect, useId, useRef, useState } from "react";
import type { ChartSpec } from "../charts/spec";
import { varde } from "../design/format";
import { tema } from "../design/tema";
import Knapp from "../ui/Knapp";
import Popover from "../ui/Popover";
import { jamforNamn, markeringsIndex, vaxlaFast } from "./fasta";
import s from "./JamforRad.module.css";

export interface JamforRadProps {
  spec: ChartSpec;
  fasta: string[];
  onFasta(ids: string[]): void;
  nivanamn?: string;        // "region" (förval), "sjukhus" …: "+ Jämför med {nivanamn}"
}

export default function JamforRad({ spec, fasta, onFasta, nivanamn = "region" }: JamforRadProps) {
  const [oppen, setOppen] = useState(false);
  const [knapp, setKnapp] = useState<HTMLButtonElement | null>(null);
  const lista = useRef<HTMLDivElement>(null);
  const chips = useRef<HTMLDivElement>(null);
  const fokusEfter = useRef<number | null>(null);
  const listaId = useId();

  // Första kryssrutan får fokus när listan öppnas. Popovern fokuserar sin yta i
  // en effekt; nästa bildruta kommer efter alla effekter, även StrictModes omkörning.
  useEffect(() => {
    if (!oppen) return;
    const r = requestAnimationFrame(() =>
      lista.current?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(r);
  }, [oppen]);

  // Efter att ett chip tagits bort: fokus till chipet på samma plats, föregående eller knappen.
  useEffect(() => {
    const i = fokusEfter.current;
    if (i === null) return;
    fokusEfter.current = null;
    const kvar = [...(chips.current?.querySelectorAll<HTMLButtonElement>("[data-chip]") ?? [])];
    (kvar[Math.min(i, kvar.length - 1)] ?? knapp)?.focus();
  }, [fasta, knapp]);

  const jamforbara = spec.jamforbara ?? [];
  if (jamforbara.length === 0) return null;

  const alfabetisk = [...jamforbara].sort((a, b) => a.namn.localeCompare(b.namn, "sv"));
  const tips = spec.typ === "linje" || spec.typ === "rangordning"
    ? "Högst fyra åt gången. Du kan också klicka på en linje i grafen."
    : "Högst fyra åt gången.";

  const taBort = (id: string, i: number) => {
    fokusEfter.current = i;
    onFasta(fasta.filter((f) => f !== id));
  };

  return (
    <div className={s.rad} data-jamfor="">
      <Knapp
        ref={setKnapp}
        ton="fokus"
        aria-haspopup="dialog"
        aria-expanded={oppen}
        aria-controls={oppen ? listaId : undefined}
        onClick={() => setOppen((o) => !o)}
        data-jamfor-knapp=""
      >
        + Jämför med {nivanamn}
      </Knapp>
      <Popover oppen={oppen} onStang={() => setOppen(false)} ankare={knapp} etikett={`Jämför med ${nivanamn}`} id={listaId}>
        <div ref={lista} className={s.lista} data-jamfor-lista="">
          <p className={s.tips}>{tips}</p>
          <div className={s.rader}>
            {alfabetisk.map((j) => (
              <label key={j.enhetId} className={s.val} style={{ minBlockSize: tema.komponent.jamforLista.radhojd }}>
                <input
                  type="checkbox"
                  value={j.enhetId}
                  checked={fasta.includes(j.enhetId)}
                  onChange={() => onFasta(vaxlaFast(fasta, j.enhetId))}
                />
                <span className={s.namn}>{j.namn}</span>
                <span className={s.varde}>{varde(j.senaste, spec.y.format)}</span>
              </label>
            ))}
          </div>
        </div>
      </Popover>
      {fasta.length > 0 && (
        <div ref={chips} className={s.rad} data-chips="">
          {fasta.map((id, i) => {
            const namn = jamforNamn(spec, id);
            const farg = markeringsIndex(spec, fasta, id);
            return (
              <button
                key={id}
                type="button"
                className={s.chip}
                aria-label={`Ta bort ${namn} ur grafen`}
                onClick={() => taBort(id, i)}
                data-chip={id}
              >
                <span
                  className={s.streck}
                  aria-hidden="true"
                  style={{
                    background: `var(--farg-diagram-markering-${farg})`,
                    blockSize: tema.diagram.roll.markerad.bredd,
                  }}
                />
                <span className={s.chipNamn}>{namn}</span>
                <span className={s.kryss} aria-hidden="true">×</span>
              </button>
            );
          })}
          {fasta.length > 1 && (
            <button
              type="button"
              className={`${s.chip} ${s.rensa}`}
              onClick={() => { fokusEfter.current = 0; onFasta([]); }}
              data-rensa=""
            >
              Rensa
            </button>
          )}
        </div>
      )}
    </div>
  );
}
