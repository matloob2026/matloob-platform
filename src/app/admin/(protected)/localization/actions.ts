"use server";

/**
 * Server actions backing the Countries/Cities CMS screen
 * (src/app/admin/(protected)/localization/page.tsx +
 * CountriesManager.tsx / CitiesManager.tsx). Same shape as every other
 * CMS actions.ts in this codebase: thin wrappers that authorize, call
 * the admin service, map the result to a small serializable state
 * object, and revalidate the affected routes.
 *
 * Mutations require `LOCALIZATION_MANAGE_PERMISSION` (ADMIN only —
 * see src/auth/permissions.ts); reads require `localization:view`
 * (also ADMIN only, unchanged since Checkpoint 01). Normal platform
 * users have no path to any of this — server actions are only
 * reachable from within the authenticated admin route tree.
 */

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/auth/guards";
import { LOCALIZATION_MANAGE_PERMISSION } from "@/auth/permissions";
import {
  countryAdminService,
  CountryServiceError,
  type CountryInput,
  type UpdateCountryInput,
} from "@/services/admin/country.service";
import {
  cityAdminService,
  CityServiceError,
  type CityInput,
  type UpdateCityInput,
} from "@/services/admin/city.service";

export interface LocalizationActionState {
  success: boolean;
  error?: string;
}

function toActionState(err: unknown): LocalizationActionState {
  if (err instanceof CountryServiceError || err instanceof CityServiceError) {
    return { success: false, error: err.message };
  }
  console.error("[admin/localization] unexpected error", err);
  return { success: false, error: "حدث خطأ غير متوقع. حاول مرة أخرى." };
}

/** The public Create Request form (src/lib/request-form-options.ts)
 * reads the same Country/City tables, so any mutation here also
 * revalidates it. */
function revalidateLocalization(): void {
  revalidatePath("/admin/localization");
  revalidatePath("/create-request");
}

// ---------------------------------------------------------------------
// Countries
// ---------------------------------------------------------------------

export async function listCountriesAction() {
  await requirePermission("localization:view");
  return countryAdminService.listCountries();
}

export async function createCountryAction(input: CountryInput): Promise<LocalizationActionState> {
  const session = await requirePermission(LOCALIZATION_MANAGE_PERMISSION);
  try {
    await countryAdminService.createCountry(input, session.userId);
    revalidateLocalization();
    return { success: true };
  } catch (err) {
    return toActionState(err);
  }
}

export async function updateCountryAction(id: string, input: UpdateCountryInput): Promise<LocalizationActionState> {
  const session = await requirePermission(LOCALIZATION_MANAGE_PERMISSION);
  try {
    await countryAdminService.updateCountry(id, input, session.userId);
    revalidateLocalization();
    return { success: true };
  } catch (err) {
    return toActionState(err);
  }
}

export async function setCountryActiveAction(id: string, isActive: boolean): Promise<LocalizationActionState> {
  const session = await requirePermission(LOCALIZATION_MANAGE_PERMISSION);
  try {
    await countryAdminService.setCountryActive(id, isActive, session.userId);
    revalidateLocalization();
    return { success: true };
  } catch (err) {
    return toActionState(err);
  }
}

export async function deleteCountryAction(id: string): Promise<LocalizationActionState> {
  const session = await requirePermission(LOCALIZATION_MANAGE_PERMISSION);
  try {
    await countryAdminService.deleteCountry(id, session.userId);
    revalidateLocalization();
    return { success: true };
  } catch (err) {
    return toActionState(err);
  }
}

// ---------------------------------------------------------------------
// Cities
// ---------------------------------------------------------------------

export async function listCitiesAction(countryId?: string) {
  await requirePermission("localization:view");
  return cityAdminService.listCities(countryId);
}

export async function createCityAction(input: CityInput): Promise<LocalizationActionState> {
  const session = await requirePermission(LOCALIZATION_MANAGE_PERMISSION);
  try {
    await cityAdminService.createCity(input, session.userId);
    revalidateLocalization();
    return { success: true };
  } catch (err) {
    return toActionState(err);
  }
}

export async function updateCityAction(id: string, input: UpdateCityInput): Promise<LocalizationActionState> {
  const session = await requirePermission(LOCALIZATION_MANAGE_PERMISSION);
  try {
    await cityAdminService.updateCity(id, input, session.userId);
    revalidateLocalization();
    return { success: true };
  } catch (err) {
    return toActionState(err);
  }
}

export async function setCityActiveAction(id: string, isActive: boolean): Promise<LocalizationActionState> {
  const session = await requirePermission(LOCALIZATION_MANAGE_PERMISSION);
  try {
    await cityAdminService.setCityActive(id, isActive, session.userId);
    revalidateLocalization();
    return { success: true };
  } catch (err) {
    return toActionState(err);
  }
}

export async function deleteCityAction(id: string): Promise<LocalizationActionState> {
  const session = await requirePermission(LOCALIZATION_MANAGE_PERMISSION);
  try {
    await cityAdminService.deleteCity(id, session.userId);
    revalidateLocalization();
    return { success: true };
  } catch (err) {
    return toActionState(err);
  }
}
