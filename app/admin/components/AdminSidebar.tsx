"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import AdminLogoutButton from "./AdminLogoutButton";
import {
  IconCalendar,
  IconClasses,
  IconDashboard,
  IconFinance,
  IconLevels,
  IconOptions,
  IconPayments,
  IconReports,
  IconSchools,
  IconSections,
  IconStudents,
  IconUsers,
  IconWallet,
  IconEnroll,
} from "./AdminIcons";

type NavItem = { href: string; label: string; icon: ReactNode };

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      className={`group flex flex-col cursor-pointer items-center gap-1.5 rounded-2xl px-2 py-2.5 text-center transition ${
        active ? "bg-white text-[#1e7bb8] shadow-md shadow-black/10" : "text-white/95 hover:bg-white/15"
      }`}
      title={item.label}
    >
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-xl transition ${
          active ? "bg-sky-100 text-[#1e7bb8]" : "bg-white/10 text-white group-hover:bg-white/20"
        }`}
      >
        {item.icon}
      </span>
      <span className="max-w-[4.5rem] text-[10px] font-medium leading-tight">{item.label}</span>
    </Link>
  );
}

function NavGroup({
  label,
  items,
  pathname,
}: {
  label: string;
  items: NavItem[];
  pathname: string;
}) {
  const anyActive = useMemo(() => items.some((item) => isActive(pathname, item.href)), [items, pathname]);
  const [open, setOpen] = useState(anyActive);

  useEffect(() => {
    if (anyActive) setOpen(true);
  }, [anyActive]);

  const expanded = anyActive || open;

  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => {
          if (!anyActive) setOpen((v) => !v);
        }}
        className={`flex w-full flex-col cursor-pointer items-center gap-1 rounded-2xl px-2 py-2 text-center transition ${
          anyActive ? "bg-white/20 text-white shadow-inner" : "text-white/95 hover:bg-white/15"
        }`}
        aria-expanded={expanded}
        title={label}
      >
        <span className="flex h-6 w-6 items-center justify-center text-[10px] font-bold text-white/90" aria-hidden>
          {expanded ? "▼" : "▶"}
        </span>
        <span className="max-w-[4.5rem] text-[9px] font-semibold uppercase leading-tight tracking-wide text-white/95">
          {label}
        </span>
      </button>
      {expanded ? (
        <div className="ml-1 flex flex-col gap-1 border-l-2 border-white/25 pl-1">
          {items.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function AdminSidebar({
  userName,
  userRole,
  brandName,
  showSchool,
  showFinance,
  showUsers,
}: {
  userName: string;
  userRole: string;
  brandName: string;
  showSchool: boolean;
  showFinance: boolean;
  showUsers: boolean;
}) {
  const pathname = usePathname() ?? "/admin";

  const configurationItems: NavItem[] = useMemo(() => {
    const out: NavItem[] = [];
    if (showSchool) {
      out.push(
        { href: "/admin/schools", label: "Écoles", icon: <IconSchools /> },
        { href: "/admin/sections", label: "Sections", icon: <IconSections /> },
        { href: "/admin/options", label: "Options", icon: <IconOptions /> },
        { href: "/admin/levels", label: "Niveaux", icon: <IconLevels /> },
        { href: "/admin/classes", label: "Classes", icon: <IconClasses /> },
      );
    }
    if (showUsers) {
      out.push({ href: "/admin/academic-years", label: "Années", icon: <IconCalendar /> });
    }
    return out;
  }, [showSchool, showUsers]);

  const financeGroupItems: NavItem[] = useMemo(
    () =>
      showFinance
        ? [
            { href: "/admin/finance", label: "Finances", icon: <IconFinance /> },
            { href: "/admin/finance/payments", label: "Paiements", icon: <IconPayments /> },
            { href: "/admin/wallet", label: "Budget", icon: <IconWallet /> },
          ]
        : [],
    [showFinance],
  );

  const schoolStandalone: NavItem[] = useMemo(
    () =>
      showSchool
        ? [
            { href: "/admin/students", label: "Élèves", icon: <IconStudents /> },
            { href: "/admin/enroll", label: "Inscription", icon: <IconEnroll /> },
          ]
        : [],
    [showSchool],
  );

  const usersOnly: NavItem[] = useMemo(
    () => (showUsers ? [{ href: "/admin/users", label: "Utilisateurs", icon: <IconUsers /> }] : []),
    [showUsers],
  );

  return (
    <aside className="relative flex w-[5.5rem] shrink-0 flex-col bg-[#2D9CDB] text-white shadow-xl shadow-sky-900/20 md:w-[6.25rem]">
      {/* Motif décoratif en tête */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-24 opacity-25"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.35'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative z-10 flex flex-1 flex-col pt-4">
        <div className="flex flex-col items-center px-2 pb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 shadow-inner ring-2 ring-white/30">
            <span className="grid grid-cols-2 gap-0.5">
              <span className="h-3 w-3 rounded-sm bg-white/90" />
              <span className="h-3 w-3 rounded-sm bg-white/60" />
              <span className="h-3 w-3 rounded-sm bg-white/60" />
              <span className="h-3 w-3 rounded-sm bg-white/90" />
            </span>
          </div>
          <p className="mt-2 line-clamp-2 text-center text-[10px] font-semibold leading-tight text-white">{brandName}</p>
        </div>

        <nav className="scrollbar-thin flex flex-1 flex-col gap-1 overflow-y-auto px-2 pb-4">
          <NavLink item={{ href: "/admin", label: "Tableau de bord", icon: <IconDashboard /> }} pathname={pathname} />

          {configurationItems.length > 0 ? (
            <NavGroup label="Configurations" items={configurationItems} pathname={pathname} />
          ) : null}

          {schoolStandalone.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}

          {financeGroupItems.length > 0 ? (
            <NavGroup label="Finances" items={financeGroupItems} pathname={pathname} />
          ) : null}

          {showFinance ? (
            <NavLink item={{ href: "/admin/reports", label: "Rapports", icon: <IconReports /> }} pathname={pathname} />
          ) : null}

          {usersOnly.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </nav>

        <div className="relative z-10 mt-auto flex flex-col items-center gap-3 border-t border-white/20 px-2 py-4">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-sm font-bold text-white ring-2 ring-white/30"
            title={userName}
          >
            {userName.slice(0, 1).toUpperCase()}
          </div>
          <p className="line-clamp-2 max-w-full px-1 text-center text-[9px] text-white/80">{userRole}</p>
          <AdminLogoutButton />
        </div>
      </div>
    </aside>
  );
}
