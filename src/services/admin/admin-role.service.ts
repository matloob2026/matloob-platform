/**
 * AdminRoleAdminService
 * ======================
 * Administration module: Roles management. Owns CRUD on the
 * `AdminRole`/`AdminRolePermission` models (see prisma/schema.prisma's
 * docstring on `AdminRole` for the full architecture note — this is
 * an ADDITIVE layer that lets a MODERATOR-tier account be granted
 * extra specific permissions beyond their hardcoded baseline; it
 * never touches or overrides ADMIN's wildcard access).
 *
 * Permission assignment is restricted to `PERMISSION_CATALOG` (the
 * fixed, enumerable list of permission strings this codebase actually
 * checks — see src/auth/permissions.ts) — never a free-text string,
 * so a typo can't silently create a permission that has no effect
 * anywhere. `users:manage`/`roles:manage`/`roles:view` are excluded
 * from that catalog specifically to prevent privilege escalation (see
 * its own docstring) and are rejected here too, defensively, even
 * though the UI never offers them as an option.
 *
 * VERIFICATION NOTE: same sandbox limitation documented in every
 * other admin service — `prisma generate` cannot complete here
 * because the network proxy blocks binaries.prisma.sh.
 */

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { PERMISSION_CATALOG } from "@/auth/permissions";

const ASSIGNABLE_PERMISSIONS = new Set(PERMISSION_CATALOG.map((p) => p.permission));

export class AdminRoleServiceError extends Error {
  constructor(message: string, public readonly code: "NOT_FOUND" | "VALIDATION_ERROR" | "DUPLICATE_NAME") {
    super(message);
    this.name = "AdminRoleServiceError";
  }
}

export function adminRoleServiceErrorStatus(code: AdminRoleServiceError["code"]): number {
  switch (code) {
    case "NOT_FOUND":
      return 404;
    case "DUPLICATE_NAME":
      return 409;
    case "VALIDATION_ERROR":
    default:
      return 400;
  }
}

export interface AdminRoleListItem {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  userCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminRoleInput {
  name: string;
  description?: string | null;
  permissions?: string[];
}

export type UpdateAdminRoleInput = Partial<AdminRoleInput>;

interface AdminRoleRecord {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  permissions: { permission: string }[];
  _count: { users: number };
}

const ROLE_INCLUDE = {
  permissions: { select: { permission: true } },
  _count: { select: { users: true } },
};

function toListItem(role: AdminRoleRecord): AdminRoleListItem {
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    permissions: role.permissions.map((p) => p.permission),
    userCount: role._count.users,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
  };
}

function validatePermissions(permissions: string[]): void {
  for (const permission of permissions) {
    if (!ASSIGNABLE_PERMISSIONS.has(permission)) {
      throw new AdminRoleServiceError(
        `الصلاحية "${permission}" غير معروفة أو لا يمكن تعيينها لدور مخصص.`,
        "VALIDATION_ERROR"
      );
    }
  }
}

async function actorExists(actorId: string): Promise<boolean> {
  const actor = await prisma.user.findUnique({ where: { id: actorId }, select: { id: true } });
  return Boolean(actor);
}

function warnAuditSkipped(action: string, entityId: string, actorId: string): void {
  console.warn(
    `[AdminAuditLog] skipped for action=${action} entityId=${entityId} — ` +
      `actor "${actorId}" has no matching User row. Will resume once real admin accounts are wired up.`
  );
}

export class AdminRoleAdminService {
  async listRoles(): Promise<AdminRoleListItem[]> {
    const roles = await prisma.adminRole.findMany({ include: ROLE_INCLUDE, orderBy: { name: "asc" } });
    return roles.map((r: AdminRoleRecord) => toListItem(r));
  }

  async getRole(id: string): Promise<AdminRoleListItem> {
    const role = await prisma.adminRole.findUnique({ where: { id }, include: ROLE_INCLUDE });
    if (!role) {
      throw new AdminRoleServiceError("الدور غير موجود.", "NOT_FOUND");
    }
    return toListItem(role);
  }

