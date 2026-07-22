/**
 * CurrencyAdminService
 * =====================
 * Completes the Currencies CMS as a real, database-backed management
 * layer, reusing the EXISTING `Currency` model — no new model, no
 * migration. Replaces the Checkpoint 01 placeholder on
 * /admin/currencies.
 *
 * NOTE ON ACTIVATE/DEACTIVATE: `Currency` has no `isActive` column in
 * the schema (unlike `Category`/`Country`/`City`). Per this task's own
 * instruction — "Activate/deactivate where the existing architecture
 * supports it" — this service intentionally does NOT add one; adding
 * a field would be a schema change, and the task also says "Do not
 * change the database schema unless absolutely necessary". Lifecycle
 * control for a currency is therefore create/edit/delete only; every
 * currency in the table is implicitly "available", matching how
 * src/lib/request-form-options.ts already reads ALL currencies
 * unconditionally (no `isActive` filter exists there to begin with).
 *
 * Follows the exact conventions established in
 * src/services/admin/category.service.ts (typed *ServiceError class,
 * type-only `Prisma.TransactionClient` import, `undefined` not `null`
 * for empty Json audit fields, actor-exists-gated AdminAuditLog rows).
 *
 * SAFE DELETE: `Currency` is referenced (with NO cascade) by
 * `Request.currencyId`, and (WITH cascade) by `CountryCurrency`. A
 * currency still used by any request is always blocked. A currency
 * still linked to a country via `CountryCurrency` is also blocked
 * here (even though the DB would silently cascade that join row) —
 * removing a country's usable currency out from under it without an
 * explicit admin confirmation would be a silent, surprising data
 * change, not a safe one.
 *
 * VERIFICATION NOTE: same sandbox limitation documented in
 * category.service.ts — `prisma generate` cannot complete here
 * because the network proxy blocks binaries.prisma.sh.
 */

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

const CODE_PATTERN = /^[A-Z]{3}$/;

export class CurrencyServiceError extends Error {
  constructor(
    message: string,
    public readonly code: "NOT_FOUND" | "VALIDATION_ERROR" | "DUPLICATE_CODE" | "CONFLICT"
  ) {
    super(message);
    this.name = "CurrencyServiceError";
  }
}

export function currencyServiceErrorStatus(code: CurrencyServiceError["code"]): number {
  switch (code) {
    case "NOT_FOUND":
      return 404;
    case "DUPLICATE_CODE":
      return 409;
    case "CONFLICT":
      return 409;
    case "VALIDATION_ERROR":
    default:
      return 400;
  }
}

export interface AdminCurrencyListItem {
  id: string;
  code: string;
  symbol: string;
  decimalDigits: number;
  countryCodes: string[];
  createdAt: Date;
}

export interface CurrencyInput {
  code: string;
  symbol: string;
  decimalDigits?: number;
}

export type UpdateCurrencyInput = Partial<CurrencyInput>;

interface CurrencyRecord {
  id: string;
  code: string;
  symbol: string;
  decimalDigits: number;
  createdAt: Date;
  countries: { country: { code: string } }[];
}

const CURRENCY_INCLUDE = {
  countries: { include: { country: { select: { code: true } } } },
};

function toListItem(currency: CurrencyRecord): AdminCurrencyListItem {
  return {
    id: currency.id,
    code: currency.code,
    symbol: currency.symbol,
    decimalDigits: currency.decimalDigits,
    countryCodes: currency.countries.map((c) => c.country.code),
    createdAt: currency.createdAt,
  };
}

function toSnapshot(currency: CurrencyRecord): Record<string, string | number | boolean | null> {
  return { code: currency.code, symbol: currency.symbol, decimalDigits: currency.decimalDigits };
}

function validateInput(input: CurrencyInput): void {
  const code = input.code?.trim().toUpperCase() ?? "";
  if (!code || !CODE_PATTERN.test(code)) {
    throw new CurrencyServiceError(
      "رمز العملة (ISO 4217) مطلوب ويجب أن يتكون من ثلاثة أحرف إنجليزية كبيرة، مثل SAR أو USD.",
      "VALIDATION_ERROR"
    );
  }
  if (!input.symbol?.trim()) {
    throw new CurrencyServiceError("رمز العملة النصي (مثل ر.س) مطلوب.", "VALIDATION_ERROR");
  }
  if (input.decimalDigits !== undefined && (!Number.isInteger(input.decimalDigits) || input.decimalDigits < 0 || input.decimalDigits > 4)) {
    throw new CurrencyServiceError("عدد الخانات العشرية يجب أن يكون رقماً صحيحاً بين 0 و 4.", "VALIDATION_ERROR");
  }
}

async function actorExists(actorId: string): Promise<boolean> {
  const actor = await prisma.user.findUnique({ where: { id: actorId }, select: { id: true } });
  return Boolean(actor);
}

function warnAuditSkipped(action: string, entityId: string, actorId: string): void {
  console.warn(
    `[AdminAuditLog] skipped for action=${action} entityId=${entityId} — ` +
      `actor "${actorId}" has no matching User row (Phase 2 mock admin session). ` +
      `Will resume once real admin accounts are wired up.`
  );
}

