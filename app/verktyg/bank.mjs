// bank.mjs: skärmdumpsbänk som tar bilder av rapportens vyer och jämför dem
// pixel för pixel mot en baslinje. Ägs av WP0; WP7 bygger ut listan VYER med
// nya adresser och kontaktarket.
//
//   npm run bank -- --baslinje          tar baslinjen  (verktyg/bank/baslinje/)
//   npm run bank                        tar nya bilder (verktyg/bank/senaste/),
//                                       jämför och skriver verktyg/bank/rapport.html
//   npm run bank -- --skarmdump         tar bara bilder till senaste/, ingen jämförelse
//   npm run bank -- --vyer start,ny-ram bara angivna vyer (även extra-vyer)
//   npm run bank -- --bredder 1440      bara angivna bredder
//   npm run bank -- --tolerans 0.1      största tillåtna andel avvikande pixlar i procent
//
// Miljövariabler: BANK_PORT (Vite, standard 5174) och CDP_PORT (Edge, standard
// 9223). Med egna portar kan flera agenter köra bänken samtidigt. BANK_URL pekar
// bänken mot en server som redan kör (t.ex. `vite preview` av ett bygge) i stället
// för att starta Vite; adresserna i VYER läggs till efter den.
//
// Bänken startar själv en Vite dev-server (motsvarar `npx vite --port
// $BANK_PORT --strictPort`, men startas med node direkt så att processen går
// att avsluta utan skal) och en headless Edge med egen profilmapp i %TEMP%.
// Den avslutar bara processer den själv startat: Edge identifieras på sin
// profilmapp, aldrig på namn, så användarens egen Edge lämnas ifred.
//
// Fallgropar (verifierade tidigare):
// - Page.captureScreenshot med `clip` använder sidkoordinater. Bänken tar därför
//   bilder utan clip (synlig viewport) och rullar i stället.
// - Viewporten ställs in en gång per flik före navigeringen och ändras aldrig
//   mitt i en mätning; ResizeObserver skulle annars rita om graferna.
//   captureBeyondViewport används inte av samma skäl.
// - Vänta på document.fonts.ready och ~1,5 s efter navigering.

import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HAR = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(HAR, "..");
const BANK = path.join(HAR, "bank");
const EDGE = process.env.EDGE_PATH ?? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const BANK_PORT = Number(process.env.BANK_PORT ?? 5174);
const CDP_PORT = Number(process.env.CDP_PORT ?? 9223);
const PROFIL = path.join(os.tmpdir(), `hos-bank-edge-${CDP_PORT}`);
const BAS_URL = (process.env.BANK_URL ?? `http://localhost:${BANK_PORT}`).replace(/\/$/, "");

// ── Argument ──
const argv = process.argv.slice(2);
const flagga = (namn) => argv.includes(`--${namn}`);
const varde = (namn) => {
  const i = argv.indexOf(`--${namn}`);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : null;
};
const BASLINJE = flagga("baslinje");
const BARA_BILDER = flagga("skarmdump");
const TOLERANS = Number(varde("tolerans") ?? 0.1); // procent
const VALDA_VYER = varde("vyer")?.split(",").map((s) => s.trim()).filter(Boolean) ?? null;
const BREDDER = (varde("bredder") ?? "1440,390").split(",").map(Number);
const HOJD = { 1440: 900, 390: 844 };

const sov = (ms) => new Promise((r) => setTimeout(r, ms));

// ════════════════════════════════════════════════════════════
//  Vyer. Varje vy har en adress (eller en funktion av bredden), en lista med
//  steg som körs efter laddningen och ett största antal skivor. Steg:
//    { vanta: "selektor" }                  vänta tills elementet finns
//    { klicka: "selektor", index: n }       element.click() på n:te träffen
//    { vila: ms }                           vänta en fast tid
//  Rullningen sker i det element som har overflow-y auto/scroll och störst
//  rullbar höjd (gamla rapportvyn rullar i en inre container), annars i
//  dokumentet. `extra: true` = körs bara när vyn anges med --vyer.
// ════════════════════════════════════════════════════════════

const grafprov = (param) => (bredd) =>
  `/verktyg/grafprov.html?${param}&w=${Math.min(820, bredd - 32)}`;

