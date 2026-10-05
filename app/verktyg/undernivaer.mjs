// undernivaer.mjs: granskning av nedborrningen (WP10, stilguiden 6.7 och 6.8)
// i den nya rapporten med riktiga mus- och tangenthändelser via
// DevTools-protokollet mot en egen headless Edge. Ägare: WP10.
//
// Prövar i akutflödet per månad, för alla fyra indikatorerna och i 1440 och
// 390 px: Region Halland › Per sjukhus › klick på Halmstad (eller första
// ambulansområdet) › Per avdelning › brödsmulan tillbaka, med mus och med
// tangentbord; rader i enheternas rangordning; + Jämför med avdelning;
// undertryckta värden (lucka, .. och not); adressens e= och v= (djuplänk,
// uppdatering, bakåt) och Kopiera länk. Tar skärmdumpar av figurerna och av
// stilguidesektionen.
//
//   node verktyg/undernivaer.mjs                 hela granskningen
//   node verktyg/undernivaer.mjs --ut <mapp>     var bilder och rapport.json hamnar
//                                                (förval verktyg/bank/undernivaer, gitignorerad)
//
// Processer och portar som i bänken (webblasare.mjs): BANK_PORT, CDP_PORT,
// BANK_URL. Avslutar bara det skriptet själv startat. Avslutskod 1 när en
// kontroll fallerar.

import fs from "node:fs";
import path from "node:path";
import { HAR, medWebblasare, oppnaSida, sov, vantaUttryck, vilaUttryck } from "./webblasare.mjs";

const argv = process.argv.slice(2);
const varde = (n) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : null; };
const UT = path.resolve(varde("ut") ?? path.join(HAR, "bank", "undernivaer"));
fs.mkdirSync(UT, { recursive: true });

const KAPITEL = "/?ny#/kapitel/akutflode?vy=manad";
const KPIER = ["belaggning", "akutbesok", "vantetid", "ambulans"];
const BREDDER = [{ bredd: 1440, hojd: 900 }, { bredd: 390, hojd: 844 }];

const kontroller = [];
function kolla(namn, ok, detalj = "") {
  kontroller.push({ namn, ok: !!ok, detalj });
  console.log(`${ok ? "  ok " : "  FEL"} ${namn}${detalj && !ok ? `: ${detalj}` : ""}`);
}

