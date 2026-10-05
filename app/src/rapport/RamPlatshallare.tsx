// rapport/RamPlatshallare.tsx: platshållare som ramen visar medan sidorna i
// andra paket är stubbar (StartSida WP11, KapitelSida och Sammanfattning WP9,
// BegreppSida WP5). Stubbgrans fångar stubbens "Ej byggd"-fel och visar
// platshållaren; när paketet är sammanslaget visas den riktiga sidan utan
// ändring i App.tsx. Platshållaren för kapitlet har samma data-block som
// rapportsidan ska ha (avsnitt, indikatorer, KAPITELBLOCK), så att rullning,
// läsposition och innehållsförteckning kan provas på riktigt. Ägare: WP6.
// Raderas när WP9 och WP11 är sammanslagna (sidan "Så läser du rapporten"
// saknar ägare och står kvar här tills vidare).

import { Component, type ReactNode } from "react";
import type { KapitelModell, KpiModell, Status, VyId } from "../data/modell";
import { standardHojd, tema } from "../design/tema";
import Lank from "../nav/Lank";
import { KAPITELBLOCK, STANDARDVY } from "../nav/route";
import type { KapitelIndex } from "./ramData";
import { vyForKapitel } from "./ramData";
import { byggDisposition, type DispIndikator } from "./ramDisposition";
import TidsupplosningVal from "./TidsupplosningVal";
import s from "./RamPlatshallare.module.css";

// ════════════════════════════════════════════════════════════
//  Felgräns för stubbar
// ════════════════════════════════════════════════════════════

interface StubbgransProps {
  ersattning: ReactNode;
  children: ReactNode;
}

/** Visar `ersattning` när barnet är en stubb som kastar "Ej byggd". Andra fel visas som fel. */
export class Stubbgrans extends Component<StubbgransProps, { fel: Error | null }> {
  state: { fel: Error | null } = { fel: null };

  static getDerivedStateFromError(fel: unknown) {
    return { fel: fel instanceof Error ? fel : new Error(String(fel)) };
  }

  render() {
    const { fel } = this.state;
    if (!fel) return this.props.children;
    if (fel.message.startsWith("Ej byggd")) return this.props.ersattning;
    return <p role="alert" className={s.fel}>Något gick fel: {fel.message}</p>;
  }
}

/** Laddar eller fel. */
export function Laddar({ fel, text = "Laddar …" }: { fel?: string | null; text?: string }) {
  return fel ? (
    <p role="alert" className={s.fel}>Kunde inte ladda rapporten: {fel}</p>
  ) : (
    <p role="status" className={s.laddar}>{text}</p>
  );
}

const ANALYS: Record<VyId, string> = {
  dag: "Daglig analys",
  vecka: "Veckoanalys",
  manad: "Månadsanalys",
  kvartal: "Kvartalsanalys",
  ar: "Årsanalys",
};

const STATUSORD: Record<Status, string> = { gron: "I fas", gul: "Bevaka", rod: "Avvikelse" };

// ════════════════════════════════════════════════════════════
//  Startsidan (WP11)
// ════════════════════════════════════════════════════════════

