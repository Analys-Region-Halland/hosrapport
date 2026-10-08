// rapport/LagetIKorthet.tsx: översiktstabellen Läget i korthet (stilguiden 5.8,
// omtag 2026-10-08 med kommundatas indikatortabell som förlaga). Ägare: WP9.
//
// Kolumner: Indikator (länk till indikatorn), Halland (senaste värdet med
// förändringen sedan föregående period inom parentes och perioderna under),
// Plats (plats av antal med förändringen inom parentes) och Status. Kolumn-
// huvudena förklarar kort vad som står i kolumnen. Minidiagrammet är borttaget;
// i stället visar raden ett hovringskort (RadKort) med värdet och platsen över
// tid. Hela raden är klickbar och leder till indikatorn. Grupperad per avsnitt
// i standardordningen; kolumnhuvudena sorterar (aria-sort), "Indikator"
// återställer. På mobil döljs Plats. Sorteringslogiken finns i oversikt.ts.

import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import type { KapitelModell, KpiModell, VyId } from "../data/modell";
import { period, SAKNAS, varde } from "../design/format";
import { tema } from "../design/tema";
import Lank from "../nav/Lank";
import { KAPITELBLOCK, type Route } from "../nav/route";
import { navigera } from "../nav/useRoute";
import StatusMarkor from "../ui/StatusMarkor";
import { ariaSort, gruppera, nastaSortering, oversiktRader, STANDARD, type OversiktRad, type SortKolumn, type Sortering } from "./oversikt";
import RadKort from "./RadKort";
import { forandringText, PLATSTONER, platsTon, radUtveckling, type PlatsTon, type RadUtveckling } from "./radUtveckling";
import t from "./delat.module.css";
import s from "./LagetIKorthet.module.css";

export interface LagetIKorthetProps {
  kapitel: KapitelModell;
  vy: VyId;
  /** Redigeringsläget; länkarna behåller det. */
  redigera?: boolean;
}

const RUBRIK_ID = `${KAPITELBLOCK.laget}-rubrik`;

interface Pekad { kpiId: string; ankare: { vanster: number; topp: number; botten: number } }

