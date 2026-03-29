import type { ReactNode } from "react";
import {
  adminCard,
  adminKicker,
  adminSubtitle,
  adminTitle,
} from "../admin/components/admin-ui";

function BrandMark() {
  return (
    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#2D9CDB] text-white shadow-lg shadow-sky-400/35 ring-4 ring-sky-200/50 dark:ring-sky-900/40">
      <span className="grid grid-cols-2 gap-1">
        <span className="h-4 w-4 rounded-md bg-white/95" />
        <span className="h-4 w-4 rounded-md bg-white/70" />
        <span className="h-4 w-4 rounded-md bg-white/70" />
        <span className="h-4 w-4 rounded-md bg-white/95" />
      </span>
    </div>
  );
}

export default function LoginLayoutChrome({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-[#eef6fb] dark:bg-zinc-950">
      <div
        className="pointer-events-none absolute inset-0 opacity-40 dark:opacity-20"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%232D9CDB' fill-opacity='0.12'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
      <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12 md:px-8 md:py-16">
        <div className="w-full max-w-md">
          <div className="text-center">
            <BrandMark />
            <p className={adminKicker}>Masomo</p>
            <h1 className={`mt-2 ${adminTitle}`}>{title}</h1>
            <p className={adminSubtitle}>{subtitle}</p>
          </div>

          <div className={`${adminCard} mt-8`}>{children}</div>

          {footer ? <div className="mt-6">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}
