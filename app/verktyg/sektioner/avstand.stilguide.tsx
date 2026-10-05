// avstand.stilguide.tsx: avståndsskalan, närhetsregeln, måtten, brytpunkterna,
// komponentmåtten och rörelsen i design/tema.ts (stilguiden 2.5–2.6). Listorna
// läses ur tema.ts; tabellen för närhetsregeln och beskrivningarna ur
// docs/stilguide.md. Ägare: WP7.

import { useSyncExternalStore } from "react";
import { mediafraga, tema } from "../../src/design/tema";
import { tal } from "../../src/design/format";
import { Blockrubrik, Dek, Kod, Not, Notis, Prosa, Tabell, Underrubrik } from "./delar";
import { exempelInnehall } from "./exempel";
import { rensa, stilguideStycken, stilguideTabell, tokensIText } from "./stilguide-md";
import { cssVariabel, lov, svTal, tokennamn, VARIABLER, VARIABLER_MOBIL } from "./tokenhjalp";
import s from "./avstand.module.css";

export const id = "avstand";
export const rubrik = "Avstånd och mått";
export const ordning = 25;

const STYCKEN = stilguideStycken("2.5");
const NARHET = stilguideTabell("2.5", 0);
const MATT = stilguideTabell("2.5", 1);

type RumNyckel = keyof typeof tema.rum;
const rum = (token: string) => tema.rum[Number(token.replace("rum.", "")) as RumNyckel] as number | undefined;

/** Jämför avståndsskalan och måtten med stilguiden 2.5. */
function jamfor(): { jamforda: number; avvikelser: string[] } {
  const avvikelser: string[] = [];
  let jamforda = 0;
  const skala = STYCKEN.find((r) => r.includes("Avståndsskala")) ?? "";
  const par = [...skala.matchAll(/(\d+)\s*=\s*(\d+)/g)].map((m) => [Number(m[1]), Number(m[2])] as const);
  for (const [steg, px] of par) {
    jamforda++;
    const kod = tema.rum[steg as RumNyckel];
    if (kod !== px) avvikelser.push(`rum.${steg}: stilguiden ${px} px, tema.ts ${kod ?? "saknar"}.`);
  }
  for (const steg of Object.keys(tema.rum)) {
    if (!par.some(([n]) => String(n) === steg)) avvikelser.push(`rum.${steg} finns i tema.ts men inte i stilguidens skala.`);
  }
  for (const rad of MATT?.rader ?? []) {
    const token = rensa(rad.Token);
    const md = rensa(rad["Värde"]).match(/\d+/g)?.map(Number) ?? [];
    const kod = lov(tema.matt).filter((l) => `matt.${l.sokvag[0]}` === token).map((l) => (typeof l.varde === "number" ? l.varde : parseFloat(String(l.varde))));
    jamforda++;
    if (!kod.length) avvikelser.push(`${token} står i stilguiden men finns inte i tema.ts.`);
    else if (md.join(",") !== kod.join(",")) avvikelser.push(`${token}: stilguiden ${md.join(", ")}, tema.ts ${kod.join(", ")}.`);
  }
  return { jamforda, avvikelser };
}

/** Närhetsregelns kvot ur stilguidens tabell: avstånd ovanför mot största avstånd inuti. */
function narhetskvoter(): { niva: string; ovanfor: number; inuti: number; kvot: number }[] {
  const rad = (borjan: string) => NARHET?.rader.find((r) => rensa(r.Mellan).startsWith(borjan));
  const forsta = (r: Record<string, string> | undefined, kolumn: string) => {
    const t = tokensIText(r?.[kolumn] ?? "").map(rum).filter((x): x is number => x !== undefined);
    return t.length ? Math.max(...t) : undefined;
  };
  const ovan = Object.keys(NARHET?.rader[0] ?? {}).find((k) => k.startsWith("Avstånd ovanför")) ?? "";
  const indikator = forsta(rad("Indikator"), ovan);
  const inne = forsta(rad("Inne i en indikator"), ovan);
  const avsnitt = forsta(rad("Avsnitt"), ovan);
  const ut: { niva: string; ovanfor: number; inuti: number; kvot: number }[] = [];
  if (indikator && inne) ut.push({ niva: "Mellan indikatorer, mot största avståndet inne i en indikator", ovanfor: indikator, inuti: inne, kvot: indikator / inne });
  if (avsnitt && indikator) ut.push({ niva: "Mellan avsnitt, mot avståndet mellan indikatorerna i avsnittet", ovanfor: avsnitt, inuti: indikator, kvot: avsnitt / indikator });
  return ut;
}

