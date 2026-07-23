"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  adminCard,
  adminErrorBox,
  adminGhostButton,
  adminInput,
  adminLabel,
  adminNestedCard,
  adminPrimaryButton,
  adminSecondaryButton,
  adminSectionTitle,
  adminSoftCard,
} from "../../components/admin-ui";
import {
  STUDENT_SEX_OPTIONS,
  STUDENT_STATUS_OPTIONS,
  studentSexLabel,
  studentStatusBadgeClass,
  studentStatusLabel,
} from "@/lib/student-labels";

type TutorRow = {
  id?: number;
  firstName: string;
  name: string;
  postnom: string;
  address: string;
  contact: string;
};

type StudentDetail = {
  id: number;
  firstName: string;
  name: string;
  postnom: string;
  sex: "MALE" | "FEMALE" | "OTHER";
  status: "ENROLLED" | "LEFT" | "EXPELLED" | "GRADUATED";
  birthDate: string;
  classId: number;
  levelId: number;
  levelLabel: string;
  classLabel: string;
  academicYear: { id: number; name: string; isCurrent: boolean };
  tutors: TutorRow[];
  createdAt: string;
  updatedAt: string;
};

type ClassOption = {
  id: number;
  levelId: number;
  levelLabel: string;
  label: string;
  codeClass: string;
};

function emptyTutor(): TutorRow {
  return { firstName: "", name: "", postnom: "", address: "", contact: "" };
}

