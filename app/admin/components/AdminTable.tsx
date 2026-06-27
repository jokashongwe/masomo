import type { ReactNode } from "react";
import {
  adminTable,
  adminTableEmpty,
  adminTableScroll,
  adminTableWrap,
  adminTableWrapNested,
  adminTd,
  adminTdActions,
  adminTdMono,
  adminTdMuted,
  adminTdSm,
  adminTdStrong,
  adminTh,
  adminThead,
  adminTr,
} from "./admin-ui";

type AdminTableProps = {
  children: ReactNode;
  className?: string;
  scroll?: boolean;
  nested?: boolean;
};

/** Conteneur + `<table>` avec styles admin unifiés. */
export function AdminTable({ children, className, scroll, nested }: AdminTableProps) {
  const wrap = nested ? adminTableWrapNested : scroll ? adminTableScroll : adminTableWrap;
  return (
    <div className={[wrap, className].filter(Boolean).join(" ")}>
      <table className={adminTable}>{children}</table>
    </div>
  );
}

export {
  adminTable,
  adminTableEmpty,
  adminTableScroll,
  adminTableWrap,
  adminTableWrapNested,
  adminTd,
  adminTdActions,
  adminTdMono,
  adminTdMuted,
  adminTdSm,
  adminTdStrong,
  adminTh,
  adminThead,
  adminTr,
};
