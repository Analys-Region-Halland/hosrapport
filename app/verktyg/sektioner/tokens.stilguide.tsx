// tokens.stilguide.tsx: färgerna i design/tema.ts (stilguiden 2.1–2.3 och 6.4).
// Allt läses ur tema.ts: textfärger, diagramfärger, statusfärger, diagramrollerna
// med sin bredd och streckning, och längst ned alla värden i tema.ts. Texten
// "används till" och kontrolltalen kommer ur docs/stilguide.md, och skillnader
// mellan dokumentet och koden listas överst. Ägare: WP7.

import type { ReactNode } from "react";
import type { Status } from "../../src/data/modell";
import { kontrast } from "../../src/design/kontrast";
import { tema } from "../../src/design/tema";
import { Blockrubrik, Dek, Kod, Not, Notis, StatusChip, StatusPrick, Tabell, Underrubrik } from "./delar";
import { hexIText, radFor, rensa, statusEtikett, stilguideTabell } from "./stilguide-md";
import { arFarg, cssVariabel, kravText, kvot, lov, svTal, tokennamn, tokenvarde, VARIABLER, VARIABLER_MOBIL } from "./tokenhjalp";
import s from "./tokens.module.css";

export const id = "tokens";
export const rubrik = "Färg";
export const ordning = 21;

const { farg } = tema;
const T21 = stilguideTabell("2.1");
const T22 = stilguideTabell("2.2");
const T23 = stilguideTabell("2.3");

const kolumn = (rad: Record<string, string> | undefined, borjan: string) =>
  rad ? Object.entries(rad).find(([k]) => k.startsWith(borjan))?.[1] ?? "" : "";

// ── Jämförelse mot docs/stilguide.md ──

function jamfor(): { jamforda: number; avvikelser: string[]; cssFynd: string[] } {
  const avvikelser: string[] = [];
  let jamforda = 0;
  const kollaFarg = (token: string, md: string[], tabell: string) => {
    const v = tokenvarde(token.split("."));
    const kod = (Array.isArray(v) ? v : [v]).map((x) => String(x).toUpperCase());
    if (v === undefined) { avvikelser.push(`${token} står i stilguiden ${tabell} men finns inte i tema.ts.`); return; }
    jamforda += md.length;
    if (md.join(",") !== kod.join(",")) avvikelser.push(`${token}: stilguiden ${tabell} säger ${md.join(", ")}, tema.ts har ${kod.join(", ")}.`);
  };
  for (const rad of T21?.rader ?? []) {
    const token = rensa(rad.Token);
    kollaFarg(token, hexIText(rad["Värde"]), "2.1");
    const md = kolumn(rad, "Kontrast").match(/\d+,\d/g);
    const v = tokenvarde(token.split("."));
    if (md?.length === 2 && arFarg(v)) {
      jamforda += 2;
      const kod = [kvot(v, farg.papper), kvot(v, farg.yta)].map((k) => k.replace(":1", ""));
      if (md.join("/") !== kod.join("/")) avvikelser.push(`${token}: stilguiden 2.1 anger kontrasten ${md.join(" / ")}, uträknat ${kod.join(" / ")}.`);
    }
  }
  for (const rad of T22?.rader ?? []) kollaFarg(rensa(rad.Token), hexIText(rad["Värde"]), "2.2");
  for (const rad of T23?.rader ?? []) {
    const st = rensa(rad.Status);
    for (const del of ["markor", "text", "botten"]) kollaFarg(`farg.status.${st}.${del}`, hexIText(kolumn(rad, del)), "2.3");
    const md = kolumn(rad, "Chiptext").match(/\d+,\d/)?.[0];
    const f = (farg.status as Record<string, { text: string; botten: string }>)[st];
    if (md && f) {
      jamforda++;
      const kod = kvot(f.text, f.botten).replace(":1", "");
      if (md !== kod) avvikelser.push(`farg.status.${st}: stilguiden 2.3 anger chiptexten ${md}:1, uträknat ${kod}:1.`);
    }
  }
  // Färger i tema.ts som stilguiden inte nämner
  const namnda = new Set([...(T21?.rader ?? []), ...(T22?.rader ?? [])].map((r) => rensa(r.Token)));
  for (const l of lov(farg, ["farg"])) {
    if (l.sokvag[1] === "status") continue;
    const token = (/^\d+$/.test(l.sokvag[l.sokvag.length - 1]) ? l.sokvag.slice(0, -1) : l.sokvag).join(".");
    if (!namnda.has(token)) avvikelser.push(`${token} finns i tema.ts men inte i stilguiden 2.1 eller 2.2.`);
  }
  // CSS-variabler med tal utan enhet där tema.ts menar px (alla mått i komponent, matt och rum är px)
  const cssFynd = Object.entries(VARIABLER)
    .filter(([namn, varde]) => /^-?\d+(\.\d+)?$/.test(varde) && /^--(komponent|matt|rum)-/.test(namn))
    .map(([namn, varde]) => `${namn} är ${varde} utan enhet: tema-css.ts behandlar nyckeln som enhetslös, så variabeln fungerar inte som längd.`);
  return { jamforda, avvikelser: [...new Set(avvikelser)], cssFynd };
}

