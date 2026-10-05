// webblasare.mjs: gemensam grund för bänken (bank.mjs) och tillgänglighets-
// körningen (a11y.mjs). Startar Vite och en headless Edge, talar
// DevTools-protokollet och städar efter sig. Ägare: WP7 (bruten ur WP0:s bank.mjs).
//
// Regler (verifierade tidigare, se bank.mjs):
// - Edge får en egen profilmapp i %TEMP% och avslutas på den, aldrig på namn,
//   så att användarens egen Edge lämnas ifred.
// - Viewporten ställs in en gång per flik före navigeringen och ändras aldrig
//   mitt i en mätning (ResizeObserver skulle rita om graferna).
// - Vänta på stilmallar, document.fonts.ready och två renderingsbilder.
//
// Miljövariabler: BANK_PORT (Vite, standard 5174), CDP_PORT (Edge, standard
// 9223), BANK_URL (befintlig server i stället för egen Vite), EDGE_PATH.

import { spawn, execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const HAR = path.dirname(fileURLToPath(import.meta.url));
export const APP = path.resolve(HAR, "..");
export const EDGE = process.env.EDGE_PATH ?? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
export const BANK_PORT = Number(process.env.BANK_PORT ?? 5174);
export const CDP_PORT = Number(process.env.CDP_PORT ?? 9223);
export const EGEN_SERVER = Boolean(process.env.BANK_URL);
export const BAS_URL = (process.env.BANK_URL ?? `http://localhost:${BANK_PORT}`).replace(/\/$/, "");
const PROFIL = path.join(os.tmpdir(), `hos-bank-edge-${CDP_PORT}`);

export const sov = (ms) => new Promise((r) => setTimeout(r, ms));

export async function vantaPaUrl(url, ms, namn) {
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

// ════════════════════════════════════════════════════════════
//  Processer
// ════════════════════════════════════════════════════════════

const startade = { vite: null, edge: null };
let avslutar = false;

/** Startar Vite med node direkt (inte via skal), så att processen går att avsluta. */
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

/** Avslutar Edge-processer vars kommandorad innehåller bänkens profilmapp. */
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
  // En nyss avslutad Edge kan hålla filer i profilen en stund. Går mappen inte
  // att tömma används en egen mapp för den här körningen; den börjar med samma
  // namn, så dodaEgnaEdge hittar den ändå.
  let profil = PROFIL;
  try {
    fs.rmSync(PROFIL, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
  } catch {
    profil = `${PROFIL}-${process.pid}`;
    fs.rmSync(profil, { recursive: true, force: true });
  }
  const p = spawn(EDGE, [
    "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run",
    "--no-default-browser-check", "--disable-extensions", "--disable-component-update",
    "--disable-background-networking", "--disable-sync", "--mute-audio",
    "--force-color-profile=srgb", "--force-device-scale-factor=1",
    "--remote-allow-origins=*",
    `--user-data-dir=${profil}`, `--remote-debugging-port=${CDP_PORT}`, "about:blank",
  ], { stdio: "ignore", windowsHide: true });
  startade.edge = p;
  const r = await vantaPaUrl(`http://127.0.0.1:${CDP_PORT}/json/version`, 30_000, "Edge");
  return (await r.json()).webSocketDebuggerUrl;
}

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

/**
 * Startar Vite (om inte BANK_URL är satt) och Edge, kör `arbete` och städar
 * alltid upp, även vid Ctrl+C. Returnerar arbetets avslutskod.
 */
export async function medWebblasare(arbete) {
  let ws = null;
  const avbryt = async () => { await stadaUpp(ws); process.exit(130); };
  process.on("SIGINT", avbryt);
  process.on("SIGTERM", avbryt);
  try {
    if (EGEN_SERVER) console.log(`Använder ${BAS_URL}; startar Edge på ${CDP_PORT} …`);
    else {
      console.log(`Startar Vite på ${BANK_PORT} och Edge på ${CDP_PORT} …`);
      await startaVite();
    }
    ws = await startaEdge();
    return await arbete();
  } catch (e) {
    console.error(e);
    return 1;
  } finally {
    await stadaUpp(ws);
  }
}

// ════════════════════════════════════════════════════════════
//  DevTools-protokollet
// ════════════════════════════════════════════════════════════

export class Cdp {
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
  lyssna(method, f) {
    if (!this.lyssnare.has(method)) this.lyssnare.set(method, new Set());
    this.lyssnare.get(method).add(f);
  }
  async utvardera(uttryck) {
    const r = await this.skicka("Runtime.evaluate", { expression: uttryck, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(`Fel i sidan: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`);
    return r.result.value;
  }
  stang() { try { this.ws.close(); } catch { /* redan stängd */ } }
}

/** Körs i sidan: väntar på att ett element finns. */
export const vantaUttryck = (sel, ms = 20_000) => `new Promise((lös, avvisa) => {
  const slut = Date.now() + ${ms};
  const f = () => document.querySelector(${JSON.stringify(sel)}) ? lös(true)
    : Date.now() > slut ? avvisa(new Error("hittade inte " + ${JSON.stringify(sel)})) : setTimeout(f, 100);
  f();
})`;

/** Körs i sidan: väntar på att stilmallar och typsnitt laddats och två renderingsbilder passerat. */
export const vilaUttryck = `(async () => {
  const lankar = [...document.querySelectorAll('link[rel="stylesheet"]')];
  const slut = Date.now() + 10000;
  while (lankar.some((l) => !l.sheet) && Date.now() < slut) await new Promise((r) => setTimeout(r, 100));
  await document.fonts.ready;
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  return document.fonts.status;
})()`;

/**
 * Öppnar en ny flik med fast viewport (ställs in före navigeringen och ändras
 * aldrig), navigerar och kör vyns steg. Returnerar { k, stang }.
 *   steg: { vanta: "selektor" } | { klicka: "selektor", index } | { vila: ms }
 */
export async function oppnaSida(adress, { bredd, hojd, steg = [], konsol = null }) {
  const url = /^https?:/.test(adress) ? adress : `${BAS_URL}${adress}`;
  const flik = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?about:blank`, { method: "PUT" })).json();
  const k = await Cdp.anslut(flik.webSocketDebuggerUrl);
  const stang = async () => {
    k.stang();
    await fetch(`http://127.0.0.1:${CDP_PORT}/json/close/${flik.id}`).catch(() => {});
  };
  try {
    await k.skicka("Page.enable");
    await k.skicka("Runtime.enable");
    if (konsol) {
      k.lyssna("Runtime.consoleAPICalled", (p) => {
        if (p.type === "error" || p.type === "warning") konsol(p.type, p.args.map((a) => a.value ?? a.description ?? "").join(" "));
      });
      k.lyssna("Runtime.exceptionThrown", (p) => konsol("exception", p.exceptionDetails?.exception?.description ?? p.exceptionDetails?.text));
    }
    await k.skicka("Emulation.setDeviceMetricsOverride", { width: bredd, height: hojd, deviceScaleFactor: 1, mobile: false });
    const laddad = k.vanta("Page.loadEventFired");
    await k.skicka("Page.navigate", { url });
    await laddad;
    for (const s of steg) {
      if (s.vanta) await k.utvardera(vantaUttryck(s.vanta));
      else if (s.klicka) {
        await k.utvardera(`(() => { const el = document.querySelectorAll(${JSON.stringify(s.klicka)})[${s.index ?? 0}];
          if (!el) throw new Error("hittade inte ${s.klicka.replace(/"/g, "'")}[${s.index ?? 0}]"); el.click(); return true; })()`);
      } else if (s.vila) await sov(s.vila);
    }
    await k.utvardera(vilaUttryck);
    await sov(1500);
    await k.utvardera(vilaUttryck);
    return { k, stang };
  } catch (e) {
    await stang();
    throw e;
  }
}
