// figur/JamforRad.tsx: jämförraden under plotytan, "+ Jämför med …" och chips för fästa serier (stilguiden 6.1).
// Ägare: WP4.
//
// - Knappen öppnar en lista med kryssrutor i alfabetisk ordning och senaste
//   värde till höger (rad 34 px). Listan står öppen medan man kryssar och
//   stängs med Escape (via lagerstapeln, fokus tillbaka till knappen), klick
//   utanför eller när fokus lämnar den.
// - Högst fyra fästa; den femte ersätter den äldsta (figur/fasta.ts).
// - Chips i fästordning: färgstreck i markeringsfärgen, namn och ×. "Rensa"
//   när fler än en är vald. Fokus flyttas till nästa chip (eller knappen) när
//   ett chip tas bort.
// - Visas bara när spec har jämförbara serier. Listan byggs ur spec.jamforbara;
//   tillståndet (fasta) ägs av Figur och delas med diagrammet.
// Listan är byggd här tills WP5:s ui/Popover finns; den kan då byta yta.

import { useEffect, useId, useRef, useState, type FocusEvent } from "react";
import type { ChartSpec } from "../charts/spec";
import { varde } from "../design/format";
import { tema } from "../design/tema";
import Knapp from "../ui/Knapp";
import { useLager } from "../ui/lager";
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
  const valjare = useRef<HTMLDivElement>(null);
  const knapp = useRef<HTMLButtonElement>(null);
  const chips = useRef<HTMLDivElement>(null);
  const fokusEfter = useRef<number | null>(null);
  const listaId = useId();

  const stang = (aterFokus: boolean) => {
    setOppen(false);
    if (aterFokus) knapp.current?.focus();
  };
  useLager(oppen, () => stang(true));

  // Första kryssrutan får fokus när listan öppnas.
  useEffect(() => {
    if (oppen) valjare.current?.querySelector<HTMLInputElement>("input")?.focus();
  }, [oppen]);

  // Klick utanför stänger listan.
  useEffect(() => {
    if (!oppen) return;
    const vidPekare = (e: PointerEvent) => {
      if (!valjare.current?.contains(e.target as Node)) setOppen(false);
    };
    document.addEventListener("pointerdown", vidPekare);
    return () => document.removeEventListener("pointerdown", vidPekare);
  }, [oppen]);

  // Efter att ett chip tagits bort: fokus till chipet på samma plats, föregående eller knappen.
  useEffect(() => {
    const i = fokusEfter.current;
    if (i === null) return;
    fokusEfter.current = null;
    const kvar = [...(chips.current?.querySelectorAll<HTMLButtonElement>("[data-chip]") ?? [])];
    (kvar[Math.min(i, kvar.length - 1)] ?? knapp.current)?.focus();
  }, [fasta]);

  const jamforbara = spec.jamforbara ?? [];
  if (jamforbara.length === 0) return null;

  const alfabetisk = [...jamforbara].sort((a, b) => a.namn.localeCompare(b.namn, "sv"));
  const tips = spec.typ === "linje" || spec.typ === "rangordning"
    ? "Högst fyra åt gången. Du kan också klicka på en linje i grafen."
    : "Högst fyra åt gången.";

  const vidFokusUt = (e: FocusEvent<HTMLDivElement>) => {
    const till = e.relatedTarget as Node | null;
    if (oppen && till && !e.currentTarget.contains(till)) setOppen(false);
  };

  const taBort = (id: string, i: number) => {
    fokusEfter.current = i;
    onFasta(fasta.filter((f) => f !== id));
  };

  return (
    <div className={s.rad} data-jamfor="">
      <div ref={valjare} className={s.valjare} onBlur={vidFokusUt}>
        <Knapp
          ref={knapp}
          ton="fokus"
          aria-expanded={oppen}
          aria-controls={oppen ? listaId : undefined}
          onClick={() => (oppen ? stang(false) : setOppen(true))}
          data-jamfor-knapp=""
        >
          + Jämför med {nivanamn}
        </Knapp>
        {oppen && (
          <div id={listaId} className={s.lista} role="group" aria-label={`Jämför med ${nivanamn}`} data-jamfor-lista="">
            <p className={s.tips}>{tips}</p>
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
        )}
      </div>
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
