import "server-only";

import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { createSessionToken, hashPassword, verifyPassword } from "@/lib/auth";

const DEFAULT_PIN = "0000";
const SESSION_DAYS = 30;

export type CurrentTutor = {
  id: number;
  name: string;
  postnom: string;
  firstName: string;
  contact: string;
  mustChangePin: boolean;
};

function sha256Hex(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

/** Normalise le téléphone pour la recherche (trim ; contact stocké tel quel à l’inscription). */
export function normalizeTutorPhone(raw: string): string {
  return raw.trim();
}

export function serializeTutor(tutor: {
  id: number;
  name: string;
  postnom: string;
  firstName: string;
  contact: string;
  mustChangePin: boolean;
}): CurrentTutor {
  return {
    id: tutor.id,
    name: tutor.name,
    postnom: tutor.postnom,
    firstName: tutor.firstName,
    contact: tutor.contact,
    mustChangePin: tutor.mustChangePin,
  };
}

export async function createTutorSession(tutorId: number): Promise<string> {
  const token = createSessionToken();
  const tokenHash = sha256Hex(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.tutorSession.create({
    data: { tutorId, tokenHash, expiresAt },
  });

  return token;
}

export async function destroyTutorSession(token: string | null) {
  if (!token) return;
  const tokenHash = sha256Hex(token);
  await prisma.tutorSession.deleteMany({ where: { tokenHash } });
}

export function extractBearerToken(req: Request): string | null {
  const header = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() || null;
}

export async function getTutorFromToken(token: string | null): Promise<CurrentTutor | null> {
  if (!token) return null;
  const tokenHash = sha256Hex(token);

  const session = await prisma.tutorSession.findUnique({
    where: { tokenHash },
    include: {
      tutor: {
        select: {
          id: true,
          name: true,
          postnom: true,
          firstName: true,
          contact: true,
          mustChangePin: true,
        },
      },
    },
  });

  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.tutorSession.delete({ where: { id: session.id } }).catch(() => null);
    return null;
  }

  return serializeTutor(session.tutor);
}

export async function loginTutorWithPin(phone: string, pin: string): Promise<
  | { ok: true; token: string; tutor: CurrentTutor }
  | { ok: false; error: string; status: number }
> {
  const contact = normalizeTutorPhone(phone);
  if (!contact || !pin) {
    return { ok: false, error: "Identifiants invalides", status: 400 };
  }

  const tutor = await prisma.tutor.findUnique({
    where: { contact },
    select: {
      id: true,
      name: true,
      postnom: true,
      firstName: true,
      contact: true,
      pinHash: true,
      mustChangePin: true,
    },
  });

  if (!tutor) {
    return { ok: false, error: "Identifiants invalides", status: 401 };
  }

  if (!tutor.pinHash) {
    if (pin !== DEFAULT_PIN) {
      return { ok: false, error: "Identifiants invalides", status: 401 };
    }
    const pinHash = await hashPassword(DEFAULT_PIN);
    const updated = await prisma.tutor.update({
      where: { id: tutor.id },
      data: {
        pinHash,
        mustChangePin: true,
        pinUpdatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        postnom: true,
        firstName: true,
        contact: true,
        mustChangePin: true,
      },
    });
    const token = await createTutorSession(updated.id);
    return { ok: true, token, tutor: serializeTutor(updated) };
  }

  const ok = await verifyPassword(pin, tutor.pinHash);
  if (!ok) {
    return { ok: false, error: "Identifiants invalides", status: 401 };
  }

  const token = await createTutorSession(tutor.id);
  return {
    ok: true,
    token,
    tutor: serializeTutor(tutor),
  };
}

export async function changeTutorPin(input: {
  tutorId: number;
  currentPin: string;
  newPin: string;
}): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  if (!/^\d{4,6}$/.test(input.newPin)) {
    return { ok: false, error: "Le nouveau PIN doit contenir 4 à 6 chiffres", status: 400 };
  }
  if (input.newPin === DEFAULT_PIN) {
    return { ok: false, error: "Choisissez un PIN différent de 0000", status: 400 };
  }

  const tutor = await prisma.tutor.findUnique({
    where: { id: input.tutorId },
    select: { id: true, pinHash: true },
  });
  if (!tutor) {
    return { ok: false, error: "Tuteur introuvable", status: 404 };
  }

  if (!tutor.pinHash) {
    if (input.currentPin !== DEFAULT_PIN) {
      return { ok: false, error: "PIN actuel incorrect", status: 400 };
    }
  } else {
    const ok = await verifyPassword(input.currentPin, tutor.pinHash);
    if (!ok) {
      return { ok: false, error: "PIN actuel incorrect", status: 400 };
    }
  }

  const pinHash = await hashPassword(input.newPin);
  await prisma.tutor.update({
    where: { id: tutor.id },
    data: {
      pinHash,
      mustChangePin: false,
      pinUpdatedAt: new Date(),
    },
  });

  return { ok: true };
}

export async function tutorOwnsStudent(tutorId: number, studentId: number): Promise<boolean> {
  const link = await prisma.studentTutor.findUnique({
    where: { studentId_tutorId: { studentId, tutorId } },
    select: { studentId: true },
  });
  return Boolean(link);
}