export const VYER = [
  {
    id: "start",
    adress: "/",
    steg: [{ vanta: "button.start-area" }],
    skivor: 6,
  },
  {
    id: "kapitel2",
    adress: "/",
    steg: [{ vanta: "button.start-area" }, { klicka: "button.start-area", index: 1 }, { vanta: "[data-block]" }],
    skivor: 6,
  },
  {
    id: "akutflode",
    adress: "/",
    steg: [{ vanta: "button.start-area" }, { klicka: "button.start-area", index: 6 }, { vanta: "[data-block]" }],
    skivor: 6,
  },
  {
    id: "graf-spagetti",
    adress: grafprov("vy=ar&sektion=skr-tillganglighet&kpi=kolada-n79179"),
    steg: [{ vanta: "svg rect[role='img']" }],
    skivor: 2,
  },
  {
    id: "graf-fasta",
    adress: grafprov("vy=ar&sektion=skr-tillganglighet&kpi=kolada-n79221&pin=Stockholm,Skåne"),
    steg: [{ vanta: "svg rect[role='img']" }],
    skivor: 2,
  },
  {
    id: "graf-hovring",
    adress: grafprov("vy=ar&sektion=skr-tillganglighet&kpi=kolada-n79179&hover=0.55,0.4"),
    steg: [{ vanta: "svg rect[role='img']" }],
    skivor: 2,
  },
  {
    id: "graf-forvantat",
    adress: grafprov("vy=manad&sektion=akutflode&kpi=belaggning"),
    steg: [{ vanta: ".figur svg" }],
    skivor: 2,
  },
  {
    id: "graf-kostnad",
    adress: grafprov("vy=ar&sektion=skr-kostnader&kpi=kolada-u70020"),
    steg: [{ vanta: "svg rect[role='img']" }],
    skivor: 2,
  },
  {
    // Den nya ramen bakom ?ny-flaggan. Ingår inte i jämförelsen förrän den
    // har en baslinje som är värd att skydda.
    id: "ny-ram",
    adress: "/?ny",
    steg: [{ vanta: "[data-ram]" }],
    skivor: 1,
    extra: true,
  },
];

// ════════════════════════════════════════════════════════════
//  Processer
// ════════════════════════════════════════════════════════════

const startade = { vite: null, edge: null };

async function vantaPaUrl(url, ms, namn) {
  const slut = Date.now() + ms;
  while (Date.now() < slut) {
    try {
      const r = await fetch(url);
      if (r.ok) return r;
    } catch { /* inte uppe än */ }
    await sov(250);
  }
  throw new Error(`${namn} svarade inte på ${url} inom ${ms} ms`);
}

async function startaVite() {
  const bin = path.join(APP, "node_modules/vite/bin/vite.js");
  const p = spawn(process.execPath, [bin, "--port", String(BANK_PORT), "--strictPort"], {
    cwd: APP, stdio: ["ignore", "pipe", "pipe"], windowsHide: true,
  });
  let logg = "";
  p.stdout.on("data", (d) => { logg += d; });
  p.stderr.on("data", (d) => { logg += d; });
  p.on("exit", (kod) => { if (kod && !avslutar) console.error(`Vite avslutades (${kod}):\n${logg}`); });
  startade.vite = p;
  await vantaPaUrl(`http://localhost:${BANK_PORT}/`, 60_000, "Vite").catch((e) => {
    throw new Error(`${e.message}\n${logg}`);
  });
}

// Avslutar Edge-processer vars kommandorad innehåller bänkens profilmapp.
function dodaEgnaEdge() {
  if (process.platform !== "win32") return;
  const skript = `Get-CimInstance Win32_Process -Filter "Name = 'msedge.exe'" | `
    + `Where-Object { $_.CommandLine -and $_.CommandLine.Contains('${PROFIL.replace(/'/g, "''")}') } | `
    + `ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`;
  try {
    execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", skript], { stdio: "ignore" });
  } catch { /* inget att avsluta */ }
}

async function startaEdge() {
  dodaEgnaEdge(); // rester från en avbruten körning med samma port
  fs.rmSync(PROFIL, { recursive: true, force: true, maxRetries: 3 });
  const p = spawn(EDGE, [
    "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run",
    "--no-default-browser-check", "--disable-extensions", "--disable-component-update",
    "--disable-background-networking", "--disable-sync", "--mute-audio",
    "--force-color-profile=srgb", "--force-device-scale-factor=1",
    "--remote-allow-origins=*",
    `--user-data-dir=${PROFIL}`, `--remote-debugging-port=${CDP_PORT}`, "about:blank",
  ], { stdio: "ignore", windowsHide: true });
  startade.edge = p;
  const r = await vantaPaUrl(`http://127.0.0.1:${CDP_PORT}/json/version`, 30_000, "Edge");
  return (await r.json()).webSocketDebuggerUrl;
}

