// server.mjs — Minimal statisk server för app/dist under basen /hosrapport/.
// Inga beroenden. Startas av hosta-lokalt.ps1 från en kopia UTANFÖR OneDrive
// (OneDrive-synk kan låsa filer och ge sporadiska 404 från servrar som läser
// direkt ur den synkade mappen).
//
// Användning: node server.mjs [port]   (default 8137; dist/ bredvid skriptet)

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROT  = fileURLToPath(new URL("./dist", import.meta.url));
const BAS  = "/hosrapport/";
const PORT = Number(process.argv[2]) || 8137;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js":   "text/javascript",
  ".css":  "text/css",
  ".json": "application/json; charset=utf-8",
  ".svg":  "image/svg+xml",
  ".ico":  "image/x-icon",
  ".png":  "image/png",
  ".woff2": "font/woff2",
  ".txt":  "text/plain; charset=utf-8",
};

createServer(async (req, res) => {
  const p = new URL(req.url, "http://localhost").pathname;

  if (p === "/" || p === "/hosrapport") {
    res.writeHead(302, { Location: BAS });
    return res.end();
  }
  if (!p.startsWith(BAS)) {
    res.writeHead(404, { "Content-Type": MIME[".txt"] });
    return res.end("404 — appen ligger under " + BAS);
  }

  let rel = decodeURIComponent(p.slice(BAS.length));
  if (rel === "" || rel.endsWith("/")) rel += "index.html";
  const fil = normalize(join(ROT, rel));
  if (!fil.startsWith(ROT)) {
    res.writeHead(403);
    return res.end();
  }

  try {
    const data = await readFile(fil);
    res.writeHead(200, {
      "Content-Type": MIME[extname(fil).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    res.end(data);
  } catch {
    // SPA-fallback: sökväg utan filändelse → index.html
    if (!extname(fil)) {
      try {
        const html = await readFile(join(ROT, "index.html"));
        res.writeHead(200, { "Content-Type": MIME[".html"], "Cache-Control": "no-cache" });
        return res.end(html);
      } catch { /* faller vidare till 404 */ }
    }
    res.writeHead(404, { "Content-Type": MIME[".txt"] });
    res.end("404 — hittade inte " + rel);
  }
}).listen(PORT, () => {
  console.log("HoS-rapport hostas på http://localhost:" + PORT + BAS);
});
