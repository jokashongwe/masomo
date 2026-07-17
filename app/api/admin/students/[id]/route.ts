import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSchoolManageApi, requireStudentProfileEditApi } from "@/lib/rbac";
import { canEditStudentStatus } from "@/lib/auth";

const idSchema = z.object({ id: z.coerce.number().int().positive() });

const tutorSchema = z.object({
  firstName: z.string().min(1),
  name: z.string().min(1),
  postnom: z.string().min(1),
  address: z.string().min(1),
  contact: z.string().min(1),
});

const updateSchema = z.object({
  firstName: z.string().min(1),
  name: z.string().min(1),
  postnom: z.string().min(1),
  sex: z.enum(["MALE", "FEMALE", "OTHER"]),
  birthDate: z.coerce.date(),
  classId: z.coerce.number().int().positive(),
  status: z.enum(["ENROLLED", "LEFT", "EXPELLED", "GRADUATED"]),
  tutors: z.array(tutorSchema).min(1).max(10),
});

const studentInclude = {
  academicYear: { select: { id: true, name: true, isCurrent: true } },
  schoolClass: {
    include: {
      level: {
        include: {
          option: {
            include: {
              section: { include: { school: true } },
            },
          },
        },
      },
    },
  },
  studentTutors: { include: { tutor: true } },
} as const;

function serializeStudent(student: Awaited<ReturnType<typeof loadStudent>>) {
  if (!student) return null;
  return {
    id: student.id,
    firstName: student.firstName,
    name: student.name,
    postnom: student.postnom,
    sex: student.sex,
    status: student.status,
    birthDate: student.birthDate.toISOString().slice(0, 10),
    classId: student.classId,
    academicYearId: student.academicYearId,
    createdAt: student.createdAt.toISOString(),
    updatedAt: student.updatedAt.toISOString(),
    academicYear: student.academicYear,
    classLabel: `${student.schoolClass.codeClass} — ${student.schoolClass.level.codeLevel} (${student.schoolClass.level.option.section.codeSection}) — ${student.schoolClass.level.option.section.school.name}`,
    tutors: student.studentTutors.map((st) => ({
      id: st.tutor.id,
      firstName: st.tutor.firstName,
      name: st.tutor.name,
      postnom: st.tutor.postnom,
      address: st.tutor.address,
      contact: st.tutor.contact,
    })),
  };
}

async function loadStudent(id: number) {
  return prisma.student.findUnique({
    where: { id },
    include: studentInclude,
  });
}

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireSchoolManageApi();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const parsedId = idSchema.safeParse({ id });
  if (!parsedId.success) return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });

  const student = await loadStudent(parsedId.data.id);
  if (!student) return NextResponse.json({ error: "Élève introuvable" }, { status: 404 });

  return NextResponse.json({ student: serializeStudent(student) });
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireStudentProfileEditApi();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const parsedId = idSchema.safeParse({ id });
  if (!parsedId.success) return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = await prisma.student.findUnique({
    where: { id: parsedId.data.id },
    select: { id: true, academicYearId: true, status: true },
  });
  if (!existing) return NextResponse.json({ error: "Élève introuvable" }, { status: 404 });

  const mayChangeStatus = canEditStudentStatus(auth.user.role);
  const nextStatus = mayChangeStatus ? parsed.data.status : existing.status;
  if (!mayChangeStatus && parsed.data.status !== existing.status) {
    return NextResponse.json(
      { error: "Seul l'administrateur système peut modifier le statut de l'élève" },
      { status: 403 },
    );
  }

  const schoolClass = await prisma.schoolClass.findUnique({
    where: { id: parsed.data.classId },
    select: { id: true },
  });
  if (!schoolClass) return NextResponse.json({ error: "Classe introuvable" }, { status: 400 });

  try {
    await prisma.$transaction(async (tx) => {
      const uniqueTutors = Array.from(
        new Map(
          parsed.data.tutors.map((t) => [t.contact.trim(), { ...t, contact: t.contact.trim() }]),
        ).values(),
      );

      const upsertedTutors = await Promise.all(
        uniqueTutors.map((t) =>
          tx.tutor.upsert({
            where: { contact: t.contact },
            update: {
              firstName: t.firstName,
              name: t.name,
              postnom: t.postnom,
              address: t.address,
            },
            create: {
              firstName: t.firstName,
              name: t.name,
              postnom: t.postnom,
              address: t.address,
              contact: t.contact,
            },
          }),
        ),
      );

      await tx.studentTutor.deleteMany({ where: { studentId: parsedId.data.id } });

      await tx.student.update({
        where: { id: parsedId.data.id },
        data: {
          firstName: parsed.data.firstName.trim(),
          name: parsed.data.name.trim(),
          postnom: parsed.data.postnom.trim(),
          sex: parsed.data.sex,
          birthDate: parsed.data.birthDate,
          classId: parsed.data.classId,
          status: nextStatus,
          studentTutors: {
            create: upsertedTutors.map((t) => ({ tutorId: t.id })),
          },
        },
      });
    });

    const student = await loadStudent(parsedId.data.id);
    return NextResponse.json({ student: serializeStudent(student) });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Échec de la mise à jour" },
      { status: 409 },
    );
  }
}
