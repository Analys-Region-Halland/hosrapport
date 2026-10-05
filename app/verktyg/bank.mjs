// bank.mjs: skärmdumpsbänk som tar bilder av rapportens vyer och den levande
// stilguiden och jämför dem pixel för pixel mot en baslinje. Ägs av WP0; WP7
// har byggt ut den med grupper, en bild per stilguidesektion och kontaktark.
//
//   npm run bank -- --baslinje          tar baslinjen  (verktyg/bank/baslinje/)
//   npm run bank                        tar nya bilder (verktyg/bank/senaste/),
//                                       jämför och skriver kontaktarket
//                                       verktyg/bank/rapport.html
//   npm run bank -- --skarmdump         tar bara bilder till senaste/ och skriver
//                                       kontaktarket utan jämförelse
//   npm run bank -- --bara stilguide    bara en grupp (eller flera: gammal,grafprov)
//   npm run bank -- --vyer start,ny-ram bara angivna vyer (även extra-vyer)
//   npm run bank -- --bredder 1440      bara angivna bredder
//   npm run bank -- --tolerans 0.1      största tillåtna andel avvikande pixlar i procent
//
// Grupper: gammal (gamla vyn), grafprov (verktyg/grafprov.html), stilguide (en
// bild per sektion och per galleriexempel i verktyg/stilguide.html), ny (nya
// adresser under ?ny; extra tills de har en baslinje värd att skydda).
//
// Miljövariabler: BANK_PORT (Vite, standard 5174) och CDP_PORT (Edge, standard
// 9223). Med egna portar kan flera agenter köra bänken samtidigt. BANK_URL pekar
// bänken mot en server som redan kör (t.ex. `vite preview` av ett bygge) i stället
// för att starta Vite; adresserna i VYER läggs till efter den. Processerna startas
// och städas av webblasare.mjs, som bara avslutar det den själv startat.
//
// Fallgropar (verifierade tidigare):
// - Viewporten ställs in en gång per flik före navigeringen och ändras aldrig
//   mitt i en mätning; ResizeObserver skulle annars rita om graferna.
//   captureBeyondViewport används inte av samma skäl.
// - Vyer med skivor tas utan clip (synlig viewport) och rullas.
// - Vyer med `bilder` (stilguiden) klipps per element i sidkoordinater. Sidan
//   mäts först i en flik med normal höjd; bilderna tas sedan i en ny flik vars
//   viewport är så hög att det högsta elementet ryms, så att inget element
//   behöver en annan viewport.
// - Vänta på document.fonts.ready och ~1,5 s efter navigering.

import fs from "node:fs";
import path from "node:path";
import { CDP_PORT, HAR, medWebblasare, oppnaSida, sov } from "./webblasare.mjs";

const BANK = path.join(HAR, "bank");

// ── Argument ──
const argv = process.argv.slice(2);
const flagga = (namn) => argv.includes(`--${namn}`);
const varde = (namn) => {
  const i = argv.indexOf(`--${namn}`);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : null;
};
const lista = (namn) => varde(namn)?.split(",").map((s) => s.trim()).filter(Boolean) ?? null;
const BASLINJE = flagga("baslinje");
const BARA_BILDER = flagga("skarmdump");
const TOLERANS = Number(varde("tolerans") ?? 0.1); // procent
const VALDA_VYER = lista("vyer");
const VALDA_GRUPPER = lista("bara");
const BREDDER = (varde("bredder") ?? "1440,390").split(",").map(Number);
const HOJD = { 1440: 900, 390: 844 };
/** Högsta viewport för elementbilder; högre element kapas (och det sägs i loggen). */
const MAX_HOJD = 16_000;
/** Luft runt elementbilder i px. */
const LUFT = 16;

// ════════════════════════════════════════════════════════════
//  Vyer. Varje vy har en grupp, en adress (eller en funktion av bredden) och
//  en lista med steg som körs efter laddningen. Steg:
//    { vanta: "selektor" }                  vänta tills elementet finns
//    { klicka: "selektor", index: n }       element.click() på n:te träffen
//    { vila: ms }                           vänta en fast tid
//    { hovra: "selektor", fx, fy }          riktig mushändelse på andelen (fx, fy)
//                                           av elementets yta (tillägg i WP3)
//  Antingen `skivor` (högst så många skärmbilder när sidan rullas; rullningen
//  sker i det element som har overflow-y auto/scroll och störst rullbar höjd,
//  annars i dokumentet) eller `bilder` (en selektor; varje träff blir en bild
//  som heter efter sitt data-bank-bild). `extra: true` = körs bara när vyn
//  anges med --vyer eller dess grupp med --bara.
// ════════════════════════════════════════════════════════════

