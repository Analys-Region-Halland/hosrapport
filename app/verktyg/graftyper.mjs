// graftyper.mjs: granskning av WP3:s graftyper (rangordning, stapel, små
// multiplar, minidiagram) med riktiga mus-, tangent- och pekskärmshändelser
// via DevTools-protokollet mot en egen headless Edge, i den levande
// stilguiden (verktyg/stilguide.html). Tar skärmdumpar i 1440 och 390 px, i
// vila och med hovring, och mäter beteendet: tooltip, att statiska lagret
// inte ändras under hovring (MutationObserver), fästa via klick och Enter,
// synkroniserad hjälplinje, nedborrning, tooltip under grafen på mobil och
// att inget ger vågrät rullning från 320 px. Ägare: WP3.
//
//   node verktyg/graftyper.mjs                     hela sviten
//   node verktyg/graftyper.mjs --ut <mapp>         var bilder och rapport.json hamnar
//                                                  (förval verktyg/bank/graftyper, gitignorerad)
//   node verktyg/graftyper.mjs --bara vila,mus,tangent,peka,smal
//
// Processer och portar som i bänken (webblasare.mjs): BANK_PORT, CDP_PORT,
// BANK_URL. Avslutar bara det skriptet själv startat.

import fs from "node:fs";
import path from "node:path";
import { BAS_URL, CDP_PORT, Cdp, HAR, medWebblasare, sov, vantaUttryck } from "./webblasare.mjs";

const argv = process.argv.slice(2);
const varde = (n) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : null; };
const UT = path.resolve(varde("ut") ?? path.join(HAR, "bank", "graftyper"));
const BARA = varde("bara")?.split(",") ?? null;
fs.mkdirSync(UT, { recursive: true });

const SIDA = "/verktyg/stilguide.html";
const EXEMPEL = ["rangordning-regioner", "rangordning-lika", "rangordning-sjukhus", "stapel-manad", "sma-sjukhus", "sma-avdelning", "minidiagram-tabell"];

