// typografi.stilguide.tsx: typrollerna i design/tema.ts (stilguiden 2.4), var
// och en med riktigt innehåll ur rapportens data i desktop- och mobilstorlek.
// Rollerna läses ur tema.typ.roll; innehållet per roll ur exempeldatan. Ägare: WP7.

import type { CSSProperties, ReactNode } from "react";
import { tema, type Rollnamn } from "../../src/design/tema";
import { HART, varde as vardeText } from "../../src/design/format";
import { Blockrubrik, Dek, Kod, Not, Notis, Tabell, Underrubrik } from "./delar";
import { exempelInnehall, exempelKapitel, type Innehall } from "./exempel";
import { rensa, stilguideTabell } from "./stilguide-md";
import { cssVariabel, svTal } from "./tokenhjalp";
import s from "./typografi.module.css";

export const id = "typografi";
export const rubrik = "Typografi";
export const ordning = 24;

type Roll = (typeof tema.typ.roll)[Rollnamn];
const T24 = stilguideTabell("2.4");
const T24_REGLER = stilguideTabell("2.4", 1);

const mdRad = (namn: string) => T24?.rader.find((r) => rensa(r.Token) === `typ.roll.${namn}`);
const mdKolumn = (rad: Record<string, string> | undefined, borjan: string) =>
  rad ? Object.entries(rad).find(([k]) => k.startsWith(borjan))?.[1] ?? "" : "";
const lasTal = (t: string) => Number(t.replace("−", "-").replace(",", "."));

/** Jämför storlek, radhöjd, vikt, spärr och mobilstorlek med stilguidens tabell 2.4. */
function jamfor(): { jamforda: number; avvikelser: string[] } {
  const avvikelser: string[] = [];
  let jamforda = 0;
  for (const [namn, roll] of Object.entries(tema.typ.roll) as [Rollnamn, Roll][]) {
    const rad = mdRad(namn);
    if (!rad) { avvikelser.push(`typ.roll.${namn} finns i tema.ts men inte i stilguiden 2.4.`); continue; }
    const desktop = rensa(mdKolumn(rad, "Desktop"));
    const m = desktop.match(/^(\d+)\/([\d.]+),\s*(\d+)(?:\s+eller\s+(\d+))?/);
    const sparr = desktop.match(/spärr\s*([−-]?\d+,\d+)\s*em/);
    const mobil = rensa(mdKolumn(rad, "Mobil"));
    const par: [string, number | undefined, number | undefined][] = [
      ["storlek", m ? Number(m[1]) : undefined, roll.storlek],
      ["radhojd", m ? Number(m[2]) : undefined, roll.radhojd],
      ["vikt", m ? Number(m[3]) : undefined, roll.vikt],
      ["viktStark", m?.[4] ? Number(m[4]) : undefined, "viktStark" in roll ? roll.viktStark : undefined],
      ["sparr", sparr ? lasTal(sparr[1]) : undefined, "sparr" in roll ? roll.sparr : undefined],
      ["mobilstorlek", /^\d+$/.test(mobil) ? Number(mobil) : undefined, roll.mobilstorlek],
    ];
    for (const [nyckel, md, kod] of par) {
      if (md === undefined && kod === undefined) continue;
      jamforda++;
      if (md !== kod) avvikelser.push(`typ.roll.${namn}.${nyckel}: stilguiden ${md ?? "saknar"}, tema.ts ${kod ?? "saknar"}.`);
    }
    if (!rensa(mdKolumn(rad, "Familj")).startsWith(roll.familj)) avvikelser.push(`typ.roll.${namn}.familj skiljer sig från stilguiden.`);
  }
  return { jamforda, avvikelser };
}

function rollstil(roll: Roll, storlek: number, vikt: number = roll.vikt): CSSProperties {
  return {
    fontFamily: tema.typ.familj[roll.familj],
    fontSize: `${storlek}px`,
    lineHeight: roll.radhojd,
    fontWeight: vikt,
    letterSpacing: "sparr" in roll ? `${roll.sparr}em` : undefined,
  };
}

/** Rollens innehåll ur rapporten. Roller som saknas här får en neutral exempeltext. */
const INNEHALL: Partial<Record<string, (i: Innehall) => ReactNode>> = {
  titel: (i) => i.kapitel,
  avsnitt: (i) => <><span className={s.nr}>{i.avsnitt.nr}</span>{i.avsnitt.namn}</>,
  indikator: (i) => <><span className={s.nr}>{i.indikator.nr}</span>{i.indikator.namn}</>,
  ingress: (i) => i.ingress,
  brod: (i) => i.brod,
  figurtitel: (i) => i.figurtitel,
  granssnitt: (i) => (
    <span className={s.nyckeltal}>
      <b>{i.nyckeltal.varde}</b>
      {i.nyckeltal.plats && <><span className={s.sep}> · </span>{i.nyckeltal.plats}</>}
      <span className={s.sep}> · </span>{i.nyckeltal.period}
    </span>
  ),
  not: (i) => i.kalla,
};

