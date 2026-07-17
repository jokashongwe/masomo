/** Compte d’encaissement principal affiché sur le tableau de bord. */
export const MAIN_FINANCE_ACCOUNT_NAME = "Encaissement École";

export function isMainFinanceAccountName(name: string): boolean {
  const n = name.trim().toLocaleLowerCase("fr");
  return (
    n === MAIN_FINANCE_ACCOUNT_NAME.toLocaleLowerCase("fr") ||
    n.includes("école") ||
    n.includes("ecole")
  );
}
