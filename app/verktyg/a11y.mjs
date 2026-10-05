// a11y.mjs: axe-core via DevTools-protokollet mot den levande stilguiden och
// rapportens nya adresser under ?ny (docs/arkitektur.md avsnitt 7, stilguiden 7).
// Ägare: WP7.
//
//   npm run a11y                          stilguiden och ?ny-adresserna, 1440 och 390 px
//   npm run a11y -- --bara stilguide      bara stilguiden (eller: ny)
//   npm run a11y -- --bredder 1440        bara angivna bredder
//   npm run a11y -- --adresser "/?ny#/begrepp,/verktyg/stilguide.html"
//                                         egna adresser i stället för listan nedan
//
// Fynden skrivs per adress och allvarlighetsgrad (critical, serious, moderate,
// minor). I stilguiden sägs också vilken sektion (data-sektion) fyndet ligger i.
// Hela resultatet sparas i verktyg/bank/a11y.json. Avslutskod 1 när något fynd
// är serious eller critical.
//
// Adresserna under ?ny byggs ur manifestet (public/data/index.json) och
// adresstabellen i arkitektur.md 4.6. En adress granskas bara när den finns, det
// vill säga när den visar något annat än /?ny; så länge nya appen är en tom ram
// hoppas de över och det står i rapporten.
//
// Processer och portar som i bänken: BANK_PORT, CDP_PORT, BANK_URL (webblasare.mjs).

import fs from "node:fs";
import path from "node:path";
import { APP, CDP_PORT, HAR, medWebblasare, oppnaSida } from "./webblasare.mjs";

const argv = process.argv.slice(2);
const varde = (namn) => {
  const i = argv.indexOf(`--${namn}`);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : null;
};
const lista = (namn) => varde(namn)?.split(",").map((s) => s.trim()).filter(Boolean) ?? null;
const BREDDER = (varde("bredder") ?? "1440,390").split(",").map(Number);
const HOJD = { 1440: 900, 390: 844 };
const GRUPPER = lista("bara");
const EGNA = lista("adresser");

const GRADER = ["critical", "serious", "moderate", "minor"];
const STOPPAR = new Set(["critical", "serious"]);
const TAGGAR = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

// ── Adresser ──

function nyaAdresser() {
  const manifest = JSON.parse(fs.readFileSync(path.join(APP, "public/data/index.json"), "utf8"));
  const kapitel = Object.entries(manifest).flatMap(([vy, m]) =>
    (m.sektioner ?? []).map((s) => `/?ny#/kapitel/${s.id}?vy=${vy}`));
  return [
    "/?ny#/",
    ...Object.keys(manifest).map((vy) => `/?ny#/sammanfattning?vy=${vy}`),
    ...kapitel,
    "/?ny#/begrepp",
    "/?ny#/las",
  ];
}

const MALL = [
  { grupp: "stilguide", adress: "/verktyg/stilguide.html", vanta: "html[data-stilguide='klar']" },
  { grupp: "ny", adress: "/?ny", vanta: "#root > *", rot: true },
  ...nyaAdresser().map((adress) => ({ grupp: "ny", adress, vanta: "#root > *", omFinns: true })),
];

if (GRUPPER) {
  const okanda = GRUPPER.filter((g) => !MALL.some((m) => m.grupp === g));
  if (okanda.length) { console.error(`Okända grupper: ${okanda.join(", ")} (finns: stilguide, ny)`); process.exit(2); }
}
const adresser = EGNA
  ? EGNA.map((adress) => ({ grupp: "egen", adress, vanta: "#root > *" }))
  : MALL.filter((m) => !GRUPPER || GRUPPER.includes(m.grupp) || (m.rot && GRUPPER.includes("ny")));

// ── Körning i sidan ──

const AXE = fs.readFileSync(path.join(APP, "node_modules/axe-core/axe.min.js"), "utf8");
const AXE_VERSION = JSON.parse(fs.readFileSync(path.join(APP, "node_modules/axe-core/package.json"), "utf8")).version;