export default function LagetIKorthet({ kapitel, vy, redigera = false }: LagetIKorthetProps): ReactNode {
  const rader = useMemo(() => oversiktRader(kapitel), [kapitel]);
  const kpier = useMemo(() => new Map(kapitel.kpier.map((k) => [k.id, k])), [kapitel]);
  const utveckling = useMemo(() => new Map(kapitel.kpier.map((k) => [k.id, radUtveckling(k, kapitel)])), [kapitel]);
  const [sortering, setSortering] = useState<Sortering>(STANDARD);
  const [pekad, setPekad] = useState<Pekad | null>(null);
  const timer = useRef(0);
  const stang = useCallback(() => { clearTimeout(timer.current); setPekad(null); }, []);
  if (!rader.length) return null;

  const grupper = gruppera(rader, sortering);
  // Plats bara när någon indikator har en (block utan data utelämnas, princip 7)
  const harPlats = rader.some((r) => r.plats !== null);
  const kolumner = harPlats ? 4 : 3;
  const klick = (k: SortKolumn | "standard") => setSortering((nu) => nastaSortering(nu, k));
  const till = (kpiId: string): Route => ({ sida: "kapitel", id: kapitel.id, vy, i: kpiId, ...(redigera ? { red: true } : {}) });

  // Kortet visas efter en kort stund och byter rad direkt när ett kort redan syns
  const visa = (kpiId: string, el: HTMLElement) => {
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const r = el.getBoundingClientRect();
      setPekad({ kpiId, ankare: { vanster: r.left + Math.min(240, r.width * 0.25), topp: r.top, botten: r.bottom } });
    }, pekad ? 0 : 90);
  };

  const huvud = (kolumn: SortKolumn | "standard", text: string, forklaring: string, klass = "") => {
    const aktiv = sortering.kolumn === kolumn && kolumn !== "standard";
    const pil = aktiv && sortering.kolumn !== "standard" ? (sortering.fallande ? "↓" : "↑") : "";
    return (
      <th scope="col" className={klass || undefined} aria-sort={ariaSort(sortering, kolumn)}>
        <button type="button" className={s.sortera} onClick={() => klick(kolumn)} data-sortera={kolumn}>
          {text}
          {pil && <span aria-hidden="true" className={s.pil}>{pil}</span>}
          {kolumn === "standard" && sortering.kolumn !== "standard" && <span className="visuellt-dold"> (avsnittens ordning)</span>}
        </button>
        <span className={s.forklaring}>{forklaring}</span>
      </th>
    );
  };

  const pekadRad = pekad ? rader.find((r) => r.kpiId === pekad.kpiId) : undefined;
  const pekadKpi = pekad ? kpier.get(pekad.kpiId) : undefined;
  const pekadUtv = pekad ? utveckling.get(pekad.kpiId) : undefined;

  return (
    <section data-block={KAPITELBLOCK.laget} aria-labelledby={RUBRIK_ID}>
      <h2 id={RUBRIK_ID} className={t.blockrubrik}>Läget i korthet</h2>
      <div className={s.kort}>
      <table className={s.tabell} data-oversikt="" onMouseLeave={stang}>
        <caption className="visuellt-dold">
          {harPlats
            ? "Kapitlets indikatorer med senaste värde och förändring sedan föregående period, plats bland regionerna och status. Kolumnhuvudena sorterar."
            : "Kapitlets indikatorer med senaste värde och förändring sedan föregående period och status. Kolumnhuvudena sorterar."}
        </caption>
        <thead>
          <tr>
            {huvud("standard", "Indikator", "Peka på en rad för utvecklingen, klicka för att gå dit", s.namnkolumn)}
            {huvud("senaste", "Halland", "Senaste värde och förändring", s.tal)}
            {harPlats && huvud("plats", "Plats", "Bland regionerna", `${s.tal} ${s.dMob}`)}
            {huvud("status", "Status", "Mot målet")}
          </tr>
        </thead>
        {grupper.map((g, gi) => (
          <tbody key={g.grupp?.id ?? `alla-${gi}`}>
            {g.grupp && (
              <tr className={s.grupp}>
                <th scope="rowgroup" colSpan={kolumner}>{g.grupp.namn}</th>
              </tr>
            )}
            {g.rader.map((r) => (
              <Rad
                key={r.kpiId}
                rad={r}
                kpi={kpier.get(r.kpiId) as KpiModell}
                utv={utveckling.get(r.kpiId) as RadUtveckling}
                vy={vy}
                till={till(r.kpiId)}
                harPlats={harPlats}
                pekad={pekad?.kpiId === r.kpiId}
                onVisa={visa}
                onStang={stang}
              />
            ))}
          </tbody>
        ))}
      </table>
      </div>
      {pekad && pekadRad && pekadKpi && pekadUtv && (
        <RadKort
          kpi={pekadKpi}
          nummer={pekadRad.nummer}
          avsnitt={pekadRad.grupp?.namn}
          status={pekadRad.status}
          utv={pekadUtv}
          vy={vy}
          ankare={pekad.ankare}
          uppmaning="Klicka på raden för att läsa mer"
          onStang={stang}
        />
      )}
    </section>
  );
}

interface RadProps {
  rad: OversiktRad;
  kpi: KpiModell;
  utv: RadUtveckling;
  vy: VyId;
  till: Route;
  harPlats: boolean;
  pekad: boolean;
  onVisa(kpiId: string, el: HTMLElement): void;
  onStang(): void;
}

