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
};

export function kpiBeskrivning(kpi: { id: string; beskrivning?: string }): string {
  return kpi.beskrivning || DEFINITIONS[kpi.id] || "";
}