// ── Färgprov ──

function Fargprov({ sokvag, hex, text }: { sokvag: string[]; hex: string; text?: string }) {
  const variabel = cssVariabel(sokvag);
  const mot = [farg.papper, farg.yta].filter((b) => b.toUpperCase() !== hex.toUpperCase());
  const lagst = Math.min(...mot.map((b) => kontrast(hex, b)));
  return (
    <li className={s.prov}>
      <span className={s.yta} style={{ background: variabel ? `var(${variabel})` : hex }} />
      <span className={s.provNamn}>{tokennamn(sokvag)}</span>
      <span className={s.provRad}>{hex}{variabel && <> · <Kod>{variabel}</Kod></>}</span>
      {mot.length === 2 && <span className={s.provRad}>Mot papper {kvot(hex, farg.papper)} · mot yta {kvot(hex, farg.yta)}</span>}
      {mot.length === 1 && <span className={s.provRad}>Mot {mot[0] === farg.yta ? "yta" : "papper"} {kvot(hex, mot[0])}</span>}
      {mot.length > 0 && <span className={s.provRad}>{kravText(lagst)}</span>}
      {text && <span className={s.provText}>{text}</span>}
    </li>
  );
}

const anvandning = (token: string) =>
  rensa(radFor(T21, "Token", token)?.["Används till"] ?? radFor(T22, "Token", token)?.["Roll"] ?? "");

// ── Diagramroller (stilguiden 6.4) ──

type Roll = (typeof tema.diagram.roll)[keyof typeof tema.diagram.roll];

/** Färgtoken för en roll: farg.diagram.{roll} om den finns, annars den färg i farg som har samma värde. */
function rollensFargtoken(namn: string, f: string): string {
  if (namn in farg.diagram) return `farg.diagram.${namn}`;
  const traff = lov(farg, ["farg"]).find((l) => l.varde === f);
  return traff ? tokennamn(traff.sokvag) : f;
}

function Rollprov({ namn, roll }: { namn: string; roll: Roll }) {
  const b = tema.rum[10];
  const h = tema.rum[6];
  const m = h / 2;
  const farger: readonly string[] = typeof roll.farg === "string" ? [roll.farg] : roll.farg;
  const del = b / farger.length;
  const streck = roll.streck ?? undefined;
  const r = roll.punktradie;
  return (
    <svg className={s.rollSvg} width={b} height={h} viewBox={`0 0 ${b} ${h}`} aria-hidden="true">
      {namn === "forvantat" ? (
        <>
          <rect x={0} y={m - tema.rum[2]} width={b - tema.rum[6]} height={tema.rum[4]} fill={farger[0]} />
          <Markor x={b - tema.rum[4]} y={m - tema.rum[1]} storlek={tema.diagram.roll.forvantat.markor} farg={tema.diagram.avvikelse.utanfor} form="triangel" />
          <Markor x={b - tema.rum[1]} y={m + tema.rum[1]} storlek={tema.diagram.roll.forvantat.markor} farg={tema.diagram.avvikelse.langtUtanfor} form="romb" />
        </>
      ) : farger.map((f, i) => (
        <g key={f}>
          <line x1={i * del + (i ? tema.rum[1] : 0)} x2={(i + 1) * del - r} y1={m} y2={m} stroke={f} strokeWidth={roll.bredd}
            strokeDasharray={streck} />
          {r > 0 && <circle cx={(i + 1) * del - r} cy={m} r={r} fill={f} />}
        </g>
      ))}
    </svg>
  );
}

function Markor({ x, y, storlek, farg: f, form }: { x: number; y: number; storlek: number; farg: string; form: "triangel" | "romb" }) {
  const h = storlek / 2;
  const d = form === "triangel"
    ? `M${x},${y - h} L${x + h},${y + h} L${x - h},${y + h} Z`
    : `M${x},${y - h} L${x + h},${y} L${x},${y + h} L${x - h},${y} Z`;
  return <path d={d} fill={f} />;
}

function linjetext(roll: Roll): string {
  if (roll.bredd === 0) return "yta, ingen linje";
  return `${svTal(roll.bredd)} px ${roll.streck ? `streckad ${roll.streck}` : "heldragen"}`;
}

