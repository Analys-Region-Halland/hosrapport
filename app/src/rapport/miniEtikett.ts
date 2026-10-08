// rapport/miniEtikett.ts: placeringen av första och senaste värdets etikett i
// minigrafen (MiniKurva). Rena funktioner. Tillägg 2026-10-08.
//
// Varje etikett prövas i ett antal lägen kring sin punkt: ovanför och under,
// nära och längre bort, rakt över punkten och förskjuten inåt i grafen. Varje
// läge får en kostnad: utanför ytan, korsar linjen, täcker en punkt eller en
// redan placerad etikett kostar mycket; avstånd från punkten kostar lite. Det
// billigaste läget vinner. Står etiketten en bit från punkten dras en tunn
// connector mellan dem, som kopplingslinjerna i de stora graferna.

export interface Ruta { x0: number; y0: number; x1: number; y1: number }

export interface Placering {
  /** Textens x (ankaret) och baslinje. */
  x: number;
  y: number;
  ruta: Ruta;
  /** Connectorn från punktens kant till etiketten, när etiketten står en bit bort. */
  connector: [number, number, number, number] | null;
}

export interface EtikettFraga {
  punkt: [number, number];
  /** Punktens radie, så att connectorn börjar vid kanten. */
  radie: number;
  bredd: number;
  /** "start": etiketten växer åt höger från punkten (första), "end": åt vänster (sista). */
  ankare: "start" | "end";
}

/** Textens höjd ovanför och under baslinjen (11 px siffror). */
const OVER = 8.5;
const UNDER = 3;
/** Luft kring rutan i kollisionsprovet. */
const LUFT = 2;
/** Längre bort än så från punkten får etiketten en connector. */
const CONNECTOR_FRAN = 7;

/** Baslinjens avstånd från punkten: nära ovanför, nära under, längre bort. */
const DY = [-8, 16, -22, 30, -36, 44];
/** Förskjutning inåt i grafen. */
const DX = [0, 12, 26];

/** Korsar sträckan a–b rutan? (Liang–Barsky.) */
export function strackaKorsar(ax: number, ay: number, bx: number, by: number, r: Ruta): boolean {
  let t0 = 0, t1 = 1;
  const dx = bx - ax, dy = by - ay;
  const prov: [number, number][] = [[-dx, ax - r.x0], [dx, r.x1 - ax], [-dy, ay - r.y0], [dy, r.y1 - ay]];
  for (const [p, q] of prov) {
    if (p === 0) { if (q < 0) return false; continue; }
    const t = q / p;
    if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t; }
    else { if (t < t0) return false; if (t < t1) t1 = t; }
  }
  return true;
}

const overlappar = (a: Ruta, b: Ruta) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
const vidgad = (r: Ruta, d: number): Ruta => ({ x0: r.x0 - d, y0: r.y0 - d, x1: r.x1 + d, y1: r.y1 + d });

/**
 * Placerar etiketterna i tur och ordning (den första i listan har företräde)
 * kring linjen `linje` (punkterna i ordning) inom `yta`.
 */
export function placeraEtiketter(fragor: EtikettFraga[], linje: [number, number][], yta: Ruta): Placering[] {
  const placerade: Ruta[] = [];
  return fragor.map((f) => {
    const [px, py] = f.punkt;
    let bast: Placering | null = null;
    let lagst = Infinity;
    for (const [di, dy] of DY.entries()) {
      for (const [xi, dx] of DX.entries()) {
        const inat = f.ankare === "start" ? dx : -dx;
        const x = px + (f.ankare === "start" ? -3 : 3) + inat;
        const y = py + dy;
        const ruta: Ruta = f.ankare === "start"
          ? { x0: x, y0: y - OVER, x1: x + f.bredd, y1: y + UNDER }
          : { x0: x - f.bredd, y0: y - OVER, x1: x, y1: y + UNDER };
        const prov = vidgad(ruta, LUFT);
        let kostnad = di * 6 + xi * 4;
        if (ruta.x0 < yta.x0 - 4 || ruta.x1 > yta.x1 + 4 || ruta.y0 < yta.y0 || ruta.y1 > yta.y1) kostnad += 1000;
        for (let i = 1; i < linje.length; i++) {
          if (strackaKorsar(linje[i - 1][0], linje[i - 1][1], linje[i][0], linje[i][1], prov)) kostnad += 300;
        }
        for (const [qx, qy] of linje) {
          if (overlappar(prov, { x0: qx - 3, y0: qy - 3, x1: qx + 3, y1: qy + 3 })) kostnad += 200;
        }
        for (const r of placerade) if (overlappar(prov, r)) kostnad += 500;
        if (kostnad < lagst) {
          // Connectorn: lodrätt från punktens kant mot rutans närmaste kant
          const cx = Math.min(Math.max(px, ruta.x0 + 2), ruta.x1 - 2);
          const ovan = ruta.y1 <= py;
          const kant = ovan ? ruta.y1 + 1 : ruta.y0 - 1;
          const avstand = Math.abs(kant - py) - f.radie;
          const connector: Placering["connector"] = avstand > CONNECTOR_FRAN || Math.abs(cx - px) > f.radie + 6
            ? [px, py + (ovan ? -f.radie - 1 : f.radie + 1), cx, kant]
            : null;
          bast = { x, y, ruta, connector };
          lagst = kostnad;
        }
      }
    }
    // DY och DX är inte tomma, så något läge är alltid valt
    const p = bast as unknown as Placering;
    placerade.push(vidgad(p.ruta, LUFT));
    return p;
  });
}