let avslutar = false;
async function stadaUpp(webblasareWs) {
  avslutar = true;
  if (webblasareWs) {
    try {
      const k = await Cdp.anslut(webblasareWs);
      k.skicka("Browser.close").catch(() => {});
      await sov(800);
      k.stang();
    } catch { /* redan stängd */ }
  }
  dodaEgnaEdge();
  if (startade.vite && startade.vite.exitCode === null) startade.vite.kill();
}

// ════════════════════════════════════════════════════════════
//  DevTools-protokollet
// ════════════════════════════════════════════════════════════

class Cdp {
  static async anslut(url) {
    const k = new Cdp();
    k.ws = new WebSocket(url);
    k.id = 0;
    k.vantande = new Map();
    k.lyssnare = new Map();
    k.ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && k.vantande.has(m.id)) {
        const { lös, avvisa } = k.vantande.get(m.id);
        k.vantande.delete(m.id);
        if (m.error) avvisa(new Error(`${m.error.message} (${m.error.code})`));
        else lös(m.result);
      } else if (m.method && k.lyssnare.has(m.method)) {
        for (const f of k.lyssnare.get(m.method)) f(m.params);
      }
    };
    await new Promise((r, e) => { k.ws.onopen = r; k.ws.onerror = e; });
    return k;
  }
  skicka(method, params = {}) {
    return new Promise((lös, avvisa) => {
      const i = ++this.id;
      this.vantande.set(i, { lös, avvisa });
      this.ws.send(JSON.stringify({ id: i, method, params }));
    });
  }
  vanta(method, ms = 30_000) {
    return new Promise((lös, avvisa) => {
      const t = setTimeout(() => avvisa(new Error(`timeout: ${method}`)), ms);
      const f = (p) => { clearTimeout(t); this.lyssnare.get(method).delete(f); lös(p); };
      if (!this.lyssnare.has(method)) this.lyssnare.set(method, new Set());
      this.lyssnare.get(method).add(f);
    });
  }
  async utvardera(uttryck) {
    const r = await this.skicka("Runtime.evaluate", { expression: uttryck, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(`Fel i sidan: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`);
    return r.result.value;
  }
  stang() { try { this.ws.close(); } catch { /* redan stängd */ } }
}

// Körs i sidan: väntar på att ett element finns.
const vantaUttryck = (sel, ms = 20_000) => `new Promise((lös, avvisa) => {
  const slut = Date.now() + ${ms};
  const f = () => document.querySelector(${JSON.stringify(sel)}) ? lös(true)
    : Date.now() > slut ? avvisa(new Error("hittade inte " + ${JSON.stringify(sel)})) : setTimeout(f, 100);
  f();
})`;

// Körs i sidan: väntar på att stilmallar och typsnitt laddats och två
// renderingsbilder passerat.
const vilaUttryck = `(async () => {
  const lankar = [...document.querySelectorAll('link[rel="stylesheet"]')];
  const slut = Date.now() + 10000;
  while (lankar.some((l) => !l.sheet) && Date.now() < slut) await new Promise((r) => setTimeout(r, 100));
  await document.fonts.ready;
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  return document.fonts.status;
})()`;

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

async function fotograferaVy(vy, bredd, utMapp) {
  const hojd = HOJD[bredd] ?? 900;
  const adress = typeof vy.adress === "function" ? vy.adress(bredd) : vy.adress;
  const url = `${BAS_URL}${adress}`;
  const flik = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?about:blank`, { method: "PUT" })).json();
  const k = await Cdp.anslut(flik.webSocketDebuggerUrl);
  const filer = [];
  try {
    await k.skicka("Page.enable");
    await k.skicka("Runtime.enable");
    await k.skicka("Emulation.setDeviceMetricsOverride", { width: bredd, height: hojd, deviceScaleFactor: 1, mobile: false });
    const laddad = k.vanta("Page.loadEventFired");
    await k.skicka("Page.navigate", { url });
    await laddad;
    for (const s of vy.steg ?? []) {
      if (s.vanta) await k.utvardera(vantaUttryck(s.vanta));
      else if (s.klicka) {
        await k.utvardera(`(() => { const el = document.querySelectorAll(${JSON.stringify(s.klicka)})[${s.index ?? 0}];
          if (!el) throw new Error("hittade inte ${s.klicka.replace(/"/g, "'")}[${s.index ?? 0}]"); el.click(); return true; })()`);
      } else if (s.vila) await sov(s.vila);
    }
    await k.utvardera(vilaUttryck);
    await sov(1500);
    await k.utvardera(vilaUttryck);
    await k.utvardera(rullUttryck);

    const steg = 820;
    let foregaende = -1;
    for (let i = 0; i < (vy.skivor ?? 6); i++) {
      const y = await k.utvardera(rullaTill(i * steg));
      if (i > 0 && y === foregaende) break; // slutet nått
      foregaende = y;
      await sov(i === 0 ? 300 : 700); // rullningsstyrda tillstånd (läsposition) hinner sätta sig
      const bild = await k.skicka("Page.captureScreenshot", { format: "png" });
      const namn = `${vy.id}-${bredd}-${String(i + 1).padStart(2, "0")}.png`;
      fs.writeFileSync(path.join(utMapp, namn), Buffer.from(bild.data, "base64"));
      filer.push(namn);
    }
  } finally {
    k.stang();
    await fetch(`http://127.0.0.1:${CDP_PORT}/json/close/${flik.id}`).catch(() => {});
  }
  return filer;
}

