// ui/lagerLokal.ts: var WP5:s tillfälliga lagerstapel tills nav/lager.ts (WP6)
// fanns. Nu återexporterar den rapportens enda stapel därifrån, så att popover,
// ark, dialog, meny och ramens lager delar stapel och Escape bara stänger det
// översta. Samma beteende som förut: lyssnaren sitter på window i fångstfasen
// och stoppar händelsen. Ägare: WP5 (omkopplad av WP6 på orkestrerarens
// begäran; filen kan tas bort när importerna pekar på nav/lager.ts).

export { arOverst, registreraLager } from "../nav/lager";
