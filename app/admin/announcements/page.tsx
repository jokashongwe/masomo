import { prisma } from "@/lib/prisma";
import { canManageAnnouncements } from "@/lib/parent-rbac";
import { requireRoles } from "@/lib/auth";
import AdminPageHeader from "../components/AdminPageHeader";
import { adminPage } from "../components/admin-ui";
import AnnouncementsCrud from "./AnnouncementsCrud";

export default async function AdminAnnouncementsPage() {
  await requireRoles(canManageAnnouncements);

  const rows = await prisma.announcement.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      body: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
      createdBy: { select: { name: true } },
    },
  });

  return (
    <div className={adminPage}>
      <AdminPageHeader
        kicker="Communication"
        title="Communiqués"
        subtitle="Publiez des annonces visibles dans l’application mobile des parents."
      />
      <div className="mt-6">
        <AnnouncementsCrud
          initialItems={rows.map((a) => ({
            id: a.id,
            title: a.title,
            body: a.body,
            publishedAt: a.publishedAt?.toISOString() ?? null,
            createdAt: a.createdAt.toISOString(),
            updatedAt: a.updatedAt.toISOString(),
            authorName: a.createdBy.name,
          }))}
        />
      </div>
    </div>
  );
}
