// begrepp/Begrepp.tsx: en begreppsmarkering i text som öppnar popover eller ark
// (stilguiden 5.7). Ägare: WP5.
//
// Markeringen är en riktig <button> som ärver texten, med prickad understrykning
// och `aria-expanded`. Klick, Enter och mellanslag öppnar; hovring gör ingenting.
// Från 640 px öppnas en popover vid termen, under 640 px ett ark från skärmens
// nederkant. Stängning och fokus sköts av ui/Popover och ui/Ark.

import { useId, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { mediafraga } from "../design/tema";
import Ark from "../ui/Ark";
import Popover from "../ui/Popover";
import { BEGREPP, hittaBegrepp, type Begrepp as BegreppTyp } from "./register";
import s from "./Begrepp.module.css";

export interface BegreppProps {
  id: string;
  children: ReactNode;
  /** Register att slå upp i. Förval: hela registret ur innehall/begrepp.json. */
  register?: BegreppTyp[];
}

const prenumerera = (fraga: string) => (andrad: () => void) => {
  const m = window.matchMedia(fraga);
  m.addEventListener("change", andrad);
  return () => m.removeEventListener("change", andrad);
};

/** Sant när mediafrågan gäller. Falskt vid serverrendering. */
function useMediafraga(fraga: string): boolean {
  const prenumeration = useMemo(() => prenumerera(fraga), [fraga]);
  return useSyncExternalStore(
    prenumeration,
    () => window.matchMedia(fraga).matches,
    () => false,
  );
}

export default function Begrepp({ id, children, register = BEGREPP }: BegreppProps): ReactNode {
  const begrepp = hittaBegrepp(register, id);
  const [oppen, setOppen] = useState(false);
  const [knapp, setKnapp] = useState<HTMLButtonElement | null>(null);
  const mobil = useMediafraga(mediafraga.mobil);
  const ytaId = useId();

  if (!begrepp) return <>{children}</>;

  const stang = () => setOppen(false);
  const kortId = `${ytaId}-kort`;
  return (
    <>
      <button
        type="button"
        ref={setKnapp}
        className={s.term}
        aria-expanded={oppen}
        aria-haspopup="dialog"
        aria-controls={oppen ? ytaId : undefined}
        onClick={() => setOppen((o) => !o)}
        data-begrepp={begrepp.id}
      >
        {children}
      </button>
      {mobil ? (
        <Ark oppen={oppen} onStang={stang} etikett={begrepp.term} ankare={knapp} id={ytaId}>
          <BegreppInnehall begrepp={begrepp} onLank={stang} />
        </Ark>
      ) : (
        <Popover oppen={oppen} onStang={stang} ankare={knapp} etikett={begrepp.term} beskrivningId={kortId} id={ytaId}>
          <BegreppInnehall begrepp={begrepp} visaTerm kortId={kortId} onLank={stang} />
        </Popover>
      )}
    </>
  );
}

export interface BegreppInnehallProps {
  begrepp: BegreppTyp;
  /** Termen som rubrik (popovern). Arket visar termen i sin egen rubrik. */
  visaTerm?: boolean;
  kortId?: string;
  onLank?(): void;
}

/** Innehållet i popover och ark: term, kort definition och länk till listan. */
export function BegreppInnehall({ begrepp, visaTerm = false, kortId, onLank }: BegreppInnehallProps) {
  return (
    <div className={s.innehall}>
      {visaTerm && <p className={s.rubrik}>{begrepp.term}</p>}
      <p id={kortId} className={s.kort}>{begrepp.kort}</p>
      {/* Stängningen väntar tills navigeringen till listan har startat. */}
      <a className={s.mer} href={`#/begrepp/${begrepp.id}`} onClick={() => { if (onLank) setTimeout(onLank, 0); }}>
        Mer i begreppslistan
      </a>
    </div>
  );
}
