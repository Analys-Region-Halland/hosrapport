import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Repo-rotens data/-mapp är ENDA kanoniska källan för hos-data.json.
// Tidigare fanns en manuellt kopierad dubblett i app/src/data/ — den är borttagen.
const dataDir = fileURLToPath(new URL("../data", import.meta.url));
const repoRoot = fileURLToPath(new URL("..", import.meta.url));

export default defineConfig(({ command }) => ({
  // Dev: rot-bas (appen nås på http://localhost:5173/ — ingen /hosrapport/-fälla).
  // Build: /hosrapport/ för GitHub Pages-utlägget. BASE_PATH-miljövariabeln
  // låter deploy-workflowet härleda basen från repo-namnet, så samma kodbas
  // kan publiceras även som t.ex. /hosrapport-utkast/.
  base: command === "serve" ? "/" : (process.env.BASE_PATH ?? "/hosrapport/"),
  // Byggdatum bakas in. Startsidans "Senast uppdaterad" ska visa när rapporten
  // publicerades, inte när läsaren öppnar sidan — ett `new Date()` i klienten
  // hade påstått att rapporten uppdaterades i dag oavsett hur gammal den är.
  // Deploy-workflowet bygger vid varje push, så datumet följer publiceringen.
  define: {
    __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@data": dataDir,
    },
  },
  server: {
    // Tillåt dev-servern att läsa JSON från repo-roten (utanför app/)
    fs: { allow: [repoRoot] },
  },
}));
