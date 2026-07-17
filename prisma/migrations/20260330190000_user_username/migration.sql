-- AlterTable: add username, backfill from email, make email optional
ALTER TABLE "User" ADD COLUMN "username" TEXT;

UPDATE "User"
SET "username" = lower(
  regexp_replace(
    split_part(COALESCE("email", 'user' || "id"::text), '@', 1),
    '[^a-zA-Z0-9._-]',
    '',
    'g'
  )
)
WHERE "username" IS NULL;

UPDATE "User"
SET "username" = 'user' || "id"::text
WHERE "username" IS NULL OR "username" = '';

-- Resolve duplicate usernames before unique constraint
UPDATE "User" u
SET "username" = u."username" || '_' || u."id"::text
WHERE u.id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY "username" ORDER BY id) AS rn
    FROM "User"
  ) t
  WHERE t.rn > 1
);

ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;
