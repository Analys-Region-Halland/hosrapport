/// <reference types="vite/client" />

/** Datum då bunten byggdes (ISO, YYYY-MM-DD). Injiceras av vite.config.ts.
 *  Det är detta som menas med "senast uppdaterad" på startsidan: när
 *  rapporten senast publicerades, inte när läsaren råkar öppna sidan. */
declare const __BUILD_DATE__: string;