// ════════════════════════════════════════════════════════════
//  Jämförelse och rapport
// ════════════════════════════════════════════════════════════

async function jamfor(namnLista) {
  const { PNG } = await import("pngjs");
  const { default: pixelmatch } = await import("pixelmatch");
  const diffMapp = path.join(BANK, "diff");
  fs.rmSync(diffMapp, { recursive: true, force: true });
  fs.mkdirSync(diffMapp, { recursive: true });
  const las = (p) => PNG.sync.read(fs.readFileSync(p));
  const resultat = [];
  for (const namn of namnLista) {
    const bas = path.join(BANK, "baslinje", namn);
    const ny = path.join(BANK, "senaste", namn);
    if (!fs.existsSync(bas)) { resultat.push({ namn, status: "saknar baslinje", andel: 100 }); continue; }
    if (!fs.existsSync(ny)) { resultat.push({ namn, status: "saknas i senaste", andel: 100 }); continue; }
    const a = las(bas), b = las(ny);
    if (a.width !== b.width || a.height !== b.height) {
      resultat.push({ namn, status: `olika mått ${a.width}×${a.height} / ${b.width}×${b.height}`, andel: 100 });
      continue;
    }
    const diff = new PNG({ width: a.width, height: a.height });
    // Kantutjämning räknas med (includeAA) så att typsnittsskillnader syns.
    const avvikande = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.1, includeAA: true });
    let exakt = 0;
    for (let i = 0; i < a.data.length; i += 4) {
      if (a.data[i] !== b.data[i] || a.data[i + 1] !== b.data[i + 1] || a.data[i + 2] !== b.data[i + 2] || a.data[i + 3] !== b.data[i + 3]) exakt++;
    }
    fs.writeFileSync(path.join(diffMapp, namn), PNG.sync.write(diff));
    const andel = (100 * avvikande) / (a.width * a.height);
    resultat.push({ namn, status: andel > TOLERANS ? "avviker" : "ok", andel, avvikande, exakt, diff: true });
  }
  // Bilder som bara finns i baslinjen för vyer som kördes
  const korda = new Set(namnLista.map((n) => n.replace(/-\d+-\d+\.png$/, "")));
  for (const namn of fs.existsSync(path.join(BANK, "baslinje")) ? fs.readdirSync(path.join(BANK, "baslinje")) : []) {
    const vyId = namn.replace(/-\d+-\d+\.png$/, "");
    const bredd = Number(namn.match(/-(\d+)-\d+\.png$/)?.[1]);
    if (korda.has(vyId) && BREDDER.includes(bredd) && !namnLista.includes(namn)) {
      resultat.push({ namn, status: "saknas i senaste", andel: 100 });
    }
  }
  return resultat;
}

