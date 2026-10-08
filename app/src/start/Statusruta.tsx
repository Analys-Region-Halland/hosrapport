// start/Statusruta.tsx: statusrutan på startsidan och i sammanfattningen
// (ersätter statusmätaren 2026-10-08). Ett kort med tre fält, ett per status:
// antalet stort i statusens färg, ordet ("I fas", "Bevaka", "Avvikelse"),
// andelen och en ruta per indikator. Pekar man på ett fält (eller ger det
// fokus) öppnas en lista över indikatorerna i kategorin, med länk till var och
// en. Listan går att peka in i och stängs med Escape (WCAG 1.4.13).
//
// Storlekar: "kapitel" (kapitelraden, kompakt) och "lage" (Läget just nu,
// större; listan grupperas per kapitel). Färg är aldrig enda bäraren: varje
// fält har ordet och talet i text.

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { Status } from "../data/modell";
import Lank from "../nav/Lank";
import { antalMedStatus, STATUSORDNING, type StatusRakning } from "./startModell";
import type { StatusIndikator } from "./statusIndikatorer";
import s from "./Statusruta.module.css";

export interface StatusrutaProps {
  status: StatusRakning;
  /** Indikatorerna bakom siffrorna; undefined medan de hämtas. */
  indikatorer?: StatusIndikator[];
  storlek?: "kapitel" | "lage";
}

const ORD: Record<Status, string> = { gron: "I fas", gul: "Bevaka", rod: "Avvikelse" };

export default function Statusruta({ status, indikatorer, storlek = "kapitel" }: StatusrutaProps): ReactNode {
  const total = antalMedStatus(status);
  const [oppen, setOppen] = useState<Status | null>(null);
  const timer = useRef(0);
  const id = useId();

  useEffect(() => {
    if (!oppen) return;
    const tangent = (e: KeyboardEvent) => { if (e.key === "Escape") setOppen(null); };
    addEventListener("keydown", tangent);
    return () => removeEventListener("keydown", tangent);
  }, [oppen]);
  useEffect(() => () => clearTimeout(timer.current), []);

  if (total === 0) return null;
  const oppna = (st: Status) => { clearTimeout(timer.current); setOppen(st); };
  const stang = () => { clearTimeout(timer.current); timer.current = window.setTimeout(() => setOppen(null), 140); };

  return (
    <div className={`${s.ruta} ${s[storlek]}`} data-statusruta="" data-oppen={oppen ?? undefined}>
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
                className={s.lista}
                role="region"
                aria-label={`${ORD[st]}: ${n} ${n === 1 ? "indikator" : "indikatorer"}`}
                onBlur={(e) => { if (!e.currentTarget.parentElement?.contains(e.relatedTarget as Node)) stang(); }}
              >
                <p className={s.listrubrik}>
                  <span className={s.prick} aria-hidden="true" />
                  {ORD[st]} <span className={s.listantal}>{n} {n === 1 ? "indikator" : "indikatorer"}</span>
                </p>
                {lista ? <Lista lista={lista} grupperad={storlek === "lage"} /> : <p className={s.hamtar}>Hämtar indikatorerna …</p>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Lista({ lista, grupperad }: { lista: StatusIndikator[]; grupperad: boolean }) {
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
                <Lank till={{ sida: "kapitel", id: i.kapitelId, vy: i.vy, i: i.kpiId }} className={s.indikatorlank}>
                  <span className={s.nr}>{i.nummer}</span>
                  <span>{i.namn}</span>
                </Lank>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