  async createRole(input: AdminRoleInput, actorId: string): Promise<AdminRoleListItem> {
    const name = input.name?.trim();
    if (!name) {
      throw new AdminRoleServiceError("اسم الدور مطلوب.", "VALIDATION_ERROR");
    }
    const permissions = input.permissions ?? [];
    validatePermissions(permissions);

    const existing = await prisma.adminRole.findUnique({ where: { name } });
    if (existing) {
      throw new AdminRoleServiceError(`الدور "${name}" موجود بالفعل.`, "DUPLICATE_NAME");
    }

    const hasRealActor = await actorExists(actorId);

    const created = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const role = await tx.adminRole.create({
        data: {
          name,
          description: input.description?.trim() || null,
          permissions: { create: permissions.map((permission: string) => ({ permission })) },
        },
        include: ROLE_INCLUDE,
      });

      if (hasRealActor) {
        await tx.adminAuditLog.create({
          data: {
            actorId,
            action: "CREATE_ADMIN_ROLE",
            entityType: "AdminRole",
            entityId: role.id,
            before: undefined,
            after: { name: role.name, permissions: permissions.join(",") },
          },
        });
      } else {
        warnAuditSkipped("CREATE_ADMIN_ROLE", role.id, actorId);
      }

      return role;
    });

    return toListItem(created);
  }

  async updateRole(id: string, input: UpdateAdminRoleInput, actorId: string): Promise<AdminRoleListItem> {
    const before = await prisma.adminRole.findUnique({ where: { id }, include: ROLE_INCLUDE });
    if (!before) {
      throw new AdminRoleServiceError("الدور غير موجود.", "NOT_FOUND");
    }

    const name = input.name !== undefined ? input.name.trim() : before.name;
    if (!name) {
      throw new AdminRoleServiceError("اسم الدور مطلوب.", "VALIDATION_ERROR");
    }
    const permissions = input.permissions ?? before.permissions.map((p: { permission: string }) => p.permission);
    validatePermissions(permissions);

    if (name !== before.name) {
      const nameTaken = await prisma.adminRole.findUnique({ where: { name } });
      if (nameTaken) {
        throw new AdminRoleServiceError(`الدور "${name}" مستخدم بالفعل.`, "DUPLICATE_NAME");
      }
    }

    const hasRealActor = await actorExists(actorId);

    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Replace the permission set atomically (delete-all then
      // recreate) — simpler and just as safe as a diff/patch for a
      // list this small, and guarantees no stale rows linger.
      await tx.adminRolePermission.deleteMany({ where: { roleId: id } });

      const role = await tx.adminRole.update({
        where: { id },
        data: {
          name,
          description: input.description !== undefined ? input.description?.trim() || null : before.description,
          permissions: { create: permissions.map((permission: string) => ({ permission })) },
        },
        include: ROLE_INCLUDE,
      });

      if (hasRealActor) {
        await tx.adminAuditLog.create({
          data: {
            actorId,
            action: "UPDATE_ADMIN_ROLE",
            entityType: "AdminRole",
            entityId: id,
            before: { name: before.name, permissions: before.permissions.map((p: { permission: string }) => p.permission).join(",") },
            after: { name: role.name, permissions: permissions.join(",") },
          },
        });
      } else {
        warnAuditSkipped("UPDATE_ADMIN_ROLE", id, actorId);
      }

      return role;
    });

    return toListItem(updated);
  }

  /** Safe delete: any user currently assigned this role simply falls
   * back to their hardcoded baseline permissions (their `customRoleId`
   * is cleared via the schema's `onDelete: SetNull`) — never left in a
   * broken or ambiguous state. */
  async deleteRole(id: string, actorId: string): Promise<void> {
    const role = await prisma.adminRole.findUnique({ where: { id }, include: ROLE_INCLUDE });
    if (!role) {
      throw new AdminRoleServiceError("الدور غير موجود.", "NOT_FOUND");
    }

    const hasRealActor = await actorExists(actorId);

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.adminRole.delete({ where: { id } });

      if (hasRealActor) {
        await tx.adminAuditLog.create({
          data: {
            actorId,
            action: "DELETE_ADMIN_ROLE",
            entityType: "AdminRole",
            entityId: id,
            before: { name: role.name },
            after: undefined,
          },
        });
      } else {
        warnAuditSkipped("DELETE_ADMIN_ROLE", id, actorId);
      }
    });
  }

  /** "User → Role assignment" — only ever meaningful for a MODERATOR
   * account (see the schema's docstring); assigning a custom role to
   * an ADMIN account is harmless but has no effect, since ADMIN's
   * wildcard access already covers everything. `roleId: null` clears
   * the assignment, returning that user to their plain hardcoded
   * baseline. */
  async assignRoleToUser(userId: string, roleId: string | null, actorId: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AdminRoleServiceError("المستخدم غير موجود.", "NOT_FOUND");
    }
    if (roleId) {
      const role = await prisma.adminRole.findUnique({ where: { id: roleId } });
      if (!role) {
        throw new AdminRoleServiceError("الدور المحدد غير موجود.", "NOT_FOUND");
      }
    }

    const hasRealActor = await actorExists(actorId);

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.user.update({ where: { id: userId }, data: { customRoleId: roleId } });

      if (hasRealActor) {
        await tx.adminAuditLog.create({
          data: {
            actorId,
            action: "ASSIGN_USER_ROLE",
            entityType: "User",
            entityId: userId,
            before: { customRoleId: user.customRoleId },
            after: { customRoleId: roleId },
          },
        });
      } else {
        warnAuditSkipped("ASSIGN_USER_ROLE", userId, actorId);
      }
    });
  }
}

export const adminRoleAdminService = new AdminRoleAdminService();