/** Närhetsregeln ritad: indikatorns delar med avstånden ur stilguidens tabell. */
function Narhetsprov() {
  const rad = (borjan: string) => NARHET?.rader.find((r) => rensa(r.Mellan).startsWith(borjan));
  const ind = rad("Indikator");
  const kolumner = Object.keys(ind ?? {});
  const ovanfor = tokensIText(ind?.[kolumner.find((k) => k.startsWith("Avstånd ovanför")) ?? ""] ?? "")[0];
  const under = [...(ind?.[kolumner.find((k) => k.startsWith("Avstånd under")) ?? ""] ?? "").matchAll(/(\p{L}+)\s+`(rum\.\d+)`/gu)]
    .map((m) => ({ namn: m[1].charAt(0).toUpperCase() + m[1].slice(1), token: m[2] }));
  const inne = tokensIText(rad("Inne i en indikator")?.[kolumner.find((k) => k.startsWith("Avstånd ovanför")) ?? ""] ?? "")[0];
  if (!ovanfor || !under.length || !inne) return null;
  const glapp = (token: string, text: string, stor = false) => (
    <div className={s.glapp} style={{ height: `var(--${token.replace(".", "-")})` }}>
      <span className={stor ? s.glappTextStor : s.glappText}>{text}</span>
    </div>
  );
  return (
    <div className={s.narhet}>
      <div className={s.block}>Föregående indikator, sista delen</div>
      {glapp(ovanfor, `${rum(ovanfor)} px mellan indikatorer (${ovanfor})`, true)}
      <div className={s.block}>Rubrikrad</div>
      {under.map((u) => (
        <div key={u.token + u.namn}>
          {glapp(u.token, `${rum(u.token)} (${u.token})`)}
          <div className={s.block}>{u.namn}</div>
        </div>
      ))}
      {glapp(inne, `${rum(inne)}, största inne i indikatorn (${inne})`)}
      <div className={s.block}>Figur</div>
    </div>
  );
}

const prenumereraRorelse = (byt: () => void) => {
  const m = matchMedia("(prefers-reduced-motion: reduce)");
  m.addEventListener("change", byt);
  return () => m.removeEventListener("change", byt);
};
const lasRorelse = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

const prenumereraBryt = (byt: () => void) => {
  const fragor = Object.values(mediafraga).map((q) => matchMedia(q));
  fragor.forEach((m) => m.addEventListener("change", byt));
  return () => fragor.forEach((m) => m.removeEventListener("change", byt));
};
const lasBryt = () => Object.entries(mediafraga).find(([, q]) => matchMedia(q).matches)?.[0] ?? "";

