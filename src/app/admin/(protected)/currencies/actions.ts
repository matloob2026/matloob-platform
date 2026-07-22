"use server";

/**
 * Server actions backing the Currencies CMS screen
 * (src/app/admin/(protected)/currencies/page.tsx +
 * CurrenciesManager.tsx). Same shape as every other CMS actions.ts in
 * this codebase.
 *
 * Mutations require `CURRENCY_MANAGE_PERMISSION` (ADMIN only — see
 * src/auth/permissions.ts); reads require `currencies:view` (also
 * ADMIN only, unchanged since Checkpoint 01).
 */

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/auth/guards";
import { CURRENCY_MANAGE_PERMISSION } from "@/auth/permissions";
import {
  currencyAdminService,
  CurrencyServiceError,
  type CurrencyInput,
  type UpdateCurrencyInput,
} from "@/services/admin/currency.service";

export interface CurrencyActionState {
  success: boolean;
  error?: string;
}

function toActionState(err: unknown): CurrencyActionState {
  if (err instanceof CurrencyServiceError) {
    return { success: false, error: err.message };
  }
  console.error("[admin/currencies] unexpected error", err);
  return { success: false, error: "حدث خطأ غير متوقع. حاول مرة أخرى." };
}

/** The public Create Request form (src/lib/request-form-options.ts)
 * reads the same Currency table. */
function revalidateCurrencies(): void {
  revalidatePath("/admin/currencies");
  revalidatePath("/create-request");
}

export async function listCurrenciesAction() {
  await requirePermission("currencies:view");
  return currencyAdminService.listCurrencies();
}

export async function createCurrencyAction(input: CurrencyInput): Promise<CurrencyActionState> {
  const session = await requirePermission(CURRENCY_MANAGE_PERMISSION);
  try {
    await currencyAdminService.createCurrency(input, session.userId);
    revalidateCurrencies();
    return { success: true };
  } catch (err) {
    return toActionState(err);
  }
}

export async function updateCurrencyAction(id: string, input: UpdateCurrencyInput): Promise<CurrencyActionState> {
  const session = await requirePermission(CURRENCY_MANAGE_PERMISSION);
  try {
    await currencyAdminService.updateCurrency(id, input, session.userId);
    revalidateCurrencies();
    return { success: true };
  } catch (err) {
    return toActionState(err);
  }
}

export async function deleteCurrencyAction(id: string): Promise<CurrencyActionState> {
  const session = await requirePermission(CURRENCY_MANAGE_PERMISSION);
  try {
    await currencyAdminService.deleteCurrency(id, session.userId);
    revalidateCurrencies();
    return { success: true };
  } catch (err) {
    return toActionState(err);
  }
}
