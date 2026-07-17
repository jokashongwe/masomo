export type SortDir = "asc" | "desc";

export type SortValue = string | number | boolean | Date | null | undefined;

export type SortGetters<T> = Record<string, (row: T) => SortValue>;

function normalizeSortValue(value: SortValue): string | number | boolean | null {
  if (value == null) return null;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string") return value.trim().toLocaleLowerCase("fr");
  return value;
}

export function compareSortValues(a: SortValue, b: SortValue, dir: SortDir): number {
  const av = normalizeSortValue(a);
  const bv = normalizeSortValue(b);

  if (av == null && bv == null) return 0;
  if (av == null) return 1;
  if (bv == null) return -1;

  let cmp = 0;
  if (typeof av === "number" && typeof bv === "number") {
    cmp = av - bv;
  } else if (typeof av === "boolean" && typeof bv === "boolean") {
    cmp = Number(av) - Number(bv);
  } else {
    cmp = String(av).localeCompare(String(bv), "fr", { numeric: true, sensitivity: "base" });
  }

  return dir === "asc" ? cmp : -cmp;
}

export function sortRows<T>(
  rows: readonly T[],
  key: string,
  dir: SortDir,
  getters: SortGetters<T>,
): T[] {
  const getter = getters[key];
  if (!getter) return [...rows];

  return [...rows].sort((a, b) => compareSortValues(getter(a), getter(b), dir));
}

export function nextSortDir(currentKey: string, clickedKey: string, currentDir: SortDir): SortDir {
  if (currentKey === clickedKey) return currentDir === "asc" ? "desc" : "asc";
  return "asc";
}

export function sortIndicator(active: boolean, dir: SortDir): string {
  if (!active) return "↕";
  return dir === "asc" ? "↑" : "↓";
}