function Rad({ rad: r, kpi, utv, vy, till, harPlats, pekad, onVisa, onStang }: RadProps) {
  const per = (iso: string) => period(iso, vy, "kort");
  const riktningKlass = utv.battre === null ? s.neutral : utv.battre ? s.battre : s.samre;
  const pf = utv.platsForandring;
  const ton = r.plats !== null && r.platsAv !== null ? platsTon(r.plats, kpi.riktning) : "neutral";
  return (
    <tr
      data-rad={r.kpiId}
      className={`${s.rad} ${pekad ? s.pekad : ""}`}
      onClick={(e) => { if (!(e.target as HTMLElement).closest("a")) { onStang(); navigera(till); } }}
      onMouseEnter={(e) => onVisa(r.kpiId, e.currentTarget)}
    >
      <th scope="row" className={s.namn}>
        <Lank
          till={till}
          className={s.namnlank}
          onFocus={(e) => onVisa(r.kpiId, e.currentTarget.closest("tr") as HTMLElement)}
          onBlur={onStang}
        >
          <span className={s.nr}>{r.nummer}</span>
          <span className={s.namnText}>{r.namn}</span>
        </Lank>
      </th>
      <td className={s.tal}>
        <span className={s.varde}>
          <b>{varde(r.senaste, kpi.format)}</b>
          {utv.forandring !== null && (
            <span className={`${s.chip} ${riktningKlass}`}
              aria-label={`förändring ${forandringText(utv.forandring, kpi)}${utv.battre === null ? "" : utv.battre ? ", åt rätt håll" : ", åt fel håll"}`}>
              <span aria-hidden="true" className={s.pil}>{utv.forandring > 0 ? "▲" : utv.forandring < 0 ? "▼" : "●"}</span>
              {forandringText(Math.abs(utv.forandring), kpi).replace(/^\+/, "")}
            </span>
          )}
        </span>
        {utv.senaste && (
          <span className={`${s.period} ${r.avvikandePeriod ? s.aldre : ""}`}
            title={r.avvikandePeriod ? `Senaste värdet gäller ${per(utv.senaste.period)}, äldre än kapitlets period` : undefined}>
            {per(utv.senaste.period)}{utv.foreg ? ` jmf. ${per(utv.foreg.period)}` : ""}
          </span>
        )}
      </td>
      {harPlats && (
        <td className={`${s.tal} ${s.dMob}`}>
          {r.plats !== null && r.platsAv !== null ? (
            <span className={s.platskort} data-ton={ton}>
              <span className={s.platsrad}>
                <span className={`${s.bricka} ${s[ton]}`}>{r.plats}</span>
                <span className={s.av}>av {r.platsAv}</span>
                {pf !== null && (
                  <span className={`${s.chip} ${pf > 0 ? s.battre : pf < 0 ? s.samre : s.neutral}`}
                    aria-label={pf === 0 ? "oförändrad plats" : `${Math.abs(pf)} ${pf > 0 ? "platser upp" : "platser ned"}`}>
                    <span aria-hidden="true" className={s.pil}>{pf > 0 ? "▲" : pf < 0 ? "▼" : "●"}</span>
                    {pf === 0 ? "0" : Math.abs(pf)}
                  </span>
                )}
              </span>
              <Platsskala plats={r.plats} av={r.platsAv} ton={ton} />
            </span>
          ) : SAKNAS}
        </td>
      )}
      <td className={s.status}>
        {r.status ? <StatusMarkor status={r.status} /> : <span className={s.beskrivande}>beskrivande mått</span>}
      </td>
    </tr>
  );
}

/**
 * Platsskalan under brickan: hela fältet (plats 1 till vänster) som segment i
 * placeringens toner, så att skalan själv visar var gränserna går, och en
 * markör där regionen står. Mått utan riktning får en grå linje.
 */
function Platsskala({ plats, av, ton }: { plats: number; av: number; ton: PlatsTon }) {
  const b = 92, h = 12, m = 5;
  const steg = (b - 2 * m) / Math.max(1, av);
  const x = (p: number) => m + (p - 0.5) * steg;
  const f = tema.farg.plats;
  const segment: { fran: number; till: number; ton: PlatsTon }[] = [];
  if (ton === "neutral") segment.push({ fran: 1, till: av, ton: "neutral" });
  else {
    let fran = 1;
    PLATSTONER.forEach((t, i) => {
      const till = Math.min(av, f.grans[i] ?? av);
      if (fran <= till) segment.push({ fran, till, ton: t });
      fran = till + 1;
    });
  }
  return (
    <svg className={s.skala} width={b} height={h} viewBox={`0 0 ${b} ${h}`} aria-hidden="true">
      {segment.map((g) => (
        <rect key={g.fran} x={m + (g.fran - 1) * steg + 0.5} y={h / 2 - 2} width={Math.max(1, (g.till - g.fran + 1) * steg - 1)} height={4}
          rx={1} fill={f[g.ton].punkt} fillOpacity={g.ton === ton ? 0.9 : 0.35} />
      ))}
      <circle cx={x(plats)} cy={h / 2} r={4.5} fill={f[ton].punkt} stroke={tema.farg.yta} strokeWidth={1.75} />
    </svg>
  );
}