export class CurrencyAdminService {
  async listCurrencies(): Promise<AdminCurrencyListItem[]> {
    const currencies = await prisma.currency.findMany({
      include: CURRENCY_INCLUDE,
      orderBy: { code: "asc" },
    });
    return currencies.map((c: CurrencyRecord) => toListItem(c));
  }

  async createCurrency(input: CurrencyInput, actorId: string): Promise<AdminCurrencyListItem> {
    const normalized: CurrencyInput = { ...input, code: input.code?.trim().toUpperCase() ?? "" };
    validateInput(normalized);

    const existing = await prisma.currency.findUnique({ where: { code: normalized.code } });
    if (existing) {
      throw new CurrencyServiceError(`رمز العملة "${normalized.code}" مستخدم بالفعل.`, "DUPLICATE_CODE");
    }

    const hasRealActor = await actorExists(actorId);

    const created = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const currency = await tx.currency.create({
        data: {
          code: normalized.code,
          symbol: normalized.symbol,
          decimalDigits: normalized.decimalDigits ?? 2,
        },
        include: CURRENCY_INCLUDE,
      });

      if (hasRealActor) {
        await tx.adminAuditLog.create({
          data: {
            actorId,
            action: "CREATE_CURRENCY",
            entityType: "Currency",
            entityId: currency.id,
            before: undefined,
            after: { code: currency.code, symbol: currency.symbol, decimalDigits: currency.decimalDigits },
          },
        });
      } else {
        warnAuditSkipped("CREATE_CURRENCY", currency.id, actorId);
      }

      return currency;
    });

    return toListItem(created);
  }

  async updateCurrency(id: string, input: UpdateCurrencyInput, actorId: string): Promise<AdminCurrencyListItem> {
    const before = await prisma.currency.findUnique({ where: { id }, include: CURRENCY_INCLUDE });
    if (!before) {
      throw new CurrencyServiceError("العملة غير موجودة.", "NOT_FOUND");
    }

    const merged: CurrencyInput = {
      code: (input.code ?? before.code).trim().toUpperCase(),
      symbol: input.symbol ?? before.symbol,
      decimalDigits: input.decimalDigits ?? before.decimalDigits,
    };
    validateInput(merged);

    if (merged.code !== before.code) {
      const codeTaken = await prisma.currency.findUnique({ where: { code: merged.code } });
      if (codeTaken) {
        throw new CurrencyServiceError(`رمز العملة "${merged.code}" مستخدم بالفعل.`, "DUPLICATE_CODE");
      }
    }

    const hasRealActor = await actorExists(actorId);

    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const currency = await tx.currency.update({
        where: { id },
        data: { code: merged.code, symbol: merged.symbol, decimalDigits: merged.decimalDigits },
        include: CURRENCY_INCLUDE,
      });

      if (hasRealActor) {
        await tx.adminAuditLog.create({
          data: {
            actorId,
            action: "UPDATE_CURRENCY",
            entityType: "Currency",
            entityId: id,
            before: toSnapshot(before),
            after: toSnapshot(currency),
          },
        });
      } else {
        warnAuditSkipped("UPDATE_CURRENCY", id, actorId);
      }

      return currency;
    });

    return toListItem(updated);
  }

  /** Safe delete: refuses when the currency is used by any request, or
   * still linked to any country via CountryCurrency — see class
   * docstring for why the join table is checked here too. */
  async deleteCurrency(id: string, actorId: string): Promise<void> {
    const currency = await prisma.currency.findUnique({ where: { id } });
    if (!currency) {
      throw new CurrencyServiceError("العملة غير موجودة.", "NOT_FOUND");
    }

    const [requestCount, countryLinkCount] = await Promise.all([
      prisma.request.count({ where: { currencyId: id } }),
      prisma.countryCurrency.count({ where: { currencyId: id } }),
    ]);

    if (requestCount > 0) {
      throw new CurrencyServiceError(
        `لا يمكن حذف هذه العملة لأنها مستخدمة في ${requestCount.toLocaleString("ar")} طلب.`,
        "CONFLICT"
      );
    }
    if (countryLinkCount > 0) {
      throw new CurrencyServiceError(
        `لا يمكن حذف هذه العملة لأنها مرتبطة بـ ${countryLinkCount.toLocaleString("ar")} دولة. أزل الربط من صفحة الدول أولاً.`,
        "CONFLICT"
      );
    }

    const hasRealActor = await actorExists(actorId);

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.currency.delete({ where: { id } });

      if (hasRealActor) {
        await tx.adminAuditLog.create({
          data: {
            actorId,
            action: "DELETE_CURRENCY",
            entityType: "Currency",
            entityId: id,
            before: { code: currency.code, symbol: currency.symbol },
            after: undefined,
          },
        });
      } else {
        warnAuditSkipped("DELETE_CURRENCY", id, actorId);
      }
    });
  }
}

export const currencyAdminService = new CurrencyAdminService();