// Hjälpfunktioner i sidan. `e` är exemplets data-bank-bild.
const SIDHJALP = `
window.__gt = {
  ex(e) { return document.querySelector('[data-bank-bild="' + e + '"]'); },
  diagram(e) { return this.ex(e)?.querySelector("[data-diagram]"); },
  svg(e) { return this.diagram(e)?.querySelector('svg[role="img"]'); },
  visa(e) { this.ex(e).scrollIntoView({ block: "start" }); window.scrollBy(0, -16); return true; },
  rekt(e) { const r = this.svg(e).getBoundingClientRect(); return { x: r.left, y: r.top, b: r.width, h: r.height }; },
  exRekt(e) { const r = this.ex(e).getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, b: r.width, h: r.height }; },
  tooltip(e) {
    const t = this.diagram(e)?.querySelector("[data-tooltip]");
    if (!t) return null;
    const r = t.getBoundingClientRect(), s = this.svg(e).getBoundingClientRect();
    return { text: t.innerText.replace(/\\s+/g, " ").trim(), x: r.left - s.left, y: r.top - s.top, b: r.width, h: r.height,
      helBredd: t.hasAttribute("data-hel-bredd"), sidX: r.left + scrollX, sidY: r.top + scrollY, svgH: s.height, svgB: s.width };
  },
  rader(e) {
    return [...this.svg(e).querySelectorAll('[data-lager="statisk"] circle[data-serie]')].map((c) => ({ id: c.getAttribute("data-serie"), x: +c.getAttribute("cx"), y: +c.getAttribute("cy") }))
      .sort((a, b) => a.y - b.y);
  },
  staplar(e) { return [...this.svg(e).querySelectorAll('[data-lager="statisk"] rect[data-index]')].map((r) => ({ i: +r.getAttribute("data-index"), x: +r.getAttribute("x") + +r.getAttribute("width") / 2, y: +r.getAttribute("y"), h: +r.getAttribute("height") })); },
  paneler(e) { return [...this.svg(e).querySelectorAll("[data-panelnamn]")].map((g) => { const r = g.querySelector("rect"); return { id: g.getAttribute("data-panelnamn"), x: +r.getAttribute("x"), y: +r.getAttribute("y"), b: +r.getAttribute("width"), h: +r.getAttribute("height"), text: g.textContent }; }); },
  lyft(e) { return this.diagram(e)?.querySelector("[data-lyft]")?.getAttribute("data-lyft") ?? null; },
  morkad(e) { return this.diagram(e)?.querySelector("[data-morkad]")?.getAttribute("data-morkad") ?? null; },
  hjalplinjer(e) { return [...this.diagram(e).querySelectorAll("[data-hjalplinje]")].map((l) => ({ x1: +l.getAttribute("x1"), y1: +l.getAttribute("y1"), x2: +l.getAttribute("x2"), y2: +l.getAttribute("y2") })); },
  chips(e) { return [...this.ex(e).querySelectorAll("[data-chip]")].map((c) => c.getAttribute("data-chip")); },
  brodsmula(e) { return this.ex(e).querySelector("[data-brodsmula]")?.innerText.replace(/\\s+/g, " ").trim() ?? ""; },
  titel(e) { return this.ex(e).querySelector("[data-figur] h4")?.textContent ?? ""; },
  live(e) { return this.diagram(e)?.querySelector("[data-live]")?.textContent ?? ""; },
  fokus() { const a = document.activeElement; return { tagg: a?.tagName ?? null, synlig: a?.matches?.(":focus-visible") ?? false, ex: a?.closest?.("[data-bank-bild]")?.getAttribute("data-bank-bild") ?? null }; },
  bevaka(e) {
    window.__gtMut = 0;
    window.__gtObs?.disconnect();
    window.__gtObs = new MutationObserver((l) => { window.__gtMut += l.length; });
    const st = this.svg(e).querySelector('[data-lager="statisk"]');
    window.__gtObs.observe(st, { subtree: true, childList: true, attributes: true, characterData: true });
    window.__gtStatisk = st;
    return true;
  },
  mutationer(e) { return { antal: window.__gtMut, sammaNod: window.__gtStatisk === this.svg(e).querySelector('[data-lager="statisk"]') }; },
  bredd() { return { dok: document.documentElement.scrollWidth, fonster: innerWidth }; },
  ryms(e) {
    const ex = this.ex(e);
    const f = ex.querySelector("[data-figur]") ?? ex;
    const r = f.getBoundingClientRect();
    const svgar = [...ex.querySelectorAll("svg")].map((s) => s.getBoundingClientRect().right);
    return { hoger: Math.max(r.right, ...svgar), fonster: innerWidth, overflow: f.scrollWidth - f.clientWidth };
  },
  minidiagram(e) { return [...this.ex(e).querySelectorAll('svg[data-minidiagram]')].map((s) => ({ b: s.getAttribute("width"), h: s.getAttribute("height"), roll: s.getAttribute("role"), namn: (s.getAttribute("aria-label") ?? "").length, fokus: s.getAttribute("tabindex") })); },
};`;

// ── Flikar och händelser ──

