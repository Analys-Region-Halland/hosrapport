// dirty.ts — håller reda på block med osparade ändringar (för beforeunload-varning).
// EditableBlock markerar sig smutsig vid tangenttryck och ren vid spar/blur.
// ReportView läser hasDirty() i en window.beforeunload-handler.

const dirtyIds = new Set<string>();

export function markDirty(id: string): void {
  dirtyIds.add(id);
}

export function markClean(id: string): void {
  dirtyIds.delete(id);
}

export function hasDirty(): boolean {
  return dirtyIds.size > 0;
}
