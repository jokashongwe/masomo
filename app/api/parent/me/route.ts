import { NextResponse } from "next/server";
import { requireParentApi } from "@/lib/parent-rbac";

export async function GET(req: Request) {
  const auth = await requireParentApi(req);
  if (!auth.ok) return auth.response;

  return NextResponse.json({
    tutor: auth.tutor,
    mustChangePin: auth.tutor.mustChangePin,
  });
}
