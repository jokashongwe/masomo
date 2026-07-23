"use client";

import { FormEvent, useMemo, useState } from "react";

type ClassOption = {
  id: number;
  codeClass: string;
  levelId: number;
  levelLabel: string;
  optionId: number;
  optionLabel: string;
};

type Sex = "MALE" | "FEMALE" | "OTHER";

type TutorInput = {
  name: string;
  postnom: string;
  firstName: string;
  address: string;
  contact: string;
};

const selectClass =
  "mt-2 w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white";
const inputClass =
  "rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white";

export default function EnrollmentForm({ classOptions }: { classOptions: ClassOption[] }) {
  const defaultTutor: TutorInput = useMemo(
    () => ({
      name: "",
      postnom: "",
      firstName: "",
      address: "",
      contact: "",
    }),
    [],
  );

  const [optionId, setOptionId] = useState("");
  const [levelId, setLevelId] = useState("");
  const [classId, setClassId] = useState<number | "">("");

  const [student, setStudent] = useState({
    name: "",
    postnom: "",
    firstName: "",
    sex: "MALE" as Sex,
    birthDate: "",
  });

  const [tutors, setTutors] = useState<TutorInput[]>([{ ...defaultTutor }, { ...defaultTutor }]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const optionChoices = useMemo(() => {
    const map = new Map<number, string>();
    for (const c of classOptions) {
      if (!map.has(c.optionId)) map.set(c.optionId, c.optionLabel);
    }
    return [...map.entries()]
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "fr"));
  }, [classOptions]);

  const levelChoices = useMemo(() => {
    if (!optionId) return [];
    const map = new Map<number, string>();
    for (const c of classOptions) {
      if (String(c.optionId) !== optionId) continue;
      if (!map.has(c.levelId)) map.set(c.levelId, c.levelLabel);
    }
    return [...map.entries()]
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "fr", { numeric: true }));
  }, [classOptions, optionId]);

  const classChoices = useMemo(() => {
    if (!levelId) return [];
    return classOptions
      .filter((c) => String(c.levelId) === levelId)
      .sort((a, b) => a.codeClass.localeCompare(b.codeClass, "fr"));
  }, [classOptions, levelId]);

  function resetClassSelection() {
    setOptionId("");
    setLevelId("");
    setClassId("");
  }

  function updateTutor(index: number, patch: Partial<TutorInput>) {
    setTutors((prev) => prev.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  }

  function handleAddTutor() {
    if (tutors.length >= 10) return;
    setTutors((prev) => [...prev, { ...defaultTutor }]);
  }

  function handleRemoveTutor(index: number) {
    if (tutors.length <= 1) return;
    setTutors((prev) => prev.filter((_, i) => i !== index));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (classId === "") {
      setError("Veuillez sélectionner une option, un niveau et une classe.");
      return;
    }

    if (!student.birthDate) {
      setError("Veuillez renseigner la date de naissance de l’élève.");
      return;
    }

    const tutorMissing = tutors.some((t) =>
      [t.name, t.postnom, t.firstName, t.address, t.contact].some((v) => v.trim().length === 0),
    );
    if (tutorMissing) {
      setError("Veuillez compléter tous les champs du tuteur.");
      return;
    }

    const studentMissing = [student.name, student.postnom, student.firstName].some((v) => v.trim().length === 0);
    if (studentMissing) {
      setError("Veuillez compléter tous les champs de l’élève.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId,
          student: {
            name: student.name.trim(),
            postnom: student.postnom.trim(),
            firstName: student.firstName.trim(),
            sex: student.sex,
            birthDate: student.birthDate,
          },
          tutors: tutors.map((t) => ({
            name: t.name.trim(),
            postnom: t.postnom.trim(),
            firstName: t.firstName.trim(),
            address: t.address.trim(),
            contact: t.contact.trim(),
          })),
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || "Échec de l’inscription.");
        return;
      }

      setSuccess(`Élève inscrit avec succès (ID : ${data?.studentId ?? "inconnu"}).`);

      resetClassSelection();
      setStudent({ name: "", postnom: "", firstName: "", sex: "MALE", birthDate: "" });
      setTutors([{ ...defaultTutor }, { ...defaultTutor }]);
    } catch {
      setError("Erreur réseau pendant l’inscription.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-black/40 p-6">
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-black dark:text-white">Classe</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-black dark:text-white">Option</label>
              <select
                required
                className={selectClass}
                value={optionId}
                onChange={(e) => {
                  const next = e.target.value;
                  setOptionId(next);
                  setLevelId("");
                  setClassId("");
                }}
              >
                <option value="">Choisir une option…</option>
                {optionChoices.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-black dark:text-white">Niveau</label>
              <select
                required
                className={selectClass}
                value={levelId}
                disabled={!optionId}
                onChange={(e) => {
                  const next = e.target.value;
                  setLevelId(next);
                  const first = classOptions.find((c) => String(c.levelId) === next);
                  setClassId(first ? first.id : "");
                }}
              >
                <option value="">{optionId ? "Choisir un niveau…" : "Choisir d’abord l’option"}</option>
                {levelChoices.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-black dark:text-white">Classe</label>
              <select
                required
                className={selectClass}
                value={classId}
                disabled={!levelId}
                onChange={(e) => setClassId(e.target.value === "" ? "" : Number(e.target.value))}
              >
                <option value="">{levelId ? "Choisir une classe…" : "Choisir d’abord le niveau"}</option>
                {classChoices.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.codeClass}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-black dark:text-white">Élève</h2>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              required
              className={inputClass}
              placeholder="Nom"
              value={student.name}
              onChange={(e) => setStudent((s) => ({ ...s, name: e.target.value }))}
            />
            <input
              required
              className={inputClass}
              placeholder="Postnom"
              value={student.postnom}
              onChange={(e) => setStudent((s) => ({ ...s, postnom: e.target.value }))}
            />
            <input
              required
              className={inputClass}
              placeholder="Prénom"
              value={student.firstName}
              onChange={(e) => setStudent((s) => ({ ...s, firstName: e.target.value }))}
            />
            <select
              className={inputClass}
              value={student.sex}
              onChange={(e) => setStudent((s) => ({ ...s, sex: e.target.value as Sex }))}
            >
              <option value="MALE">Masculin</option>
              <option value="FEMALE">Féminin</option>
              <option value="OTHER">Autre</option>
            </select>
            <input
              required
              type="date"
              className={inputClass}
              value={student.birthDate}
              onChange={(e) => setStudent((s) => ({ ...s, birthDate: e.target.value }))}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-black dark:text-white">Tuteur(s)</h2>
            <button
              type="button"
              onClick={handleAddTutor}
              className="rounded-lg bg-zinc-900 text-white px-3 py-2 text-sm hover:bg-zinc-800 disabled:opacity-50"
              disabled={tutors.length >= 10}
            >
              Ajouter un tuteur
            </button>
          </div>

          <div className="mt-3 space-y-4">
            {tutors.map((t, index) => (
              <div key={index} className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 bg-white/50 dark:bg-black/30">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-black dark:text-white">Tuteur #{index + 1}</h3>
                  <button
                    type="button"
                    onClick={() => handleRemoveTutor(index)}
                    disabled={tutors.length <= 1}
                    className="text-sm text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white disabled:opacity-50"
                  >
                    Retirer
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    required
                    className={inputClass}
                    placeholder="Nom"
                    value={t.name}
                    onChange={(e) => updateTutor(index, { name: e.target.value })}
                  />
                  <input
                    required
                    className={inputClass}
                    placeholder="Postnom"
                    value={t.postnom}
                    onChange={(e) => updateTutor(index, { postnom: e.target.value })}
                  />
                  <input
                    required
                    className={inputClass}
                    placeholder="Prénom"
                    value={t.firstName}
                    onChange={(e) => updateTutor(index, { firstName: e.target.value })}
                  />
                  <input
                    required
                    className={inputClass}
                    placeholder="Contact"
                    value={t.contact}
                    onChange={(e) => updateTutor(index, { contact: e.target.value })}
                  />
                  <input
                    required
                    className={`sm:col-span-2 ${inputClass}`}
                    placeholder="Adresse"
                    value={t.address}
                    onChange={(e) => updateTutor(index, { address: e.target.value })}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-800">{error}</div> : null}
        {success ? (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-green-800">{success}</div>
        ) : null}

        <div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-zinc-900 text-white px-4 py-3 hover:bg-zinc-800 disabled:opacity-50"
          >
            {submitting ? "Inscription..." : "Inscrire l’élève"}
          </button>
        </div>
      </div>
    </form>
  );
}