async function oppna(bredd, hojd, { pek = false } = {}) {
  const flik = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?about:blank`, { method: "PUT" })).json();
  const k = await Cdp.anslut(flik.webSocketDebuggerUrl);
  k.flikId = flik.id;
  await k.skicka("Page.enable");
  await k.skicka("Runtime.enable");
  await k.skicka("Emulation.setDeviceMetricsOverride", { width: bredd, height: hojd, deviceScaleFactor: 1, mobile: pek });
  if (pek) await k.skicka("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
  await k.skicka("Page.addScriptToEvaluateOnNewDocument", { source: SIDHJALP });
  const laddad = k.vanta("Page.loadEventFired");
  await k.skicka("Page.navigate", { url: `${BAS_URL}${SIDA}` });
  await laddad;
  await k.utvardera(vantaUttryck("html[data-stilguide='klar']", 30_000));
  await k.utvardera(`document.fonts.ready.then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))`);
  await sov(800);
  return k;
}
async function stang(k) {
  k.stang();
  await fetch(`http://127.0.0.1:${CDP_PORT}/json/close/${k.flikId}`).catch(() => {});
}
const js = (k, uttryck) => k.utvardera(uttryck);
const mus = (k, x, y) => k.skicka("Input.dispatchMouseEvent", { type: "mouseMoved", x, y, button: "none", pointerType: "mouse" });
async function klick(k, x, y) {
  await mus(k, x, y);
  await k.skicka("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1, pointerType: "mouse" });
  await k.skicka("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1, pointerType: "mouse" });
  await sov(250);
}
const TANGENT = { Tab: 9, Enter: 13, Escape: 27, End: 35, Home: 36, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40 };
async function tryck(k, key) {
  const text = key === "Enter" ? "\r" : undefined;
  const p = { key, code: key, windowsVirtualKeyCode: TANGENT[key] ?? 0 };
  await k.skicka("Input.dispatchKeyEvent", { type: "rawKeyDown", ...p, text });
  if (text) await k.skicka("Input.dispatchKeyEvent", { type: "char", ...p, text });
  await k.skicka("Input.dispatchKeyEvent", { type: "keyUp", ...p });
  await sov(80);
}
async function peka(k, x, y) {
  await k.skicka("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  await k.skicka("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await sov(250);
}

// ── Rapport och bilder ──

const rapport = { tid: new Date().toISOString(), bilder: [], kontroller: [] };
const kontroll = (namn, ok, v) => {
  rapport.kontroller.push({ namn, ok, varde: v });
  console.log(`${ok ? "OK  " : "FEL "} ${namn}${v !== undefined ? `: ${JSON.stringify(v)}` : ""}`);
};

/** Bild av exemplet, och av tooltipen om den sticker ut under (smala diagram). */
async function bild(k, e, namn) {
  await sov(150);
  const r = await js(k, `__gt.exRekt(${JSON.stringify(e)})`);
  const t = await js(k, `__gt.ex(${JSON.stringify(e)}).querySelector("[data-diagram]") ? __gt.tooltip(${JSON.stringify(e)}) : null`);
  const m = 8;
  let y1 = r.y + r.h + m;
  if (t) y1 = Math.max(y1, t.sidY + t.h + m);
  const clip = { x: Math.max(0, r.x - m), y: Math.max(0, r.y - m), width: r.b + 2 * m, height: y1 - Math.max(0, r.y - m), scale: 1 };
  const b = await k.skicka("Page.captureScreenshot", { format: "png", clip, captureBeyondViewport: false });
  const fil = path.join(UT, `${namn}.png`);
  fs.writeFileSync(fil, Buffer.from(b.data, "base64"));
  rapport.bilder.push(fil);
  console.log(`     bild ${fil}`);
}

// Pekarens punkt i viewporten för en punkt i svg:ns koordinater
async function iSvg(k, e, x, y) {
  const r = await js(k, `__gt.rekt(${JSON.stringify(e)})`);
  return [r.x + x, r.y + y];
}

/** Hovrar ett exempel på ett typiskt ställe och returnerar vad som hände. */
async function hovra(k, e) {
  const q = JSON.stringify(e);
  if (e.startsWith("rangordning")) {
    const rader = await js(k, `__gt.rader(${q})`);
    const rad = rader[Math.min(rader.length - 1, Math.floor(rader.length * 0.6))];
    const [x, y] = await iSvg(k, e, Math.max(8, rad.x - 60), rad.y + 3);
    await mus(k, x - 20, y - 30); await sov(60);
    await mus(k, x, y); await sov(250);
    return { mal: rad.id, lyft: await js(k, `__gt.lyft(${q})`) };
  }
  if (e.startsWith("stapel")) {
    const s = await js(k, `__gt.staplar(${q})`);
    const st = s[Math.floor(s.length * 0.65)];
    const [x, y] = await iSvg(k, e, st.x + 1, st.y + st.h / 2);
    await mus(k, x - 30, y); await sov(60);
    await mus(k, x, y); await sov(250);
    return { mal: String(st.i), lyft: await js(k, `__gt.morkad(${q})`) };
  }
  if (e.startsWith("sma")) {
    const p = await js(k, `__gt.paneler(${q})`);
    const panel = p[Math.min(1, p.length - 1)];
    const [x, y] = await iSvg(k, e, panel.x + 60, panel.y + panel.h + 70);
    await mus(k, x - 20, y); await sov(60);
    await mus(k, x, y); await sov(250);
    return { mal: panel.id, lyft: null };
  }
  return { mal: null, lyft: null };
}

// ── Sviter ──

/** Vila och hovring för alla exempel i 1440 och 390 px. */
async function vila() {
  for (const [bredd, hojd] of [[1440, 1600], [390, 1800]]) {
    const k = await oppna(bredd, hojd);
    try {
      for (const e of EXEMPEL) {
        await js(k, `__gt.visa(${JSON.stringify(e)})`);
        await sov(300);
        await mus(k, 2, 2);
        await bild(k, e, `${e}-vila-${bredd}`);
        if (e.startsWith("minidiagram")) {
          const mini = await js(k, `__gt.minidiagram(${JSON.stringify(e)})`);
          kontroll(`${bredd}: minidiagram 96 × 24 med role=img och namn, utan fokus`, mini.length > 0 && mini.every((m) => m.b === "96" && m.h === "24" && m.roll === "img" && m.namn >= 100 && m.fokus === null), mini.length);
          continue;
        }
        await js(k, `__gt.bevaka(${JSON.stringify(e)})`);
        const h = await hovra(k, e);
        const t = await js(k, `__gt.tooltip(${JSON.stringify(e)})`);
        kontroll(`${bredd} ${e}: hovring visar tooltip`, !!t, t?.text);
        if (h.mal && h.lyft !== null) kontroll(`${bredd} ${e}: raden eller stapeln under pekaren lyfts`, h.lyft === h.mal, h);
        if (bredd < 560) kontroll(`${bredd} ${e}: tooltipen står under grafen i full bredd`, !!t && t.helBredd && t.y >= (e.startsWith("sma") ? 0 : t.svgH) && Math.abs(t.b - t.svgB) < 2, t && { y: t.y, svgH: t.svgH, b: t.b, svgB: t.svgB });
        await bild(k, e, `${e}-hovra-${bredd}`);
        const mut = await js(k, `__gt.mutationer(${JSON.stringify(e)})`);
        kontroll(`${bredd} ${e}: hovring ändrar inte statiska lagret`, mut.antal === 0 && mut.sammaNod, mut);
        await mus(k, 2, 2); await sov(150);
      }
    } finally { await stang(k); }
  }
}

/** Mus: svep, klick som fäster, synkroniserad hjälplinje, nedborrning. */
async function musSvit() {
  const k = await oppna(1440, 1600);
  try {
    // Rangordning: svep nedåt rad för rad, tooltipen följer, statiska lagret orört
    let e = "rangordning-regioner", q = JSON.stringify(e);
    await js(k, `__gt.visa(${q})`); await sov(300);
    await js(k, `__gt.bevaka(${q})`);
    const rader = await js(k, `__gt.rader(${q})`);
    const sedda = [];
    for (const r of rader) {
      const [x, y] = await iSvg(k, e, 40, r.y + 2);
      await mus(k, x, y); await sov(40);
      sedda.push(await js(k, `__gt.lyft(${q})`));
    }
    kontroll("rangordning: varje rad lyfts när pekaren står på namnet", JSON.stringify(sedda) === JSON.stringify(rader.map((r) => r.id)), sedda.filter((s, i) => s !== rader[i].id));
    const t = await js(k, `__gt.tooltip(${q})`);
    kontroll("rangordning: tooltipen visar plats och skillnad mot riket", /plats\s\d+ av\s\d+/.test(t?.text ?? "") && /Skillnad mot riket/.test(t?.text ?? ""), t?.text);
    const mut = await js(k, `__gt.mutationer(${q})`);
    kontroll("rangordning: svepet ändrar inte statiska lagret", mut.antal === 0 && mut.sammaNod, mut);
    // Klick fäster en region, klick igen tar bort
    const fore = await js(k, `__gt.chips(${q})`);
    const ovrig = rader.find((r) => !fore.includes(r.id) && r.id !== "0013");
    let [x, y] = await iSvg(k, e, ovrig.x, ovrig.y);
    await klick(k, x, y);
    kontroll("rangordning: klick på raden fäster regionen (chip)", (await js(k, `__gt.chips(${q})`)).includes(ovrig.id), await js(k, `__gt.chips(${q})`));
    await sov(150);
    kontroll("rangordning: fäst rad säger Klicka för att ta bort", /Klicka för att ta bort/.test((await js(k, `__gt.tooltip(${q})`))?.text ?? ""));
    await klick(k, x, y);
    kontroll("rangordning: klick igen tar bort", !(await js(k, `__gt.chips(${q})`)).includes(ovrig.id));
    kontroll("rangordning: musklick ger inte diagrammet fokus", (await js(k, `__gt.fokus()`)).ex !== e, await js(k, `__gt.fokus()`));
    await bild(k, e, `${e}-klick-1440`);

    // Stapel: svep över alla staplar
    e = "stapel-manad"; q = JSON.stringify(e);
    await js(k, `__gt.visa(${q})`); await sov(300);
    await js(k, `__gt.bevaka(${q})`);
    const staplar = await js(k, `__gt.staplar(${q})`);
    const mork = [];
    for (const s of staplar) {
      [x, y] = await iSvg(k, e, s.x, s.y + s.h - 4);
      await mus(k, x, y); await sov(30);
      mork.push(await js(k, `__gt.morkad(${q})`));
    }
    kontroll("stapel: varje stapel mörkas under pekaren", JSON.stringify(mork) === JSON.stringify(staplar.map((s) => String(s.i))), mork.length);
    const ts = await js(k, `__gt.tooltip(${q})`);
    kontroll("stapel: tooltipen har förändring mot föregående period och året innan", (ts?.text.match(/Mot /g) ?? []).length === 2, ts?.text);
    kontroll("stapel: svepet ändrar inte statiska lagret", (await js(k, `__gt.mutationer(${q})`)).antal === 0);

    // Små multiplar: synkroniserad hjälplinje, tooltip i panelen, nedborrning på namnet
    e = "sma-sjukhus"; q = JSON.stringify(e);
    await js(k, `__gt.visa(${q})`); await sov(300);
    await js(k, `__gt.bevaka(${q})`);
    const p = await js(k, `__gt.paneler(${q})`);
    [x, y] = await iSvg(k, e, p[2].x + 80, p[2].y + p[2].h + 60);
    await mus(k, x, y); await sov(200);
    const linjer = await js(k, `__gt.hjalplinjer(${q})`);
    const dx = linjer.map((l, i) => l.x1 - p[i].x);
    kontroll("små multiplar: hjälplinje i alla paneler på samma period", linjer.length === p.length && Math.max(...dx) - Math.min(...dx) < 1.5, { linjer: linjer.length, dx });
    const tp = await js(k, `__gt.tooltip(${q})`);
    kontroll("små multiplar: tooltipen i panelen under pekaren", !!tp && tp.x >= p[2].x - 1, tp && { x: tp.x, panel: p[2].x });
    kontroll("små multiplar: tooltipen visar enheten och Region Halland", tp?.text.includes(p[2].text.trim()) && tp?.text.includes("Region Halland"), tp?.text);
    await bild(k, e, `${e}-hovra-panel3-1440`);
    kontroll("små multiplar: hovringen ändrar inte statiska lagret", (await js(k, `__gt.mutationer(${q})`)).antal === 0);
    const smulaFore = await js(k, `__gt.brodsmula(${q})`);
    [x, y] = await iSvg(k, e, p[0].x + 10, p[0].y + p[0].h / 2);
    await klick(k, x, y); await sov(400);
    const smulaEfter = await js(k, `__gt.brodsmula(${q})`);
    kontroll("små multiplar: klick på panelens namn borrar ned (brödsmulan)", smulaFore === "" && smulaEfter.includes(p[0].text.trim()), { smulaFore, smulaEfter });
    await bild(k, e, `${e}-nedborrad-1440`);

    // Avdelningar: två rader i rubriken, nedborrning till en avdelning
    e = "sma-avdelning"; q = JSON.stringify(e);
    await js(k, `__gt.visa(${q})`); await sov(300);
    const pa = await js(k, `__gt.paneler(${q})`);
    [x, y] = await iSvg(k, e, pa[1].x + 5, pa[1].y + pa[1].h / 2);
    await klick(k, x, y); await sov(400);
    kontroll("små multiplar: nedborrning till en avdelning", (await js(k, `__gt.brodsmula(${q})`)).includes(pa[1].text.trim()), await js(k, `__gt.brodsmula(${q})`));
  } finally { await stang(k); }
}

/** Tangentbord: Tab, pilar, Home/End, Enter, Escape i varje typ. */
async function tangentSvit() {
  const k = await oppna(1440, 1600);
  const tabTill = async (e) => {
    await js(k, `(() => { const s = __gt.svg(${JSON.stringify(e)}); s.scrollIntoView({ block: "center" }); const f = [...document.querySelectorAll("a,button,input,[tabindex]")].filter((x) => x.tabIndex >= 0 && !x.disabled); const i = f.indexOf(s); (f[i - 1] ?? document.body).focus(); return true; })()`);
    await sov(100);
    await tryck(k, "Tab"); await sov(150);
  };
  try {
    let e = "rangordning-regioner", q = JSON.stringify(e);
    await tabTill(e);
    const f = await js(k, `__gt.fokus()`);
    kontroll("rangordning: Tab ger synlig fokusring", f.ex === e && f.synlig && f.tagg.toLowerCase() === "svg", f);
    kontroll("rangordning: fokus startar på Halland", (await js(k, `__gt.lyft(${q})`)) === "0013", await js(k, `__gt.lyft(${q})`));
    await tryck(k, "ArrowDown");
    const efter = await js(k, `__gt.lyft(${q})`);
    kontroll("rangordning: ↓ flyttar till nästa rad", efter && efter !== "0013", efter);
    await tryck(k, "Home");
    const forsta = (await js(k, `__gt.rader(${q})`))[0].id;
    kontroll("rangordning: Home går till första raden", (await js(k, `__gt.lyft(${q})`)) === forsta);
    await tryck(k, "Enter"); await sov(150);
    kontroll("rangordning: Enter fäster raden", (await js(k, `__gt.chips(${q})`)).includes(forsta), await js(k, `__gt.chips(${q})`));
    kontroll("rangordning: aria-live läser upp raden", /2025: .+plats/.test(await js(k, `__gt.live(${q})`)), await js(k, `__gt.live(${q})`));
    await bild(k, e, `${e}-tangentbord-1440`);
    await tryck(k, "Escape");
    kontroll("rangordning: Escape stänger tooltipen", (await js(k, `__gt.tooltip(${q})`)) === null);

    e = "stapel-manad"; q = JSON.stringify(e);
    await tabTill(e);
    const t0 = (await js(k, `__gt.tooltip(${q})`))?.text ?? "";
    await tryck(k, "ArrowLeft");
    const t1 = (await js(k, `__gt.tooltip(${q})`))?.text ?? "";
    kontroll("stapel: Tab visar senaste perioden och ← flyttar en period", /^mar 2026/.test(t0) && /^feb 2026/.test(t1), { t0: t0.slice(0, 12), t1: t1.slice(0, 12) });
    kontroll("stapel: den mörkade stapeln följer tangentbordet", (await js(k, `__gt.morkad(${q})`)) !== null);
    await tryck(k, "Escape");

    e = "sma-avdelning"; q = JSON.stringify(e);
    await tabTill(e);
    const tA = (await js(k, `__gt.tooltip(${q})`))?.text ?? "";
    await tryck(k, "ArrowDown");
    const tB = (await js(k, `__gt.tooltip(${q})`))?.text ?? "";
    kontroll("små multiplar: ↓ flyttar tooltipen till nästa panel", tA !== tB && /Tryck Enter för att visa/.test(tB), { tA, tB });
    kontroll("små multiplar: hjälplinje i alla paneler vid tangentbord", (await js(k, `__gt.hjalplinjer(${q})`)).length === (await js(k, `__gt.paneler(${q})`)).length);
    const titelFore = await js(k, `__gt.brodsmula(${q})`);
    await tryck(k, "Enter"); await sov(400);
    kontroll("små multiplar: Enter borrar ned", (await js(k, `__gt.brodsmula(${q})`)) !== titelFore, await js(k, `__gt.brodsmula(${q})`));
  } finally { await stang(k); }
}

/** Pekskärm i 390 px: tryck visar, tryck igen fäster, tryck utanför stänger. */
async function pekaSvit() {
  const k = await oppna(390, 1800, { pek: true });
  try {
    const e = "rangordning-regioner", q = JSON.stringify(e);
    await js(k, `__gt.visa(${q})`); await sov(300);
    const rader = await js(k, `__gt.rader(${q})`);
    const r = rader[12];
    const [x, y] = await iSvg(k, e, r.x, r.y);
    await peka(k, x, y);
    const t = await js(k, `__gt.tooltip(${q})`);
    kontroll("pekskärm: tryck visar raden och tooltipen under grafen", (await js(k, `__gt.lyft(${q})`)) === r.id && t?.helBredd, t?.text);
    await bild(k, e, `${e}-tryck-390`);
    await peka(k, x, y);
    kontroll("pekskärm: tryck igen fäster", (await js(k, `__gt.chips(${q})`)).includes(r.id), await js(k, `__gt.chips(${q})`));
    await peka(k, 5, 5);
    kontroll("pekskärm: tryck utanför stänger", (await js(k, `__gt.tooltip(${q})`)) === null);

    const s = "sma-sjukhus", qs = JSON.stringify(s);
    await js(k, `__gt.visa(${qs})`); await sov(300);
    const p = await js(k, `__gt.paneler(${qs})`);
    const [px, py] = await iSvg(k, s, p[0].x + 100, p[0].y + p[0].h + 60);
    await peka(k, px, py);
    const tp = await js(k, `__gt.tooltip(${qs})`);
    kontroll("pekskärm: små multiplar visar tooltipen under panelen", !!tp && tp.helBredd, tp?.text);
    await bild(k, s, `${s}-tryck-390`);
  } finally { await stang(k); }
}

/** Inget ger vågrät rullning från 320 px; graferna ryms i figuren. */
async function smal() {
  for (const bredd of [320, 360]) {
    const k = await oppna(bredd, 1200);
    try {
      for (const e of EXEMPEL) {
        await js(k, `__gt.visa(${JSON.stringify(e)})`); await sov(200);
        const r = await js(k, `__gt.ryms(${JSON.stringify(e)})`);
        kontroll(`${bredd} px ${e}: inget sticker ut till höger`, r.hoger <= bredd + 0.5 && r.overflow <= 0, r);
      }
      for (const s of ["rangordning", "stapel", "smaMultiplar", "minidiagram"]) {
        const r = await js(k, `(() => { const el = document.querySelector('[data-sektion="${s}"]'); const h = Math.max(...[...el.querySelectorAll("*")].map((x) => x.getBoundingClientRect().right)); return { hoger: Math.round(h), fonster: innerWidth, overflow: el.scrollWidth - el.clientWidth }; })()`);
        kontroll(`${bredd} px sektionen ${s}: inget sticker ut till höger`, r.hoger <= bredd + 0.5 && r.overflow <= 0, r);
      }
      for (const e of ["rangordning-regioner", "stapel-manad", "sma-avdelning"]) {
        await js(k, `__gt.visa(${JSON.stringify(e)})`); await sov(200);
        await bild(k, e, `${e}-vila-${bredd}`);
      }
    } finally { await stang(k); }
  }
}

const SVITER = { vila, mus: musSvit, tangent: tangentSvit, peka: pekaSvit, smal };

const kod = await medWebblasare(async () => {
  for (const [namn, f] of Object.entries(SVITER)) {
    if (BARA && !BARA.includes(namn)) continue;
    console.log(`\n== ${namn}`);
    await f();
  }
  fs.writeFileSync(path.join(UT, "rapport.json"), JSON.stringify(rapport, null, 2));
  const fel = rapport.kontroller.filter((x) => !x.ok).length;
  console.log(`\n${rapport.kontroller.length - fel} av ${rapport.kontroller.length} kontroller OK. Bilder och rapport.json i ${UT}`);
  return fel ? 1 : 0;
});
process.exit(kod);
