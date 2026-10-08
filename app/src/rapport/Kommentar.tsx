// rapport/Kommentar.tsx: verksamhetens kommentar (stilguiden 4.4). Ägare: WP9.
//
// Visas bara när en kommentar finns, i samma ram som AI-analysen (Textram,
// 2026-10-08): etiketten "Verksamhetens kommentar", vem och när ("Robin R,
// uppdaterad 16 juni 2026") och texten som löptext. Titeln blir kommentarens
// rubrik, rader som börjar med "## " mellanrubriker och rader med "- " punkter.
// Det fiktiva exemplet, när ett finns, står alltid först, märkt "Fiktivt
// exempel" och utan redigering (data/exempelkommentarer.ts); egna kommentarer
// står efter. I redigeringsläget (route.red) finns "Lägg till kommentar",
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
import { EXEMPEL_PREFIX, EXEMPELKOMMENTARER } from "../data/exempelkommentarer";
import Textram from "./Textram";

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

type Stycke = { typ: "rubrik" | "text"; text: string } | { typ: "lista"; punkter: string[] };

/**
 * Kommentarens stycken (åtskilda av tomrad). En rad som börjar med "#" eller
 * "##" är en rubrik; texten under den i samma stycke blir ett eget stycke.
 * Ett stycke där alla rader börjar med "- " är en punktlista.
 */
function stycken(text: string): Stycke[] {
  const ut: Stycke[] = [];
  for (const stycke of text.split(/\n\s*\n/)) {
    const rader = stycke.trim().split("\n");
    const m = /^#{1,3}\s+(.*)$/.exec(rader[0] ?? "");
    if (m) {
      ut.push({ typ: "rubrik", text: m[1].trim() });
      rader.shift();
    }
    if (rader.length && rader.every((r) => /^-\s+/.test(r.trim()))) {
      ut.push({ typ: "lista", punkter: rader.map((r) => r.trim().replace(/^-\s+/, "")) });
      continue;
    }
    const rest = rader.join("\n").trim();
    if (rest) ut.push({ typ: "text", text: rest });
  }
  return ut;
}

const nyttId = () => `kommentar-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

// ── Komponenten ──

export default function Kommentar({ vy, targetId, redigera }: KommentarProps): ReactNode {
  const nyckel = `${vy}:${targetId}`;
  const json = useSyncExternalStore(prenumerera, () => lasJson(nyckel), () => "[]");
  // De egna kommentarerna (webbläsarens lager); redigering och borttagning gäller bara dem
  const block: Block[] = JSON.parse(json);
  // Det fiktiva exemplet (data/exempelkommentarer.ts) står alltid först och går inte att ändra
  const exempel = EXEMPELKOMMENTARER[nyckel] ?? [];
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

  if (!block.length && !exempel.length && !redigera) return null;

  return (
    <div className={s.kommentar} data-kommentar={targetId}>
      {[...exempel, ...block].map((b) =>
        redigerar === b.id && redigera ? (
          <Redigering key={b.id} block={b} onSpara={spara} onAvbryt={() => setRedigerar(null)} />
        ) : (
          <div key={b.id} className={s.post}>
            <Textram
              ikon="kommentar"
              etikett="Verksamhetens kommentar"
              markering={b.id.startsWith(EXEMPEL_PREFIX) ? "Fiktivt exempel" : undefined}
              uppgifter={[b.author, b.timestamp ? `${b.author ? "uppdaterad" : "Uppdaterad"} ${datum(b.timestamp.slice(0, 10))}` : ""].filter(Boolean).join(", ")}
            >
              {b.title && <h4>{b.title}</h4>}
              {stycken(b.text).map((st, i) =>
                st.typ === "rubrik" ? <h5 key={i}>{st.text}</h5>
                : st.typ === "lista" ? <ul key={i} className={t.brod}>{st.punkter.map((p, j) => <li key={j}>{p}</li>)}</ul>
                : <p key={i} className={t.brod}>{st.text}</p>,
              )}
            </Textram>
            {redigera && !b.id.startsWith(EXEMPEL_PREFIX) && (
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
      <p className={s.tips}>En rad som börjar med <code>##</code> blir en mellanrubrik, en rad som börjar med <code>-</code> en punkt. Tom rad mellan styckena.</p>
      <label className={s.faltetikett} htmlFor={`${id}-signatur`}>Signatur</label>
      <input id={`${id}-signatur`} className={s.falt} value={signatur} onChange={(e) => setSignatur(e.target.value)} />
      <p className={s.knappar}>
        <button type="submit" className={t.knapp}>Spara</button>
        <button type="button" className={t.knapp} onClick={onAvbryt}>Avbryt</button>
      </p>
    </form>
  );
}
