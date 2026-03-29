"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  adminCard,
  adminErrorBox,
  adminGhostButton,
  adminPage,
  adminPrimaryButton,
  adminSectionTitle,
} from "../../components/admin-ui";
import AdminPageHeader from "../../components/AdminPageHeader";

const TEMPLATE_COLUMNS = [
  "classId",
  "schoolName",
  "schoolId",
  "codeSection",
  "codeOption",
  "codeLevel",
  "codeClass",
  "firstName",
  "name",
  "postnom",
  "sex",
  "birthDate",
  "tutorFirstName",
  "tutorName",
  "tutorPostnom",
  "tutorAddress",
  "tutorContact",
];

export default function StudentsImportClient() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [rows, setRows] = useState<Array<{ index: number; ok: boolean; message: string; studentId?: number }>>([]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSummary(null);
    setRows([]);
    if (!file) {
      setError("Choisissez un fichier Excel.");
      return;
    }
    setSubmitting(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch("/api/admin/students/import", { method: "POST", body: form });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : "Échec de l’import");
        return;
      }
      setSummary(`Import terminé : ${data.successCount} réussite(s), ${data.failedCount} échec(s).`);
      setRows(data.results ?? []);
      router.refresh();
    } catch {
      setError("Erreur réseau");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={adminPage}>
      <AdminPageHeader
        kicker="Scolarité"
        title="Import élèves (Excel)"
        subtitle="Une ligne par élève, inscrit dans l’année scolaire en cours. Un tuteur minimum par ligne (identifié par le contact)."
        backHref="/admin/students"
        backLabel="Liste des élèves"
        actions={
          <Link href="/admin/enroll" className={adminGhostButton}>
            Inscription manuelle
          </Link>
        }
      />

      <div className={`${adminCard} mt-6 space-y-4`}>
        <div>
          <div className={adminSectionTitle}>Fichier</div>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            Utilisez la <strong>première feuille</strong>. Colonnes attendues (en-têtes de la première ligne) :
          </p>
          <ul className="mt-2 list-inside list-disc text-sm text-zinc-600 dark:text-zinc-300">
            <li>
              <strong>Classe :</strong> soit <code className="text-xs">classId</code> (numérique), soit les codes{" "}
              <code className="text-xs">codeSection</code>, <code className="text-xs">codeOption</code>,{" "}
              <code className="text-xs">codeLevel</code>, <code className="text-xs">codeClass</code> — optionnellement{" "}
              <code className="text-xs">schoolName</code> ou <code className="text-xs">schoolId</code> s’il y a plusieurs
              écoles.
            </li>
            <li>
              <strong>Élève :</strong> <code className="text-xs">firstName</code>, <code className="text-xs">name</code>,{" "}
              <code className="text-xs">postnom</code>, <code className="text-xs">sex</code> (MALE/FEMALE/OTHER ou M/F/H),{" "}
              <code className="text-xs">birthDate</code> (AAAA-MM-JJ ou date Excel).
            </li>
            <li>
              <strong>Tuteur :</strong> <code className="text-xs">tutorFirstName</code>, <code className="text-xs">tutorName</code>,{" "}
              <code className="text-xs">tutorPostnom</code>, <code className="text-xs">tutorAddress</code>,{" "}
              <code className="text-xs">tutorContact</code> (unique — réutilisé si déjà en base).
            </li>
          </ul>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            Noms alternatifs acceptés : prenom, nom, tuteur_prenom, tuteur_nom, etc.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-zinc-700 dark:text-zinc-200"
          />
          {error ? <div className={adminErrorBox}>{error}</div> : null}
          {summary ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100">
              {summary}
            </div>
          ) : null}
          <button type="submit" disabled={submitting || !file} className={adminPrimaryButton}>
            {submitting ? "Import…" : "Importer"}
          </button>
        </form>
      </div>

      {rows.length > 0 ? (
        <div className={`${adminCard} mt-6`}>
          <div className={adminSectionTitle}>Détail par ligne</div>
          <div className="mt-3 max-h-96 overflow-auto text-sm">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-700">
                  <th className="py-2 pr-2">Ligne</th>
                  <th className="py-2 pr-2">Statut</th>
                  <th className="py-2 pr-2">Message</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.index} className="border-b border-zinc-100 dark:border-zinc-800">
                    <td className="py-2 pr-2">{r.index}</td>
                    <td className="py-2 pr-2">{r.ok ? "OK" : "Erreur"}</td>
                    <td className="py-2 pr-2">
                      {r.message}
                      {r.studentId != null ? ` (élève #${r.studentId})` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div className="mt-6 text-xs text-zinc-500 dark:text-zinc-400">
        Référence API : colonnes renvoyées dans la réponse JSON sous <code>templateColumns</code> —{" "}
        {TEMPLATE_COLUMNS.join(", ")}.
      </div>
    </div>
  );
}
