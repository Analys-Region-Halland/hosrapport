// rapport/RamPlatshallare.tsx: platshållare som ramen visar medan sidorna i
// andra paket är stubbar (StartSida WP11, BegreppSida WP5). Stubbgrans fångar
// stubbens "Ej byggd"-fel och visar platshållaren; när paketet är sammanslaget
// visas den riktiga sidan utan ändring i App.tsx. Ägare: WP6.
// Platshållarna för kapitlet och sammanfattningen är borttagna sedan WP9
// byggt de riktiga sidorna. Raderas när WP11 är sammanslaget (sidan "Så läser
// du rapporten" saknar ägare och står kvar här tills vidare).

import { Component, type ReactNode } from "react";
import Lank from "../nav/Lank";
import { KAPITELVY, STANDARDVY } from "../nav/route";
import type { KapitelIndex } from "./ramData";
import { vyForKapitel } from "./ramData";
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
            <Lank till={{ sida: "kapitel", id: k.id, vy: vyForKapitel(index, k.id, KAPITELVY) ?? STANDARDVY }} className={s.kapitellank} data-kapitel={k.id}>
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
//  Begrepp (WP5), så läser du rapporten
// ════════════════════════════════════════════════════════════

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
