/**
 * AdminUserAdminService
 * ======================
 * Administration module: real, database-backed user management.
 * Replaces the mock `listUsersMock` the Admin Users screen previously
 * used (src/services/mock/users.mock.ts, now removed). Manages every
 * `User` row regardless of role (buyer/supplier/admin/moderator) — the
 * SAME screen an ADMIN uses to promote a user to MODERATOR/ADMIN,
 * suspend/reactivate any account ("lock"/"unlock"), and trigger a
 * password reset — rather than a second, parallel "admin accounts"
 * screen. This is also exactly the table src/auth/session.ts's real
 * admin login now authenticates against, so promoting a user to
 * ADMIN/MODERATOR role here is what actually grants them Admin
 * Dashboard access.
 *
 * Reuses rather than duplicates:
 *   - `AuthService.requestPasswordReset` (src/services/auth.service.ts)
 *     for the "send password reset" action — the exact same email/
 *     token flow already used for end-user self-service resets,
 *   - the existing `UserStatus` enum (`SUSPENDED` = "locked",
 *     `ACTIVE` = "unlocked") — no new status field,
 *   - the existing `UserRole` enum (already includes ADMIN/MODERATOR)
 *     — no new role model,
 *   - the existing `AdminAuditLog` model, same actor-exists-gated
 *     pattern every other admin service already follows.
 *
 * VERIFICATION NOTE: same sandbox limitation documented in every
 * other admin service — `prisma generate` cannot complete here
 * because the network proxy blocks binaries.prisma.sh.
 */

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { authService } from "@/services/auth.service";
import { revokeAdminSessionById, listAdminSessions } from "@/auth/session";

export class AdminUserServiceError extends Error {
  constructor(message: string, public readonly code: "NOT_FOUND" | "VALIDATION_ERROR" | "CONFLICT") {
    super(message);
    this.name = "AdminUserServiceError";
  }
}

export function adminUserServiceErrorStatus(code: AdminUserServiceError["code"]): number {
  switch (code) {
    case "NOT_FOUND":
      return 404;
    case "CONFLICT":
      return 409;
    case "VALIDATION_ERROR":
    default:
      return 400;
  }
}

export type UserRoleValue = "BUYER" | "SUPPLIER" | "BOTH" | "ADMIN" | "MODERATOR";
export type UserStatusValue = "ACTIVE" | "SUSPENDED" | "PENDING_VERIFICATION" | "BANNED";

export interface AdminUserListItem {
  id: string;
  email: string | null;
  phone: string | null;
  displayName: string | null;
  role: UserRoleValue;
  status: UserStatusValue;
  /** Assigned custom `AdminRole` id (Administration module's Roles
   * management) — only ever meaningful when `role` is MODERATOR. */
  customRoleId: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
}

export interface AdminUserSession {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: Date;
  expiresAt: Date;
}

interface UserRecord {
  id: string;
  email: string | null;
  phone: string | null;
  role: string;
  status: string;
  customRoleId: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  profile: { displayName: string } | null;
}

const USER_INCLUDE = { profile: { select: { displayName: true } } };

function toListItem(user: UserRecord): AdminUserListItem {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    displayName: user.profile?.displayName ?? null,
    role: user.role as UserRoleValue,
    status: user.status as UserStatusValue,
    customRoleId: user.customRoleId,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  };
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

export interface ListUsersFilters {
  search?: string;
  role?: UserRoleValue;
  status?: UserStatusValue;
}

export class AdminUserAdminService {
  async listUsers(filters?: ListUsersFilters): Promise<AdminUserListItem[]> {
    const users = await prisma.user.findMany({
      include: USER_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
    let items: AdminUserListItem[] = users.map((u: UserRecord) => toListItem(u));

    if (filters?.role) {
      items = items.filter((u) => u.role === filters.role);
    }
    if (filters?.status) {
      items = items.filter((u) => u.status === filters.status);
    }
    if (filters?.search?.trim()) {
      const q = filters.search.trim().toLowerCase();
      items = items.filter(
        (u) =>
          (u.email ?? "").toLowerCase().includes(q) ||
          (u.phone ?? "").toLowerCase().includes(q) ||
          (u.displayName ?? "").toLowerCase().includes(q)
      );
    }

    return items;
  }

  async getUser(id: string): Promise<AdminUserListItem> {
    const user = await prisma.user.findUnique({ where: { id }, include: USER_INCLUDE });
    if (!user) {
      throw new AdminUserServiceError("المستخدم غير موجود.", "NOT_FOUND");
    }
    return toListItem(user);
  }

  /** "User → Role assignment" — promoting/demoting between
   * buyer/supplier/moderator/admin. Refuses to let an admin demote
   * their OWN account out of ADMIN — the one hard safety rule that
   * prevents an admin from ever locking themselves out entirely. */
  async setRole(id: string, role: UserRoleValue, actorId: string): Promise<AdminUserListItem> {
    const before = await prisma.user.findUnique({ where: { id }, include: USER_INCLUDE });
    if (!before) {
      throw new AdminUserServiceError("المستخدم غير موجود.", "NOT_FOUND");
    }
    if (id === actorId && before.role === "ADMIN" && role !== "ADMIN") {
      throw new AdminUserServiceError("لا يمكنك تغيير دورك الخاص من مدير إلى دور آخر.", "CONFLICT");
    }

    const hasRealActor = await actorExists(actorId);

    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const user = await tx.user.update({ where: { id }, data: { role }, include: USER_INCLUDE });

      if (hasRealActor) {
        await tx.adminAuditLog.create({
          data: {
            actorId,
            action: "SET_USER_ROLE",
            entityType: "User",
            entityId: id,
            before: { role: before.role },
            after: { role: user.role },
          },
        });
      } else {
        warnAuditSkipped("SET_USER_ROLE", id, actorId);
      }

      return user;
    });

    return toListItem(updated);
  }

