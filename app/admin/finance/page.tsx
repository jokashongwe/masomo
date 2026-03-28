import Link from "next/link";
import { requireRoles, canReadFinance } from "@/lib/auth";
import AdminPageHeader from "../components/AdminPageHeader";
import { adminHubCard, adminHubCardDesc, adminHubCardTitle, adminPage } from "../components/admin-ui";

export default async function AdminFinanceHomePage() {
  await requireRoles((role) => canReadFinance(role));
  const links = [
    { href: "/admin/finance/modules", title: "Modules", desc: "Périodes et modules de facturation." },
    { href: "/admin/finance/tranches", title: "Tranches", desc: "Tranches rattachées aux modules." },
    { href: "/admin/finance/fees", title: "Frais", desc: "Barèmes par niveau, USD et CDF." },
    { href: "/admin/finance/payments", title: "Paiements", desc: "Saisie et suivi des paiements." },
  ];

  return (
    <div className={adminPage}>
      <AdminPageHeader
        kicker="Finances"
        title="Finances"
        subtitle="Gérer les frais, les modules de facturation, les tranches et les paiements."
        backLabel="Retour à l’admin"
      />
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {links.map((item) => (
          <Link key={item.href} href={item.href} className={adminHubCard}>
            <span className={adminHubCardTitle}>{item.title}</span>
            <span className={adminHubCardDesc}>{item.desc}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
