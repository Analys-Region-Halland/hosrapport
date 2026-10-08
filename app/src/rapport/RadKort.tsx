// rapport/RadKort.tsx: hovringskortet för en rad i Läget i korthet.
// Tillägg 2026-10-08, förlaga: radens tooltip i kommundatas indikatortabell.
//
// Visas när pekaren står på raden (eller namnlänken har tangentbordsfokus) och
// försvinner när den lämnar. Kortet: avsnittet som kicker, indikatorns namn,
// senaste värdet och platsen med förändringen i ord, och två minigrafer: värdet
// över tid (Halland och riket streckat) och platsen bland regionerna över tid
// (plats 1 överst, topp 3 som streckad linje). Sist en rad om att klick leder
// till indikatorn. Kortet ligger i en portal med fast position, ovanför raden
// när det finns plats, annars under. Escape stänger (WCAG 1.4.13).

import { useEffect, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { KpiModell, Status, VyId } from "../data/modell";
import { period, varde } from "../design/format";
import { tema } from "../design/tema";
import StatusMarkor from "../ui/StatusMarkor";
import { MiniPlats, MiniVarde } from "./MiniKurva";
import { forandringText, platsTon, type RadUtveckling } from "./radUtveckling";
import s from "./RadKort.module.css";

export interface RadKortProps {
  kpi: KpiModell;
  nummer: string;
  avsnitt?: string;
  status: Status | null;
  utv: RadUtveckling;
  vy: VyId;
  ankare: { vanster: number; topp: number; botten: number };
  onStang(): void;
}

const BREDD = 500;

export default function RadKort({ kpi, nummer, avsnitt, status, utv, vy, ankare, onStang }: RadKortProps): ReactNode {
  useEffect(() => {
    const tangent = (e: KeyboardEvent) => { if (e.key === "Escape") onStang(); };
    addEventListener("keydown", tangent);
    return () => removeEventListener("keydown", tangent);
  }, [onStang]);

  const per = (iso: string) => period(iso, vy, "kort");
  const fmt = (v: number) => varde(v, kpi.format);
  const harPlats = utv.platser.length > 1;
  const enhetsord = kpi.format.enhet === "procent" ? " procentenheter" : "";

  const bredd = Math.min(BREDD, innerWidth - 16);
  const vanster = Math.max(8, Math.min(ankare.vanster, innerWidth - bredd - 8));
  const hojdGissning = 350;
  const ovanfor = ankare.topp > hojdGissning + 16;
  const stil: CSSProperties = ovanfor
    ? { left: vanster, top: ankare.topp - 8, width: bredd, transform: "translateY(-100%)" }
    : { left: vanster, top: ankare.botten + 8, width: bredd };
  const grafB = harPlats ? Math.floor((bredd - 32 - 28) / 2) : bredd - 32;

  return createPortal(
    <div className={s.kort} style={stil} role="tooltip" data-radkort={kpi.id}>
      <div className={s.huvud}>
        <div>
          {avsnitt && <p className={s.kicker}>{nummer} · {avsnitt}</p>}
          <p className={s.namn}>{kpi.namn}</p>
        </div>
        {status && <StatusMarkor status={status} />}
      </div>

      <div className={s.siffror}>
        {utv.senaste && (
          <div>
            <p className={s.stort}>{fmt(utv.senaste.varde)}</p>
            <p className={s.under}>
              Halland {per(utv.senaste.period)}
              {utv.forandring !== null && utv.foreg && (
                <>
                  {", "}
                  <span className={utv.battre === null ? undefined : utv.battre ? s.battre : s.samre}>
                    {forandringText(utv.forandring, kpi)}{enhetsord}
                  </span>
                  {" sedan "}{per(utv.foreg.period)}
                </>
              )}
            </p>
          </div>
        )}
        {utv.plats && (
          <div>
            <p className={s.stort}>
              <span style={{ color: tema.farg.plats[platsTon(utv.plats.plats, kpi.riktning)].text }}>{utv.plats.plats}</span><span className={s.av}> av {utv.plats.av}</span>
            </p>
            <p className={s.under}>
              Plats bland regionerna
              {utv.foregPlats && utv.platsForandring !== null && (
                <>
                  {", "}
                  <span className={utv.platsForandring === 0 ? undefined : utv.platsForandring > 0 ? s.battre : s.samre}>
                    {utv.platsForandring === 0 ? "oförändrad" : `${Math.abs(utv.platsForandring)} ${utv.platsForandring > 0 ? "upp" : "ned"}`}
                  </span>
                  {" sedan "}{per(utv.foregPlats.period)}
                </>
              )}
            </p>
          </div>
        )}
      </div>

      <div className={s.grafer}>
        <div>
          <p className={s.graftitel}>Värde över tid</p>
          {utv.serie.length > 1 && (
            <p className={s.fran}>
              {fmt(utv.serie[0].varde)} <span aria-hidden="true">→</span> <b>{fmt(utv.serie[utv.serie.length - 1].varde)}</b>
            </p>
          )}
          <MiniVarde serie={utv.serie} format={fmt} periodText={per} bredd={grafB} hojd={104} />
        </div>
        {harPlats && (
          <div>
            <p className={s.graftitel}>Plats bland regionerna</p>
            <p className={s.fran}>
              plats {utv.platser[0].plats} <span aria-hidden="true">→</span>{" "}
              <b style={{ color: tema.farg.plats[platsTon(utv.platser[utv.platser.length - 1].plats, kpi.riktning)].text }}>
                plats {utv.platser[utv.platser.length - 1].plats}
              </b>
            </p>
            <MiniPlats platser={utv.platser} periodText={per} bredd={grafB} hojd={104} riktning={kpi.riktning} />
          </div>
        )}
      </div>

      <p className={s.fot}>Klicka på raden för att gå till indikatorn</p>
    </div>,
    document.body,
  );
}