export function StartPlatshallare({ index }: { index: KapitelIndex | null }) {
  return (
    <div className={s.startsida} data-platshallare="start">
      <p className={s.kicker}>Region Halland · Analys</p>
      <h1 className={s.titel}>Hälso- och sjukvården i Halland</h1>
      <p className={s.ingress}>Platshållare för startsidan tills WP11 är klar. Välj ett kapitel.</p>
      <ol className={s.kapitellista}>
        {index?.kapitel.map((k, i) => (
          <li key={k.id}>
            <Lank till={{ sida: "kapitel", id: k.id, vy: vyForKapitel(index, k.id, STANDARDVY) ?? STANDARDVY }} className={s.kapitellank} data-kapitel={k.id}>
              <span className={s.nr}>{i + 1}</span> {k.namn}
            </Lank>
          </li>
        ))}
      </ol>
      <p className={s.lankrad}>
        <Lank till={{ sida: "sammanfattning", vy: STANDARDVY }} className={s.lank}>Sammanfattning</Lank>
        <span className={s.skiljare} aria-hidden="true"> · </span>
        <Lank till={{ sida: "begrepp" }} className={s.lank}>Begrepp</Lank>
        <span className={s.skiljare} aria-hidden="true"> · </span>
        <Lank till={{ sida: "las" }} className={s.lank}>Så läser du rapporten</Lank>
      </p>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  Kapitlet (WP9)
// ════════════════════════════════════════════════════════════

export interface KapitelPlatshallareProps {
  kapitel: KapitelModell;
  vy: VyId;
  vyer: VyId[];
  period?: string;
  onVy(vy: VyId): void;
}

export function KapitelPlatshallare({ kapitel, vy, vyer, period, onVy }: KapitelPlatshallareProps) {
  const d = byggDisposition(kapitel);
  const kpier = new Map(kapitel.kpier.map((k) => [k.id, k]));
  const antal = kapitel.avsnitt.length
    ? `${kapitel.kpier.length} indikatorer i ${kapitel.avsnitt.length} avsnitt`
    : `${kapitel.kpier.length} indikatorer`;
  const indikator = (x: DispIndikator) => <IndikatorPlats key={x.id} x={x} kpi={kpier.get(x.id)} />;

  return (
    <article className={s.kapitel} data-platshallare="kapitel">
      <header className={s.masthead}>
        <p className={s.kicker}>Platshållare för kapitelsidan</p>
        <h1 className={s.titel}>{kapitel.namn}</h1>
        <p className={s.dek}>
          Kapitelsidan byggs i WP9. Ramen runt den, innehållsförteckningen, positionsraden och adresserna är de riktiga.
        </p>
        <div className={s.metarad}>
          <span>{`${ANALYS[vy]} ${period ?? ""}`.trim()}</span>
          <span className={s.skiljare} aria-hidden="true">·</span>
          <span>{antal}</span>
          <TidsupplosningVal vyer={vyer} aktiv={vy} onByt={onVy} />
        </div>
      </header>

      {d.fore.map((b) => (
        <section key={b.id} data-block={b.id} className={s.block}>
          <h2 className={s.blockrubrik}>{b.namn}</h2>
          {b.id === KAPITELBLOCK.laget && (
            <ol className={s.oversikt}>
              {kapitel.kpier.map((k) => (
                <li key={k.id}>
                  <Lank till={{ sida: "kapitel", id: kapitel.id, vy, i: k.id }} className={s.lank}>{k.namn}</Lank>
                  {k.status && <span className={s.status}>{STATUSORD[k.status]}</span>}
                </li>
              ))}
            </ol>
          )}
        </section>
      ))}

      {d.avsnitt.map((a) => (
        <section key={a.id} data-block={a.id} className={s.avsnitt}>
          <h2 className={s.avsnittsrubrik}><span className={s.nr}>{a.nummer}</span> {a.namn}</h2>
          {a.indikatorer.map(indikator)}
        </section>
      ))}
      {d.indikatorer.map(indikator)}

      {d.efter.map((b) => (
        <section key={b.id} data-block={b.id} className={s.block}>
          <h2 className={s.avsnittsrubrik}>{b.namn}</h2>
          {(kapitel.om_statistiken.length ? kapitel.om_statistiken : ["Metod, begrepp och källor för kapitlet."]).map((p, i) => (
            <p key={i} className={s.brod}>{p}</p>
          ))}
        </section>
      ))}
    </article>
  );
}

function IndikatorPlats({ x, kpi }: { x: DispIndikator; kpi?: KpiModell }) {
  return (
    <section data-block={x.id} className={s.indikator}>
      <h3 className={s.indikatorrubrik}><span className={s.nr}>{x.nummer}</span> {x.namn}</h3>
      {kpi?.analystext && <p className={s.brod}>{kpi.analystext}</p>}
      <div className={s.figur} style={{ minHeight: standardHojd(tema.matt.figur) }} aria-hidden="true">Figur</div>
    </section>
  );
}

// ════════════════════════════════════════════════════════════
//  Sammanfattning (WP9), begrepp (WP5), så läser du rapporten
// ════════════════════════════════════════════════════════════

export function SammanfattningPlatshallare({ kapitel, vy }: { kapitel: KapitelModell[]; vy: VyId }) {
  return (
    <article className={s.kapitel} data-platshallare="sammanfattning">
      <header className={s.masthead}>
        <p className={s.kicker}>Platshållare för sammanfattningen</p>
        <h1 className={s.titel}>Sammanfattning</h1>
        <p className={s.dek}>Sammanfattningen byggs i WP9.</p>
      </header>
      {kapitel.map((k, i) => (
        <section key={k.id} className={s.block} data-block={k.id}>
          <h2 className={s.avsnittsrubrik}><span className={s.nr}>{i + 1}</span> {k.namn}</h2>
          <p className={s.brod}>
            <Lank till={{ sida: "kapitel", id: k.id, vy }} className={s.lank}>Läs kapitlet</Lank>
          </p>
        </section>
      ))}
    </article>
  );
}

export function BegreppPlatshallare({ id }: { id?: string }) {
  return (
    <article className={s.kapitel} data-platshallare="begrepp">
      <header className={s.masthead}>
        <p className={s.kicker}>Platshållare för begreppslistan</p>
        <h1 className={s.titel}>Begrepp</h1>
        <p className={s.dek}>Begreppslistan byggs i WP5.</p>
      </header>
      {id && (
        <section className={s.block} data-block={id}>
          <h2 className={s.blockrubrik}>{id}</h2>
        </section>
      )}
    </article>
  );
}

export function LasPlatshallare() {
  return (
    <article className={s.kapitel} data-platshallare="las">
      <header className={s.masthead}>
        <h1 className={s.titel}>Så läser du rapporten</h1>
        <p className={s.dek}>Läsanvisningen är inte skriven än.</p>
      </header>
    </article>
  );
}
