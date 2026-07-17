"use client";

import { useMemo, useState } from "react";
import {
  nextSortDir,
  sortRows,
  type SortDir,
  type SortGetters,
} from "@/lib/table-sort";

export function useClientSort<T>(
  rows: readonly T[],
  options: {
    defaultKey: string;
    defaultDir?: SortDir;
    getters: SortGetters<T>;
  },
) {
  const { defaultKey, defaultDir = "asc", getters } = options;
  const [sortKey, setSortKey] = useState(defaultKey);
  const [sortDir, setSortDir] = useState<SortDir>(defaultDir);

  const sortedRows = useMemo(
    () => sortRows(rows, sortKey, sortDir, getters),
    // getters is expected to be a stable column map; rows/sort drive reordering
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, sortKey, sortDir],
  );

  function toggleSort(column: string) {
    setSortDir((dir) => nextSortDir(sortKey, column, dir));
    setSortKey(column);
  }

  return { sortedRows, sortKey, sortDir, toggleSort };
}
