/**
 * ProfileService
 * ==============
 * Owns reads/writes for a user's own UserProfile fields (display name,
 * bio, city/country, contact phone, preferred contact method, avatar
 * is handled separately by MediaService). Every field here is
 * optional — the platform must keep working with nothing but the
 * Google/email account info, per product requirement.
 */

import { prisma } from "@/lib/prisma";

export class ProfileServiceError extends Error {
  constructor(
    message: string,
    public readonly code: "NOT_FOUND" | "VALIDATION_ERROR"
  ) {
    super(message);
    this.name = "ProfileServiceError";
  }
}

export function profileServiceErrorStatus(code: ProfileServiceError["code"]): number {
  switch (code) {
    case "NOT_FOUND":
      return 404;
    case "VALIDATION_ERROR":
    default:
      return 400;
  }
}

export const PREFERRED_CONTACT_METHODS = ["EMAIL", "PHONE", "WHATSAPP"] as const;
export type PreferredContactMethod = (typeof PREFERRED_CONTACT_METHODS)[number];

export interface UpdateProfileInput {
  displayName?: string;
  contactPhone?: string | null;
  cityId?: string | null;
  bio?: string | null;
  preferredContactMethod?: PreferredContactMethod | null;
}

export interface ProfileDetail {
  displayName: string;
  avatarUrl?: string;
  contactPhone?: string;
  cityId?: string;
  cityName?: string;
  bio?: string;
  preferredContactMethod?: string;
}

export class ProfileService {
  async getProfile(userId: string): Promise<ProfileDetail | null> {
    const profile = await prisma.userProfile.findUnique({
      where: { userId },
      include: { avatar: true, city: { include: { translations: true } } },
    });
    if (!profile) return null;

    return {
      displayName: profile.displayName,
      avatarUrl: profile.avatar?.url,
      contactPhone: profile.contactPhone ?? undefined,
      cityId: profile.cityId ?? undefined,
      cityName: profile.city?.translations?.find((t: { locale: string }) => t.locale === "ar")?.name,
      bio: profile.bio ?? undefined,
      preferredContactMethod: profile.preferredContactMethod ?? undefined,
    };
  }

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<ProfileDetail> {
    const existing = await prisma.userProfile.findUnique({ where: { userId } });
    if (!existing) throw new ProfileServiceError("Profile not found.", "NOT_FOUND");

    if (input.displayName !== undefined && input.displayName.trim().length < 2) {
      throw new ProfileServiceError("Display name must be at least 2 characters.", "VALIDATION_ERROR");
    }

    await prisma.userProfile.update({
      where: { userId },
      data: {
        displayName: input.displayName?.trim(),
        contactPhone: input.contactPhone === undefined ? undefined : input.contactPhone,
        cityId: input.cityId === undefined ? undefined : input.cityId,
        bio: input.bio === undefined ? undefined : input.bio,
        preferredContactMethod:
          input.preferredContactMethod === undefined ? undefined : input.preferredContactMethod,
      },
    });

    const updated = await this.getProfile(userId);
    if (!updated) throw new ProfileServiceError("Profile not found.", "NOT_FOUND");
    return updated;
  }
}

export const profileService = new ProfileService();