export function Sektion() {
  const { jamforda, avvikelser } = jamfor();
  const kvoter = narhetskvoter();
  const krav = Number((STYCKEN.find((r) => r.includes("Närhetsregeln")) ?? "").match(/minst\s+(\d+(?:,\d+)?)/)?.[1]?.replace(",", ".") ?? NaN);
  const narhetstext = rensa(STYCKEN.find((r) => r.includes("Närhetsregeln")) ?? "").replace(/\s*Därför:$/, "");
  const reducerad = useSyncExternalStore(prenumereraRorelse, lasRorelse);
  const bryt = useSyncExternalStore(prenumereraBryt, lasBryt);
  const mattLov = lov(tema.matt, ["matt"]);
  const sida = tema.matt.sida;
  let radprov = "Löptexten bryts vid matt.text, så att raden blir 60 till 70 tecken lång.";
  try { radprov = exempelInnehall().brod; } catch { /* exempeldatan saknas */ }

  return (
    <>
      <Dek>Avstånd ersätter linjer och ramar. Skalan, närhetsregeln, måtten och brytpunkterna läses ur tema.ts.</Dek>
      {avvikelser.length > 0 ? (
        <Notis rubrik={`${avvikelser.length} skillnader mellan tema.ts och docs/stilguide.md 2.5`}>
          <ul>{avvikelser.map((a) => <li key={a}>{a}</li>)}</ul>
        </Notis>
      ) : (
        <Not>Avståndsskalan och måtten stämmer med stilguiden 2.5: {jamforda} värden jämförda.</Not>
      )}

      <Underrubrik id="avstand-skala">Avståndsskala</Underrubrik>
      <ol className={s.skala}>
        {Object.entries(tema.rum).map(([steg, px]) => (
          <li key={steg}>
            <span className={s.skalaNamn}>rum.{steg}</span>
            <span className={s.skalaVarde}>{px} px</span>
            <span className={s.skalaVariabel}><Kod>{cssVariabel(["rum", steg])}</Kod></span>
            <span className={s.stapel} aria-hidden="true">
              <i style={{ width: `var(--rum-${steg})` }} />
            </span>
          </li>
        ))}
      </ol>

      <Underrubrik id="avstand-narhet">Närhetsregeln</Underrubrik>
      {narhetstext && <Prosa>{narhetstext}</Prosa>}
      <Narhetsprov />
      {kvoter.length > 0 && (
        <ul className={s.kvoter}>
          {kvoter.map((k) => (
            <li key={k.niva}>
              {k.niva}: {k.ovanfor} / {k.inuti} = {tal(k.kvot, 1)}
              {Number.isFinite(krav) && (k.kvot >= krav ? `, klarar ${svTal(krav)}` : `, under ${svTal(krav)}`)}
            </li>
          ))}
        </ul>
      )}
      {NARHET && (
        <Tabell caption="Avstånd ovanför och under rubriker ur stilguiden 2.5" kolumner={NARHET.kolumner}
          rader={NARHET.rader.map((r) => NARHET.kolumner.map((k) => rensa(r[k])))} />
      )}

      <Underrubrik id="avstand-matt">Mått</Underrubrik>
      <ul className={s.matt}>
        {mattLov.map((l) => {
          const v = cssVariabel(l.sokvag);
          const md = MATT?.rader.find((r) => rensa(r.Token) === l.sokvag.slice(0, 2).join("."));
          const px = typeof l.varde === "number" ? l.varde : null;
          return (
            <li key={l.sokvag.join(".")}>
              <p className={s.mattNamn}>{tokennamn(l.sokvag)} · {px !== null ? `${px} px` : l.varde}</p>
              <p className={s.mattRad}>
                {v ? <Kod>{v}</Kod> : "ingen egen CSS-variabel"}
                {md ? ` · ${rensa(md.Vad)}` : ""}
              </p>
              {px !== null && (
                <span className={s.stapel} aria-hidden="true">
                  <i style={{ width: `calc(100% * ${Math.min(px, sida)} / ${sida})` }} />
                </span>
              )}
              {l.sokvag[1] === "text" && <p className={s.radlangd}>{radprov}</p>}
            </li>
          );
        })}
      </ul>
      <Not>
        <Kod>--matt-marginal</Kod> är {VARIABLER["--matt-marginal"]} och byts till {VARIABLER_MOBIL["--matt-marginal"]} under
        brytpunkt.mobil.
      </Not>

      <Underrubrik id="avstand-brytpunkter">Brytpunkter</Underrubrik>
      <Tabell caption="Brytpunkter i tema.ts" doldCaption kolumner={["Token", "Mediafråga", "Gäller i fönstret nu"]}
        rader={Object.entries(tema.brytpunkt).map(([namn]) => [
          <Kod key="k">brytpunkt.{namn}</Kod>,
          mediafraga[namn as keyof typeof mediafraga] ?? "–",
          bryt === namn ? "ja" : "nej",
        ])} />

      <Underrubrik id="avstand-komponenter">Komponentmått</Underrubrik>
      <Tabell caption="Komponentmått i tema.ts" doldCaption kolumner={["Token", "Värde", "CSS-variabel"]} tal={[1]}
        rader={lov(tema.komponent, ["komponent"]).map((l) => {
          const v = cssVariabel(l.sokvag);
          return [<Kod key="k">{tokennamn(l.sokvag)}</Kod>, String(l.varde), v ? <Kod key="v">{v}: {VARIABLER[v]}</Kod> : "–"];
        })} />

      <Blockrubrik>Rörelse</Blockrubrik>
      <Tabell caption="Rörelse i tema.ts" doldCaption kolumner={["Token", "Värde", "CSS-variabel"]} tal={[1]}
        rader={lov(tema.rorelse, ["rorelse"]).map((l) => [<Kod key="k">{tokennamn(l.sokvag)}</Kod>, `${l.varde} ms`,
          <Kod key="v">{cssVariabel(l.sokvag)}</Kod>])} />
      <Not>
        Bara opacitet när popover och tooltip visas. Webbläsaren ber {reducerad ? "om" : "inte om"} reducerad rörelse just nu
        {reducerad ? ", så variablerna är 0 ms" : ""}.
      </Not>
    </>
  );
}
