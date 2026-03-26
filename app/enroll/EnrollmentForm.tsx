"use client";

import { FormEvent, useMemo, useState } from "react";

type ClassOption = { id: number; label: string };

type Sex = "MALE" | "FEMALE" | "OTHER";

type TutorInput = {
  name: string;
  postnom: string;
  firstName: string;
  address: string;
  contact: string;
};

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
      setError("Please select a class.");
      return;
    }

    if (!student.birthDate) {
      setError("Please provide student birth date.");
      return;
    }

    // Basic client-side check (server will validate again).
    const tutorMissing = tutors.some((t) =>
      [t.name, t.postnom, t.firstName, t.address, t.contact].some((v) => v.trim().length === 0),
    );
    if (tutorMissing) {
      setError("Please complete all tutor fields.");
      return;
    }

    const studentMissing = [student.name, student.postnom, student.firstName].some((v) => v.trim().length === 0);
    if (studentMissing) {
      setError("Please complete all student fields.");
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
        setError(data?.error || "Enrollment failed.");
        return;
      }

      setSuccess(`Student enrolled successfully (ID: ${data?.studentId ?? "unknown"}).`);

      setClassId("");
      setStudent({ name: "", postnom: "", firstName: "", sex: "MALE", birthDate: "" });
      setTutors([{ ...defaultTutor }, { ...defaultTutor }]);
    } catch {
      setError("Network error while enrolling student.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-black/40 p-6">
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-black dark:text-white">Class</label>
          <select
            className="mt-2 w-full rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
            value={classId}
            onChange={(e) => setClassId(e.target.value === "" ? "" : Number(e.target.value))}
          >
            <option value="">Select a class...</option>
            {classOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-black dark:text-white">Student</h2>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              required
              className="rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
              placeholder="Name"
              value={student.name}
              onChange={(e) => setStudent((s) => ({ ...s, name: e.target.value }))}
            />
            <input
              required
              className="rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
              placeholder="Postnom"
              value={student.postnom}
              onChange={(e) => setStudent((s) => ({ ...s, postnom: e.target.value }))}
            />
            <input
              required
              className="rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
              placeholder="First name"
              value={student.firstName}
              onChange={(e) => setStudent((s) => ({ ...s, firstName: e.target.value }))}
            />
            <select
              className="rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
              value={student.sex}
              onChange={(e) => setStudent((s) => ({ ...s, sex: e.target.value as Sex }))}
            >
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
            <input
              required
              type="date"
              className="rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
              value={student.birthDate}
              onChange={(e) => setStudent((s) => ({ ...s, birthDate: e.target.value }))}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-black dark:text-white">Tutor(s)</h2>
            <button
              type="button"
              onClick={handleAddTutor}
              className="rounded-lg bg-zinc-900 text-white px-3 py-2 text-sm hover:bg-zinc-800 disabled:opacity-50"
              disabled={tutors.length >= 10}
            >
              Add tutor
            </button>
          </div>

          <div className="mt-3 space-y-4">
            {tutors.map((t, index) => (
              <div key={index} className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 bg-white/50 dark:bg-black/30">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-black dark:text-white">Tutor #{index + 1}</h3>
                  <button
                    type="button"
                    onClick={() => handleRemoveTutor(index)}
                    disabled={tutors.length <= 1}
                    className="text-sm text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    required
                    className="rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
                    placeholder="Name"
                    value={t.name}
                    onChange={(e) => updateTutor(index, { name: e.target.value })}
                  />
                  <input
                    required
                    className="rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
                    placeholder="Postnom"
                    value={t.postnom}
                    onChange={(e) => updateTutor(index, { postnom: e.target.value })}
                  />
                  <input
                    required
                    className="rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
                    placeholder="First name"
                    value={t.firstName}
                    onChange={(e) => updateTutor(index, { firstName: e.target.value })}
                  />
                  <input
                    required
                    className="rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
                    placeholder="Contact"
                    value={t.contact}
                    onChange={(e) => updateTutor(index, { contact: e.target.value })}
                  />
                  <input
                    required
                    className="sm:col-span-2 rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-black dark:text-white"
                    placeholder="Address"
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
            {submitting ? "Enrolling..." : "Enroll student"}
          </button>
        </div>
      </div>
    </form>
  );
}