const korAxe = `(async () => {
  const r = await axe.run(document, { runOnly: { type: "tag", values: ${JSON.stringify(TAGGAR)} }, resultTypes: ["violations"] });
  return r.violations.map((v) => ({
    id: v.id, impact: v.impact, help: v.help, helpUrl: v.helpUrl,
    noder: v.nodes.map((n) => {
      const sel = Array.isArray(n.target[0]) ? n.target[0][0] : n.target[0];
      let el = null;
      try { el = document.querySelector(sel); } catch { el = null; }
      return {
        target: n.target.join(" "), html: n.html.slice(0, 160),
        sektion: el?.closest("[data-sektion]")?.getAttribute("data-sektion") ?? null,
        sammanfattning: n.failureSummary,
      };
    }),
  }));
})()`;

// ── Huvudflöde ──

const kod = await medWebblasare(async () => {
  console.log(`axe-core ${AXE_VERSION} · ${adresser.length} adresser · bredder ${BREDDER.join(", ")} · CDP ${CDP_PORT}`);
  const resultat = [];
  for (const bredd of BREDDER) {
    let rotText = null;
    for (const a of adresser) {
      const konsol = [];
      const { k, stang } = await oppnaSida(a.adress, {
        bredd, hojd: HOJD[bredd] ?? 900, steg: [{ vanta: a.vanta }], konsol: (typ, text) => konsol.push(`${typ}: ${text}`),
      });
      try {
        const text = await k.utvardera("document.body.innerText.trim()");
        if (a.rot) rotText = text;
        if (a.omFinns && rotText !== null && text === rotText) {
          resultat.push({ adress: a.adress, bredd, grupp: a.grupp, hoppad: "visar samma innehåll som /?ny, adressen finns inte än" });
          continue;
        }
        await k.utvardera(AXE);
        const fynd = await k.utvardera(korAxe);
        resultat.push({ adress: a.adress, bredd, grupp: a.grupp, fynd, konsol });
      } finally {
        await stang();
      }
    }
  }

  // Rapport per adress och allvarlighetsgrad
  let stoppande = 0;
  const summa = Object.fromEntries(GRADER.map((g) => [g, 0]));
  const hoppade = resultat.filter((r) => r.hoppad);
  for (const r of resultat.filter((x) => !x.hoppad)) {
    const perGrad = Object.fromEntries(GRADER.map((g) => [g, r.fynd.filter((f) => f.impact === g)]));
    console.log(`\n${r.adress} ${r.bredd}: ${GRADER.map((g) => `${perGrad[g].length} ${g}`).join(", ")}`);
    for (const g of GRADER) {
      for (const f of perGrad[g]) {
        summa[g]++;
        if (STOPPAR.has(g)) stoppande++;
        const sektioner = [...new Set(f.noder.map((n) => n.sektion).filter(Boolean))];
        console.log(`  ${g.padEnd(8)} ${f.id}: ${f.help} (${f.noder.length} st${sektioner.length ? `, sektion ${sektioner.join(", ")}` : ""})`);
        for (const n of f.noder.slice(0, 3)) console.log(`           ${n.target}`);
      }
    }
    for (const rad of r.konsol) console.log(`  konsol   ${rad.slice(0, 200)}`);
  }
  if (hoppade.length) {
    console.log(`\nHoppade över ${hoppade.length} adresser som inte finns än (visar samma som /?ny):`);
    console.log(`  ${[...new Set(hoppade.map((r) => r.adress))].join(", ")}`);
  }
  const granskade = resultat.length - hoppade.length;
  console.log(`\n${granskade} sidor granskade. ${GRADER.map((g) => `${summa[g]} ${g}`).join(", ")}.`);
  const ut = path.join(HAR, "bank", "a11y.json");
  fs.mkdirSync(path.dirname(ut), { recursive: true });
  fs.writeFileSync(ut, JSON.stringify({ tid: new Date().toISOString(), axe: AXE_VERSION, taggar: TAGGAR, resultat }, null, 2));
  console.log(`Resultat: ${ut}`);
  if (stoppande) console.log(`${stoppande} fynd är serious eller critical.`);
  return stoppande ? 1 : 0;
});
process.exit(kod);
