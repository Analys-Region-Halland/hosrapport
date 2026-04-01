import type { VComment } from "../types";
export type { VComment };

const STORAGE_KEY = "hos-rapport-comments";

export function loadVComments(): VComment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveVComment(comment: VComment): VComment[] {
  const all = loadVComments().filter((c) => c.targetId !== comment.targetId);
  if (comment.text.trim()) all.push(comment);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  return all;
}

export function getVComment(targetId: string): VComment | undefined {
  return loadVComments().find((c) => c.targetId === targetId);
}

export function exportVComments(): string {
  return JSON.stringify(loadVComments(), null, 2);
}