// Hjälp i sidan. `k` är indikatorns id (data-block).
const SIDHJALP = `
window.__un = {
  blk(k) { return document.querySelector('[data-block="' + k + '"]'); },
  fig(k) { return this.blk(k)?.querySelector("[data-figur]") ?? null; },
  svg(k) { return this.fig(k)?.querySelector('[data-plotyta] svg[role="img"]') ?? null; },
  titel(k) { return this.fig(k)?.querySelector("figcaption h4")?.textContent ?? null; },
  flikar(k) { return [...(this.fig(k)?.querySelectorAll('[role="tab"]') ?? [])].map((t) => t.textContent); },
  vald(k) { return this.fig(k)?.querySelector('[role="tab"][aria-selected="true"]')?.textContent ?? null; },
  // Leden med " › " emellan (avskiljaren är genererat innehåll i CSS och syns inte i innerText)
  brodsmula(k) { const n = this.fig(k)?.querySelector("[data-brodsmula]"); return n ? [...n.querySelectorAll("li")].map((li) => li.textContent.trim()).join(" › ") : null; },
  brodsmulaEtikett(k) { return this.fig(k)?.querySelector("[data-brodsmula]")?.getAttribute("aria-label") ?? null; },
  paneler(k) { return [...(this.svg(k)?.querySelectorAll("[data-panelnamn]") ?? [])].map((g) => g.getAttribute("data-panelnamn")); },
  rader(k) { return [...(this.svg(k)?.querySelectorAll('[data-lager="statisk"] circle[data-serie]') ?? [])].map((c) => c.getAttribute("data-serie")); },
  aktivPanel(k) { return this.fig(k)?.querySelector("[data-aktiv-panel]")?.getAttribute("data-panel") ?? null; },
  lyft(k) { return this.fig(k)?.querySelector("[data-lyft]")?.getAttribute("data-lyft") ?? null; },
  live(k) { return this.fig(k)?.querySelector("[data-live]")?.textContent ?? ""; },
  jamforKnapp(k) { return this.fig(k)?.querySelector("[data-jamfor-knapp]")?.textContent ?? null; },
  jamforLista() { return [...document.querySelectorAll("[data-jamfor-lista] label")].map((l) => l.querySelector("span")?.textContent); },
  noter(k) { return this.fig(k)?.innerText ?? ""; },
  hash() { return location.hash; },
  fokus(k) {
    const a = document.activeElement;
    return { tagg: a?.tagName ?? null, iFigur: !!this.fig(k)?.contains(a), roll: a?.getAttribute?.("role") ?? null, text: a?.textContent?.trim().slice(0, 40) ?? "",
      brodsmula: a?.getAttribute?.("data-brodsmula-lank") ?? null, synlig: a?.matches?.(":focus-visible") ?? false };
  },
  visa(k) { const f = this.fig(k) ?? this.blk(k); f.scrollIntoView({ block: "center" }); return true; },
  mitt(sel, k) {
    const el = (k ? this.fig(k) : document).querySelector(sel);
    if (!el) return null;
    el.scrollIntoView({ block: "center" });  // inte under den klibbiga verktygsraden
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  },
  rad(k, id) {
    const c = this.svg(k)?.querySelector('[data-lager="statisk"] circle[data-serie="' + id + '"]');
    if (!c) return null;
    c.scrollIntoView({ block: "center" });
    const r = c.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  },
  panelBanor(k, id) {
    // Bananas antal delar (M) för panelens fokuslinje: fler än en betyder lucka
    const s = this.svg(k);
    const p = [...(s?.querySelectorAll('[data-lager="statisk"] path') ?? [])].filter((x) => x.getAttribute("data-serie") === id);
    return p.map((x) => (x.getAttribute("d")?.match(/M/g) ?? []).length);
  },
  figRekt(k) { const r = this.fig(k).getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, b: r.width, h: r.height }; },
};
true`;

const KODER = { Tab: 9, Enter: 13, Escape: 27, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, Home: 36, End: 35 };

async function tryck(k, nyckel, shift = false) {
  const p = { key: nyckel, code: nyckel, windowsVirtualKeyCode: KODER[nyckel], nativeVirtualKeyCode: KODER[nyckel], modifiers: shift ? 8 : 0 };
  await k.skicka("Input.dispatchKeyEvent", { type: "rawKeyDown", ...p });
  if (nyckel === "Enter") await k.skicka("Input.dispatchKeyEvent", { type: "char", ...p, text: "\r", unmodifiedText: "\r" });
  await k.skicka("Input.dispatchKeyEvent", { type: "keyUp", ...p });
  await sov(120);
}

async function klicka(k, punkt) {
  if (!punkt) throw new Error("inget att klicka på");
  await k.skicka("Input.dispatchMouseEvent", { type: "mouseMoved", x: punkt.x - 10, y: punkt.y - 6, button: "none" });
  await sov(40);
  await k.skicka("Input.dispatchMouseEvent", { type: "mouseMoved", x: punkt.x, y: punkt.y, button: "none" });
  await sov(60);
  await k.skicka("Input.dispatchMouseEvent", { type: "mousePressed", x: punkt.x, y: punkt.y, button: "left", clickCount: 1 });
  await k.skicka("Input.dispatchMouseEvent", { type: "mouseReleased", x: punkt.x, y: punkt.y, button: "left", clickCount: 1 });
  await sov(250);
}

/** Flyttar musen bort från graferna, så att hovringen släpper. */
const flyttaBort = (k) => k.skicka("Input.dispatchMouseEvent", { type: "mouseMoved", x: 2, y: 2, button: "none" });