function Rollrad({ namn, roll, innehall }: { namn: Rollnamn; roll: Roll; innehall: Innehall | null }) {
  const text = innehall && INNEHALL[namn] ? INNEHALL[namn]!(innehall) : `Exempeltext i rollen ${namn}`;
  const anvands = rensa(mdKolumn(mdRad(namn), "Används"));
  const storlekar = roll.mobilstorlek === roll.storlek
    ? [{ etikett: `Desktop och mobil · ${roll.storlek} px`, storlek: roll.storlek }]
    : [
      { etikett: `Desktop · ${roll.storlek} px`, storlek: roll.storlek },
      { etikett: `Mobil, under ${tema.brytpunkt.mobil.max + 1} px · ${roll.mobilstorlek} px`, storlek: roll.mobilstorlek },
    ];
  const vikter = "viktStark" in roll && namn !== "granssnitt" ? [roll.vikt, roll.viktStark] : [roll.vikt];
  return (
    <li className={s.rad} data-roll={namn}>
      <div className={s.meta}>
        <p className={s.rollNamn}>typ.roll.{namn}</p>
        <p className={s.metaRad}>
          {roll.familj} · {roll.storlek}/{svTal(roll.radhojd)} · vikt {roll.vikt}
          {"viktStark" in roll ? ` och ${roll.viktStark}` : ""}
          {"sparr" in roll ? ` · spärr ${svTal(roll.sparr)} em` : ""}
        </p>
        <p className={s.metaRad}><Kod>{cssVariabel(["typ", "roll", namn, "storlek"])}</Kod></p>
        {anvands && <p className={s.metaText}>{anvands}</p>}
      </div>
      <div className={s.prover}>
        {storlekar.map((st) => vikter.map((v) => (
          <div key={`${st.storlek}-${v}`} className={s.prov}>
            <p className={s.provEtikett}>{st.etikett}{vikter.length > 1 ? ` · vikt ${v}` : ""}</p>
            <p className={namn === "brod" ? s.provTextBrod : s.provText} style={rollstil(roll, st.storlek, v)}>{text}</p>
          </div>
        )))}
      </div>
    </li>
  );
}

export function Sektion() {
  let innehall: Innehall | null = null;
  try { innehall = exempelInnehall(); } catch { innehall = null; }
  const { jamforda, avvikelser } = jamfor();
  const roller = Object.entries(tema.typ.roll) as [Rollnamn, Roll][];
  const t = tema.typ;
  const tal = (() => {
    try {
      const kap = exempelKapitel("ar", "skr-tillganglighet");
      return kap.kpier.slice(0, 6).map((k) => vardeText(k.senaste, { enhet: k.enhet === "procent" ? "procent" : "antal" }));
    } catch { return []; }
  })();
  const not = t.roll.not;

  return (
    <>
      <Dek>
        Två familjer och åtta roller. Varje roll visas med text ur rapporten i desktop- och mobilstorlek, ritad med värdena i
        tema.typ.
      </Dek>
      {avvikelser.length > 0 ? (
        <Notis rubrik={`${avvikelser.length} skillnader mellan tema.typ och docs/stilguide.md 2.4`}>
          <ul>{avvikelser.map((a) => <li key={a}>{a}</li>)}</ul>
        </Notis>
      ) : (
        <Not>Typrollerna stämmer med stilguiden 2.4: {jamforda} värden jämförda.</Not>
      )}
      {!innehall && <Not>Exempeldatan saknas, så rollerna visas med neutral text.</Not>}

      <Underrubrik id="typografi-roller">Roller</Underrubrik>
      <ul className={s.roller}>
        {roller.map(([namn, roll]) => <Rollrad key={namn} namn={namn} roll={roll} innehall={innehall} />)}
      </ul>

      <Underrubrik id="typografi-familjer">Familjer</Underrubrik>
      <ul className={s.familjer}>
        {Object.entries(t.familj).map(([namn, stack]) => (
          <li key={namn}>
            <p className={s.rollNamn}>typ.familj.{namn}</p>
            <p className={s.metaRad}><Kod>{stack}</Kod></p>
            <p className={s.familjProv} style={{ fontFamily: stack, fontSize: `${t.roll.ingress.storlek}px` }}>
              Hälso- och sjukvården i Halland
              <span className={s.siffror}>0123456789 åäö ÅÄÖ −3,2{HART}%</span>
            </p>
          </li>
        ))}
      </ul>

      <Underrubrik id="typografi-detaljer">Detaljer</Underrubrik>
      <dl className={s.detaljer}>
        <div>
          <dt><Kod>typ.kicker</Kod>: not 600, versal, spärr {svTal(t.kicker.sparr)} em, farg.fokus</dt>
          <dd className={s.kicker} style={{ letterSpacing: `${t.kicker.sparr}em` }}>{innehall?.kicker ?? "Region Halland · Analys"}</dd>
        </div>
        <div>
          <dt><Kod>typ.minsta</Kod>: {t.minsta} px, bara seriebrottets och rangordningens etikett</dt>
          <dd style={{ ...rollstil(not, t.minsta), color: "var(--farg-text3)" }}>ny metod · topp 3</dd>
        </div>
        <div>
          <dt><Kod>typ.siffror</Kod>: {t.siffror} i tabeller, nyckeltal och diagram</dt>
          <dd className={s.talkolumn} style={{ fontVariantNumeric: t.siffror }}>
            {tal.map((x, i) => <span key={i}>{x}</span>)}
          </dd>
        </div>
        <div>
          <dt><Kod>typ.lank</Kod>: farg.fokus, understrykning {t.lank.understrykning} px med {t.lank.avstand} avstånd, {t.lank.understrykningHover} px vid hover</dt>
          <dd><a className={s.lank} href="#typografi">Så skapas texten</a></dd>
        </div>
      </dl>

      {T24_REGLER && (
        <>
          <Blockrubrik>Regler</Blockrubrik>
          <Tabell caption="Typografiska regler ur stilguiden 2.4" doldCaption kolumner={T24_REGLER.kolumner}
            rader={T24_REGLER.rader.map((r) => T24_REGLER.kolumner.map((k) => rensa(r[k])))} />
        </>
      )}
    </>
  );
}
