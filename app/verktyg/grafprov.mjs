// grafprov.mjs: granskning av linjediagrammet med riktiga mushändelser,
// tangenter och pekskärmstryck via DevTools-protokollet mot en egen headless
// Edge (Input.dispatchMouseEvent, dispatchKeyEvent, dispatchTouchEvent).
// Tar skärmdumpar av figuren och mäter beteendet: vilken linje som är lyft,
// att de statiska lagren aldrig ändras under hovring (MutationObserver), att
// musklick inte ger fokus och att tooltipen står på fast höjd. Ägare: WP2.
//
//   node verktyg/grafprov.mjs                  hela sviten
//   node verktyg/grafprov.mjs --bara granskning,galleri,mobil,stilguide
//   node verktyg/grafprov.mjs --ut <mapp>      var bilder och rapport hamnar
//   node verktyg/grafprov.mjs --bara prov --q "vy=dag&sektion=akutflode&kpi=belaggning;…" [--bredd 390]
//                                              vila och hovring för valfria adresser
//
// Miljövariabler: BANK_PORT (Vite, standard 5182) och CDP_PORT (Edge, standard
// 9232). Startar Vite om ingen server svarar på BANK_PORT. Avslutar bara
// processer som skriptet själv startat; Edge identifieras på sin profilmapp.
//
// Fallgropar (som i bank.mjs): viewporten ställs in en gång per flik före
// navigeringen och ändras aldrig mitt i en mätning (ResizeObserver skulle rita
// om grafen); captureScreenshot med clip tar sidkoordinater.

import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HAR = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(HAR, "..");
const EDGE = process.env.EDGE_PATH ?? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const BANK_PORT = Number(process.env.BANK_PORT ?? 5182);
const CDP_PORT = Number(process.env.CDP_PORT ?? 9232);
const PROFIL = path.join(os.tmpdir(), `hos-grafprov-edge-${CDP_PORT}`);
const BAS = `http://localhost:${BANK_PORT}`;

const argv = process.argv.slice(2);
const varde = (n) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : null; };
const UT = path.resolve(varde("ut") ?? path.join(os.tmpdir(), `hos-grafprov-${CDP_PORT}`));
const BARA = varde("bara")?.split(",") ?? null;
fs.mkdirSync(UT, { recursive: true });

const sov = (ms) => new Promise((r) => setTimeout(r, ms));
const startade = { vite: null, edge: null };

// ── Processer ──

