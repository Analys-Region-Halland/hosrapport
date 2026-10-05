// rapport/OmStatistiken.tsx: blocket Om statistiken sist i kapitlet
// (stilguiden 4.3). Ägare: WP9.
//
// Rubrik på avsnittsnivå utan nummer. Innehåll i ordning:
//   metodtexten        dagens kapitelinledning (`om_statistiken`)
//   Så skapas texten   vad AI-analysen är (proveniensraden länkar hit)
//   Så läser du status statusmarkörerna med sina korta definitioner och länk
//                      till begreppslistan
//   Begrepp i kapitlet begreppen som förekommer i kapitlets texter
//   Källor och leveranskedja  primärkällorna och vägen till rapporten
// Begreppen länkas en gång i blocket (eget omfång per kapitelblock).

import { useMemo, useState, type ReactNode } from "react";
import Prosa from "../begrepp/Prosa";
import { BEGREPP, hittaBegrepp } from "../begrepp/register";
import type { KallaRef, KapitelModell, Status } from "../data/modell";
import Lank from "../nav/Lank";
import { KAPITELBLOCK } from "../nav/route";
import StatusMarkor from "../ui/StatusMarkor";
import { begreppIKapitlet } from "./rapportText";
import t from "./delat.module.css";
import s from "./OmStatistiken.module.css";

export interface OmStatistikenProps {
  kapitel: KapitelModell;
}

const RUBRIK_ID = `${KAPITELBLOCK.om}-rubrik`;

const SA_SKAPAS =
  "Analyserna vid indikatorerna och punkterna under Det viktigaste är AI-analys. De skrivs automatiskt med fasta regler ur rapportens data, så att samma läge alltid beskrivs på samma sätt. Texten beskriver vad datan visar, inte varför. Förklaringar står i fördjupningen under varje figur och i verksamhetens kommentar.";

const STATUSAR: Status[] = ["gron", "gul", "rod"];
const STATUSBEGREPP: Record<Status, string> = { gron: "i-fas", gul: "bevaka", rod: "avvikelse" };

/** Primärkällorna: kapitlets källförteckning, annars indikatorernas egna källor. */
function primarkallor(kap: KapitelModell): KallaRef[] {
  if (kap.kallor.length) return kap.kallor;
  const per = new Map<string, KallaRef>();
  for (const k of kap.kpier) {
    if (!k.kalla) continue;
    const { kolada_kalla: _kolada, ...kalla } = k.kalla;
    const finns = per.get(kalla.namn);
    per.set(kalla.namn, { ...kalla, n_indikatorer: (finns?.n_indikatorer ?? 0) + 1 });
  }
  return [...per.values()];
}

export default function OmStatistiken({ kapitel }: OmStatistikenProps): ReactNode {
  const [redan] = useState(() => new Set<string>());
  const begrepp = useMemo(() => begreppIKapitlet(kapitel), [kapitel]);
  const kallor = useMemo(() => primarkallor(kapitel), [kapitel]);
  const rankad = kapitel.kpier.some((k) => k.serier[k.fokus]?.rank !== undefined);
  const intern = kapitel.kpier.some((k) => k.serier[k.fokus]?.tidsserie.some((p) => p.yhat !== undefined));
  const beskrivande = kapitel.kpier.some((k) => k.status === null);
  const statusIntro = [
    rankad && "För indikatorer som jämför regionerna sätts status efter Hallands plats bland de regioner som har ett värde.",
    intern && "I den interna uppföljningen sätts status efter hur värdet förhåller sig till det förväntade intervallet.",
  ].filter(Boolean).join(" ");
  const vag = [
    kallor.length === 1 ? kallor[0].namn : "Primärkällorna",
    ...kapitel.leverans.map((l) => l.namn),
    "rapporten",
  ].join(" › ");

  return (
    <section data-block={KAPITELBLOCK.om} aria-labelledby={RUBRIK_ID}>
      <h2 id={RUBRIK_ID} className={t.avsnittsrubrik}>Om statistiken</h2>

      <div className={s.delar}>
        {kapitel.om_statistiken.length > 0 && (
          <Prosa text={kapitel.om_statistiken.join("\n\n")} redan={redan} className={t.brod} />
        )}

        <div className={s.del}>
          <h3 className={t.blockrubrik}>Så skapas texten</h3>
          <Prosa text={SA_SKAPAS} redan={redan} className={t.brod} />
        </div>

        <div className={s.del}>
          <h3 className={t.blockrubrik}>Så läser du status</h3>
          {statusIntro && <Prosa text={statusIntro} redan={redan} className={t.brod} />}
          <dl className={s.statuslista}>
            {STATUSAR.map((st) => (
              <div key={st} className={s.statusrad}>
                <dt><StatusMarkor status={st} /></dt>
                <dd>{hittaBegrepp(BEGREPP, STATUSBEGREPP[st])?.kort}</dd>
              </div>
            ))}
            {beskrivande && (
              <div className={s.statusrad}>
                <dt className={s.beskrivande}>beskrivande mått</dt>
                <dd>{hittaBegrepp(BEGREPP, "beskrivande-matt")?.kort}</dd>
              </div>
            )}
          </dl>
          <p className={t.granssnitt}>
            <Lank till={{ sida: "begrepp" }} className={t.lank}>Alla begrepp i begreppslistan</Lank>
          </p>
        </div>

        {begrepp.length > 0 && (
          <div className={s.del}>
            <h3 className={t.blockrubrik}>Begrepp i kapitlet</h3>
            <dl className={s.begrepp}>
              {begrepp.map((b) => (
                <div key={b.id} className={s.begreppsrad}>
                  <dt>
                    <Lank till={{ sida: "begrepp", id: b.id }} className={t.lank}>{b.term}</Lank>
                  </dt>
                  <dd>{b.kort}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {kallor.length > 0 && (
          <div className={s.del}>
            <h3 className={t.blockrubrik}>Källor och leveranskedja</h3>
            <ul className={s.kallor}>
              {kallor.map((k) => <KallaPost key={k.namn} kalla={k} />)}
            </ul>
            <p className={t.granssnitt}>
              <span className={s.vagEtikett}>Vägen till rapporten: </span>
              {vag}
            </p>
            {kapitel.leverans.length > 0 && (
              <ul className={s.kallor}>
                {kapitel.leverans.map((k) => <KallaPost key={k.namn} kalla={k} />)}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function KallaPost({ kalla }: { kalla: KallaRef }) {
  const meta = [
    kalla.huvudman,
    kalla.typ,
    kalla.n_indikatorer ? `${kalla.n_indikatorer} ${kalla.n_indikatorer === 1 ? "indikator" : "indikatorer"}` : "",
  ].filter(Boolean).join(" · ");
  return (
    <li className={s.kalla}>
      <p className={t.etikett}>
        {kalla.url ? <a className={t.lank} href={kalla.url} target="_blank" rel="noreferrer">{kalla.namn}</a> : kalla.namn}
      </p>
      {meta && <p className={t.not}>{meta}</p>}
      {kalla.om && <p className={`${t.granssnitt} ${s.om}`}>{kalla.om}</p>}
    </li>
  );
}
