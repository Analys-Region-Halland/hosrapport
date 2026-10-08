// rapport/RadKort.tsx: hovringskortet för en rad i Läget i korthet.
// Tillägg 2026-10-08, förlaga: radens tooltip i kommundatas indikatortabell.
//
// Visas när pekaren står på raden (eller namnlänken har tangentbordsfokus) och
// försvinner när den lämnar. Kortet: avsnittet som kicker, indikatorns namn,
// senaste värdet och platsen med förändringen i ord, och två minigrafer
// (MiniKurva): värdet över tid på regionernas skala och platsen bland regionerna
// över tid (plats 1 överst, topp 3 som grönt fält). Sist en rad om att klick leder
// till indikatorn. Kortet ligger i en portal med fast position, ovanför raden
// när det finns plats, annars under. Escape stänger (WCAG 1.4.13).
//
// Med `sida` (statusrutans lista på startsidan) står kortet bredvid ankaret i
// stället, till höger om det finns plats, annars till vänster, så att listan
// syns medan man pekar sig nedåt i den. Höjden mäts innan kortet visas, så att
// det alltid ryms i fönstret.

import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
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
  ankare: { vanster: number; topp: number; botten: number; hoger?: number };
  /** Kortet bredvid ankaret i stället för ovanför eller under. */
  sida?: boolean;
  /** Uppmaningen längst ned. */
  uppmaning?: string;
  onStang(): void;
}

const BREDD = 520;
/** Avståndet mellan ankaret och kortet när det står bredvid. */
const LUFT = 12;

/**
 * Kortets läge. Bredvid (`sida`): till höger om ankaret om det får plats,
 * annars till vänster, i höjd med raden och inom fönstret. Annars, och när det
 * inte får plats bredvid: ovanför raden om det finns plats, annars under.
 */
function lage(h: number, bredd: number, ankare: RadKortProps["ankare"], sida: boolean): { left: number; top: number } {
  const hoger = ankare.hoger ?? ankare.vanster;
  const sidled = !sida ? null
    : innerWidth - hoger >= bredd + 2 * LUFT ? hoger + LUFT
    : ankare.vanster >= bredd + 2 * LUFT ? ankare.vanster - LUFT - bredd
    : null;
  if (sidled !== null) return { left: sidled, top: Math.max(8, Math.min(ankare.topp - 56, innerHeight - h - 8)) };
  const left = Math.max(8, Math.min(ankare.vanster, innerWidth - bredd - 8));
  return { left, top: ankare.topp > h + 16 ? ankare.topp - 8 - h : ankare.botten + 8 };
}
/** Minigrafernas höjd: plats för hela platsfältet med läsbara steg. */
const GRAF_HOJD = 156;

export default function RadKort({ kpi, nummer, avsnitt, status, utv, vy, ankare, sida = false, uppmaning = "Klicka på raden för att läsa mer", onStang }: RadKortProps): ReactNode {
  const ref = useRef<HTMLDivElement>(null);
  const bredd = Math.min(BREDD, innerWidth - 16);
  // Läget räknas med kortets uppmätta höjd före första bilden
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { left, top } = lage(el.offsetHeight, bredd, ankare, sida);
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  });
  useEffect(() => {
    const tangent = (e: KeyboardEvent) => { if (e.key === "Escape") onStang(); };
    addEventListener("keydown", tangent);
    return () => removeEventListener("keydown", tangent);
  }, [onStang]);

  const per = (iso: string) => period(iso, vy, "kort");
  const fmt = (v: number) => varde(v, kpi.format);
  const harPlats = utv.platser.length > 1;
  const enhetsord = kpi.format.enhet === "procent" ? " procentenheter" : "";

  const grafB = harPlats ? Math.floor((bredd - 32 - 28) / 2) : bredd - 32;

  return createPortal(
    <div ref={ref} className={s.kort} style={{ width: bredd }} role="tooltip" data-radkort={kpi.id}>
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
          <MiniVarde serie={utv.serie} spann={utv.spann} format={kpi.format} formatVarde={fmt} periodText={per} bredd={grafB} hojd={GRAF_HOJD} />
        </div>
        {harPlats && (
          <div>
            <p className={s.graftitel}>
              Plats bland regionerna
              {kpi.riktning !== "neutral" && <span className={s.nyckel}><span className={s.topp3} aria-hidden="true" />topp 3, målet</span>}
            </p>
            <MiniPlats platser={utv.platser} periodText={per} bredd={grafB} hojd={GRAF_HOJD} riktning={kpi.riktning} />
          </div>
        )}
      </div>

      <p className={s.fot}>{uppmaning} <span className={s.pil} aria-hidden="true">→</span></p>
    </div>,
    document.body,
  );
}