async function svarar(url) {
  try { return (await fetch(url)).ok; } catch { return false; }
}
async function vantaPa(url, ms, namn) {
  const slut = Date.now() + ms;
  while (Date.now() < slut) { if (await svarar(url)) return; await sov(250); }
  throw new Error(`${namn} svarade inte på ${url}`);
}
async function startaVite() {
  if (await svarar(`${BAS}/`)) return;
  const bin = path.join(APP, "node_modules/vite/bin/vite.js");
  startade.vite = spawn(process.execPath, [bin, "--port", String(BANK_PORT), "--strictPort"], { cwd: APP, stdio: "ignore", windowsHide: true });
  await vantaPa(`${BAS}/`, 60_000, "Vite");
}
function dodaEgnaEdge() {
  if (process.platform !== "win32") return;
  const s = `Get-CimInstance Win32_Process -Filter "Name = 'msedge.exe'" | Where-Object { $_.CommandLine -and $_.CommandLine.Contains('${PROFIL.replace(/'/g, "''")}') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`;
  try { execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", s], { stdio: "ignore" }); } catch { /* inget att avsluta */ }
}
async function startaEdge() {
  dodaEgnaEdge();
  fs.rmSync(PROFIL, { recursive: true, force: true, maxRetries: 3 });
  startade.edge = spawn(EDGE, [
    "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run", "--no-default-browser-check",
    "--disable-extensions", "--disable-component-update", "--disable-background-networking", "--disable-sync",
    "--mute-audio", "--force-color-profile=srgb", "--force-device-scale-factor=1", "--remote-allow-origins=*",
    `--user-data-dir=${PROFIL}`, `--remote-debugging-port=${CDP_PORT}`, "about:blank",
  ], { stdio: "ignore", windowsHide: true });
  await vantaPa(`http://127.0.0.1:${CDP_PORT}/json/version`, 30_000, "Edge");
}

// ── DevTools-protokollet ──

class Cdp {
  static async anslut(url) {
    const k = new Cdp();
    k.ws = new WebSocket(url); k.id = 0; k.vantande = new Map(); k.lyssnare = new Map();
    k.ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && k.vantande.has(m.id)) {
        const { los, avvisa } = k.vantande.get(m.id); k.vantande.delete(m.id);
        if (m.error) avvisa(new Error(`${m.error.message} (${m.error.code})`)); else los(m.result);
      } else if (m.method && k.lyssnare.has(m.method)) for (const f of k.lyssnare.get(m.method)) f(m.params);
    };
    await new Promise((r, e) => { k.ws.onopen = r; k.ws.onerror = e; });
    return k;
  }
  skicka(method, params = {}) {
    return new Promise((los, avvisa) => { const i = ++this.id; this.vantande.set(i, { los, avvisa }); this.ws.send(JSON.stringify({ id: i, method, params })); });
  }
  vanta(method, ms = 30_000) {
    return new Promise((los, avvisa) => {
      const t = setTimeout(() => avvisa(new Error(`timeout: ${method}`)), ms);
      const f = (p) => { clearTimeout(t); this.lyssnare.get(method).delete(f); los(p); };
      if (!this.lyssnare.has(method)) this.lyssnare.set(method, new Set());
      this.lyssnare.get(method).add(f);
    });
  }
  async js(uttryck) {
    const r = await this.skicka("Runtime.evaluate", { expression: uttryck, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(`Fel i sidan: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`);
    return r.result.value;
  }
  stang() { try { this.ws.close(); } catch { /* redan stängd */ } }
}

// Hjälpfunktioner som läggs in i sidan (window.__gp). n = diagrammets ordning på sidan.
const SIDHJALP = `
window.__gp = {
  diagram(n = 0) { return document.querySelectorAll("[data-diagram]")[n]; },
  svg(n = 0) { return this.diagram(n)?.querySelector("svg"); },
  rekt(n = 0) { const r = this.svg(n).getBoundingClientRect(); return { x: r.left, y: r.top, b: r.width, h: r.height }; },
  punkter(id, n = 0) {
    const p = this.svg(n).querySelector('[data-lager="statisk"] path[data-serie="' + id + '"]');
    if (!p) return null;
    const ut = []; const re = /([ML])\\s*(-?[\\d.]+)[ ,](-?[\\d.]+)/g; let m;
    while ((m = re.exec(p.getAttribute("d")))) ut.push({ c: m[1], x: +m[2], y: +m[3] });
    return ut;
  },
  etikett(id, n = 0) { const t = this.svg(n).querySelector('[data-etikett="' + id + '"] text'); if (!t) return null; const r = t.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, vanster: r.left, text: t.textContent }; },
  lyft(n = 0) {
    const d = this.diagram(n);
    const l = d.querySelector("[data-lyft]");
    if (l) return l.getAttribute("data-lyft");
    const fet = [...d.querySelectorAll("[data-tooltip] tr")].find((tr) => getComputedStyle(tr).fontWeight >= 600);
    return fet ? "rad:" + fet.textContent : null;
  },
  tooltip(n = 0) {
    const t = this.diagram(n).querySelector("[data-tooltip]");
    if (!t) return null;
    return { text: t.innerText.replace(/\\s+/g, " ").trim(), left: t.offsetLeft, top: t.offsetTop, b: t.offsetWidth };
  },
  live(n = 0) { return this.diagram(n).querySelector("[data-live]")?.textContent ?? ""; },
  hjalplinje(n = 0) { const l = this.svg(n).querySelector("[data-hjalplinje]"); return l ? +l.getAttribute("x1") : null; },
  statiskaPaths(n = 0) { return this.svg(n).querySelectorAll('[data-lager="statisk"] path').length; },
  bevaka(n = 0) {
    window.__gpMut = 0;
    window.__gpObs?.disconnect();
    window.__gpObs = new MutationObserver((l) => { window.__gpMut += l.length; });
    window.__gpObs.observe(this.svg(n).querySelector('[data-lager="statisk"]'), { subtree: true, childList: true, attributes: true, characterData: true });
    window.__gpStatisk = this.svg(n).querySelector('[data-lager="statisk"]');
    return true;
  },
  mutationer(n = 0) { return { antal: window.__gpMut, sammaNod: window.__gpStatisk === this.svg(n).querySelector('[data-lager="statisk"]') }; },
  fokus() { const a = document.activeElement; return { tagg: a?.tagName ?? null, synlig: a?.matches?.(":focus-visible") ?? false, diagram: !!a?.closest?.("[data-diagram]") }; },
  fasta() { return [...document.querySelectorAll("[data-figur]")].map((f) => f.querySelector("p[class*=fasta]")?.textContent ?? ""); },
  figurRekt(n = 0) { const f = document.querySelectorAll("[data-figur]")[n]; f.scrollIntoView({ block: "center" }); const r = f.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, b: r.width, h: r.height }; },
};`;

async function oppnaFlik(url, bredd, hojd, { pek = false } = {}) {
  const flik = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?about:blank`, { method: "PUT" })).json();
  const k = await Cdp.anslut(flik.webSocketDebuggerUrl);
  k.flikId = flik.id;
  await k.skicka("Page.enable");
  await k.skicka("Runtime.enable");
  await k.skicka("Emulation.setDeviceMetricsOverride", { width: bredd, height: hojd, deviceScaleFactor: 1, mobile: pek });
  if (pek) await k.skicka("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
  await k.skicka("Page.addScriptToEvaluateOnNewDocument", { source: SIDHJALP });
  const laddad = k.vanta("Page.loadEventFired");
  await k.skicka("Page.navigate", { url });
  await laddad;
  await k.js(`new Promise((los, avvisa) => { const slut = Date.now() + 20000; const f = () => document.querySelectorAll("[data-diagram] svg").length ? los(true) : Date.now() > slut ? avvisa(new Error("inget diagram")) : setTimeout(f, 100); f(); })`);
  await k.js(`document.fonts.ready.then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))`);
  await sov(400);
  return k;
}
async function stangFlik(k) {
  k.stang();
  await fetch(`http://127.0.0.1:${CDP_PORT}/json/close/${k.flikId}`).catch(() => {});
}

