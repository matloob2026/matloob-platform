-- Administration module: AdminRole + AdminRolePermission — an
-- additive layer for granting a MODERATOR-tier account extra specific
-- permissions beyond their hardcoded baseline (see the schema
-- comment on AdminRole for the full rationale). Every statement below
-- is written idempotently (IF NOT EXISTS / guarded DO blocks),
-- matching the convention every other migration in this project
-- follows, so a redeploy that re-runs `prisma migrate deploy` against
-- an already-migrated database never fails.

CREATE TABLE IF NOT EXISTS "admin_roles" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "admin_roles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "admin_roles_name_key" ON "admin_roles"("name");

CREATE TABLE IF NOT EXISTS "admin_role_permissions" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "roleId" TEXT NOT NULL,
    "permission" TEXT NOT NULL,
    CONSTRAINT "admin_role_permissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "admin_role_permissions_roleId_permission_key" ON "admin_role_permissions"("roleId", "permission");

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "customRoleId" TEXT;

DO $$ BEGIN
  ALTER TABLE "admin_role_permissions" ADD CONSTRAINT "admin_role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "admin_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "users" ADD CONSTRAINT "users_customRoleId_fkey" FOREIGN KEY ("customRoleId") REFERENCES "admin_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
