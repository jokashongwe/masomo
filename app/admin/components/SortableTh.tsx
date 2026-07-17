"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { sortIndicator, type SortDir } from "@/lib/table-sort";
import { adminTh, adminThSortable } from "./admin-ui";

type SortableThProps = {
  column: string;
  label: ReactNode;
  sortKey: string;
  sortDir: SortDir;
  onSort: (column: string) => void;
  className?: string;
};

/** En-tête cliquable pour le tri côté client. */
export function SortableTh({
  column,
  label,
  sortKey,
  sortDir,
  onSort,
  className,
}: SortableThProps) {
  const active = sortKey === column;
  return (
    <th className={[adminTh, className].filter(Boolean).join(" ")} aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}>
      <button type="button" className={adminThSortable} onClick={() => onSort(column)}>
        <span>{label}</span>
        <span className={active ? "text-[#2D9CDB]" : "text-zinc-400"} aria-hidden>
          {sortIndicator(active, sortDir)}
        </span>
      </button>
    </th>
  );
}

type SortableThLinkProps = {
  column: string;
  label: ReactNode;
  sortKey: string;
  sortDir: SortDir;
  href: string;
  className?: string;
};

/** En-tête cliquable pour le tri via URL (pages serveur paginées). */
export function SortableThLink({
  column,
  label,
  sortKey,
  sortDir,
  href,
  className,
}: SortableThLinkProps) {
  const active = sortKey === column;
  return (
    <th className={[adminTh, className].filter(Boolean).join(" ")} aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}>
      <Link href={href} className={adminThSortable} prefetch={false}>
        <span>{label}</span>
        <span className={active ? "text-[#2D9CDB]" : "text-zinc-400"} aria-hidden>
          {sortIndicator(active, sortDir)}
        </span>
      </Link>
    </th>
  );
}
