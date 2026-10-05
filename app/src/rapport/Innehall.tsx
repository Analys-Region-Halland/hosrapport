// rapport/Innehall.tsx: innehållsförteckningen som spalt (≥ 1200 px) eller ark
// (under 1200 px), stilguiden 4.5. Byggs ur KapitelModell. Ägare: WP6.
//
// Avsnitt i typ.roll.granssnitt (aktivt i 600 farg.black), indikatorer i
// typ.roll.not med statusprick 6 px före namnet (status i ord för
// skärmläsare). Aktiv indikator har farg.fokusLjus som bakgrund. Inga
// trianglar, ingen förloppslinje, inga räknare. I spalten fälls avsnittet ut
// när läsaren är i det; i arket är alla avsnitt utfällda, eftersom arket är
// till för att hoppa var som helst.
//
// Arket är en modal <dialog> nedifrån med stängknapp 44 px. Escape går via
// nav/lager.ts; dialogens egen avbrytning (cancel) stänger också, utan att
// navigera. Länkarna navigerar med pushState och flyttar fokus till blocket.

import { useEffect, useId, useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";
import type { KapitelModell, Status, VyId } from "../data/modell";
import Lank from "../nav/Lank";
import { arOverst, registreraLager } from "../nav/lager";
import { STANDARDVY, type Route } from "../nav/route";
import { useRoute } from "../nav/useRoute";
import { byggDisposition, hittaPosition, type Disposition, type DispIndikator } from "./ramDisposition";
import s from "./Innehall.module.css";

export interface InnehallProps {
  kapitel: KapitelModell;
  /** Blocket läsaren är i (nav/scroll.ts). */
  aktivt?: string;
  /** "spalt" (desktop) eller "ark" (mellan och mobil). Förval spalt. */
  variant?: "spalt" | "ark";
  /** Arket: öppet eller stängt. */
  oppen?: boolean;
  /** Arket: stäng (Escape, stängknapp, klick utanför, val av länk). */
  onStang?(): void;
  /** Vyn länkarna ska ha när adressen inte är kapitlets egen (t.ex. i stilguiden). */
  vy?: VyId;
}

const STATUSORD: Record<Status, string> = { gron: "I fas", gul: "Bevaka", rod: "Avvikelse" };

export default function Innehall({ kapitel, aktivt = "", variant = "spalt", oppen = false, onStang, vy }: InnehallProps): ReactNode {
  const [route] = useRoute();
  const d = useMemo(() => byggDisposition(kapitel), [kapitel]);
  // Länkarna behåller kapitlets vy och redigeringsläge; figurläget (v, e) hör till ett annat block.
  const bas: Extract<Route, { sida: "kapitel" }> =
    route.sida === "kapitel" && route.id === kapitel.id
      ? { sida: "kapitel", id: kapitel.id, vy: route.vy, ...(route.red ? { red: true } : {}) }
      : { sida: "kapitel", id: kapitel.id, vy: vy ?? STANDARDVY };
  const till = (i: string): Route => ({ ...bas, i });

  if (variant === "ark") {
    return <InnehallArk d={d} aktivt={aktivt} till={till} oppen={oppen} onStang={onStang} />;
  }
  return <InnehallSpalt d={d} aktivt={aktivt} till={till} />;
}

// ════════════════════════════════════════════════════════════
//  Spalt
// ════════════════════════════════════════════════════════════

function InnehallSpalt({ d, aktivt, till }: { d: Disposition; aktivt: string; till(i: string): Route }) {
  const nav = useRef<HTMLElement>(null);

  // Den aktiva posten hålls synlig i spaltens egen rullning (aldrig dokumentets)
  useEffect(() => {
    const n = nav.current;
    const a = n?.querySelector<HTMLElement>("[data-aktiv]");
    if (!n || !a) return;
    const topp = a.offsetTop;
    const marginal = a.offsetHeight * 2;
    if (topp < n.scrollTop + marginal || topp + a.offsetHeight > n.scrollTop + n.clientHeight - marginal) {
      n.scrollTo({ top: Math.max(0, topp - n.clientHeight / 3), behavior: "instant" });
    }
  }, [aktivt]);

  return (
    <nav ref={nav} className={s.spalt} aria-label="Innehåll" data-innehall="spalt">
      <Lista d={d} aktivt={aktivt} till={till} allaUtfallda={false} />
    </nav>
  );
}

// ════════════════════════════════════════════════════════════
//  Ark
// ════════════════════════════════════════════════════════════

function InnehallArk({ d, aktivt, till, oppen, onStang }: {
  d: Disposition; aktivt: string; till(i: string): Route; oppen: boolean; onStang?(): void;
}) {
  const dlg = useRef<HTMLDialogElement>(null);
  const rubrikId = useId();
  const stang = useRef(onStang);
  useEffect(() => {
    stang.current = onStang;
  });
  // Samma funktion i stapeln och i arOverst
  const [stangLager] = useState(() => () => stang.current?.());

  useEffect(() => {
    const el = dlg.current;
    if (!el) return;
    if (!oppen) {
      if (el.open) el.close();
      return;
    }
    if (!el.open) el.showModal();
    // Aktiv post synlig i arket
    el.querySelector<HTMLElement>("[data-aktiv]")?.scrollIntoView({ block: "center", behavior: "instant" });
    return registreraLager(stangLager);
  }, [oppen, stangLager]);

  // Klick på bakgrunden (utanför arkets ruta) stänger, när arket är överst
  const klick = (e: MouseEvent<HTMLDialogElement>) => {
    if (e.target !== e.currentTarget || !arOverst(stangLager)) return;
    const r = e.currentTarget.getBoundingClientRect();
    const utanfor = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    if (utanfor) onStang?.();
  };

  return (
    <dialog
      ref={dlg}
      className={s.ark}
      aria-labelledby={rubrikId}
      data-innehall="ark"
      onCancel={(e) => {
        // Escape går via lagerstapeln; andra stängningsbegäran (t.ex. Androids bakåtgest) stänger här
        e.preventDefault();
        onStang?.();
      }}
      onClick={klick}
    >
      <div className={s.arkhuvud}>
        <h2 id={rubrikId} className={s.arkrubrik}>Innehåll</h2>
        <button type="button" className={s.stang} onClick={() => onStang?.()} aria-label="Stäng innehållet" data-stang="">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
      </div>
      <nav className={s.arkinnehall} aria-label="Innehåll">
        <Lista d={d} aktivt={aktivt} till={till} allaUtfallda onValj={onStang} />
      </nav>
    </dialog>
  );
}

// ════════════════════════════════════════════════════════════
//  Listan (delas av spalt och ark)
// ════════════════════════════════════════════════════════════

function Lista({ d, aktivt, till, allaUtfallda, onValj }: {
  d: Disposition; aktivt: string; till(i: string): Route; allaUtfallda: boolean; onValj?(): void;
}) {
  const pos = hittaPosition(d, aktivt);
  const post = (id: string, innehall: ReactNode, klass: string, iDelen = false) => (
    <Lank
      till={till(id)}
      className={klass}
      aria-current={aktivt === id ? "location" : undefined}
      data-aktiv={aktivt === id || undefined}
      data-i-delen={iDelen || undefined}
      data-block-lank={id}
      onClick={() => onValj?.()}
    >
      {innehall}
    </Lank>
  );

  return (
    <ol className={s.lista}>
      {d.fore.map((b) => (
        <li key={b.id} className={s.del}>{post(b.id, b.namn, s.avsnitt)}</li>
      ))}
      {d.avsnitt.map((a) => {
        const iAvsnittet = pos.avsnitt?.id === a.id;
        return (
          <li key={a.id} className={s.del}>
            {post(a.id, <><span className={s.nr}>{a.nummer}</span> {a.namn}</>, s.avsnitt, iAvsnittet)}
            {(allaUtfallda || iAvsnittet) && a.indikatorer.length > 0 && (
              <ol className={s.indikatorer}>
                {a.indikatorer.map((x) => <li key={x.id}>{post(x.id, <Indikator x={x} />, s.indikator)}</li>)}
              </ol>
            )}
          </li>
        );
      })}
      {d.indikatorer.length > 0 && (
        <li className={s.del}>
          <ol className={s.indikatorer} data-utan-avsnitt="">
            {d.indikatorer.map((x) => <li key={x.id}>{post(x.id, <Indikator x={x} />, s.indikator)}</li>)}
          </ol>
        </li>
      )}
      {d.efter.map((b) => (
        <li key={b.id} className={s.del}>{post(b.id, b.namn, s.avsnitt)}</li>
      ))}
    </ol>
  );
}

function Indikator({ x }: { x: DispIndikator }) {
  return (
    <>
      <span className={s.prick} data-status={x.status ?? undefined} aria-hidden="true" />
      <span className={s.nr}>{x.nummer}</span>
      <span className={s.namn}>
        {x.namn}
        {x.status && <span className={s.osynlig}>, {STATUSORD[x.status]}</span>}
      </span>
    </>
  );
}
