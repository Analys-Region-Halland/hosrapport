// rapport/Kommentar.tsx: verksamhetens kommentar (stilguiden 4.4). Ägare: WP9.
//
// Visas bara när en kommentar finns, som ett kort (2026-10-08): vit yta med
// grön vänsterkant, överst en pratbubbla och "Verksamhetens kommentar", texten
// i typ.roll.brod och sist en fot med vem som skrev (initialerna i en rund
// bricka och namnet) och när ("Uppdaterad 16 juni 2026"). I redigeringsläget (route.red) finns "Lägg till kommentar",
// "Redigera" och "Ta bort". Kommentarerna lagras som i dag via stores/blocks.ts
// under nyckeln `${vy}:${targetId}`, så att gamla vyns kommentarer syns här och
// tvärtom. Lagret läses med useSyncExternalStore: ändringar i en annan flik
// (storage-händelsen) och i samma flik (egen signal) slår igenom direkt.

import { useEffect, useId, useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import { datum } from "../design/format";
import { BLOCKS_KEY, getBlocks, getForfattare, setBlocks, setForfattare } from "../stores/blocks";
import { markClean, markDirty } from "../stores/dirty";
import t from "./delat.module.css";
import s from "./Kommentar.module.css";

export interface KommentarProps {
  vy: string;
  /** Indikatorns id (eller annat block). */
  targetId: string;
  redigera: boolean;
}

type Block = Parameters<typeof setBlocks>[1][number];

// ── Lagret som extern källa ──

const egna = new Set<() => void>();

function prenumerera(f: () => void): () => void {
  const vidLagring = (e: StorageEvent) => {
    if (e.key === BLOCKS_KEY || e.key === null) f();
  };
  egna.add(f);
  addEventListener("storage", vidLagring);
  return () => {
    egna.delete(f);
    removeEventListener("storage", vidLagring);
  };
}

/** Blocken för nyckeln som JSON, så att ögonblicksbilden kan jämföras med ===. */
function lasJson(nyckel: string): string {
  try {
    return JSON.stringify(getBlocks(nyckel));
  } catch {
    return "[]";
  }
}

function skriv(nyckel: string, block: Block[]): void {
  try {
    setBlocks(nyckel, block);
  } finally {
    egna.forEach((f) => f());
  }
}

/** "Robin R" → "RR": första bokstaven i de två första orden. */
function initialer(namn: string): string {
  return namn.trim().split(/\s+/).slice(0, 2).map((d) => d[0]?.toUpperCase() ?? "").join("");
}

const nyttId = () => `kommentar-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

// ── Komponenten ──

export default function Kommentar({ vy, targetId, redigera }: KommentarProps): ReactNode {
  const nyckel = `${vy}:${targetId}`;
  const json = useSyncExternalStore(prenumerera, () => lasJson(nyckel), () => "[]");
  const block: Block[] = JSON.parse(json);
  const [redigerar, setRedigerar] = useState<string | null>(null);
  const [ny, setNy] = useState<Block | null>(null);

  const laggTill = () => {
    const b: Block = { id: nyttId(), type: "anteckning", text: "", author: getForfattare(), timestamp: new Date().toISOString() };
    setNy(b);
    setRedigerar(b.id);
  };
  const spara = (b: Block) => {
    const finns = block.some((x) => x.id === b.id);
    skriv(nyckel, finns ? block.map((x) => (x.id === b.id ? b : x)) : [...block, b]);
    setRedigerar(null);
  };
  const taBort = (id: string) => {
    skriv(nyckel, block.filter((x) => x.id !== id));
    setRedigerar(null);
  };

  if (!block.length && !redigera) return null;

  return (
    <div className={s.kommentar} data-kommentar={targetId}>
      {block.map((b) =>
        redigerar === b.id && redigera ? (
          <Redigering key={b.id} block={b} onSpara={spara} onAvbryt={() => setRedigerar(null)} />
        ) : (
          <div key={b.id} className={s.post}>
            <p className={s.rubrik}>
              <svg className={s.ikon} viewBox="0 0 20 20" aria-hidden="true">
                <path d="M3.5 4.5h13a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H9l-4 3v-3H3.5a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z" />
              </svg>
              Verksamhetens kommentar
            </p>
            {b.title && <p className={`${t.brod} ${s.text} ${s.titel}`}>{b.title}</p>}
            {b.text.split(/\n\s*\n/).filter(Boolean).map((stycke, i) => (
              <p key={i} className={`${t.brod} ${s.text}`}>{stycke}</p>
            ))}
            {(b.author || b.timestamp) && (
              <div className={s.fot}>
                {b.author && (
                  <span className={s.vem}>
                    <span className={s.initialer} aria-hidden="true">{initialer(b.author)}</span>
                    <span><span className="visuellt-dold">Skriven av </span>{b.author}</span>
                  </span>
                )}
                {b.timestamp && (
                  <span className={s.nar}>
                    Uppdaterad <time dateTime={b.timestamp.slice(0, 10)}>{datum(b.timestamp.slice(0, 10))}</time>
                  </span>
                )}
              </div>
            )}
            {redigera && (
              <p className={s.knappar}>
                <button type="button" className={t.knapp} onClick={() => setRedigerar(b.id)}>Redigera</button>
                <button type="button" className={t.knapp} onClick={() => taBort(b.id)}>Ta bort</button>
              </p>
            )}
          </div>
        ),
      )}
      {redigera && ny && redigerar === ny.id && (
        <Redigering block={ny} onSpara={spara} onAvbryt={() => setRedigerar(null)} />
      )}
      {redigera && redigerar === null && (
        <p className={s.knappar}>
          <button type="button" className={t.knapp} onClick={laggTill} data-lagg-till="">
            Lägg till kommentar
          </button>
        </p>
      )}
    </div>
  );
}

function Redigering({ block, onSpara, onAvbryt }: { block: Block; onSpara(b: Block): void; onAvbryt(): void }) {
  const [text, setText] = useState(block.text);
  const [signatur, setSignatur] = useState(block.author ?? "");
  const id = useId();
  const andrad = text !== block.text || signatur !== (block.author ?? "");

  // Osparad text: varna innan sidan lämnas, som gamla vyn (stores/dirty.ts)
  useEffect(() => {
    if (!andrad) {
      markClean(block.id);
      return;
    }
    markDirty(block.id);
    const varna = (e: BeforeUnloadEvent) => e.preventDefault();
    addEventListener("beforeunload", varna);
    return () => {
      removeEventListener("beforeunload", varna);
      markClean(block.id);
    };
  }, [andrad, block.id]);

  const skicka = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    if (signatur.trim()) setForfattare(signatur);
    onSpara({ ...block, type: "anteckning", text: text.trim(), author: signatur.trim() || undefined, timestamp: new Date().toISOString() });
  };

  return (
    <form className={s.formular} onSubmit={skicka} data-kommentar-formular="">
      <label className={t.etikett} htmlFor={`${id}-text`}>Verksamhetens kommentar</label>
      <textarea
        id={`${id}-text`}
        className={s.falt}
        rows={4}
        value={text}
        onChange={(e) => setText(e.target.value)}
        autoFocus
      />
      <label className={s.faltetikett} htmlFor={`${id}-signatur`}>Signatur</label>
      <input id={`${id}-signatur`} className={s.falt} value={signatur} onChange={(e) => setSignatur(e.target.value)} />
      <p className={s.knappar}>
        <button type="submit" className={t.knapp}>Spara</button>
        <button type="button" className={t.knapp} onClick={onAvbryt}>Avbryt</button>
      </p>
    </form>
  );
}