const u = (k, uttryck) => k.utvardera(`window.__un.${uttryck}`);

async function vila(k) {
  await k.utvardera(vilaUttryck);
  await sov(200);
}

/**
 * Skärmdump av ett element, rullat till fönstrets överkant (under verktygsraden).
 * Fönstret ändras aldrig (captureBeyondViewport skulle montera lata figurer och
 * flytta allt); bildflikarna är i stället höga nog för hela figuren.
 */
async function skarmdump(k, selektor, namn, ovanfor = 72) {
  await flyttaBort(k);
  await k.utvardera(`(() => { document.querySelector(${JSON.stringify(selektor)}).scrollIntoView({ block: "start" }); scrollBy(0, -${ovanfor}); return true; })()`);
  await vila(k);
  const r = await k.utvardera(`(() => { const b = document.querySelector(${JSON.stringify(selektor)}).getBoundingClientRect();
    return { x: b.left + scrollX, y: b.top + scrollY, b: b.width, h: b.height, synlig: innerHeight - b.top }; })()`);
  const skott = await k.skicka("Page.captureScreenshot", {
    format: "png", captureBeyondViewport: false,
    clip: { x: Math.max(0, r.x - 8), y: Math.max(0, r.y - 8), width: r.b + 16, height: Math.min(r.h + 16, r.synlig + 8), scale: 1 },
  });
  const fil = path.join(UT, `${namn}.png`);
  fs.writeFileSync(fil, Buffer.from(skott.data, "base64"));
  return fil;
}

/** Bildernas lägen, öppnade som djuplänkar (e= och v=) i en hög flik. */
const BILDER = [
  { namn: "vantetid-per-sjukhus", kpi: "vantetid", adress: "&i=vantetid&v=enheter" },
  { namn: "vantetid-halmstad-per-avdelning", kpi: "vantetid", adress: "&i=vantetid&v=enheter&e=halmstad" },
  { namn: "belaggning-halmstad-avdelningar-rangordnade", kpi: "belaggning", adress: "&i=belaggning&v=enheterRang&e=halmstad" },
  { namn: "belaggning-avdelning-medicin-3", kpi: "belaggning", adress: "&i=belaggning&e=halmstad-medicin-3" },
  { namn: "akutbesok-varberg-per-avdelning", kpi: "akutbesok", adress: "&i=akutbesok&v=enheter&e=varberg" },
  { namn: "ambulans-nord-per-station", kpi: "ambulans", adress: "&i=ambulans&v=enheter&e=nord" },
];

async function bilder(bredd, lista) {
  for (const b of BILDER) {
    const { k, stang } = await oppnaSida(`${KAPITEL}${b.adress}`, { bredd, hojd: 2400, steg: [{ vanta: `[data-block="${b.kpi}"] [data-figur] svg[role="img"]` }] });
    try {
      await k.skicka("Input.dispatchMouseEvent", { type: "mouseWheel", x: 4, y: 300, deltaX: 0, deltaY: 0 });
      lista.push(await skarmdump(k, `[data-block="${b.kpi}"] [data-figur]`, `${bredd}-${b.namn}`));
    } finally {
      await stang();
    }
  }
}

async function vantaFigur(k, kpi) {
  await k.utvardera(vantaUttryck(`[data-block="${kpi}"]`));
  await u(k, `visa(${JSON.stringify(kpi)})`);
  await k.utvardera(vantaUttryck(`[data-block="${kpi}"] [data-figur] svg[role="img"]`));
  await vila(k);
}

// ════════════════════════════════════════════════════════════
//  Mus: Region Halland › Per sjukhus › Halmstad › Per avdelning › tillbaka
// ════════════════════════════════════════════════════════════

