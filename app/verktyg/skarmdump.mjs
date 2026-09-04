// skarmdump.mjs — skärmdump av en sida via DevTools-protokollet mot en
// headless Edge. Används för att granska diagrammen (grafprov.html) utan
// webbläsartillägg; riktiga mushändelser gör att hover och klick kan testas.
//
// 1. Starta dev-servern:   npm run dev            (port 5173)
// 2. Starta headless Edge (egen profilmapp, stör inte din vanliga Edge):
//    & "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless=new --disable-gpu --user-data-dir=$env:TEMP/edge-skarmdump --remote-debugging-port=9222 --window-size=900,900 about:blank
// 3. node verktyg/skarmdump.mjs "<url>" ut.png [fx,fy] [click]
//    fx,fy = andel av plotytan (0–1) där musen ställs; "click" klickar där.
//    Bilden klipps till .figur-elementet i 2x-upplösning.
//
// OBS: skärmdumpen får INTE ändra viewportstorlek (captureBeyondViewport) —
// det utlöser ResizeObserver, grafen ritas om och hover-tillståndet försvinner.
import { writeFileSync } from "node:fs";

const [url, out, hoverArg, clickArg] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const t = await (await fetch("http://localhost:9222/json/new?" + encodeURIComponent(url), { method: "PUT" })).json();
const ws = new WebSocket(t.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map();
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result ?? m.error); pending.delete(m.id); }
};
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });

await send("Page.enable");
await sleep(3500);

if (hoverArg) {
  const [fx, fy] = hoverArg.split(",").map(Number);
  const r = await send("Runtime.evaluate", { expression: `(() => { const el = document.querySelector("svg rect[role='img']"); if (!el) return null; const b = el.getBoundingClientRect(); return JSON.stringify({ x: b.left + b.width * ${fx}, y: b.top + b.height * ${fy} }); })()`, returnByValue: true });
  const p = JSON.parse(r.result.value);
  if (p) {
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: p.x, y: p.y });
    await sleep(200);
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: p.x + 1, y: p.y });
    if (clickArg === "click") {
      await send("Input.dispatchMouseEvent", { type: "mousePressed", x: p.x + 1, y: p.y, button: "left", clickCount: 1 });
      await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: p.x + 1, y: p.y, button: "left", clickCount: 1 });
      await sleep(400);
      await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: p.x + 2, y: p.y });
    }
    await sleep(300);
  }
}

const fb = JSON.parse((await send("Runtime.evaluate", { expression: `(() => { const b = document.querySelector(".figur").getBoundingClientRect(); return JSON.stringify({x:b.left-8,y:b.top-8,width:b.width+16,height:b.height+16}); })()`, returnByValue: true })).result.value);
const shot = await send("Page.captureScreenshot", { format: "png", clip: { ...fb, scale: 2 } });
writeFileSync(out, Buffer.from(shot.data, "base64"));
ws.close();
await fetch("http://localhost:9222/json/close/" + t.id);
console.log("skrev", out);
