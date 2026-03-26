import Link from "next/link";
import { redirect } from "next/navigation";
import { canManageSchool, canReadFinance, getCurrentUser, isSystemAdmin } from "@/lib/auth";
import type { ReactNode } from "react";

function IconSchools() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7l9-4 9 4-9 4-9-4z" />
      <path d="M21 10v6" />
      <path d="M3 7v6l9 4 9-4" />
    </svg>
  );
}

function IconSections() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4h12v6H6z" />
      <path d="M6 14h12v6H6z" />
      <path d="M8 7h8" />
      <path d="M8 17h8" />
    </svg>
  );
}

function IconOptions() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l2.2 6.8H21l-5.5 4 2.1 6.7L12 15.9 6.4 19.5l2.1-6.7L3 8.8h6.8L12 2z" />
    </svg>
  );
}

function IconLevels() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16v6H4z" />
      <path d="M4 14h10v6H4z" />
      <path d="M16 14h4" />
    </svg>
  );
}

function IconClasses() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6l9-3 9 3-9 3-9-3z" />
      <path d="M3 10l9 3 9-3" />
      <path d="M3 14l9 3 9-3" />
    </svg>
  );
}

function IconStudents() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <path d="M8.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconFinance() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 12-9 12S3 17 3 10a9 9 0 0 1 18 0z" />
      <path d="M12 7v6" />
      <path d="M12 13h3" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <path d="M8.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
      <path d="M20 8v6" />
      <path d="M23 11h-6" />
    </svg>
  );
}

function IconWallet() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 9V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-2" />
      <path d="M21 12H12a2 2 0 0 0 0 4h9v-4Z" />
      <path d="M16 12h0" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const showSchool = canManageSchool(user.role);
  const showFinance = canReadFinance(user.role);
  const showUsers = isSystemAdmin(user.role);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <div className="flex min-h-screen">
        <aside className="w-64 shrink-0 border-r border-zinc-200/70 dark:border-zinc-800 bg-white/70 dark:bg-black/40">
          <div className="p-4">
            <div className="text-sm font-semibold text-black dark:text-white">KelaApp Admin</div>
            <div className="text-xs text-zinc-600 dark:text-zinc-300 mt-1">
              {user.name} ({user.role})
            </div>
          </div>

          <nav className="px-3 pb-6">
            <div className="space-y-1">
              <Link
                href="/admin"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-800 dark:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60"
              >
                <span className="text-zinc-900 dark:text-white">
                  <IconSchools />
                </span>
                Dashboard
              </Link>

              {showSchool ? (
                <>
                  <Link
                    href="/admin/schools"
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-800 dark:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60"
                  >
                    <span className="text-zinc-900 dark:text-white">
                      <IconSchools />
                    </span>
                    Schools
                  </Link>
                  <Link
                    href="/admin/sections"
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-800 dark:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60"
                  >
                    <span className="text-zinc-900 dark:text-white">
                      <IconSections />
                    </span>
                    Sections
                  </Link>
                  <Link
                    href="/admin/options"
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-800 dark:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60"
                  >
                    <span className="text-zinc-900 dark:text-white">
                      <IconOptions />
                    </span>
                    Options
                  </Link>
                  <Link
                    href="/admin/levels"
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-800 dark:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60"
                  >
                    <span className="text-zinc-900 dark:text-white">
                      <IconLevels />
                    </span>
                    Levels
                  </Link>
                  <Link
                    href="/admin/classes"
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-800 dark:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60"
                  >
                    <span className="text-zinc-900 dark:text-white">
                      <IconClasses />
                    </span>
                    Classes
                  </Link>
                  <Link
                    href="/admin/students"
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-800 dark:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60"
                  >
                    <span className="text-zinc-900 dark:text-white">
                      <IconStudents />
                    </span>
                    Students
                  </Link>
                </>
              ) : null}

              {showFinance ? (
                <Link
                  href="/admin/finance"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-800 dark:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60"
                >
                  <span className="text-zinc-900 dark:text-white">
                    <IconFinance />
                  </span>
                  Finance
                </Link>
              ) : null}

              {showFinance ? (
                <Link
                  href="/admin/wallet"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-800 dark:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60"
                >
                  <span className="text-zinc-900 dark:text-white">
                    <IconWallet />
                  </span>
                  Wallet
                </Link>
              ) : null}

              {showUsers ? (
                <Link
                  href="/admin/users"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-800 dark:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60"
                >
                  <span className="text-zinc-900 dark:text-white">
                    <IconUsers />
                  </span>
                  Users
                </Link>
              ) : null}

              {showUsers ? (
                <Link
                  href="/admin/academic-years"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-800 dark:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60"
                >
                  <span className="text-zinc-900 dark:text-white">
                    <IconCalendar />
                  </span>
                  Academic Years
                </Link>
              ) : null}
            </div>
          </nav>
        </aside>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