async function musFlode(k, kpi, bredd) {
  const q = JSON.stringify(kpi);
  const amb = kpi === "ambulans";
  const per = amb ? "Per ambulansområde" : "Per sjukhus";
  const under = amb ? "Per station" : "Per avdelning";
  await vantaFigur(k, kpi);
  kolla(`${bredd} ${kpi}: förval Region Halland`, (await u(k, `vald(${q})`)) === "Region Halland", await u(k, `vald(${q})`));

  await klicka(k, await u(k, `mitt('[data-flik="enheter"]', ${q})`));
  const titel = await u(k, `titel(${q})`);
  kolla(`${bredd} ${kpi} mus: fliken ${per}`, titel === per && (await u(k, `brodsmula(${q})`)) === null, titel);
  kolla(`${bredd} ${kpi} mus: v=enheter i adressen`, (await u(k, "hash()")).includes(`i=${kpi}&v=enheter`), await u(k, "hash()"));

  const paneler = await u(k, `paneler(${q})`);
  const mal = amb ? paneler[0] : "halmstad";
  const malNamn = amb ? (mal === "nord" ? "Nord" : "Syd") : "Halmstad";
  kolla(`${bredd} ${kpi}: aggregatet är ingen panel`, !paneler.includes("0013") && paneler.length >= 2, paneler.join(","));
  await klicka(k, await u(k, `mitt('[data-panelnamn="${mal}"] rect', ${q})`));
  const efter = { titel: await u(k, `titel(${q})`), brod: await u(k, `brodsmula(${q})`), flikar: await u(k, `flikar(${q})`), hash: await u(k, "hash()") };
  kolla(`${bredd} ${kpi} mus: klick på ${malNamn} ger ${under}`,
    efter.titel === under && efter.brod === `Region Halland › ${malNamn}` && efter.flikar[0] === malNamn && efter.flikar[1] === under,
    JSON.stringify(efter));
  kolla(`${bredd} ${kpi} mus: e=${mal} i adressen`, efter.hash.includes(`i=${kpi}&v=enheter&e=${mal}`), efter.hash);

  await klicka(k, await u(k, `mitt('[data-brodsmula-lank="0013"]', ${q})`));
  const tillbaka = { titel: await u(k, `titel(${q})`), brod: await u(k, `brodsmula(${q})`), hash: await u(k, "hash()"), fokus: await u(k, `fokus(${q})`) };
  kolla(`${bredd} ${kpi} mus: brödsmulan tillbaka till ${per}`,
    tillbaka.titel === per && tillbaka.brod === null && !tillbaka.hash.includes("e=") && tillbaka.hash.includes(`i=${kpi}&v=enheter`),
    JSON.stringify(tillbaka));
  kolla(`${bredd} ${kpi}: fokus på den valda fliken efter brödsmulan`, tillbaka.fokus.roll === "tab" && tillbaka.fokus.iFigur && tillbaka.fokus.text === per,
    JSON.stringify(tillbaka.fokus));
  // Tillbaka till förval inför tangentbordet
  await klicka(k, await u(k, `mitt('[data-flik="tid"]', ${q})`));
  await flyttaBort(k);
}

// ════════════════════════════════════════════════════════════
//  Tangentbord: samma flöde utan mus
// ════════════════════════════════════════════════════════════