  /** "Lock/Unlock accounts" — SUSPENDED is the "locked" state; ACTIVE
   * is "unlocked". Locking an account also revokes every one of its
   * standing admin sessions immediately (src/auth/session.ts's
   * `getAdminSession` already refuses a SUSPENDED/BANNED user on its
   * own, but proactively clearing the Session rows means a locked-out
   * admin can't keep using a request that's already in flight either). */
  async setStatus(id: string, status: UserStatusValue, actorId: string): Promise<AdminUserListItem> {
    const before = await prisma.user.findUnique({ where: { id }, include: USER_INCLUDE });
    if (!before) {
      throw new AdminUserServiceError("المستخدم غير موجود.", "NOT_FOUND");
    }
    if (id === actorId && status !== "ACTIVE") {
      throw new AdminUserServiceError("لا يمكنك قفل أو حظر حسابك الخاص.", "CONFLICT");
    }

    const hasRealActor = await actorExists(actorId);

    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const user = await tx.user.update({ where: { id }, data: { status }, include: USER_INCLUDE });

      if (status === "SUSPENDED" || status === "BANNED") {
        await tx.session.deleteMany({ where: { userId: id } });
      }

      if (hasRealActor) {
        await tx.adminAuditLog.create({
          data: {
            actorId,
            action: "SET_USER_STATUS",
            entityType: "User",
            entityId: id,
            before: { status: before.status },
            after: { status: user.status },
          },
        });
      } else {
        warnAuditSkipped("SET_USER_STATUS", id, actorId);
      }

      return user;
    });

    return toListItem(updated);
  }

  /** "Password reset" — reuses the EXACT SAME email/token flow
   * `AuthService.requestPasswordReset` already sends for end-user
   * self-service resets. No duplicate mailer/token logic. */
  async sendPasswordReset(id: string, actorId: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || !user.email) {
      throw new AdminUserServiceError("لا يوجد بريد إلكتروني مرتبط بهذا الحساب.", "VALIDATION_ERROR");
    }

    await authService.requestPasswordReset(user.email);

    const hasRealActor = await actorExists(actorId);
    if (hasRealActor) {
      await prisma.adminAuditLog.create({
        data: {
          actorId,
          action: "SEND_PASSWORD_RESET",
          entityType: "User",
          entityId: id,
          before: undefined,
          after: undefined,
        },
      });
    } else {
      warnAuditSkipped("SEND_PASSWORD_RESET", id, actorId);
    }
  }

  /** "Login session management" — every active admin session for a
   * given user (src/auth/session.ts's real, revocable `Session` rows). */
  async listSessions(userId: string): Promise<AdminUserSession[]> {
    const sessions = await listAdminSessions(userId);
    return sessions.map((s: { id: string; userAgent: string | null; ipAddress: string | null; createdAt: Date; expiresAt: Date }) => ({
      id: s.id,
      userAgent: s.userAgent,
      ipAddress: s.ipAddress,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
    }));
  }

  /** Revokes one specific session — ends that login immediately, the
   * next time it's used (see src/auth/session.ts's docstring). */
  async revokeSession(sessionId: string, userId: string, actorId: string): Promise<void> {
    await revokeAdminSessionById(sessionId);

    const hasRealActor = await actorExists(actorId);
    if (hasRealActor) {
      await prisma.adminAuditLog.create({
        data: {
          actorId,
          action: "REVOKE_SESSION",
          entityType: "Session",
          entityId: sessionId,
          before: { userId },
          after: undefined,
        },
      });
    } else {
      warnAuditSkipped("REVOKE_SESSION", sessionId, actorId);
    }
  }
}

export const adminUserAdminService = new AdminUserAdminService();
