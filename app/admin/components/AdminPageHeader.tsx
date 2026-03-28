import Link from "next/link";
import type { ReactNode } from "react";
import {
  adminBackLink,
  adminHeaderRow,
  adminKicker,
  adminSubtitle,
  adminTitle,
} from "./admin-ui";

export default function AdminPageHeader({
  kicker,
  title,
  subtitle,
  backHref = "/admin",
  backLabel = "Retour",
  actions,
}: {
  kicker?: string;
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
}) {
  return (
    <header className={adminHeaderRow}>
      <div>
        {kicker ? <p className={adminKicker}>{kicker}</p> : null}
        <h1 className={kicker ? `mt-1 ${adminTitle}` : adminTitle}>{title}</h1>
        {subtitle ? <p className={adminSubtitle}>{subtitle}</p> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {actions}
        <Link href={backHref} className={adminBackLink}>
          {backLabel}
        </Link>
      </div>
    </header>
  );
}
