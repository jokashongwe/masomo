import { requireRoles, canManageSchool } from "@/lib/auth";
import StudentsImportClient from "./StudentsImportClient";

export default async function AdminStudentsImportPage() {
  await requireRoles((role) => canManageSchool(role));
  return <StudentsImportClient />;
}