const grafprov = (param) => (bredd) =>
  `/verktyg/grafprov.html?${param}&w=${Math.min(820, bredd - 32)}`;
/** Grafprovets diagram (WP2:s Figur och Diagram), som stegen väntar på. */
const DIAGRAM = "[data-diagram] svg[role='img']";

export const VYER = [
  { id: "start", grupp: "gammal", adress: "/", steg: [{ vanta: "button.start-area" }], skivor: 6 },
  {
    id: "kapitel2", grupp: "gammal", adress: "/",
    steg: [{ vanta: "button.start-area" }, { klicka: "button.start-area", index: 1 }, { vanta: "[data-block]" }],
    skivor: 6,
  },
  {
    id: "akutflode", grupp: "gammal", adress: "/",
    steg: [{ vanta: "button.start-area" }, { klicka: "button.start-area", index: 6 }, { vanta: "[data-block]" }],
    skivor: 6,
  },
  // Grafprovet (verktyg/grafprov.html, WP2): fästa enheter med `fasta=` (enhets-id),
  // visning med `visning=` (tid, rang, enheter, enheterRang). Hovring med en riktig
  // mushändelse i steget `hovra`.
  {
    id: "graf-spagetti", grupp: "grafprov",
    adress: grafprov("vy=ar&sektion=skr-tillganglighet&kpi=kolada-n79179"),
    steg: [{ vanta: DIAGRAM }], skivor: 2,
  },
  {
    id: "graf-fasta", grupp: "grafprov",
    adress: grafprov("vy=ar&sektion=skr-tillganglighet&kpi=kolada-n79221&fasta=0001,0012"),
    steg: [{ vanta: DIAGRAM }], skivor: 2,
  },
  {
    id: "graf-hovring", grupp: "grafprov",
    adress: grafprov("vy=ar&sektion=skr-tillganglighet&kpi=kolada-n79179"),
    steg: [{ vanta: DIAGRAM }, { hovra: DIAGRAM, fx: 0.55, fy: 0.4 }], skivor: 1,
  },
  {
    id: "graf-forvantat", grupp: "grafprov",
    adress: grafprov("vy=manad&sektion=akutflode&kpi=belaggning"),
    steg: [{ vanta: DIAGRAM }], skivor: 2,
  },
  {
    id: "graf-kostnad", grupp: "grafprov",
    adress: grafprov("vy=ar&sektion=skr-kostnader&kpi=kolada-u70020"),
    steg: [{ vanta: DIAGRAM }], skivor: 2,
  },
  {
    id: "graf-rangordning", grupp: "grafprov",
    adress: grafprov("vy=ar&sektion=skr-tillganglighet&kpi=kolada-n79179&visning=rang&fasta=0012,0024"),
    steg: [{ vanta: DIAGRAM }], skivor: 2,
  },
  {
    id: "graf-rangordning-hovring", grupp: "grafprov",
    adress: grafprov("vy=ar&sektion=skr-tillganglighet&kpi=kolada-n79179&visning=rang"),
    steg: [{ vanta: DIAGRAM }, { hovra: DIAGRAM, fx: 0.3, fy: 0.55 }], skivor: 1,
  },
  {
    id: "graf-stapel", grupp: "grafprov",
    adress: grafprov("vy=kvartal&sektion=akutflode&kpi=akutbesok"),
    steg: [{ vanta: DIAGRAM }, { hovra: DIAGRAM, fx: 0.6, fy: 0.6 }], skivor: 1,
  },
  {
    id: "graf-smamultiplar", grupp: "grafprov",
    adress: grafprov("vy=manad&sektion=akutflode&kpi=belaggning&visning=enheter"),
    steg: [{ vanta: DIAGRAM }, { hovra: DIAGRAM, fx: 0.5, fy: 0.6 }], skivor: 2,
  },
  {
    id: "graf-sjukhus-rangordnade", grupp: "grafprov",
    adress: grafprov("vy=manad&sektion=akutflode&kpi=vantetid&visning=enheterRang"),
    steg: [{ vanta: DIAGRAM }], skivor: 1,
  },
  {
    // Stilguidens första skärm: masthead och innehållsförteckning
    id: "stilguide-topp", grupp: "stilguide",
    adress: "/verktyg/stilguide.html",
    steg: [{ vanta: "html[data-stilguide='klar']" }],
    skivor: 1,
  },
  {
    // Den levande stilguiden: en bild per sektion och per galleriexempel
    id: "stilguide", grupp: "stilguide",
    adress: "/verktyg/stilguide.html",
    steg: [{ vanta: "html[data-stilguide='klar']" }],
    bilder: "[data-bank-bild]",
  },
  {
    // Den nya ramen bakom ?ny-flaggan. Ingår inte i jämförelsen förrän den
    // har en baslinje som är värd att skydda.
    id: "ny-ram", grupp: "ny", adress: "/?ny", steg: [{ vanta: "[data-ram]" }], skivor: 1, extra: true,
  },
];

