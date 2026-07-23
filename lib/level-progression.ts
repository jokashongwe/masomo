import "server-only";

import type { Prisma } from "@/generated/prisma/client";

export type LevelRef = {
  id: number;
  codeLevel: string;
  name: string;
  nextLevel: string | null;
  optionId: number;
};

/** Résout le niveau suivant à partir du pointeur `nextLevel` (id ou codeLevel legacy). */
export async function resolveNextLevel(
  tx: Prisma.TransactionClient,
  level: LevelRef,
): Promise<LevelRef | null> {
  if (!level.nextLevel) return null;
  const pointer = level.nextLevel.trim();
  if (!pointer) return null;

  if (/^\d+$/.test(pointer)) {
    const byId = await tx.level.findUnique({
      where: { id: Number(pointer) },
      select: { id: true, codeLevel: true, name: true, nextLevel: true, optionId: true },
    });
    return byId;
  }

  const byCode = await tx.level.findFirst({
    where: { optionId: level.optionId, codeLevel: pointer },
    select: { id: true, codeLevel: true, name: true, nextLevel: true, optionId: true },
  });
  return byCode;
}

/** Choisit une classe cible sur le niveau suivant (même codeClass si possible). */
export async function pickClassOnLevel(
  tx: Prisma.TransactionClient,
  levelId: number,
  preferredCodeClass: string | null,
): Promise<{ id: number; codeClass: string } | null> {
  const classes = await tx.schoolClass.findMany({
    where: { levelId },
    orderBy: { id: "asc" },
    select: { id: true, codeClass: true },
  });
  if (!classes.length) return null;
  if (preferredCodeClass) {
    const same = classes.find((c) => c.codeClass === preferredCodeClass);
    if (same) return same;
  }
  return classes[0] ?? null;
}
