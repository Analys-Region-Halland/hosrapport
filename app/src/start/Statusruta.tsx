// start/Statusruta.tsx: statusrutan på startsidan och i sammanfattningen
// (ersätter statusmätaren 2026-10-08). Ett kort med tre fält, ett per status:
// antalet stort i statusens färg, ordet ("I fas", "Bevaka", "Avvikelse"),
// andelen och en ruta per indikator. Pekar man på ett fält (eller ger det
// fokus) öppnas en lista över indikatorerna i kategorin, med länk till var och
// en. Listan går att peka in i och stängs med Escape (WCAG 1.4.13).
//
// Pekar man på en indikator i listan (eller ger länken fokus) visas samma
// hovringskort som i Läget i korthet (RadKort), bredvid listan, med värdet och
// platsen över tid och uppmaningen att klicka vidare till rapporten. Kortet
// kommer nästan direkt och byter indikator utan fördröjning när man pekar sig
// nedåt i listan.
//
// Överst i kortet står vad siffrorna gäller ("Status för 14 indikatorer"), i
// Läget just nu också uppmaningen att peka på en kategori. Det ersätter de grå
// rader som tidigare stod ovanför och under (2026-10-08).
//
// Storlekar: "kapitel" (kapitelraden, kompakt) och "lage" (Läget just nu,
// större; listan grupperas per kapitel). Färg är aldrig enda bäraren: varje
// fält har ordet och talet i text.

import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import type { Status } from "../data/modell";
import Lank from "../nav/Lank";
import RadKort from "../rapport/RadKort";
import { radUtveckling } from "../rapport/radUtveckling";
import { antalMedStatus, STATUSORDNING, type StatusRakning } from "./startModell";
import type { StatusIndikator } from "./statusIndikatorer";
import s from "./Statusruta.module.css";

export interface StatusrutaProps {
  status: StatusRakning;
  /** Indikatorerna bakom siffrorna; undefined medan de hämtas. */
  indikatorer?: StatusIndikator[];
  storlek?: "kapitel" | "lage";
  /** Vad siffrorna gäller, utan antalet: "i 7 kapitel". Antalet räknas här. */
  omfang?: string;
}

const ORD: Record<Status, string> = { gron: "I fas", gul: "Bevaka", rod: "Avvikelse" };

interface Pekad { ind: StatusIndikator; ankare: { vanster: number; hoger: number; topp: number; botten: number } }

/** Listor smalare än så har kortet bredvid hela listan; bredare bredvid raden. */
const SMAL_LISTA = 520;