const mus = (k, x, y) => k.skicka("Input.dispatchMouseEvent", { type: "mouseMoved", x, y, button: "none", pointerType: "mouse" });
async function klick(k, x, y) {
  await k.skicka("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1, pointerType: "mouse" });
  await k.skicka("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1, pointerType: "mouse" });
}
async function tangent(k, key, code = key, keyCode = 0) {
  const text = key === "Enter" ? "\r" : undefined;
  await k.skicka("Input.dispatchKeyEvent", { type: "rawKeyDown", key, code, windowsVirtualKeyCode: keyCode, text });
  if (text) await k.skicka("Input.dispatchKeyEvent", { type: "char", key, code, windowsVirtualKeyCode: keyCode, text });
  await k.skicka("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode: keyCode });
  await sov(60);
}
const TANGENT = { Tab: 9, Enter: 13, Escape: 27, End: 35, Home: 36, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40 };
const tryck = async (k, key) => tangent(k, key, key, TANGENT[key] ?? 0);
async function peka(k, x, y) {
  await k.skicka("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  await k.skicka("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await sov(150);
}

async function bild(k, namn, n = 0) {
  const r = await k.js(`__gp.figurRekt(${n})`);
  await sov(150);
  const m = 8;
  const b = await k.skicka("Page.captureScreenshot", { format: "png", clip: { x: r.x - m, y: r.y - m, width: r.b + 2 * m, height: r.h + 2 * m, scale: 1 } });
  const fil = path.join(UT, `${namn}.png`);
  fs.writeFileSync(fil, Buffer.from(b.data, "base64"));
  return fil;
}

// Pekarens position i viewporten för en punkt i svg:ns koordinater
async function iSvg(k, x, y, n = 0) {
  const r = await k.js(`__gp.rekt(${n})`);
  return [r.x + x, r.y + y];
}

const url = (q) => `${BAS}/verktyg/grafprov.html?${q}`;
const rapport = { tid: new Date().toISOString(), bilder: [], kontroller: [] };
const kontroll = (namn, ok, varde) => { rapport.kontroller.push({ namn, ok, varde }); console.log(`${ok ? "OK  " : "FEL "} ${namn}${varde !== undefined ? `: ${JSON.stringify(varde)}` : ""}`); };
const sparaBild = async (k, namn, n = 0) => { const f = await bild(k, namn, n); rapport.bilder.push(f); console.log(`     bild ${f}`); };

// ── Granskning: telefontillgängligheten med riktiga händelser (1440 × 900) ──

async function granskning() {
  const k = await oppnaFlik(url("vy=ar&sektion=skr-tillganglighet&kpi=kolada-n79179"), 1440, 900);
  try {
    await k.js(`__gp.figurRekt(0)`);
    await sparaBild(k, "01-n79179-vila-1440");
    const pathsVila = await k.js(`__gp.statiskaPaths()`);
    await k.js(`__gp.bevaka()`);

    // Hovra en grå linje: Västerbotten (0024), mitt på sträckan 2016–2017
    const vb = await k.js(`__gp.punkter("0024")`);
    let [x, y] = await iSvg(k, (vb[0].x + vb[1].x) / 2 + 2, (vb[0].y + vb[1].y) / 2 + 2);
    await mus(k, x - 40, y - 40); await sov(80);
    await mus(k, x, y); await sov(200);
    kontroll("hovra grå linje lyfter Västerbotten", (await k.js(`__gp.lyft()`)) === "0024", await k.js(`__gp.lyft()`));
    kontroll("tooltip har uppmaning att visa i grafen", /Klicka för att visa Västerbotten i grafen/.test((await k.js(`__gp.tooltip()`))?.text ?? ""), (await k.js(`__gp.tooltip()`))?.text);
    await sparaBild(k, "02-n79179-hovra-gra-1440");

    // Rör pekaren längs den branta delen (2020 → 2021, 87,4 → 61,5) med 3 px förskjutning
    let brant = 0, bastLut = 0;
    for (let i = 0; i < vb.length - 1; i++) {
      if (vb[i + 1].c !== "L") continue;
      const lut = Math.abs((vb[i + 1].y - vb[i].y) / (vb[i + 1].x - vb[i].x));
      if (lut > bastLut) { bastLut = lut; brant = i; }
    }
    const a = vb[brant], b = vb[brant + 1];
    const spar = [], toppar = [];
    for (let s = 0; s <= 20; s++) {
      const t = 0.05 + (0.9 * s) / 20;
      [x, y] = await iSvg(k, a.x + (b.x - a.x) * t + 3, a.y + (b.y - a.y) * t);
      await mus(k, x, y); await sov(35);
      spar.push(await k.js(`__gp.lyft()`));
      toppar.push((await k.js(`__gp.tooltip()`))?.top);
    }
    kontroll(`brant del (lutning ${bastLut.toFixed(1)}): Västerbotten står kvar i alla 21 steg`, spar.every((s) => s === "0024"), [...new Set(spar)]);
    kontroll("tooltipen står på fast höjd under svepet", new Set(toppar).size === 1, [...new Set(toppar)]);
    [x, y] = await iSvg(k, a.x + (b.x - a.x) * 0.5 + 3, a.y + (b.y - a.y) * 0.5);
    await mus(k, x, y); await sov(120);
    await sparaBild(k, "03-n79179-brant-1440");

    // Svep vågrätt över hela plotytan: statiska lagret får inte röras
    const rekt = await k.js(`__gp.rekt()`);
    const tooltipSidor = [];
    for (let px = 60; px < rekt.b - 40; px += 9) {
      await mus(k, rekt.x + px, rekt.y + rekt.h * 0.45); await sov(16);
      const t = await k.js(`__gp.tooltip()`); const hj = await k.js(`__gp.hjalplinje()`);
      if (t && hj !== null) tooltipSidor.push(t.left > hj ? "h" : "v");
    }
    const byten = tooltipSidor.filter((s, i) => i > 0 && s !== tooltipSidor[i - 1]).length;
    kontroll("tooltipen byter sida en gång vid mitten under ett svep", byten === 1, { byten, prov: tooltipSidor.length });
    const mut = await k.js(`__gp.mutationer()`);
    kontroll("hovring ändrar inte statiska lagret (MutationObserver)", mut.antal === 0 && mut.sammaNod, mut);
    kontroll("antalet path i statiska lagret oförändrat", (await k.js(`__gp.statiskaPaths()`)) === pathsVila, { vila: pathsVila });

    // Klicka för att fästa Västerbotten: musklick ger inte fokus
    [x, y] = await iSvg(k, (vb[0].x + vb[1].x) / 2 + 2, (vb[0].y + vb[1].y) / 2 + 2);
    await mus(k, x, y); await sov(120);
    await klick(k, x, y); await sov(250);
    kontroll("klick fäster Västerbotten", (await k.js(`__gp.fasta()`))[0].includes("Västerbotten"), await k.js(`__gp.fasta()`));
    const f = await k.js(`__gp.fokus()`);
    kontroll("musklick ger inte diagrammet fokus", !f.diagram, f);
    kontroll("fäst linje: Klicka för att ta bort", /Klicka för att ta bort/.test((await k.js(`__gp.tooltip()`))?.text ?? ""), (await k.js(`__gp.tooltip()`))?.text);
    await sparaBild(k, "04-n79179-fast-1440");

    // Hovra etikett (högsta regionen, Kalmar) och klicka på den
    const et = await k.js(`__gp.etikett("0008")`);
    await mus(k, et.x, et.y); await sov(200);
    kontroll("hovrad etikett lyfter Kalmar", (await k.js(`__gp.lyft()`)) === "0008", await k.js(`__gp.lyft()`));
    await sparaBild(k, "05-n79179-etikett-1440");
    // Från plotytan in på en etikett i 2 px-steg: tooltipen får inte blinka till
    const hl = await k.js(`__gp.etikett("0013")`);
    const glapp = [];
    for (let px = hl.vanster - 40; px <= hl.x; px += 2) {
      await mus(k, px, hl.y); await sov(12);
      if ((await k.js(`__gp.tooltip()`)) === null) glapp.push(Math.round(px - hl.vanster));
    }
    kontroll("ingen blinkning från linjeslut till etikett", glapp.length === 0, glapp);
    await klick(k, et.x, et.y); await sov(250);
    kontroll("klick på etiketten fäster Kalmar", (await k.js(`__gp.fasta()`))[0].includes("Kalmar"), await k.js(`__gp.fasta()`));
    await mus(k, rekt.x + rekt.b / 2, rekt.y + rekt.h + 80); await sov(200);
    kontroll("pekaren utanför: ingen tooltip", (await k.js(`__gp.tooltip()`)) === null);
    await sparaBild(k, "06-n79179-tva-fasta-vila-1440");

    // Tangentbord: Tab ger synlig fokusring, pilar, Enter, Escape
    await k.js(`document.activeElement?.blur(); window.scrollTo(0, 0); true`);
    await tryck(k, "Tab"); await sov(150);
    const fk = await k.js(`__gp.fokus()`);
    kontroll("Tab ger diagrammet synlig fokusring", fk.diagram && fk.synlig, fk);
    kontroll("fokus visar Halland senaste år", /^2025/.test((await k.js(`__gp.tooltip()`))?.text ?? ""), (await k.js(`__gp.tooltip()`))?.text);
    await tryck(k, "ArrowLeft"); await tryck(k, "ArrowLeft");
    kontroll("← flyttar till 2023 (Halland saknar värde)", /^2023/.test((await k.js(`__gp.tooltip()`))?.text ?? ""), (await k.js(`__gp.tooltip()`))?.text);
    await tryck(k, "Home");
    kontroll("Home går till 2016", /^2016/.test((await k.js(`__gp.tooltip()`))?.text ?? ""));
    await tryck(k, "End");
    for (let i = 0; i < 5; i++) await tryck(k, "ArrowDown");
    const lyftTangent = await k.js(`__gp.lyft()`);
    kontroll("↓ växlar till en övrig region", lyftTangent !== null, lyftTangent);
    kontroll("aria-live läser upp perioden", /^2025/.test(await k.js(`__gp.live()`)), await k.js(`__gp.live()`));
    await sparaBild(k, "07-n79179-tangentbord-1440");
    await tryck(k, "Enter"); await sov(150);
    kontroll("Enter fäster regionen", (await k.js(`__gp.fasta()`))[0].split(",").length === 3, await k.js(`__gp.fasta()`));
    await tryck(k, "Escape"); await sov(100);
    kontroll("Escape stänger tooltipen", (await k.js(`__gp.tooltip()`)) === null);
  } finally { await stangFlik(k); }
}

// ── Galleri för G2: fem SKR-indikatorer och två akutflödesindikatorer ──

const GALLERI = [
  ["n79179", "vy=ar&sektion=skr-tillganglighet&kpi=kolada-n79179"],
  ["u79049", "vy=ar&sektion=skr-tillganglighet&kpi=kolada-u79049"],
  ["n79221", "vy=ar&sektion=skr-tillganglighet&kpi=kolada-n79221"],
  ["u70020", "vy=ar&sektion=skr-kostnader&kpi=kolada-u70020"],
  ["u70425", "vy=ar&sektion=skr-saker-vard&kpi=kolada-u70425"],
  ["belaggning", "vy=manad&sektion=akutflode&kpi=belaggning"],
  ["vantetid", "vy=manad&sektion=akutflode&kpi=vantetid"],
];

async function galleri(bredd = 1440, hojd = 900) {
  for (const [namn, q] of GALLERI) {
    const skr = q.includes("skr-");
    const k = await oppnaFlik(url(q), bredd, hojd);
    try {
      await sparaBild(k, `g-${namn}-vila-${bredd}`);
      const r = await k.js(`__gp.rekt()`);
      // Hovra en period till vänster om mitten, nära en kontextlinje om det finns
      const st = await k.js(`(() => { const p = [...__gp.svg().querySelectorAll('[data-lager-id="kontext"] path')][3]; return p ? p.getAttribute("data-serie") : null; })()`);
      if (st) {
        const pk = await k.js(`__gp.punkter(${JSON.stringify(st)})`);
        const i = Math.max(1, Math.floor(pk.length * 0.35));
        await mus(k, r.x + pk[i].x + 1, r.y + pk[i].y + 2);
      } else {
        await mus(k, r.x + r.b * 0.62, r.y + r.h * 0.5);
      }
      await sov(250);
      await sparaBild(k, `g-${namn}-hovra-${bredd}`);
      if (skr) {
        await k.skicka("Page.navigate", { url: url(`${q}&fasta=0012,0001`) });
        await sov(1200);
        await k.js(`document.fonts.ready`);
        await sov(300);
        await sparaBild(k, `g-${namn}-tva-fasta-${bredd}`);
      }
    } finally { await stangFlik(k); }
  }
}

// ── Mobil 390 px med pekskärm ──

async function mobil() {
  const k = await oppnaFlik(url("vy=ar&sektion=skr-tillganglighet&kpi=kolada-n79179"), 390, 844, { pek: true });
  try {
    await sparaBild(k, "m-n79179-vila-390");
    const vb = await k.js(`__gp.punkter("0024")`);
    const [x, y] = await iSvg(k, vb[3].x, vb[3].y + 2);
    await peka(k, x, y); await sov(200);
    kontroll("pekskärm: tryck visar tooltip och lyfter linjen", (await k.js(`__gp.lyft()`)) === "0024", await k.js(`__gp.lyft()`));
    await sparaBild(k, "m-n79179-tryck-390");
    await peka(k, x, y); await sov(250);
    kontroll("pekskärm: tryck igen fäster", (await k.js(`__gp.fasta()`))[0].includes("Västerbotten"), await k.js(`__gp.fasta()`));
    await sparaBild(k, "m-n79179-tryck-igen-390");
    await peka(k, 20, 10); await sov(200);
    kontroll("pekskärm: tryck utanför stänger", (await k.js(`__gp.tooltip()`)) === null);
  } finally { await stangFlik(k); }
  const k2 = await oppnaFlik(url("vy=manad&sektion=akutflode&kpi=belaggning"), 390, 844, { pek: true });
  try { await sparaBild(k2, "m-belaggning-vila-390"); } finally { await stangFlik(k2); }
}

// ── Stilguidesektionen i 1440 och 390 px ──

async function stilguide() {
  for (const [bredd, hojd] of [[1440, 900], [390, 844]]) {
    const k = await oppnaFlik(url("stilguide=linje"), bredd, hojd);
    try {
      await k.js(`new Promise((r) => { const f = () => document.querySelectorAll("[data-diagram] svg").length >= 4 ? r(true) : setTimeout(f, 100); f(); })`);
      await sov(300);
      for (let n = 0; n < 4; n++) await sparaBild(k, `s-linje-${n + 1}-${bredd}`, n);
    } finally { await stangFlik(k); }
  }
}

// ── Valfria adresser (--q "a;b", --bredd) ──

async function prov() {
  const bredd = Number(varde("bredd") ?? 1440);
  for (const q of (varde("q") ?? "").split(";").filter(Boolean)) {
    const namn = q.replace(/[^a-z0-9]+/gi, "-").slice(0, 60);
    const k = await oppnaFlik(url(q), bredd, bredd < 640 ? 844 : 900);
    try {
      await sparaBild(k, `q-${namn}-vila-${bredd}`);
      const r = await k.js(`__gp.rekt()`);
      await mus(k, r.x + r.b * 0.4, r.y + r.h * 0.5); await sov(250);
      await sparaBild(k, `q-${namn}-hovra-${bredd}`);
    } finally { await stangFlik(k); }
  }
}

const SVITER = { granskning, galleri, mobil, stilguide, prov };

try {
  await startaVite();
  await startaEdge();
  for (const [namn, f] of Object.entries(SVITER)) {
    if (BARA ? !BARA.includes(namn) : namn === "prov") continue;
    console.log(`\n== ${namn}`);
    await f();
  }
  fs.writeFileSync(path.join(UT, "rapport.json"), JSON.stringify(rapport, null, 2));
  const fel = rapport.kontroller.filter((x) => !x.ok).length;
  console.log(`\n${rapport.kontroller.length - fel} av ${rapport.kontroller.length} kontroller OK. Bilder och rapport.json i ${UT}`);
  process.exitCode = fel ? 1 : 0;
} finally {
  dodaEgnaEdge();
  if (startade.vite && startade.vite.exitCode === null) startade.vite.kill();
}
