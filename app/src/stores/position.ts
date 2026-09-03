import { useSyncExternalStore } from "react";

// ════════════════════════════════════════════════════════════
//  position.ts — var i rapporten läsaren befinner sig.
//
//  Scrollhanteraren i ReportView räknar ut vilket block (kapitelingång,
//  avsnitt, indikator, källor) som ligger vid läslinjen och hur långt in i
//  det läsaren kommit. Positionsraden och innehållsförteckningen
//  prenumererar härifrån, så att rapportens stora artikelträd (med alla
//  diagram) inte ritas om för varje scrollsteg.
// ════════════════════════════════════════════════════════════

export interface Position {
  /** Blockets id utan "rapport-"-prefix, tomt = ovanför första blocket. */
  id: string;
  /** 0–1: hur långt in i blocket läslinjen ligger. */
  progress: number;
}

let state: Position = { id: "", progress: 0 };
const listeners = new Set<() => void>();

export function setPosition(next: Position) {
  // Kvantisera progressen så att prenumeranterna inte ritas om i onödan.
  const p = Math.round(next.progress * 50) / 50;
  if (next.id === state.id && p === state.progress) return;
  state = { id: next.id, progress: p };
  listeners.forEach((l) => l());
}

export function resetPosition() {
  setPosition({ id: "", progress: 0 });
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

export function usePosition(): Position {
  return useSyncExternalStore(subscribe, () => state, () => state);
}
