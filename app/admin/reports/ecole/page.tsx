import { requireRoles, canReadFinance } from "@/lib/auth";
import EcoleReportClient from "./EcoleReportClient";

export default async function EcoleReportPage() {
  await requireRoles((role) => canReadFinance(role));
  return <EcoleReportClient />;
}
