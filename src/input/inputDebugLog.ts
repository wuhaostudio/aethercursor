export interface InputDebugEntry {
  readonly id: number;
  readonly type: string;
  readonly detail: string;
}

export const INPUT_LOG_LIMIT = 20;

export function appendInputDebugLog(
  entries: readonly InputDebugEntry[],
  next: Omit<InputDebugEntry, "id">
): readonly InputDebugEntry[] {
  const id = entries.length > 0 ? entries[0].id + 1 : 1;

  return [
    {
      id,
      ...next
    },
    ...entries
  ].slice(0, INPUT_LOG_LIMIT);
}

export function formatPointerDetail(x: number, y: number): string {
  return `x:${Math.round(x)} y:${Math.round(y)}`;
}