/** Bildens filnamn: {vy}-{bredd}-{del}.png, där del är skivnummer eller data-bank-bild. */
const filnamn = (vyId, bredd, del) => `${vyId}-${bredd}-${del}.png`;
const lasFilnamn = (namn) => {
  const m = namn.match(/^(.+?)-(\d{3,4})-(.+)\.png$/);
  return m ? { vy: m[1], bredd: Number(m[2]), del: m[3] } : null;
};

// ════════════════════════════════════════════════════════════
//  Fotografering
// ════════════════════════════════════════════════════════════

// Körs i sidan: väljer rullningselement och lägger det i window.__bankRull.
const rullUttryck = `(() => {
  const dok = document.scrollingElement;
  let bast = dok, langd = dok.scrollHeight - dok.clientHeight;
  for (const el of document.querySelectorAll("body *")) {
    const oy = getComputedStyle(el).overflowY;
    if ((oy === "auto" || oy === "scroll") && el.scrollHeight - el.clientHeight > langd) {
      bast = el; langd = el.scrollHeight - el.clientHeight;
    }
  }
  window.__bankRull = bast;
  return { dokument: bast === dok, langd };
})()`;

const rullaTill = (y) => `(async () => {
  const el = window.__bankRull;
  el.scrollTop = ${y};
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  return el.scrollTop;
})()`;

/** Vyer med skivor: rulla och ta den synliga viewporten. */
async function fotograferaSkivor(vy, bredd, utMapp) {
  const adress = typeof vy.adress === "function" ? vy.adress(bredd) : vy.adress;
  const { k, stang } = await oppnaSida(adress, { bredd, hojd: HOJD[bredd] ?? 900, steg: vy.steg });
  const filer = [];
  try {
    await k.utvardera(rullUttryck);
    const steg = 820;
    let foregaende = -1;
    for (let i = 0; i < (vy.skivor ?? 6); i++) {
      const y = await k.utvardera(rullaTill(i * steg));
      if (i > 0 && y === foregaende) break; // slutet nått
      foregaende = y;
      await sov(i === 0 ? 300 : 700); // rullningsstyrda tillstånd (läsposition) hinner sätta sig
      const bild = await k.skicka("Page.captureScreenshot", { format: "png" });
      const namn = filnamn(vy.id, bredd, String(i + 1).padStart(2, "0"));
      fs.writeFileSync(path.join(utMapp, namn), Buffer.from(bild.data, "base64"));
      filer.push(namn);
    }
  } finally {
    await stang();
  }
  return filer;
}

// Körs i sidan: elementen som ska bli bilder, med mått i sidkoordinater.
const elementUttryck = (sel) => `(() => [...document.querySelectorAll(${JSON.stringify(sel)})].map((el) => {
  const r = el.getBoundingClientRect();
  return { namn: el.getAttribute("data-bank-bild"), x: r.left + scrollX, y: r.top + scrollY, b: r.width, h: r.height };
}).filter((e) => e.namn && e.b > 0 && e.h > 0))()`;

const rullaDokument = (y) => `(async () => {
  window.scrollTo(0, ${y});
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  return scrollY;
})()`;