export default function Statusruta({ status, indikatorer, storlek = "kapitel", omfang }: StatusrutaProps): ReactNode {
  const total = antalMedStatus(status);
  const [oppen, setOppen] = useState<Status | null>(null);
  const timer = useRef(0);
  const id = useId();
  const [pekad, setPekad] = useState<Pekad | null>(null);
  const kortTimer = useRef(0);

  useEffect(() => {
    if (!oppen) return;
    const tangent = (e: KeyboardEvent) => { if (e.key === "Escape") setOppen(null); };
    addEventListener("keydown", tangent);
    return () => removeEventListener("keydown", tangent);
  }, [oppen]);
  useEffect(() => () => { clearTimeout(timer.current); clearTimeout(kortTimer.current); }, []);

  const stangKort = useCallback(() => { clearTimeout(kortTimer.current); setPekad(null); }, []);
  const pekadRef = useRef(pekad);
  useEffect(() => { pekadRef.current = pekad; }, [pekad]);
  const visaKort = useCallback((ind: StatusIndikator, el: HTMLElement) => {
    clearTimeout(kortTimer.current);
    const visa = () => {
      const rad = el.getBoundingClientRect();
      const lista = el.closest("[data-statuslista]")?.getBoundingClientRect() ?? rad;
      const ref = lista.width < SMAL_LISTA ? lista : rad;
      setPekad({ ind, ankare: { vanster: ref.left, hoger: ref.right, topp: rad.top, botten: rad.bottom } });
    };
    // Första kortet efter en kort stund (inte när pekaren bara passerar), sedan direkt
    if (pekadRef.current) visa();
    else kortTimer.current = window.setTimeout(visa, 60);
  }, []);
  const lamnaRad = useCallback(() => {
    clearTimeout(kortTimer.current);
    kortTimer.current = window.setTimeout(() => setPekad(null), 80);
  }, []);
  const pekadInd = pekad?.ind;
  const utv = useMemo(() => (pekadInd?.kpi ? radUtveckling(pekadInd.kpi, pekadInd.kap) : null), [pekadInd]);

  if (total === 0) return null;
  const oppna = (st: Status) => {
    clearTimeout(timer.current);
    if (st !== oppen) { clearTimeout(kortTimer.current); setPekad(null); }
    setOppen(st);
  };
  const stang = () => { clearTimeout(timer.current); timer.current = window.setTimeout(() => setOppen(null), 140); };

  return (
    <div className={`${s.ruta} ${s[storlek]}`} data-statusruta="" data-oppen={oppen ?? undefined}>
      <p className={s.rubrik}>
        <span>Status för {total} {total === 1 ? "indikator" : "indikatorer"}{omfang ? ` ${omfang}` : ""}</span>
        {storlek === "lage" && <span className={s.tips} aria-hidden="true">Peka på en kategori för att se vilka</span>}
      </p>
      {STATUSORDNING.map((st) => {
        const n = status[st];
        const andel = Math.round((n / total) * 100);
        const lista = indikatorer?.filter((i) => i.status === st);
        const listId = `${id}-${st}`;
        const aktiv = oppen === st;
        return (
          <div
            key={st}
            className={`${s.falt} ${s[st]} ${aktiv ? s.aktiv : ""} ${n === 0 ? s.tomt : ""}`}
            onPointerEnter={(e) => { if (e.pointerType === "mouse" && n > 0) oppna(st); }}
            onPointerLeave={(e) => { if (e.pointerType === "mouse") stang(); }}
            data-status={st}
          >
            <button
              type="button"
              className={s.knapp}
              aria-expanded={n > 0 ? aktiv : undefined}
              aria-controls={aktiv ? listId : undefined}
              disabled={n === 0}
              onClick={() => (aktiv ? setOppen(null) : oppna(st))}
              onFocus={() => n > 0 && oppna(st)}
              onBlur={(e) => { if (!e.currentTarget.parentElement?.contains(e.relatedTarget as Node)) stang(); }}
            >
              <span className={s.tal}>{n}</span>
              <span className={s.ord}>
                {ORD[st]}
                {storlek === "lage" && <span className={s.andel}>{andel} %</span>}
              </span>
              <span className={s.rutor} aria-hidden="true">
                {Array.from({ length: n }, (_, i) => <span key={i} className={s.kvadrat} />)}
              </span>
              <span className="visuellt-dold">{`, ${n === 1 ? "indikator" : "indikatorer"}. Visa vilka.`}</span>
            </button>
            {aktiv && (
              <div
                id={listId}
                data-statuslista=""
                className={s.lista}
                role="region"
                aria-label={`${ORD[st]}: ${n} ${n === 1 ? "indikator" : "indikatorer"}`}
                onBlur={(e) => { if (!e.currentTarget.parentElement?.contains(e.relatedTarget as Node)) stang(); }}
              >
                <p className={s.listrubrik}>
                  <span className={s.prick} aria-hidden="true" />
                  {ORD[st]} <span className={s.listantal}>{n} {n === 1 ? "indikator" : "indikatorer"}</span>
                </p>
                {lista
                  ? <Lista lista={lista} grupperad={storlek === "lage"} pekadId={pekad?.ind.kpiId} onVisa={visaKort} onLamna={lamnaRad} />
                  : <p className={s.hamtar}>Hämtar indikatorerna …</p>}
              </div>
            )}
          </div>
        );
      })}
      {/* Kortet hör till den öppna listan */}
      {pekad?.ind.kpi && utv && oppen === pekad.ind.status && (
        <RadKort
          kpi={pekad.ind.kpi}
          nummer={pekad.ind.nummer}
          avsnitt={pekad.ind.avsnitt ?? pekad.ind.kapitelNamn}
          status={pekad.ind.status}
          utv={utv}
          vy={pekad.ind.vy}
          ankare={pekad.ankare}
          sida
          uppmaning="Klicka för att läsa mer i rapporten"
          onStang={stangKort}
        />
      )}
    </div>
  );
}

function Lista({ lista, grupperad, pekadId, onVisa, onLamna }: {
  lista: StatusIndikator[];
  grupperad: boolean;
  pekadId?: string;
  onVisa(ind: StatusIndikator, el: HTMLElement): void;
  onLamna(): void;
}) {
  const grupper: { namn: string; id: string; rader: StatusIndikator[] }[] = [];
  for (const i of lista) {
    const sista = grupper[grupper.length - 1];
    if (grupperad && sista?.id === i.kapitelId) sista.rader.push(i);
    else if (!grupperad && sista) sista.rader.push(i);
    else grupper.push({ namn: i.kapitelNamn, id: i.kapitelId, rader: [i] });
  }
  return (
    <div className={s.rullning}>
      {grupper.map((g) => (
        <div key={g.id}>
          {grupperad && <p className={s.kapitelnamn}>{g.namn}</p>}
          <ul className={s.indikatorer}>
            {g.rader.map((i) => (
              <li key={i.kpiId}>
                <Lank
                  till={{ sida: "kapitel", id: i.kapitelId, vy: i.vy, i: i.kpiId }}
                  className={`${s.indikatorlank} ${pekadId === i.kpiId ? s.pekad : ""}`}
                  onPointerEnter={(e) => { if (e.pointerType === "mouse") onVisa(i, e.currentTarget); }}
                  onPointerLeave={(e) => { if (e.pointerType === "mouse") onLamna(); }}
                  onFocus={(e) => onVisa(i, e.currentTarget)}
                  onBlur={onLamna}
                >
                  <span className={s.nr}>{i.nummer}</span>
                  <span className={s.indikatornamn}>{i.namn}</span>
                  <span className={s.vidare} aria-hidden="true">→</span>
                </Lank>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