async function tangentFlode(k, kpi, bredd) {
  const q = JSON.stringify(kpi);
  const amb = kpi === "ambulans";
  const per = amb ? "Per ambulansområde" : "Per sjukhus";
  const under = amb ? "Per station" : "Per avdelning";
  await vantaFigur(k, kpi);
  // Startpunkt: den valda fliken (som efter Tab från texten ovanför)
  await k.utvardera(`window.__un.fig(${q}).querySelector('[role="tab"][aria-selected="true"]').focus()`);
  await tryck(k, "ArrowRight");
  await tryck(k, "Enter");
  kolla(`${bredd} ${kpi} tangent: → och Enter väljer ${per}`, (await u(k, `titel(${q})`)) === per, await u(k, `titel(${q})`));
  await tryck(k, "Tab");
  const iGrafen = await u(k, `fokus(${q})`);
  kolla(`${bredd} ${kpi} tangent: Tab till grafen`, iGrafen.tagg === "svg" && iGrafen.iFigur && iGrafen.synlig, JSON.stringify(iGrafen));
  const mal = amb ? (await u(k, `paneler(${q})`))[0] : "halmstad";
  for (let i = 0; i < 6 && (await u(k, `aktivPanel(${q})`)) !== mal; i++) await tryck(k, "ArrowDown");
  kolla(`${bredd} ${kpi} tangent: ↓ till panelen ${mal}`, (await u(k, `aktivPanel(${q})`)) === mal, await u(k, `aktivPanel(${q})`));
  await tryck(k, "Enter");
  await sov(200);
  const efter = { titel: await u(k, `titel(${q})`), brod: await u(k, `brodsmula(${q})`), fokus: await u(k, `fokus(${q})`), live: await u(k, `live(${q})`), hash: await u(k, "hash()") };
  kolla(`${bredd} ${kpi} tangent: Enter borrar ned till ${under}`, efter.titel === under && (efter.brod ?? "").startsWith("Region Halland › "), JSON.stringify(efter));
  kolla(`${bredd} ${kpi} tangent: fokus kvar i grafen och nästa nivå läses upp`, efter.fokus.tagg === "svg" && efter.fokus.iFigur && efter.live.length > 10, JSON.stringify(efter.fokus) + " " + efter.live);
  kolla(`${bredd} ${kpi} tangent: e=${mal} i adressen`, efter.hash.includes(`e=${mal}`), efter.hash);
  await tryck(k, "Escape");
  await tryck(k, "Tab", true);
  const iBrod = await u(k, `fokus(${q})`);
  kolla(`${bredd} ${kpi} tangent: Skift+Tab till brödsmulan`, iBrod.brodsmula === "0013", JSON.stringify(iBrod));
  await tryck(k, "Enter");
  const tillbaka = { titel: await u(k, `titel(${q})`), brod: await u(k, `brodsmula(${q})`), fokus: await u(k, `fokus(${q})`) };
  kolla(`${bredd} ${kpi} tangent: Enter i brödsmulan går tillbaka till ${per}`, tillbaka.titel === per && tillbaka.brod === null && tillbaka.fokus.roll === "tab",
    JSON.stringify(tillbaka));
  // Tillbaka till förval
  await tryck(k, "Home");
  await tryck(k, "Enter");
}

// ════════════════════════════════════════════════════════════
//  Rangordning, jämför och undertryckning (en bredd räcker för logiken)
// ════════════════════════════════════════════════════════════