export default function StudentDetailClient({
  initialStudent,
  classOptions,
  canEdit,
  canEditStatus,
  backHref,
}: {
  initialStudent: StudentDetail;
  classOptions: ClassOption[];
  canEdit: boolean;
  canEditStatus: boolean;
  backHref: string;
}) {
  const router = useRouter();
  const [student, setStudent] = useState(initialStudent);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    firstName: initialStudent.firstName,
    name: initialStudent.name,
    postnom: initialStudent.postnom,
    sex: initialStudent.sex,
    status: initialStudent.status,
    birthDate: initialStudent.birthDate,
    levelId: String(initialStudent.levelId),
    classId: String(initialStudent.classId),
    tutors: initialStudent.tutors.map((t) => ({ ...t })),
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fullName = useMemo(
    () => `${student.firstName} ${student.name} ${student.postnom}`.trim(),
    [student],
  );

  const levelOptions = useMemo(() => {
    const map = new Map<number, string>();
    for (const c of classOptions) {
      if (!map.has(c.levelId)) map.set(c.levelId, c.levelLabel);
    }
    return [...map.entries()]
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "fr"));
  }, [classOptions]);

  const classesForLevel = useMemo(
    () => classOptions.filter((c) => String(c.levelId) === form.levelId),
    [classOptions, form.levelId],
  );

  function resetForm() {
    setForm({
      firstName: student.firstName,
      name: student.name,
      postnom: student.postnom,
      sex: student.sex,
      status: student.status,
      birthDate: student.birthDate,
      levelId: String(student.levelId),
      classId: String(student.classId),
      tutors: student.tutors.map((t) => ({ ...t })),
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/students/${student.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName,
          name: form.name,
          postnom: form.postnom,
          sex: form.sex,
          status: canEditStatus ? form.status : student.status,
          birthDate: form.birthDate,
          classId: Number(form.classId),
          tutors: form.tutors,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : "Échec de l’enregistrement");
        return;
      }
      setStudent(data.student);
      setEditing(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  function updateTutor(index: number, patch: Partial<TutorRow>) {
    setForm((f) => ({
      ...f,
      tutors: f.tutors.map((t, i) => (i === index ? { ...t, ...patch } : t)),
    }));
  }

  return (
    <div className="mt-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${studentStatusBadgeClass(student.status)}`}
          >
            {studentStatusLabel(student.status)}
          </span>
          <h2 className="mt-2 text-xl font-bold text-zinc-900 dark:text-white">{fullName}</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Année {student.academicYear.name}
            {student.academicYear.isCurrent ? " (en cours)" : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={backHref} className={adminGhostButton}>
            Retour à la liste
          </Link>
          {canEdit && !editing ? (
            <button
              type="button"
              className={adminPrimaryButton}
              onClick={() => {
                resetForm();
                setEditing(true);
              }}
            >
              Modifier
            </button>
          ) : null}
          {canEdit && editing ? (
            <button
              type="button"
              className={adminSecondaryButton}
              onClick={() => {
                setEditing(false);
                resetForm();
                setError(null);
              }}
            >
              Annuler
            </button>
          ) : null}
        </div>
      </div>

      {!canEdit ? (
        <div className={adminSoftCard}>
          Consultation seule. Seul l’administrateur système peut modifier la fiche ou le statut de l’élève.
        </div>
      ) : null}

      {editing ? (
        <form onSubmit={handleSave} className={`${adminCard} space-y-5`}>
          <div className={adminSectionTitle}>Modifier la fiche élève</div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className={adminLabel}>Prénom</label>
              <input
                required
                className={`mt-2 ${adminInput}`}
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
              />
            </div>
            <div>
              <label className={adminLabel}>Nom</label>
              <input
                required
                className={`mt-2 ${adminInput}`}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label className={adminLabel}>Postnom</label>
              <input
                required
                className={`mt-2 ${adminInput}`}
                value={form.postnom}
                onChange={(e) => setForm((f) => ({ ...f, postnom: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className={adminLabel}>Sexe</label>
              <select
                className={`mt-2 ${adminInput}`}
                value={form.sex}
                onChange={(e) =>
                  setForm((f) => ({ ...f, sex: e.target.value as StudentDetail["sex"] }))
                }
              >
                {STUDENT_SEX_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={adminLabel}>Date de naissance</label>
              <input
                required
                type="date"
                className={`mt-2 ${adminInput}`}
                value={form.birthDate}
                onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value }))}
              />
            </div>
            <div>
              <label className={adminLabel}>Statut</label>
              {canEditStatus ? (
                <select
                  className={`mt-2 ${adminInput}`}
                  value={form.status}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, status: e.target.value as StudentDetail["status"] }))
                  }
                >
                  {STUDENT_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-200">
                  {studentStatusLabel(student.status)}
                  <span className="mt-1 block text-xs text-zinc-500">
                    Modification réservée à l&apos;administrateur système.
                  </span>
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={adminLabel}>Niveau</label>
              <select
                required
                className={`mt-2 ${adminInput}`}
                value={form.levelId}
                onChange={(e) => {
                  const levelId = e.target.value;
                  const firstClass = classOptions.find((c) => String(c.levelId) === levelId);
                  setForm((f) => ({
                    ...f,
                    levelId,
                    classId: firstClass ? String(firstClass.id) : "",
                  }));
                }}
              >
                {levelOptions.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={adminLabel}>Classe</label>
              <select
                required
                className={`mt-2 ${adminInput}`}
                value={form.classId}
                onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value }))}
              >
                {classesForLevel.length === 0 ? (
                  <option value="">Aucune classe pour ce niveau</option>
                ) : (
                  classesForLevel.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.codeClass}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-2">
              <div className={adminSectionTitle}>Tuteurs</div>
              {form.tutors.length < 10 ? (
                <button
                  type="button"
                  className={adminGhostButton}
                  onClick={() => setForm((f) => ({ ...f, tutors: [...f.tutors, emptyTutor()] }))}
                >
                  Ajouter un tuteur
                </button>
              ) : null}
            </div>
            <div className="mt-3 space-y-3">
              {form.tutors.map((t, i) => (
                <div key={i} className={adminNestedCard}>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <input
                      required
                      placeholder="Prénom tuteur"
                      className={adminInput}
                      value={t.firstName}
                      onChange={(e) => updateTutor(i, { firstName: e.target.value })}
                    />
                    <input
                      required
                      placeholder="Nom tuteur"
                      className={adminInput}
                      value={t.name}
                      onChange={(e) => updateTutor(i, { name: e.target.value })}
                    />
                    <input
                      required
                      placeholder="Postnom tuteur"
                      className={adminInput}
                      value={t.postnom}
                      onChange={(e) => updateTutor(i, { postnom: e.target.value })}
                    />
                    <input
                      required
                      placeholder="Contact (unique)"
                      className={adminInput}
                      value={t.contact}
                      onChange={(e) => updateTutor(i, { contact: e.target.value })}
                    />
                    <input
                      required
                      placeholder="Adresse"
                      className={`md:col-span-2 ${adminInput}`}
                      value={t.address}
                      onChange={(e) => updateTutor(i, { address: e.target.value })}
                    />
                  </div>
                  {form.tutors.length > 1 ? (
                    <button
                      type="button"
                      className={`${adminGhostButton} mt-3 text-rose-700 dark:text-rose-300`}
                      onClick={() =>
                        setForm((f) => ({ ...f, tutors: f.tutors.filter((_, idx) => idx !== i) }))
                      }
                    >
                      Retirer ce tuteur
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          {error ? <div className={adminErrorBox}>{error}</div> : null}

          <button type="submit" disabled={submitting} className={adminPrimaryButton}>
            {submitting ? "Enregistrement…" : "Enregistrer les modifications"}
          </button>
        </form>
      ) : (
        <>
          <div className={`${adminCard} grid grid-cols-1 gap-4 md:grid-cols-2`}>
            <div className={adminSectionTitle}>Identité</div>
            <dl className="md:col-span-2 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
              <div>
                <dt className="text-zinc-500 dark:text-zinc-400">Prénom</dt>
                <dd className="font-medium text-zinc-900 dark:text-white">{student.firstName}</dd>
              </div>
              <div>
                <dt className="text-zinc-500 dark:text-zinc-400">Nom</dt>
                <dd className="font-medium text-zinc-900 dark:text-white">{student.name}</dd>
              </div>
              <div>
                <dt className="text-zinc-500 dark:text-zinc-400">Postnom</dt>
                <dd className="font-medium text-zinc-900 dark:text-white">{student.postnom}</dd>
              </div>
              <div>
                <dt className="text-zinc-500 dark:text-zinc-400">Sexe</dt>
                <dd className="font-medium text-zinc-900 dark:text-white">{studentSexLabel(student.sex)}</dd>
              </div>
              <div>
                <dt className="text-zinc-500 dark:text-zinc-400">Date de naissance</dt>
                <dd className="font-medium text-zinc-900 dark:text-white">{student.birthDate}</dd>
              </div>
              <div>
                <dt className="text-zinc-500 dark:text-zinc-400">Statut</dt>
                <dd className="font-medium text-zinc-900 dark:text-white">{studentStatusLabel(student.status)}</dd>
              </div>
            </dl>
          </div>

          <div className={adminCard}>
            <div className={adminSectionTitle}>Scolarité</div>
            <dl className="mt-3 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
              <div>
                <dt className="text-zinc-500 dark:text-zinc-400">Année scolaire</dt>
                <dd className="font-medium text-zinc-900 dark:text-white">{student.academicYear.name}</dd>
              </div>
              <div>
                <dt className="text-zinc-500 dark:text-zinc-400">Niveau</dt>
                <dd className="font-medium text-zinc-900 dark:text-white">{student.levelLabel}</dd>
              </div>
              <div>
                <dt className="text-zinc-500 dark:text-zinc-400">Classe</dt>
                <dd className="font-medium text-zinc-900 dark:text-white">{student.classLabel}</dd>
              </div>
            </dl>
          </div>

          <div className={adminCard}>
            <div className={adminSectionTitle}>Tuteurs ({student.tutors.length})</div>
            {student.tutors.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500">Aucun tuteur enregistré.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {student.tutors.map((t) => (
                  <li key={t.contact} className={adminNestedCard}>
                    <p className="font-medium text-zinc-900 dark:text-white">
                      {t.firstName} {t.name} {t.postnom}
                    </p>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{t.address}</p>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">Contact : {t.contact}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={`${adminCard} text-xs text-zinc-500 dark:text-zinc-400`}>
            Créé le {new Date(student.createdAt).toLocaleString("fr-FR")} — Dernière mise à jour le{" "}
            {new Date(student.updatedAt).toLocaleString("fr-FR")}
          </div>
        </>
      )}
    </div>
  );
}
