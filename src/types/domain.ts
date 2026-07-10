/**
 * Domain types — hand-written, framework-agnostic interfaces that
 * mirror prisma/schema.prisma.
 *
 * WHY THESE EXIST SEPARATELY FROM PRISMA'S GENERATED TYPES:
 * Prisma generates types for you (`import { User } from '@prisma/client'`),
 * but importing generated DB types directly into UI components couples
 * your frontend to your database shape. These hand-written types are the
 * "public contract" the rest of the app (components, hooks, API responses)
 * depends on. The services layer (src/services) is responsible for
 * mapping Prisma's generated types onto these domain types.
 *
 * This indirection is what lets the database evolve without breaking
 * every component that renders a Request or a User.
 */

export type Locale = "ar" | "en";

export type UserRole = "BUYER" | "SUPPLIER" | "BOTH" | "ADMIN" | "MODERATOR";
export type UserStatus = "ACTIVE" | "SUSPENDED" | "PENDING_VERIFICATION" | "BANNED";

export type RequestStatus =
  | "DRAFT"
  | "PUBLISHED"
  | "IN_PROGRESS"
  | "FULFILLED"
  | "EXPIRED"
  | "CLOSED_BY_BUYER"
  | "REMOVED_BY_ADMIN";

export type OfferStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "WITHDRAWN" | "EXPIRED";

export interface LocalizedText {
  locale: Locale;
  value: string;
}

/** A value resolved for the CURRENT request locale, with the raw
 *  per-locale table available for admin-editing screens. */
export interface Localized<T extends string = string> {
  current: T;
  translations: LocalizedText[];
}

export interface Country {
  id: string;
  code: string; // ISO 3166-1 alpha-2
  isActive: boolean;
  isDefault: boolean;
  defaultLocale: Locale;
  phoneDialCode?: string;
  name: Localized;
}

export interface Currency {
  id: string;
  code: string; // ISO 4217
  symbol: string;
  decimalDigits: number;
}

export interface City {
  id: string;
  countryId: string;
  slug: string;
  isActive: boolean;
  name: Localized;
}

export interface UserSummary {
  id: string;
  displayName: string;
  avatarUrl?: string;
  isVerifiedSupplier: boolean;
  ratingAvg: number;
  ratingCount: number;
}

export interface Category {
  id: string;
  slug: string;
  parentId?: string;
  iconUrl?: string;
  imageUrl?: string;
  colorHex?: string;
  isActive: boolean;
  sortOrder: number;
  name: Localized;
  description?: Localized;
}

export interface RequestMedia {
  id: string;
  url: string;
  altText?: string;
}

export interface RequestSummary {
  id: string;
  title: string;
  description: string;
  category: Pick<Category, "id" | "slug" | "name">;
  city?: Pick<City, "id" | "name">;
  country: Pick<Country, "id" | "code">;
  budgetMin?: number;
  budgetMax?: number;
  currency?: Pick<Currency, "code" | "symbol">;
  coverImageUrl?: string;
  offerCount: number;
  status: RequestStatus;
  publishedAt?: string; // ISO date string over the wire
  createdAt: string;
}

export interface RequestDetail extends RequestSummary {
  owner: UserSummary;
  media: RequestMedia[];
  expiresAt?: string;
}

export interface Offer {
  id: string;
  requestId: string;
  supplier: UserSummary;
  message: string;
  price?: number;
  status: OfferStatus;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  linkUrl?: string;
  isRead: boolean;
  createdAt: string;
}

/**
 * Standard paginated envelope used by every list endpoint
 * (requests, offers, notifications, admin tables, etc.)
 */
export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

/**
 * Standard API error shape returned by every route in src/app/api.
 * Keeping this uniform means the frontend has exactly one error-handling
 * code path (see src/lib/api-client.ts).
 */
export interface ApiError {
  code: string; // machine-readable, e.g. "REQUEST_NOT_FOUND"
  message: string; // human-readable, already localized server-side
  details?: Record<string, unknown>;
}
