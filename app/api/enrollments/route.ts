import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSchoolManageApi } from "@/lib/rbac";

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

  const currentYear = await prisma.academicYear.findFirst({
    where: { isCurrent: true },
    select: { id: true, name: true },
  });

  if (!currentYear) {
    return NextResponse.json(
      { error: "No academic year in progress. Ask a system administrator to configure it." },
      { status: 500 },
    );
  }

  const schoolClass = await prisma.schoolClass.findUnique({
    where: { id: classId },
    select: { id: true },
  });

  if (!schoolClass) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Deduplicate tutors by contact (simplifies upsert + prevents duplicates in join).
      const uniqueTutors = Array.from(
        new Map(tutors.map((t) => [t.contact.trim(), { ...t, contact: t.contact.trim() }])),
        // Map values
        ([, v]) => v,
      );

      const upsertedTutors = await Promise.all(
        uniqueTutors.map((t) =>
          tx.tutor.upsert({
            where: { contact: t.contact },
            update: {
              name: t.name,
              postnom: t.postnom,
              firstName: t.firstName,
              address: t.address,
            },
            create: {
              name: t.name,
              postnom: t.postnom,
              firstName: t.firstName,
              address: t.address,
              contact: t.contact,
            },
          }),
        ),
      );

      const createdStudent = await tx.student.create({
        data: {
          name: student.name,
          postnom: student.postnom,
          firstName: student.firstName,
          sex: student.sex,
          birthDate: student.birthDate,
          classId,
          academicYearId: currentYear.id,
          studentTutors: {
            create: upsertedTutors.map((t) => ({
              tutor: { connect: { id: t.id } },
            })),
          },
        },
        include: {
          schoolClass: {
            include: {
              level: { include: { option: { include: { section: { include: { school: true } } } } } },
            },
          },
          studentTutors: { include: { tutor: true } },
        },
      });

      return createdStudent;
    });

    return NextResponse.json(
      { studentId: result.id, message: "Student enrolled successfully" },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to enroll student. Please verify payload and database constraints." },
      { status: 500 },
    );
  }
}

