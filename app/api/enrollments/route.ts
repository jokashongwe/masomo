import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSchoolManageApi } from "@/lib/rbac";
import { enrollStudentInCurrentYear } from "@/lib/student-enroll";

const tutorSchema = z.object({
  name: z.string().min(1, "Tutor name is required"),
  postnom: z.string().min(1, "Tutor postnom is required"),
  firstName: z.string().min(1, "Tutor first name is required"),
  address: z.string().min(1, "Tutor address is required"),
  contact: z.string().min(1, "Tutor contact is required"),
});

const studentSchema = z.object({
  name: z.string().min(1, "Student name is required"),
  postnom: z.string().min(1, "Student postnom is required"),
  firstName: z.string().min(1, "Student first name is required"),
  sex: z.enum(["MALE", "FEMALE", "OTHER"]),
  birthDate: z.coerce.date(),
});

const enrollSchema = z.object({
  classId: z.number().int().positive(),
  student: studentSchema,
  tutors: z.array(tutorSchema).min(1).max(10),
});

export async function POST(req: Request) {
  const auth = await requireSchoolManageApi();
  if (!auth.ok) return auth.response;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = enrollSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().formErrors.join(", ") || "Invalid payload" },
      { status: 400 },
    );
  }

  const { classId, student, tutors } = parsed.data;

  try {
    const { studentId } = await enrollStudentInCurrentYear({
      classId,
      student,
      tutors,
    });

    return NextResponse.json(
      { studentId, message: "Student enrolled successfully" },
      { status: 201 },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to enroll student";
    const status =
      msg.includes("introuvable") || msg.includes("Aucune année") ? 400 : msg.includes("requis") ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