/** Vyer med bilder: en bild per element, klippt i sidkoordinater. */
async function fotograferaBilder(vy, bredd, utMapp) {
  const adress = typeof vy.adress === "function" ? vy.adress(bredd) : vy.adress;
  // 1. Mät elementen i en flik med normal höjd
  let matt;
  {
    const { k, stang } = await oppnaSida(adress, { bredd, hojd: HOJD[bredd] ?? 900, steg: vy.steg });
    try { matt = await k.utvardera(elementUttryck(vy.bilder)); } finally { await stang(); }
  }
  if (!matt.length) throw new Error(`${vy.id}: inga element matchar ${vy.bilder}`);
  const dubbletter = matt.map((e) => e.namn).filter((n, i, a) => a.indexOf(n) !== i);
  if (dubbletter.length) throw new Error(`${vy.id}: data-bank-bild förekommer flera gånger: ${[...new Set(dubbletter)].join(", ")}`);
  const hojd = Math.min(MAX_HOJD, Math.max(HOJD[bredd] ?? 900, Math.ceil(Math.max(...matt.map((e) => e.h))) + 2 * LUFT));

  // 2. Ta bilderna i en ny flik där det högsta elementet ryms i viewporten
  const { k, stang } = await oppnaSida(adress, { bredd, hojd, steg: vy.steg });
  const filer = [];
  try {
    const element = await k.utvardera(elementUttryck(vy.bilder));
    for (const e of element) {
      const rullat = await k.utvardera(rullaDokument(Math.max(0, Math.floor(e.y) - LUFT)));
      await sov(150);
      const nu = (await k.utvardera(elementUttryck(`[data-bank-bild=${JSON.stringify(e.namn)}]`)))[0] ?? e;
      const x = Math.max(0, Math.floor(nu.x) - LUFT);
      const y = Math.max(rullat, Math.floor(nu.y) - LUFT);
      const b = Math.min(bredd - x, Math.ceil(nu.b) + 2 * LUFT);
      const h = Math.min(rullat + hojd - y, Math.ceil(nu.y + nu.h) + LUFT - y);
      if (nu.h + 2 * LUFT > hojd) console.warn(`  ${vy.id} ${bredd}: ${e.namn} är ${Math.round(nu.h)} px hög och kapas vid ${hojd} px`);
      const bild = await k.skicka("Page.captureScreenshot", { format: "png", clip: { x, y, width: b, height: h, scale: 1 } });
      const namn = filnamn(vy.id, bredd, e.namn);
      fs.writeFileSync(path.join(utMapp, namn), Buffer.from(bild.data, "base64"));
      filer.push(namn);
    }
  } finally {
    await stang();
  }
  return filer;
}

const fotografera = (vy, bredd, utMapp) => (vy.bilder ? fotograferaBilder : fotograferaSkivor)(vy, bredd, utMapp);

// ════════════════════════════════════════════════════════════
//  Jämförelse
// ════════════════════════════════════════════════════════════

/** Lägger en bild på en större, genomskinlig duk så att bilder med olika mått kan jämföras. */
function utfyll(PNG, bild, bredd, hojd) {
  if (bild.width === bredd && bild.height === hojd) return bild;
  const ut = new PNG({ width: bredd, height: hojd, fill: true });
  PNG.bitblt(bild, ut, 0, 0, bild.width, bild.height, 0, 0);
  return ut;
}

async function jamfor(namnLista) {
  const { PNG } = await import("pngjs");
  const { default: pixelmatch } = await import("pixelmatch");
  const diffMapp = path.join(BANK, "diff");
  fs.mkdirSync(diffMapp, { recursive: true });
  for (const namn of namnLista) fs.rmSync(path.join(diffMapp, namn), { force: true });
  const las = (p) => PNG.sync.read(fs.readFileSync(p));
  const resultat = [];
  for (const namn of namnLista) {
    const bas = path.join(BANK, "baslinje", namn);
    const ny = path.join(BANK, "senaste", namn);
    if (!fs.existsSync(bas)) { resultat.push({ namn, status: "saknar baslinje", andel: 100 }); continue; }
    if (!fs.existsSync(ny)) { resultat.push({ namn, status: "saknas i senaste", andel: 100 }); continue; }
    let a = las(bas), b = las(ny);
    const olikaMatt = a.width !== b.width || a.height !== b.height
      ? `olika mått ${a.width}×${a.height} / ${b.width}×${b.height}` : null;
    const bredd = Math.max(a.width, b.width), hojd = Math.max(a.height, b.height);
    a = utfyll(PNG, a, bredd, hojd);
    b = utfyll(PNG, b, bredd, hojd);
    const diff = new PNG({ width: bredd, height: hojd });
    // Kantutjämning räknas med (includeAA) så att typsnittsskillnader syns.
    const avvikande = pixelmatch(a.data, b.data, diff.data, bredd, hojd, { threshold: 0.1, includeAA: true });
    let exakt = 0;
    for (let i = 0; i < a.data.length; i += 4) {
      if (a.data[i] !== b.data[i] || a.data[i + 1] !== b.data[i + 1] || a.data[i + 2] !== b.data[i + 2] || a.data[i + 3] !== b.data[i + 3]) exakt++;
    }
    fs.writeFileSync(path.join(diffMapp, namn), PNG.sync.write(diff));
    const andel = (100 * avvikande) / (bredd * hojd);
    resultat.push({ namn, status: olikaMatt ?? (andel > TOLERANS ? "avviker" : "ok"), andel, avvikande, exakt, diff: true });
  }
  // Bilder som bara finns i baslinjen för vyer och bredder som kördes
  const korda = new Set(namnLista.map((n) => lasFilnamn(n)?.vy));
  const basMapp = path.join(BANK, "baslinje");
  for (const namn of fs.existsSync(basMapp) ? fs.readdirSync(basMapp) : []) {
    const f = lasFilnamn(namn);
    if (f && korda.has(f.vy) && BREDDER.includes(f.bredd) && !namnLista.includes(namn)) {
      resultat.push({ namn, status: "saknas i senaste", andel: 100 });
    }
  }
  return resultat;
}

