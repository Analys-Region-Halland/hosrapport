// pptx-smoke.mjs: röktest för PowerPoint-exporten (src/export/pptx.ts).
//
// Exporten körs i webbläsaren vid ett knapptryck, och ett fel i en
// diagramserie eller en tabellrad märks först när någon öppnar filen. Skriptet
// bygger därför riktiga deck ur appens data och skriver dem till disk, så att
// felet syns i terminalen i stället:
//
//   - ett deck per kapitel i varje tidsupplösning
//   - hela rapporten per tidsupplösning
//   - graftyper.pptx: en indikatorbild per graftyp (linje, linje med fästa
//     regioner, förväntat intervall, stapel, rangordning, små multiplar,
//     enheter rangordnade, minidiagram)
//
// Varje fil packas upp igen och kontrolleras: antalet bilder är planens,
// varje kapitel har en bild per indikator och avsnitt, hela rapporten har
// rapportens bilder plus alla kapitlens, och inga färger finns utöver tema.ts.
//
// Körs med jiti, som läser TypeScript direkt. JSZip kommer med pptxgenjs.
//
//   npm run test:pptx              → skriver till app/.pptx-smoke/
//   npm run test:pptx -- <mapp>    → skriver till angiven mapp
//
// Filen är ett utvecklarverktyg och ingår inte i bunten.

import { createJiti } from "jiti";
import JSZip from "jszip";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const harHar = path.dirname(fileURLToPath(import.meta.url));
const appRot = path.resolve(harHar, "..");
const utdata = path.resolve(process.argv[2] ?? path.join(appRot, ".pptx-smoke"));
const dataDir = path.join(appRot, "public/data");
const RAPPORTTITEL = "Hälso- och sjukvården i Halland";
const VYORDNING = ["ar", "kvartal", "manad", "vecka", "dag"];

const jiti = createJiti(import.meta.url, { interopDefault: true });
const { normalisera } = await jiti.import(path.join(appRot, "src/data/normalisera.ts"));
const { kpiTillSpec, minidiagramSpec, visningar } = await jiti.import(path.join(appRot, "src/charts/kpiTillSpec.ts"));
const { byggPptx, ritaDeck } = await jiti.import(path.join(appRot, "src/export/pptx.ts"));
const { planeraDeck } = await jiti.import(path.join(appRot, "src/export/innehall.ts"));
const { panelsidor } = await jiti.import(path.join(appRot, "src/export/graf.ts"));
const { allaFarger } = await jiti.import(path.join(appRot, "src/export/pptxTema.ts"));

const TILLATNA = allaFarger();
const fel = [];
const manifest = JSON.parse(fs.readFileSync(path.join(dataDir, "index.json"), "utf8"));
fs.mkdirSync(utdata, { recursive: true });

/** Skriver decket och läser tillbaka antal bilder, diagram och färger. */
async function skrivOchLas(pptx, fil) {
  const buffer = await pptx.write({ outputType: "nodebuffer" });
  fs.writeFileSync(path.join(utdata, fil), buffer);
  const zip = await JSZip.loadAsync(buffer);
  const namn = Object.keys(zip.files);
  const bilder = namn.filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n));
  const diagram = namn.filter((n) => /^ppt\/charts\/chart\d+\.xml$/.test(n));
  const farger = new Set();
  for (const n of [...bilder, ...diagram]) {
    const xml = await zip.file(n).async("string");
    for (const m of xml.matchAll(/srgbClr val="([0-9A-Fa-f]{6})"/g)) farger.add(m[1].toUpperCase());
  }
  const okanda = [...farger].filter((f) => !TILLATNA.has(f));
  if (okanda.length) fel.push(`${fil}: färger utanför tema.ts: ${okanda.join(", ")}`);
  return { bilder: bilder.length, diagram: diagram.length };
}

const laddaKapitel = (vy, id) => normalisera(JSON.parse(fs.readFileSync(path.join(dataDir, `${vy}-${id}.json`), "utf8")), vy);
const vyer = VYORDNING.filter((vy) => manifest[vy]?.sektioner?.length);
let antalFiler = 0;

