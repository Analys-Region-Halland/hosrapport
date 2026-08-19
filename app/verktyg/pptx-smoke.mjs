// pptx-smoke.mjs — Röktest för PowerPoint-exporten.
//
// Exporten har ingen annan automatisk kontroll: den körs i webbläsaren vid ett
// knapptryck, och ett fel i en diagramserie eller en tabellrad märks först när
// någon öppnar filen. Skriptet bygger därför ett riktigt deck ur den exporterade
// JSON:en och skriver det till disk, så att felet syns i terminalen i stället.
//
// Körs med jiti, som läser TypeScript direkt. localStorage saknas i Node, men
// stores/blocks.ts fångar det i sin try/catch och ger tomma anteckningar.
//
//   npm run test:pptx              → skriver till app/.pptx-smoke/
//   npm run test:pptx -- <mapp>    → skriver till angiven mapp
//
// Filen är ett utvecklarverktyg och ingår inte i bunten.

import { createJiti } from "jiti";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const harHar = path.dirname(fileURLToPath(import.meta.url));
const appRot = path.resolve(harHar, "..");
const repoRot = path.resolve(appRot, "..");
const utdata = path.resolve(process.argv[2] ?? path.join(appRot, ".pptx-smoke"));

const dataDir = path.join(repoRot, "app/public/data");
const manifest = JSON.parse(fs.readFileSync(path.join(dataDir, "index.json"), "utf8"));

// Testa varje kapitel, inte bara ett: fel brukar sitta i en enskild indikator
// (saknad riket-serie, neutralt mått utan placering, tom topp 3-zon).
const sektionsIds = manifest.ar.sektioner.map((s) => s.id);

fs.mkdirSync(utdata, { recursive: true });
const jiti = createJiti(import.meta.url, { interopDefault: true });
const { exporteraPptx } = await jiti.import(path.join(appRot, "src/utils/pptx.ts"));

process.chdir(utdata);
for (const id of sektionsIds) {
  const sek = JSON.parse(fs.readFileSync(path.join(dataDir, `ar-${id}.json`), "utf8"));
  await exporteraPptx({ sektioner: [sek], vyData: manifest.ar, titel: sek.namn });
  console.log(`  ${id}: ${sek.kpier.length} indikatorer, ${sek.delar?.length ?? 0} avsnitt`);
}

const filer = fs.readdirSync(utdata).filter((f) => f.endsWith(".pptx"));
if (filer.length !== sektionsIds.length) {
  console.error(`FEL: ${sektionsIds.length} kapitel gav ${filer.length} filer`);
  process.exit(1);
}
console.log(`\nOK: ${filer.length} deck skrivna till ${utdata}`);