async function ovrigt(k, bredd) {
  // Rad i enheternas rangordning borrar ned
  const q = JSON.stringify("belaggning");
  await vantaFigur(k, "belaggning");
  await klicka(k, await u(k, `mitt('[data-flik="enheterRang"]', ${q})`));
  kolla(`${bredd} rangordning: Sjukhusen rangordnade`, (await u(k, `titel(${q})`)) === "Sjukhusen rangordnade", await u(k, `titel(${q})`));
  const rad = await u(k, `rad(${q}, "halmstad")`);
  await k.skicka("Input.dispatchMouseEvent", { type: "mouseMoved", x: rad.x + 3, y: rad.y, button: "none" });
  await sov(150);
  const tips = await k.utvardera(`window.__un.fig(${q}).querySelector("[data-tooltip]")?.innerText ?? ""`);
  kolla(`${bredd} rangordning: tooltipen säger att raden visar sjukhuset`, tips.includes("Klicka för att visa Halmstad"), tips);
  await klicka(k, { x: rad.x + 3, y: rad.y });
  const r = { titel: await u(k, `titel(${q})`), brod: await u(k, `brodsmula(${q})`), rader: await u(k, `rader(${q})`) };
  kolla(`${bredd} rangordning: klick på raden borrar ned till avdelningarna rangordnade`,
    r.titel === "Avdelningarna rangordnade" && r.brod === "Region Halland › Halmstad" && r.rader.every((x) => x.startsWith("halmstad-")), JSON.stringify(r));

  // Ned till en avdelning: + Jämför med avdelning listar syskonen
  await klicka(k, await u(k, `rad(${q}, "halmstad-medicin-3")`));
  const avd = { titel: await u(k, `titel(${q})`), brod: await u(k, `brodsmula(${q})`), knapp: await u(k, `jamforKnapp(${q})`), flikar: await u(k, `flikar(${q})`) };
  kolla(`${bredd} avdelning: Över tid med tre led i brödsmulan`, avd.brod === "Region Halland › Halmstad › Medicin 3" && avd.flikar.length === 0, JSON.stringify(avd));
  kolla(`${bredd} avdelning: knappen heter + Jämför med avdelning`, avd.knapp === "+ Jämför med avdelning", avd.knapp);
  await klicka(k, await u(k, `mitt("[data-jamfor-knapp]", ${q})`));
  await sov(200);
  const lista = await u(k, "jamforLista()");
  kolla(`${bredd} avdelning: listan visar syskonen`, JSON.stringify(lista) === JSON.stringify(["Akutvårdsavdelning", "Infektion", "Kirurgi 2"]), JSON.stringify(lista));
  await tryck(k, "Escape");
  await klicka(k, await u(k, `mitt('[data-brodsmula-lank="0013"]', ${q})`));

  // Undertryckta värden: lucka, .. och not
  const v = JSON.stringify("vantetid");
  await vantaFigur(k, "vantetid");
  await klicka(k, await u(k, `mitt('[data-flik="enheter"]', ${v})`));
  await klicka(k, await u(k, `mitt('[data-panelnamn="halmstad"] rect', ${v})`));
  const delar = await u(k, `panelBanor(${v}, "halmstad-infektion")`);
  kolla(`${bredd} undertryckt: lucka i Infektions linje`, delar.some((n) => n > 1), JSON.stringify(delar));
  const text = await u(k, `noter(${v})`);
  kolla(`${bredd} undertryckt: noten står under grafen`, text.includes("Värden baserade på färre än 10 fall visas inte."), "");
  await klicka(k, await u(k, `mitt('[data-atgard="tabell"]', ${v})`));
  const tabell = await k.utvardera(`window.__un.fig(${v}).querySelector("table")?.innerText ?? ""`);
  kolla(`${bredd} undertryckt: .. i tabellvyn`, /(^|\s)\.\.(\s|$)/.test(tabell), tabell.slice(0, 80));
  await klicka(k, await u(k, `mitt('[data-atgard="tabell"]', ${v})`));
  await klicka(k, await u(k, `mitt('[data-brodsmula-lank="0013"]', ${v})`));
  await klicka(k, await u(k, `mitt('[data-flik="tid"]', ${v})`));
}

// ════════════════════════════════════════════════════════════
//  Adressen: djuplänk, uppdatering, bakåt och Kopiera länk
// ════════════════════════════════════════════════════════════