for (const vy of vyer) {
  const m = manifest[vy];
  const kapitel = m.sektioner.map((s) => laddaKapitel(vy, s.id));
  console.log(`${vy} (${m.period})`);
  let kapitelBilder = 0;
  for (const kap of kapitel) {
    const { pptx, bilder } = byggPptx([kap], { titel: kap.namn, vy, omfang: "kapitel", publicerad: m.datum });
    const las = await skrivOchLas(pptx, `${vy}-${kap.id}.pptx`);
    antalFiler++;
    kapitelBilder += bilder.length;
    const ind = bilder.filter((b) => b.typ === "indikator" && b.sida === 0).length;
    const avs = bilder.filter((b) => b.typ === "avsnitt").length;
    if (las.bilder !== bilder.length) fel.push(`${vy}-${kap.id}: ${las.bilder} bilder i filen, planen har ${bilder.length}`);
    if (ind !== kap.kpier.length) fel.push(`${vy}-${kap.id}: ${ind} indikatorbilder för ${kap.kpier.length} indikatorer`);
    if (avs !== kap.avsnitt.length) fel.push(`${vy}-${kap.id}: ${avs} avsnittsbilder för ${kap.avsnitt.length} avsnitt`);
    if (las.diagram < kap.kpier.length) fel.push(`${vy}-${kap.id}: ${las.diagram} diagram för ${kap.kpier.length} indikatorer`);
    console.log(`  ${kap.id}: ${las.bilder} bilder, ${las.diagram} diagram (${kap.kpier.length} indikatorer, ${kap.avsnitt.length} avsnitt)`);
  }

  // Hela rapporten: rapportens egna bilder plus varje kapitel
  const { pptx, bilder } = byggPptx(kapitel, { titel: RAPPORTTITEL, vy, omfang: "rapport", publicerad: m.datum });
  const las = await skrivOchLas(pptx, `${vy}-rapport.pptx`);
  antalFiler++;
  const egna = bilder.filter((b) => b.id.startsWith("rapport:")).length;
  const vantat = egna + kapitelBilder;
  if (las.bilder !== bilder.length) fel.push(`${vy}-rapport: ${las.bilder} bilder i filen, planen har ${bilder.length}`);
  if (las.bilder !== vantat) fel.push(`${vy}-rapport: ${las.bilder} bilder, väntat ${egna} + ${kapitelBilder} = ${vantat}`);
  console.log(`  hela rapporten: ${las.bilder} bilder (${egna} för rapporten + ${kapitelBilder} i ${kapitel.length} kapitel), ${las.diagram} diagram`);
}

// ── Graftyperna: en indikatorbild per typ ──

const ar = manifest.ar ? "ar" : vyer[0];
const arKapitel = manifest[ar].sektioner.map((s) => laddaKapitel(ar, s.id));
const prov = [];

/** Lägger till indikatorbilder med en given spec, byggda på kapitlets plan. */
function provbild(kap, kpi, spec, namn) {
  const plan = planeraDeck([kap], { titel: kap.namn, vy: ar, omfang: "kapitel" });
  const bas = plan.find((b) => b.typ === "indikator" && b.id.endsWith(`kpi:${kpi.id}`));
  if (!bas) return;
  const sidor = panelsidor(spec);
  for (let s = 0; s < sidor; s++) prov.push({ ...bas, id: `${namn}:${s}`, kicker: `Graftyp: ${namn}`, spec, sida: s, sidor });
}
const hitta = (pred) => {
  for (const kap of arKapitel) for (const kpi of kap.kpier) if (pred(kap, kpi)) return { kap, kpi };
  return null;
};

const regioner = hitta((kap, kpi) => visningar(kpi, kap, { vy: ar }).some((v) => v.id === "rang"));
if (regioner) {
  const { kap, kpi } = regioner;
  const fasta = Object.keys(kpi.serier).filter((id) => id !== kpi.fokus && id !== "0000").slice(0, 2);
  provbild(kap, kpi, kpiTillSpec(kpi, kap, { vy: ar }, "tid"), "linje mot regionerna");
  provbild(kap, kpi, kpiTillSpec(kpi, kap, { vy: ar, fasta }, "tid"), "linje med två fästa regioner");
  provbild(kap, kpi, kpiTillSpec(kpi, kap, { vy: ar, fasta }, "rang"), "rangordning med två fästa regioner");
  provbild(kap, kpi, minidiagramSpec(kpi, kap, { vy: ar }), "minidiagram");
}
for (const [villkor, visning, namn] of [
  [(s) => s.typ === "linje" && s.serier.some((x) => x.roll === "forvantat"), "tid", "förväntat intervall"],
  [(s) => s.typ === "stapel", "tid", "stapel över tid"],
  [(s) => s.typ === "smaMultiplar", "enheter", "små multiplar"],
  [(s) => s.typ === "rangordning", "enheterRang", "enheter rangordnade"],
]) {
  const traff = hitta((kap, kpi) => visningar(kpi, kap, { vy: ar }).some((v) => v.id === visning)
    && villkor(kpiTillSpec(kpi, kap, { vy: ar }, visning)));
  if (traff) provbild(traff.kap, traff.kpi, kpiTillSpec(traff.kpi, traff.kap, { vy: ar }, visning), namn);
}
const typer = new Set(prov.map((b) => b.spec.typ));
const graf = await skrivOchLas(ritaDeck(prov, "Graftyper"), "graftyper.pptx");
antalFiler++;
for (const t of ["linje", "rangordning", "stapel", "smaMultiplar", "minidiagram"]) {
  if (!typer.has(t)) fel.push(`graftyper: ingen bild av typen ${t}`);
}
if (graf.bilder !== prov.length) fel.push(`graftyper: ${graf.bilder} bilder, väntat ${prov.length}`);
console.log(`graftyper: ${graf.bilder} bilder (${[...typer].join(", ")}), ${graf.diagram} diagram`);

if (fel.length) {
  console.error(`\nFEL:\n  ${fel.join("\n  ")}`);
  process.exit(1);
}
console.log(`\nOK: ${antalFiler} deck skrivna till ${utdata}`);