// ════════════════════════════════════════════════════════════
//  Kontaktark: en ruta per bild med baslinje, senaste och diff sida vid sida,
//  grupperat per vy. Kryssrutan döljer bilderna inom toleransen.
// ════════════════════════════════════════════════════════════

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function skrivKontaktark(resultat, { jamfort }) {
  const fmt = (v) => v.toLocaleString("sv-SE", { maximumFractionDigits: 4 });
  const fel = resultat.filter((r) => r.status !== "ok" && r.status !== "ej jämförd");
  const vyOrdning = VYER.map((v) => v.id);
  const grupper = new Map();
  for (const r of resultat) {
    const f = lasFilnamn(r.namn) ?? { vy: "övrigt" };
    if (!grupper.has(f.vy)) grupper.set(f.vy, []);
    grupper.get(f.vy).push({ ...r, ...f });
  }
  const ordnade = [...grupper.entries()].sort(([a], [b]) => vyOrdning.indexOf(a) - vyOrdning.indexOf(b));
  const bild = (mapp, namn, etikett) => fs.existsSync(path.join(BANK, mapp, namn))
    ? `<figure><figcaption>${etikett}</figcaption><a href="${mapp}/${esc(namn)}"><img loading="lazy" src="${mapp}/${esc(namn)}" alt="${etikett}: ${esc(namn)}"></a></figure>`
    : `<figure><figcaption>${etikett}</figcaption><p class="saknas">saknas</p></figure>`;
  const klass = (r) => (r.status === "ok" ? "ok" : r.status === "ej jämförd" ? "ny" : "avviker");
  const kort = (r) => `<li class="kort ${klass(r)}">
  <p class="namn">${esc(r.del ?? r.namn)} <span>· ${r.bredd ?? ""} px</span></p>
  <p class="status">${esc(r.status)}${r.avvikande != null ? ` · ${fmt(r.andel)} % (${r.avvikande} px, exakt ${r.exakt} px)` : ""}</p>
  <div class="bilder">${jamfort ? bild("baslinje", r.namn, "Baslinje") : ""}${bild("senaste", r.namn, "Senaste")}${jamfort && r.diff ? bild("diff", r.namn, "Diff") : ""}</div>
</li>`;
  const html = `<!doctype html>
<html lang="sv"><head><meta charset="utf-8"><title>Kontaktark, skärmdumpsbänken</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body { font: 15px/1.45 "IBM Plex Sans", system-ui, sans-serif; margin: 24px; color: #1a1a1a; background: #fbfbf9; }
  h1 { font-size: 24px; margin: 0 0 4px; }
  h2 { font-size: 18px; margin: 40px 0 12px; }
  h2 span { font-weight: 400; color: #4a4f4c; font-size: 15px; }
  p { margin: 0; }
  .meta { color: #4a4f4c; margin-bottom: 16px; font-variant-numeric: tabular-nums; }
  label { display: inline-flex; gap: 8px; align-items: center; cursor: pointer; }
  body:has(#bara-fel:checked) .kort.ok { display: none; }
  ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 24px; }
  .kort { background: #fff; padding: 16px; }
  .namn { font-weight: 600; }
  .namn span { font-weight: 400; color: #4a4f4c; }
  .status { color: #4a4f4c; font-size: 13px; margin-bottom: 12px; font-variant-numeric: tabular-nums; }
  .avviker .status { color: #9a2e22; font-weight: 600; }
  .bilder { display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-start; }
  figure { margin: 0; width: 320px; }
  figcaption { font-size: 13px; color: #6b716d; margin-bottom: 4px; }
  img { display: block; width: 100%; max-height: 640px; object-fit: cover; object-position: top; outline: 1px solid #e6e6e1; }
  .saknas { color: #6b716d; font-size: 13px; }
</style></head><body>
<h1>Kontaktark</h1>
<p class="meta">${new Date().toLocaleString("sv-SE")} · ${resultat.length} bilder · ${jamfort
    ? `tolerans ${fmt(TOLERANS)} % · ${resultat.length - fel.length} inom toleransen · ${fel.length} avviker eller saknas`
    : "ingen jämförelse (--skarmdump)"}</p>
${jamfort ? `<label><input type="checkbox" id="bara-fel"${fel.length ? " checked" : ""}> Visa bara avvikande</label>` : ""}
${ordnade.map(([vy, rader]) => `<h2>${esc(vy)} <span>${esc(VYER.find((v) => v.id === vy)?.grupp ?? "")}</span></h2>
<ul>${rader.sort((a, b) => (b.bredd ?? 0) - (a.bredd ?? 0)).map(kort).join("\n")}</ul>`).join("\n")}
</body></html>`;
  const ut = path.join(BANK, "rapport.html");
  fs.writeFileSync(ut, html);
  return ut;
}