async function adress(bredd, hojd) {
  const djup = `${KAPITEL}&i=vantetid&v=enheter&e=halmstad`;
  const { k, stang } = await oppnaSida(djup, { bredd, hojd, steg: [{ vanta: '[data-block="vantetid"] [data-figur] svg[role="img"]' }] });
  try {
    await k.utvardera(SIDHJALP);
    const q = JSON.stringify("vantetid");
    const las = async () => ({ titel: await u(k, `titel(${q})`), brod: await u(k, `brodsmula(${q})`), vald: await u(k, `vald(${q})`), hash: await u(k, "hash()") });
    let l = await las();
    kolla(`${bredd} djuplänk: e=halmstad och v=enheter öppnar Halmstad per avdelning`,
      l.titel === "Per avdelning" && l.brod === "Region Halland › Halmstad" && l.vald === "Per avdelning", JSON.stringify(l));
    const topp = await k.utvardera(`window.__un.blk("vantetid").getBoundingClientRect().top`);
    kolla(`${bredd} djuplänk: sidan rullad till indikatorn`, topp >= 0 && topp < 200, String(topp));
    kolla(`${bredd} djuplänk: brödsmulan har unikt namn`, (await u(k, `brodsmulaEtikett(${q})`)) === "Nivå, Medianväntetid akut", await u(k, `brodsmulaEtikett(${q})`));

    // Uppdatering
    const laddad = k.vanta("Page.loadEventFired");
    await k.skicka("Page.reload", {});
    await laddad;
    await k.utvardera(vantaUttryck('[data-block="vantetid"] [data-figur] svg[role="img"]'));
    await vila(k);
    await k.utvardera(SIDHJALP);
    l = await las();
    kolla(`${bredd} uppdatering: samma läge`, l.titel === "Per avdelning" && l.brod === "Region Halland › Halmstad" && l.hash.includes("e=halmstad"), JSON.stringify(l));

    // Läsaren byter nivå (replaceState), går till ett annat kapitel och tillbaka.
    // Ramen håller kvar blocket den rullat till tills läsaren rör sidan; ett
    // hjul utan utslag är den beröringen, som när en läsare börjar rulla.
    await k.skicka("Input.dispatchMouseEvent", { type: "mouseWheel", x: 4, y: 300, deltaX: 0, deltaY: 0 });
    const historik = await k.utvardera("history.length");
    await klicka(k, await u(k, `mitt('[data-brodsmula-lank="0013"]', ${q})`));
    l = await las();
    kolla(`${bredd} uppåt skriver om adressen utan ny historikpost`, l.titel === "Per sjukhus" && !l.hash.includes("e=") && (await k.utvardera("history.length")) === historik, JSON.stringify(l));
    await u(k, `visa(${q})`);
    await klicka(k, await u(k, `mitt('[data-panelnamn="varberg"] rect', ${q})`));
    l = await las();
    kolla(`${bredd} nedborrning till Varberg i adressen`, l.hash.includes("i=vantetid&v=enheter&e=varberg"), l.hash);
    await k.utvardera(`location.hash = "#/kapitel/skr-tillganglighet?vy=ar"`);
    await k.utvardera(vantaUttryck('[data-kapitelsida="skr-tillganglighet"]'));
    await vila(k);
    await k.utvardera("history.back()");
    await k.utvardera(vantaUttryck('[data-kapitelsida="akutflode"] [data-block="vantetid"] [data-figur] svg[role="img"]'));
    await vila(k);
    await sov(400);
    l = await las();
    kolla(`${bredd} bakåt: tillbaka i Varberg per avdelning`, l.titel === "Per avdelning" && l.brod === "Region Halland › Varberg" && l.hash.includes("e=varberg"), JSON.stringify(l));

    // Bakåt inom kapitlet: en länk till ett annat block och tillbaka
    await k.utvardera(`location.hash = "#/kapitel/akutflode?vy=manad&i=belaggning"`);
    await sov(600);
    await k.utvardera("history.back()");
    await sov(800);
    l = await las();
    kolla(`${bredd} bakåt inom kapitlet: figuren följer adressen`, l.titel === "Per avdelning" && l.brod === "Region Halland › Varberg", JSON.stringify(l));

    // Kopiera länk: figurens läge följer med
    await k.utvardera(`window.__kopierat = null; navigator.clipboard.writeText = (t) => { window.__kopierat = t; return Promise.resolve(); }; true`);
    await u(k, `visa(${q})`);
    await k.utvardera(`window.dispatchEvent(new Event("scroll"))`);
    await sov(300);
    await klicka(k, await k.utvardera(`(() => { const r = document.querySelector("[data-exportera]").getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`));
    await k.utvardera(vantaUttryck('[data-menyval="kopiera-lank"]'));
    await klicka(k, await k.utvardera(`(() => { const r = document.querySelector('[data-menyval="kopiera-lank"]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`));
    await sov(300);
    const kopierat = await k.utvardera("window.__kopierat");
    kolla(`${bredd} Kopiera länk: i, v och e för figuren`, typeof kopierat === "string" && kopierat.includes("#/kapitel/akutflode?vy=manad&i=vantetid&v=enheter&e=varberg"), String(kopierat));
  } finally {
    await stang();
  }
}

