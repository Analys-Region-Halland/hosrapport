// stilguide-stil.ts: stilarna för den levande stilguiden, i samma ordning som
// main.tsx (utan gamla vyns index.css). Laddas som eget skript före
// stilguide.tsx: Vite lyfter import.meta.glob({ eager: true }) överst i
// stilguide.tsx, så sektionernas CSS Modules skulle annars hamna före
// styles/index.css. Då deklareras @layer komponent först och hamnar under
// reset, och återställningen vinner över alla komponentregler. Ägare: WP7.

import "../src/styles/index.css";
import "virtual:tema.css";
