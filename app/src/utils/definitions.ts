// Indikatorbeskrivningar — "vad grafen visar". Platshållare tills R-pipelinen
// levererar kpi.beskrivning; kpiBeskrivning() föredrar datan och faller tillbaka
// på dessa. Används i undertitlar (ChartModal, FacetedChart) och titel-tooltip.

export const DEFINITIONS: Record<string, string> = {
  belaggning: "Andel disponibla vårdplatser som är belagda vid mättillfället.",
  akutbesok: "Antal patientbesök på akutmottagningen under perioden.",
  vantetid: "Mediantid från ankomst till läkarbedömning på akutmottagningen.",
  ambulans: "Antal genomförda ambulansuppdrag under perioden.",
  inlaggningar: "Antal patienter inlagda på vårdavdelning via akutmottagningen.",
  utskrivningsklara: "Medicinskt färdigbehandlade patienter som kvarstår i väntan på kommunal insats.",
  npe_helhetsintryck: "Andel patienter med positivt helhetsintryck av vården (Nationell patientenkät).",
  npe_respekt: "Andel patienter som upplevde gott bemötande och respekt (Nationell patientenkät).",
  npe_delaktighet: "Andel patienter som upplevde delaktighet och involvering (Nationell patientenkät).",
  npe_tillganglighet: "Andel patienter som upplevde god tillgänglighet (Nationell patientenkät).",
  pv_besok: "Antal genomförda läkarbesök på vårdcentraler i Halland under perioden.",
  digital_kontakt: "Antal digitala vårdkontakter (video, chatt och asynkrona ärenden) i den nära vården.",
  telefon_svar: "Andel telefonsamtal till vårdcentral som besvarades samma dag.",
  sjukfranvaro: "Sjukfrånvaro i procent av ordinarie arbetstid, samtliga yrkesgrupper.",
  overtid: "Antal arbetade övertidstimmar under perioden, samtliga yrkesgrupper.",
  inhyrd: "Antal timmar utförda av inhyrd personal (bemanningsföretag) under perioden.",
};

export function kpiBeskrivning(kpi: { id: string; beskrivning?: string }): string {
  return kpi.beskrivning || DEFINITIONS[kpi.id] || "";
}

// Kort undertitel: de första `maxMeningar` meningarna ur indikatorns beskrivning.
// För Kolada/SKR-indikatorer är beskrivningen "Titel — definition"; titeln
// upprepar rubriken ovanför och hör hemma under infoknappen, så undertiteln tar
// bara definitionsdelen. En avslutande "Källa: …" och övrig uttömmande text
// stannar likaså under infoknappen (full kpi.beskrivning), inte i undertiteln.
export function kortBeskrivning(
  kpi: { id: string; beskrivning?: string },
  maxMeningar = 2,
): string {
  let full = kpiBeskrivning(kpi).trim();
  if (!full) return "";

  // Släpp ledande "Titel — ". Endast em-streck (U+2014) som pipelinen sätter;
  // bindestreck och en-streck (–) förekommer inuti titlarna och får inte träffas.
  const sep = full.indexOf("—");
  if (sep !== -1) full = full.slice(sep + 1).trim();

  // Släpp avslutande källhänvisning ("Källa: …").
  full = full.replace(/\s*Källa:[\s\S]*$/, "").trim();

  const meningar = full.match(/[^.!?]+[.!?]+(?=\s|$)/g);
  if (!meningar || meningar.length <= maxMeningar) return full;
  return meningar.slice(0, maxMeningar).join("").trim();
}