function Rollrad({ namn, roll }: { namn: string; roll: Roll }) {
  const farger: readonly string[] = typeof roll.farg === "string" ? [roll.farg] : roll.farg;
  const token = rollensFargtoken(namn, farger[0]);
  const extra = Object.entries(roll).filter(([k]) => !["farg", "bredd", "streck", "punktradie"].includes(k));
  return (
    <li className={s.roll}>
      <Rollprov namn={namn} roll={roll} />
      <div className={s.rollText}>
        <p className={s.rollNamn}>diagram.roll.{namn}</p>
        <p className={s.provRad}>
          {linjetext(roll)}
          {roll.punktradie > 0 && ` · slutpunkt r ${svTal(roll.punktradie)}`}
          {extra.map(([k, v]) => ` · ${k} ${typeof v === "number" ? svTal(v) : String(v)}`).join("")}
        </p>
        <p className={s.provRad}>
          {token}{farger.length > 1 ? ` (${farger.length} färger)` : ""} · mot yta {farger.map((f) => kvot(f, farg.yta)).join(", ")}
        </p>
        {anvandning(token) && <p className={s.provText}>{anvandning(token)}</p>}
      </div>
    </li>
  );
}

/** Rutnät, axel, nollinje, seriebrott, kopplingslinje och hjälplinje med sina värden ur tema.diagram. */
function Strecken() {
  const d = tema.diagram;
  const b = tema.rum[10];
  const h = tema.rum[6];
  const m = h / 2;
  const prov: { namn: string; text: string; rita: ReactNode }[] = [
    {
      namn: "diagram.rutnat", text: `${svTal(d.rutnat.bredd)} px streckad ${d.rutnat.streck}, farg.diagram.rutnat`,
      rita: <line x1={0} x2={b} y1={m} y2={m} stroke={farg.diagram.rutnat} strokeWidth={d.rutnat.bredd} strokeDasharray={d.rutnat.streck} />,
    },
    {
      namn: "diagram.xAxel", text: `baslinje ${svTal(d.xAxel.baslinje)} px, streck ${svTal(d.xAxel.streckLangd)} px nedåt, farg.diagram.rutnat`,
      rita: (
        <g stroke={farg.diagram.rutnat} strokeWidth={d.xAxel.baslinje}>
          <line x1={0} x2={b} y1={m} y2={m} />
          {[0.1, 0.5, 0.9].map((a) => <line key={a} x1={b * a} x2={b * a} y1={m} y2={m + d.xAxel.streckLangd} />)}
        </g>
      ),
    },
    {
      namn: "diagram.nollinje", text: `${svTal(d.nollinje)} px, farg.diagram.nollinje`,
      rita: <line x1={0} x2={b} y1={m} y2={m} stroke={farg.diagram.nollinje} strokeWidth={d.nollinje} />,
    },
    {
      namn: "diagram.seriebrott", text: `${svTal(d.seriebrott.langd)} px streck, ${svTal(d.seriebrott.bredd)} px, farg.text3`,
      rita: (
        <g>
          <line x1={0} x2={b} y1={m} y2={m} stroke={farg.diagram.rutnat} strokeWidth={d.xAxel.baslinje} />
          <line x1={b / 2} x2={b / 2} y1={m - d.seriebrott.langd / 2} y2={m + d.seriebrott.langd / 2} stroke={farg.text3} strokeWidth={d.seriebrott.bredd} />
        </g>
      ),
    },
    {
      namn: "diagram.kopplingslinje", text: `${svTal(d.kopplingslinje.bredd)} px, farg.diagram.anslutning, vågrät–lodrät–vågrät`,
      rita: (
        <path d={`M0,${h - tema.rum[1]} H${b / 2} V${tema.rum[1]} H${b}`} fill="none" stroke={d.kopplingslinje.farg}
          strokeWidth={d.kopplingslinje.bredd} />
      ),
    },
    {
      namn: "diagram.hjalplinje", text: `${svTal(d.hjalplinje.bredd)} px farg.text3, opacitet ${svTal(d.hjalplinje.opacitet)}`,
      rita: <line x1={b / 2} x2={b / 2} y1={0} y2={h} stroke={farg.text3} strokeWidth={d.hjalplinje.bredd} strokeOpacity={d.hjalplinje.opacitet} />,
    },
  ];
  return (
    <ul className={s.roller}>
      {prov.map((p) => (
        <li key={p.namn} className={s.roll}>
          <svg className={s.rollSvg} width={b} height={h} viewBox={`0 0 ${b} ${h}`} aria-hidden="true">{p.rita}</svg>
          <div className={s.rollText}>
            <p className={s.rollNamn}>{p.namn}</p>
            <p className={s.provRad}>{p.text}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

// ── Sektionen ──

export function Sektion() {
  const { jamforda, avvikelser, cssFynd } = jamfor();
  const grund = lov(farg, ["farg"]).filter((l) => l.sokvag.length === 2 && arFarg(l.varde));
  const diagram = lov(farg.diagram, ["farg", "diagram"]).filter((l) => arFarg(l.varde));
  const statusar = Object.entries(farg.status) as [Status, (typeof farg.status)[Status]][];
  const alla = lov(tema);

  return (
    <>
      <Dek>Alla färger i design/tema.ts med värde, CSS-variabel och uträknad kontrast mot papper och yta.</Dek>
      {avvikelser.length > 0 ? (
        <Notis rubrik={`${avvikelser.length} skillnader mellan tema.ts och docs/stilguide.md`}>
          <ul>{avvikelser.map((a) => <li key={a}>{a}</li>)}</ul>
        </Notis>
      ) : (
        <Not>Färgerna i tema.ts och docs/stilguide.md stämmer överens: {jamforda} värden jämförda.</Not>
      )}
      {cssFynd.length > 0 && (
        <Notis rubrik={`${cssFynd.length} CSS-variabler saknar enhet`}>
          <ul>{cssFynd.map((a) => <li key={a}>{a}</li>)}</ul>
        </Notis>
      )}

      <Underrubrik id="tokens-grund">Grundfärger</Underrubrik>
      <Not>
        Texten ska klara 4,5:1 mot både papper och yta. Den lägsta tillåtna textfärgen är farg.text3. Beskrivningarna kommer ur
        stilguiden 2.1.
      </Not>
      <ul className={s.prover}>
        {grund.map((l) => <Fargprov key={l.sokvag.join(".")} sokvag={l.sokvag} hex={String(l.varde)} text={anvandning(l.sokvag.join("."))} />)}
      </ul>

      <Underrubrik id="tokens-diagram">Diagramfärger</Underrubrik>
      <Not>Allt som bär budskapet i en graf ska klara 3:1 mot figurens yta. Kontextlinjerna är medvetet ljusare (stilguiden 2.2).</Not>
      <ul className={s.prover}>
        {diagram.map((l) => {
          const token = (/^\d+$/.test(l.sokvag[l.sokvag.length - 1]) ? l.sokvag.slice(0, -1) : l.sokvag).join(".");
          return <Fargprov key={l.sokvag.join(".")} sokvag={l.sokvag} hex={String(l.varde)} text={anvandning(token)} />;
        })}
      </ul>

      <Underrubrik id="tokens-roller">Diagramroller</Underrubrik>
      <Not>Varje serieroll ritad med sin färg, bredd, streckning och slutpunkt ur tema.diagram.roll (stilguiden 6.4).</Not>
      <ul className={s.roller}>
        {Object.entries(tema.diagram.roll).map(([namn, roll]) => <Rollrad key={namn} namn={namn} roll={roll} />)}
      </ul>
      <Blockrubrik>Axlar, rutnät och hjälplinjer</Blockrubrik>
      <Strecken />

      <Underrubrik id="tokens-status">Statusfärger</Underrubrik>
      <Not>Statusfärg får bara förekomma i statusmarkören, innehållsförteckningens prick, översiktstabellen och punkter utanför förväntat intervall.</Not>
      <ul className={s.statusar}>
        {statusar.map(([st, f]) => (
          <li key={st} className={s.status}>
            <p className={s.statusProv}>
              <StatusChip status={st} etikett={statusEtikett(st)} />
              <span className={s.statusPrick}><StatusPrick status={st} /> {statusEtikett(st)}</span>
            </p>
            <p className={s.rollNamn}>farg.status.{st}</p>
            <p className={s.provRad}>markor {f.markor} · mot papper {kvot(f.markor, farg.papper)} · mot yta {kvot(f.markor, farg.yta)}</p>
            <p className={s.provRad}>text {f.text} på botten {f.botten} · {kvot(f.text, f.botten)}</p>
          </li>
        ))}
      </ul>

      <Underrubrik id="tokens-alla">Alla värden i tema.ts</Underrubrik>
      <Not>
        Varje värde i design/tema.ts och CSS-variabeln som genereras ur det. Värden som byts under brytpunkt.mobil står efter
        snedstrecket.
      </Not>
      <details className={s.alla}>
        <summary>Visa alla {alla.length} värden</summary>
        <Tabell caption="Alla värden i tema.ts" doldCaption kolumner={["Token", "Värde", "CSS-variabel"]}
          rader={alla.map((l) => {
            const v = cssVariabel(l.sokvag);
            return [
              <Kod key="t">{tokennamn(l.sokvag)}</Kod>,
              l.varde === null ? "null" : String(l.varde),
              v ? <Kod key="v">{v}: {VARIABLER[v]}{VARIABLER_MOBIL[v] ? ` / ${VARIABLER_MOBIL[v]}` : ""}</Kod> : "–",
            ];
          })} />
      </details>
    </>
  );
}