// ════════════════════════════════════════════════════════════
//  Huvudflöde
// ════════════════════════════════════════════════════════════

const kandaGrupper = new Set(VYER.map((v) => v.grupp));
if (VALDA_GRUPPER) {
  const okanda = VALDA_GRUPPER.filter((g) => !kandaGrupper.has(g) && !VYER.some((v) => v.id === g));
  if (okanda.length) { console.error(`Okända grupper: ${okanda.join(", ")} (finns: ${[...kandaGrupper].join(", ")})`); process.exit(2); }
}
if (VALDA_VYER) {
  const okanda = VALDA_VYER.filter((id) => !VYER.some((v) => v.id === id));
  if (okanda.length) { console.error(`Okända vyer: ${okanda.join(", ")}`); process.exit(2); }
}
const vyer = VYER.filter((v) => {
  if (VALDA_VYER) return VALDA_VYER.includes(v.id);
  if (VALDA_GRUPPER) return VALDA_GRUPPER.includes(v.grupp) || VALDA_GRUPPER.includes(v.id);
  return !v.extra;
});

const utMapp = path.join(BANK, BASLINJE ? "baslinje" : "senaste");
fs.mkdirSync(utMapp, { recursive: true });
// Rensa bara bilderna för de vyer och bredder som tas om
for (const f of fs.readdirSync(utMapp)) {
  const m = lasFilnamn(f);
  if (m && vyer.some((v) => v.id === m.vy) && BREDDER.includes(m.bredd)) fs.rmSync(path.join(utMapp, f));
}

const kod = await medWebblasare(async () => {
  console.log(`Vyer: ${vyer.map((v) => v.id).join(", ")} · bredder ${BREDDER.join(", ")} · CDP ${CDP_PORT}`);
  const tagna = [];
  for (const vy of vyer) {
    for (const bredd of BREDDER) {
      const filer = await fotografera(vy, bredd, utMapp);
      console.log(`  ${vy.id} ${bredd}: ${filer.length} bilder`);
      tagna.push(...filer);
    }
  }
  if (BASLINJE) {
    console.log(`Baslinje: ${tagna.length} bilder i ${utMapp}`);
    return 0;
  }
  if (BARA_BILDER) {
    const ut = skrivKontaktark(tagna.map((namn) => ({ namn, status: "ej jämförd", andel: 0 })), { jamfort: false });
    console.log(`${tagna.length} bilder i ${utMapp}. Kontaktark: ${ut}`);
    return 0;
  }
  const resultat = await jamfor(tagna);
  const ut = skrivKontaktark(resultat, { jamfort: true });
  const fel = resultat.filter((r) => r.status !== "ok");
  for (const r of resultat) {
    const tal = r.avvikande != null ? `${r.andel.toFixed(4)} % (${r.avvikande} st, exakt ${r.exakt} st)` : "";
    console.log(`  ${r.status === "ok" ? "ok     " : "AVVIKER"} ${r.namn} ${tal} ${r.status === "ok" || r.status === "avviker" ? "" : r.status}`);
  }
  console.log(`\n${resultat.length - fel.length}/${resultat.length} inom toleransen ${TOLERANS} %. Kontaktark: ${ut}`);
  return fel.length ? 1 : 0;
});
process.exit(kod);