function skrivRapport(resultat) {
  const rader = [...resultat].sort((x, y) => y.andel - x.andel || x.namn.localeCompare(y.namn));
  const fmt = (v) => v.toLocaleString("sv-SE", { maximumFractionDigits: 4 });
  const cell = (mapp, namn) => fs.existsSync(path.join(BANK, mapp, namn))
    ? `<a href="${mapp}/${namn}"><img loading="lazy" src="${mapp}/${namn}" alt="${mapp} ${namn}"></a>` : `<span>saknas</span>`;
  const html = `<!doctype html>
<html lang="sv"><head><meta charset="utf-8"><title>Skärmdumpsbänk</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body { font: 14px/1.45 system-ui, sans-serif; margin: 24px; color: #1a1a1a; background: #fbfbf9; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  p.meta { color: #4a4f4c; margin: 0 0 24px; }
  table { border-collapse: collapse; width: 100%; }
  th, td { text-align: left; vertical-align: top; padding: 8px; border-bottom: 1px solid #e6e6e1; }
  th { font-weight: 600; color: #4a4f4c; }
  td.tal { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  img { width: 360px; height: auto; display: block; border: 1px solid #e6e6e1; }
  .avviker td:first-child { color: #9a2e22; font-weight: 600; }
</style></head><body>
<h1>Skärmdumpsbänk</h1>
<p class="meta">${new Date().toLocaleString("sv-SE")} · ${resultat.length} bilder · tolerans ${fmt(TOLERANS)} % · `
  + `${resultat.filter((r) => r.status !== "ok").length} avviker</p>
<table><thead><tr><th>Bild</th><th>Avvikande pixlar</th><th>Baslinje</th><th>Senaste</th><th>Diff</th></tr></thead><tbody>
${rader.map((r) => `<tr class="${r.status === "ok" ? "ok" : "avviker"}"><td>${r.namn}<br>${r.status}</td>`
  + `<td class="tal">${fmt(r.andel)} %<br>${r.avvikande ?? "–"} st (pixelmatch)<br>${r.exakt ?? "–"} st (exakt)</td>`
  + `<td>${cell("baslinje", r.namn)}</td><td>${cell("senaste", r.namn)}</td><td>${r.diff ? cell("diff", r.namn) : "–"}</td></tr>`).join("\n")}
</tbody></table></body></html>`;
  const ut = path.join(BANK, "rapport.html");
  fs.writeFileSync(ut, html);
  return ut;
}

// ════════════════════════════════════════════════════════════
//  Huvudflöde
// ════════════════════════════════════════════════════════════

const vyer = VYER.filter((v) => (VALDA_VYER ? VALDA_VYER.includes(v.id) : !v.extra));
if (VALDA_VYER) {
  const okanda = VALDA_VYER.filter((id) => !VYER.some((v) => v.id === id));
  if (okanda.length) { console.error(`Okända vyer: ${okanda.join(", ")}`); process.exit(2); }
}

const utMapp = path.join(BANK, BASLINJE ? "baslinje" : "senaste");
fs.mkdirSync(utMapp, { recursive: true });
// Rensa bara bilderna för de vyer och bredder som tas om
for (const f of fs.readdirSync(utMapp)) {
  const m = f.match(/^(.*)-(\d+)-\d+\.png$/);
  if (m && vyer.some((v) => v.id === m[1]) && BREDDER.includes(Number(m[2]))) fs.rmSync(path.join(utMapp, f));
}

let webblasareWs = null;
let kod = 0;
const avbryt = async () => { await stadaUpp(webblasareWs); process.exit(130); };
process.on("SIGINT", avbryt);
process.on("SIGTERM", avbryt);

try {
  if (process.env.BANK_URL) console.log(`Använder ${BAS_URL}; startar Edge på ${CDP_PORT} …`);
  else {
    console.log(`Startar Vite på ${BANK_PORT} och Edge på ${CDP_PORT} …`);
    await startaVite();
  }
  webblasareWs = await startaEdge();
  const tagna = [];
  for (const vy of vyer) {
    for (const bredd of BREDDER) {
      const filer = await fotograferaVy(vy, bredd, utMapp);
      console.log(`  ${vy.id} ${bredd}: ${filer.length} skivor`);
      tagna.push(...filer);
    }
  }
  if (BASLINJE) {
    console.log(`Baslinje: ${tagna.length} bilder i ${utMapp}`);
  } else if (BARA_BILDER) {
    console.log(`${tagna.length} bilder i ${utMapp}`);
  } else {
    const resultat = await jamfor(tagna);
    const ut = skrivRapport(resultat);
    const fel = resultat.filter((r) => r.status !== "ok");
    for (const r of resultat) {
      const tal = r.avvikande != null ? `${r.andel.toFixed(4)} % (${r.avvikande} st, exakt ${r.exakt} st)` : "";
      console.log(`  ${r.status === "ok" ? "ok     " : "AVVIKER"} ${r.namn} ${tal} ${r.status === "ok" || r.status === "avviker" ? "" : r.status}`);
    }
    console.log(`\n${resultat.length - fel.length}/${resultat.length} inom toleransen ${TOLERANS} %. Rapport: ${ut}`);
    if (fel.length) kod = 1;
  }
} catch (e) {
  console.error(e);
  kod = 1;
} finally {
  await stadaUpp(webblasareWs);
}
process.exit(kod);