// ════════════════════════════════════════════════════════════
//  Stilguidesektionen
// ════════════════════════════════════════════════════════════

async function stilguide(bredd, bilder) {
  const { k, stang } = await oppnaSida("/verktyg/stilguide.html", {
    bredd, hojd: 2400, steg: [{ vanta: "html[data-stilguide='klar']" }, { vanta: "[data-undernivaexempel='avdelning'] svg[role='img']" }],
  });
  try {
    for (const namn of ["nedborrning", "undertryckt", "rangordning", "avdelning"]) {
      bilder.push(await skarmdump(k, `[data-undernivaexempel='${namn}']`, `${bredd}-stilguide-${namn}`, 16));
    }
    bilder.push(await skarmdump(k, "[data-bank-bild='undernivaer-tabell']", `${bredd}-stilguide-tabell`, 16));
    // Nedborrning i sektionen: klick på Halmstad
    const p = await k.utvardera(`(() => { const el = document.querySelector("[data-undernivaexempel='nedborrning'] [data-panelnamn='halmstad'] rect"); el.scrollIntoView({ block: "center" });
      const b = el.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; })()`);
    await klicka(k, p);
    const brod = await k.utvardera(`(() => { const n = document.querySelector("[data-undernivaexempel='nedborrning'] [data-brodsmula]");
      return n ? [...n.querySelectorAll("li")].map((li) => li.textContent.trim()).join(" › ") : null; })()`);
    kolla(`${bredd} stilguiden: nedborrning i sektionen`, brod === "Region Halland › Halmstad", String(brod));
    const hash = await k.utvardera("location.hash");
    kolla(`${bredd} stilguiden: ingen adress skrivs utanför rapporten`, !hash.includes("kapitel"), hash);
  } finally {
    await stang();
  }
}

// ════════════════════════════════════════════════════════════

const kod = await medWebblasare(async () => {
  const lista = [];
  const fel = [];
  for (const { bredd, hojd } of BREDDER) {
    console.log(`\n${bredd} px`);
    const { k, stang } = await oppnaSida(KAPITEL, {
      bredd, hojd, steg: [{ vanta: "[data-kapitelsida='akutflode']" }],
      konsol: (typ, text) => { if (typ !== "warning") fel.push(`${bredd} ${typ}: ${text}`); },
    });
    try {
      await k.utvardera(SIDHJALP);
      for (const kpi of KPIER) {
        await musFlode(k, kpi, bredd);
        await tangentFlode(k, kpi, bredd);
      }
      await ovrigt(k, bredd);
      const b = await k.utvardera("({ dok: document.documentElement.scrollWidth, fonster: innerWidth })");
      kolla(`${bredd}: ingen vågrät rullning`, b.dok <= b.fonster, JSON.stringify(b));
    } finally {
      await stang();
    }
    await adress(bredd, hojd);
    await stilguide(bredd, lista);
    await bilder(bredd, lista);
  }
  kolla("inga fel i konsolen", fel.length === 0, fel.join(" | "));
  const misslyckade = kontroller.filter((x) => !x.ok);
  fs.writeFileSync(path.join(UT, "rapport.json"), JSON.stringify({ kontroller, bilder: lista }, null, 2));
  console.log(`\n${kontroller.length - misslyckade.length} av ${kontroller.length} kontroller ok. Bilder i ${UT}`);
  return misslyckade.length ? 1 : 0;
});
process.exit(kod);
