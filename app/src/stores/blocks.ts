import type { ContentBlock } from "../types";

const KEY = "hos-rapport-content-blocks";

type BlockStore = Record<string, ContentBlock[]>;

function loadStore(): BlockStore {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

function persist(store: BlockStore): void {
  localStorage.setItem(KEY, JSON.stringify(store));
}

export function getBlocks(targetId: string): ContentBlock[] {
  return loadStore()[targetId] || [];
}

export function setBlocks(targetId: string, blocks: ContentBlock[]): void {
  const store = loadStore();
  store[targetId] = blocks;
  persist(store);
}

export function exportAllBlocks(): string {
  return JSON.stringify(loadStore(), null, 2);
}
