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
  adminTable,
  adminTableScroll,
  adminTh,
  adminThead,
  adminTr,
  adminTd,
} from "../../components/admin-ui";
import AdminPageHeader from "../../components/AdminPageHeader";

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
        title="Import élèves (Excel / CSV)"
        subtitle="Format Matricule, Nom, section/option/niveau par codes. Section, option et niveau créés automatiquement s’ils n’existent pas. N/A = donnée manquante (tuteur)."
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
          <div className={adminSectionTitle}>Modèle Excel</div>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            Téléchargez le fichier modèle avec les colonnes requises, une ligne d’exemple et une feuille
            d’instructions. Renseignez la feuille <strong>Eleves</strong> (première feuille) puis importez le fichier
            ci-dessous.
          </p>
          <a
            href="/api/admin/students/import/template"
            download="modele-import-eleves.xlsx"
            className={`${adminGhostButton} mt-4 inline-flex`}
          >
            Télécharger le modèle (.xlsx)
          </a>
        </div>

        <div>
          <div className={adminSectionTitle}>Importer un fichier</div>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            Colonnes : <code>Matricule</code>, <code>Nom</code>, <code>Numero_Tuteur</code>, <code>Nom_Tuteur</code>,{" "}
            <code>Niveau</code>, <code>Section</code>, <code>codeSection</code>, <code>Option</code>,{" "}
            <code>codeOption</code>. Fichiers <strong>.xlsx</strong> ou <strong>.csv</strong> acceptés.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
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
          <div className={`${adminTableScroll} mt-3`}>
            <table className={adminTable}>
              <thead className={adminThead}>
                <tr>
                  <th className={adminTh}>Ligne</th>
                  <th className={adminTh}>Statut</th>
                  <th className={adminTh}>Message</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.index} className={adminTr}>
                    <td className={adminTd}>{r.index}</td>
                    <td className={adminTd}>{r.ok ? "OK" : "Erreur"}</td>
                    <td className={adminTd}>
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

    </div>
  );
}
