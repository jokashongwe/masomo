import { requireRoles, canReadFinance } from "@/lib/auth";
import FeePaymentsByClassClient from "./FeePaymentsByClassClient";

export default async function FeePaymentsByClassReportPage() {
  await requireRoles((role) => canReadFinance(role));
  return <FeePaymentsByClassClient />;
}
