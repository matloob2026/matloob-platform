-- Matloob — initial schema migration
--
-- HAND-AUTHORED, not `prisma migrate dev`-generated: the sandbox this
-- project was built in cannot reach binaries.prisma.sh (the Prisma
-- engine download host), so the engine that normally diffs/generates
-- this SQL could not run there. This file was instead written by hand,
-- directly and carefully from prisma/schema.prisma, covering every
-- model, enum, relation, unique constraint, and index in that file —
-- not just the auth/request tables.
--
-- Assumption flagged for review: onDelete actions not explicitly set
-- in schema.prisma default here to CASCADE for required-but-owned
-- child rows only where the schema's own doc comments make the intent
-- clear (e.g. translations, tokens); everywhere else, an unspecified
-- required relation defaults to RESTRICT and an unspecified optional
-- relation defaults to SET NULL. This matches Prisma's own real
-- defaults. If a future `prisma migrate dev` run (once real Prisma CLI
-- access is available) proposes a follow-up migration that only
-- changes a foreign key's ON DELETE action, that's this assumption
-- being reconciled — it is not data-destructive.
--
-- Safe to apply with: npx prisma migrate deploy

-- =====================================================================
-- EXTENSIONS
-- =====================================================================
DO $$
BEGIN
  BEGIN
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";
  EXCEPTION WHEN insufficient_privilege THEN
    -- Managed Postgres providers commonly restrict CREATE EXTENSION to
    -- superusers. Not fatal: PostgreSQL 13+ has gen_random_uuid() built
    -- into core, so every DEFAULT gen_random_uuid() below works with or
    -- without pgcrypto actually installed.
    RAISE NOTICE 'Skipping pgcrypto extension (insufficient privilege) - gen_random_uuid() is built into PostgreSQL 13+ regardless.';
  END;
END $$;

-- =====================================================================
-- ENUMS
-- =====================================================================
DO $$ BEGIN
  CREATE TYPE "UserRole" AS ENUM ('BUYER', 'SUPPLIER', 'BOTH', 'ADMIN', 'MODERATOR');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION', 'BANNED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE TYPE "RequestStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'IN_PROGRESS', 'FULFILLED', 'EXPIRED', 'CLOSED_BY_BUYER', 'REMOVED_BY_ADMIN');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE TYPE "OfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE TYPE "ConversationStatus" AS ENUM ('OPEN', 'ARCHIVED', 'BLOCKED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'SMS', 'PUSH');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE TYPE "NotificationType" AS ENUM ('NEW_OFFER', 'OFFER_ACCEPTED', 'OFFER_REJECTED', 'NEW_MESSAGE', 'REQUEST_EXPIRING', 'REQUEST_APPROVED', 'REQUEST_REJECTED', 'SYSTEM_ANNOUNCEMENT', 'AI_SUGGESTION');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE TYPE "ReportReason" AS ENUM ('SPAM', 'SCAM_OR_FRAUD', 'INAPPROPRIATE_CONTENT', 'DUPLICATE', 'MISLEADING_PRICE', 'OTHER');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE TYPE "MediaOwnerType" AS ENUM ('REQUEST', 'USER_PROFILE', 'CATEGORY', 'PAGE_CONTENT', 'HOMEPAGE_HERO', 'SITE_LOGO', 'ADMIN_UPLOAD');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE TYPE "SettingValueType" AS ENUM ('STRING', 'NUMBER', 'BOOLEAN', 'JSON', 'COLOR', 'IMAGE_URL', 'RICH_TEXT');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- =====================================================================
-- TABLES (columns + primary keys only — foreign keys added at the end)
-- =====================================================================

CREATE TABLE IF NOT EXISTS "countries" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "defaultLocale" TEXT NOT NULL DEFAULT 'ar',
    "phoneDialCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "country_translations" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "countryId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "country_translations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "currencies" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "decimalDigits" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "currencies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "country_currencies" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "countryId" TEXT NOT NULL,
    "currencyId" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "country_currencies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "cities" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "countryId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "city_translations" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "cityId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "city_translations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT,
    "phone" TEXT,
    "passwordHash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'BUYER',
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "emailVerifiedAt" TIMESTAMP(3),
    "phoneVerifiedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "user_profiles" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatarMediaId" TEXT,
    "bio" TEXT,
    "countryId" TEXT,
    "cityId" TEXT,
    "companyName" TEXT,
    "isVerifiedSupplier" BOOLEAN NOT NULL DEFAULT false,
    "ratingAvg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "oauth_accounts" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    CONSTRAINT "oauth_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "sessions" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "email_verification_tokens" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "categories" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "parentId" TEXT,
    "iconMediaId" TEXT,
    "imageMediaId" TEXT,
    "colorHex" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "category_translations" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "categoryId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    CONSTRAINT "category_translations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "requests" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "ownerId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "cityId" TEXT,
    "currencyId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "budgetMin" DECIMAL(12,2),
    "budgetMax" DECIMAL(12,2),
    "status" "RequestStatus" NOT NULL DEFAULT 'DRAFT',
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "offerCount" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "aiSuggestedCategoryId" TEXT,
    "aiQualityScore" DOUBLE PRECISION,
    CONSTRAINT "requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "offers" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "requestId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "price" DECIMAL(12,2),
    "status" "OfferStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "conversations" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "requestId" TEXT NOT NULL,
    "offerId" TEXT,
    "status" "ConversationStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "conversation_participants" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReadAt" TIMESTAMP(3),
    CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "messages" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "notifications" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "linkUrl" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "favorites" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "reports" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "reporterId" TEXT NOT NULL,
    "reportedUserId" TEXT,
    "requestId" TEXT,
    "reason" "ReportReason" NOT NULL,
    "details" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "media" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "ownerType" "MediaOwnerType" NOT NULL,
    "url" TEXT NOT NULL,
    "altText" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "sizeBytes" INTEGER,
    "mimeType" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "site_settings" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "group" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "valueType" "SettingValueType" NOT NULL DEFAULT 'STRING',
    "value" TEXT NOT NULL,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "page_contents" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "page" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "heading" TEXT,
    "body" TEXT,
    "ctaLabel" TEXT,
    "ctaUrl" TEXT,
    "mediaId" TEXT,
    "extra" JSONB,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "page_contents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "homepage_stats" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "iconMediaId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "homepage_stats_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "homepage_stat_translations" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "statId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    CONSTRAINT "homepage_stat_translations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "trust_badges" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "iconMediaId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "trust_badges_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "trust_badge_translations" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "badgeId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    CONSTRAINT "trust_badge_translations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "social_links" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "platform" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "social_links_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "seo_settings" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "locale" TEXT NOT NULL,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "ogImageMediaId" TEXT,
    "canonicalUrl" TEXT,
    "noIndex" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "seo_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "admin_audit_logs" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- Implicit many-to-many join tables (Prisma's own naming convention:
-- "_" + relation name, columns "A"/"B" referencing the two sides in
-- alphabetical-by-model-name order)
CREATE TABLE IF NOT EXISTS "_RequestMedia" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "_MessageMedia" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- =====================================================================
-- UNIQUE CONSTRAINTS / UNIQUE INDEXES
-- =====================================================================
CREATE UNIQUE INDEX IF NOT EXISTS "countries_code_key" ON "countries"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "country_translations_countryId_locale_key" ON "country_translations"("countryId", "locale");
CREATE UNIQUE INDEX IF NOT EXISTS "currencies_code_key" ON "currencies"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "country_currencies_countryId_currencyId_key" ON "country_currencies"("countryId", "currencyId");
CREATE UNIQUE INDEX IF NOT EXISTS "cities_countryId_slug_key" ON "cities"("countryId", "slug");
CREATE UNIQUE INDEX IF NOT EXISTS "city_translations_cityId_locale_key" ON "city_translations"("cityId", "locale");
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "users_phone_key" ON "users"("phone");
CREATE UNIQUE INDEX IF NOT EXISTS "user_profiles_userId_key" ON "user_profiles"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "oauth_accounts_provider_providerAccountId_key" ON "oauth_accounts"("provider", "providerAccountId");
CREATE UNIQUE INDEX IF NOT EXISTS "sessions_tokenHash_key" ON "sessions"("tokenHash");
CREATE UNIQUE INDEX IF NOT EXISTS "email_verification_tokens_tokenHash_key" ON "email_verification_tokens"("tokenHash");
CREATE UNIQUE INDEX IF NOT EXISTS "password_reset_tokens_tokenHash_key" ON "password_reset_tokens"("tokenHash");
CREATE UNIQUE INDEX IF NOT EXISTS "categories_slug_key" ON "categories"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "category_translations_categoryId_locale_key" ON "category_translations"("categoryId", "locale");
CREATE UNIQUE INDEX IF NOT EXISTS "offers_requestId_supplierId_key" ON "offers"("requestId", "supplierId");
CREATE UNIQUE INDEX IF NOT EXISTS "conversations_offerId_key" ON "conversations"("offerId");
CREATE UNIQUE INDEX IF NOT EXISTS "conversation_participants_conversationId_userId_key" ON "conversation_participants"("conversationId", "userId");
CREATE UNIQUE INDEX IF NOT EXISTS "favorites_userId_requestId_key" ON "favorites"("userId", "requestId");
CREATE UNIQUE INDEX IF NOT EXISTS "site_settings_group_key_key" ON "site_settings"("group", "key");
CREATE UNIQUE INDEX IF NOT EXISTS "page_contents_page_section_locale_key" ON "page_contents"("page", "section", "locale");
CREATE UNIQUE INDEX IF NOT EXISTS "homepage_stats_key_key" ON "homepage_stats"("key");
CREATE UNIQUE INDEX IF NOT EXISTS "homepage_stat_translations_statId_locale_key" ON "homepage_stat_translations"("statId", "locale");
CREATE UNIQUE INDEX IF NOT EXISTS "trust_badge_translations_badgeId_locale_key" ON "trust_badge_translations"("badgeId", "locale");
CREATE UNIQUE INDEX IF NOT EXISTS "seo_settings_entityType_entityId_locale_key" ON "seo_settings"("entityType", "entityId", "locale");

-- =====================================================================
-- REGULAR (NON-UNIQUE) INDEXES
-- =====================================================================
CREATE INDEX IF NOT EXISTS "cities_countryId_isActive_idx" ON "cities"("countryId", "isActive");
CREATE INDEX IF NOT EXISTS "users_role_status_idx" ON "users"("role", "status");
CREATE INDEX IF NOT EXISTS "sessions_userId_idx" ON "sessions"("userId");
CREATE INDEX IF NOT EXISTS "email_verification_tokens_userId_idx" ON "email_verification_tokens"("userId");
CREATE INDEX IF NOT EXISTS "password_reset_tokens_userId_idx" ON "password_reset_tokens"("userId");
CREATE INDEX IF NOT EXISTS "categories_isActive_sortOrder_idx" ON "categories"("isActive", "sortOrder");
CREATE INDEX IF NOT EXISTS "requests_status_categoryId_countryId_idx" ON "requests"("status", "categoryId", "countryId");
CREATE INDEX IF NOT EXISTS "requests_ownerId_idx" ON "requests"("ownerId");
CREATE INDEX IF NOT EXISTS "offers_requestId_status_idx" ON "offers"("requestId", "status");
CREATE INDEX IF NOT EXISTS "conversations_requestId_idx" ON "conversations"("requestId");
CREATE INDEX IF NOT EXISTS "messages_conversationId_createdAt_idx" ON "messages"("conversationId", "createdAt");
CREATE INDEX IF NOT EXISTS "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");
CREATE INDEX IF NOT EXISTS "reports_status_idx" ON "reports"("status");
CREATE INDEX IF NOT EXISTS "media_ownerType_idx" ON "media"("ownerType");
CREATE INDEX IF NOT EXISTS "admin_audit_logs_entityType_entityId_idx" ON "admin_audit_logs"("entityType", "entityId");

-- Implicit m2m join table indexes (Prisma convention: composite unique
-- + a secondary index on B for reverse-direction lookups)
CREATE UNIQUE INDEX IF NOT EXISTS "_RequestMedia_AB_unique" ON "_RequestMedia"("A", "B");
CREATE INDEX IF NOT EXISTS "_RequestMedia_B_index" ON "_RequestMedia"("B");
CREATE UNIQUE INDEX IF NOT EXISTS "_MessageMedia_AB_unique" ON "_MessageMedia"("A", "B");
CREATE INDEX IF NOT EXISTS "_MessageMedia_B_index" ON "_MessageMedia"("B");

-- =====================================================================
-- FOREIGN KEYS
-- =====================================================================
DO $$ BEGIN
  ALTER TABLE "country_translations" ADD CONSTRAINT "country_translations_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "country_currencies" ADD CONSTRAINT "country_currencies_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "country_currencies" ADD CONSTRAINT "country_currencies_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "cities" ADD CONSTRAINT "cities_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "city_translations" ADD CONSTRAINT "city_translations_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_avatarMediaId_fkey" FOREIGN KEY ("avatarMediaId") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "categories" ADD CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "categories" ADD CONSTRAINT "categories_iconMediaId_fkey" FOREIGN KEY ("iconMediaId") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "categories" ADD CONSTRAINT "categories_imageMediaId_fkey" FOREIGN KEY ("imageMediaId") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "category_translations" ADD CONSTRAINT "category_translations_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "requests" ADD CONSTRAINT "requests_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "requests" ADD CONSTRAINT "requests_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "requests" ADD CONSTRAINT "requests_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "requests" ADD CONSTRAINT "requests_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "requests" ADD CONSTRAINT "requests_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "offers" ADD CONSTRAINT "offers_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "offers" ADD CONSTRAINT "offers_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "conversations" ADD CONSTRAINT "conversations_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "conversations" ADD CONSTRAINT "conversations_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "messages" ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "favorites" ADD CONSTRAINT "favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "favorites" ADD CONSTRAINT "favorites_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "reports" ADD CONSTRAINT "reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "reports" ADD CONSTRAINT "reports_reportedUserId_fkey" FOREIGN KEY ("reportedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "reports" ADD CONSTRAINT "reports_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "page_contents" ADD CONSTRAINT "page_contents_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "homepage_stats" ADD CONSTRAINT "homepage_stats_iconMediaId_fkey" FOREIGN KEY ("iconMediaId") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "homepage_stat_translations" ADD CONSTRAINT "homepage_stat_translations_statId_fkey" FOREIGN KEY ("statId") REFERENCES "homepage_stats"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "trust_badges" ADD CONSTRAINT "trust_badges_iconMediaId_fkey" FOREIGN KEY ("iconMediaId") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "trust_badge_translations" ADD CONSTRAINT "trust_badge_translations_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "trust_badges"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "seo_settings" ADD CONSTRAINT "seo_settings_ogImageMediaId_fkey" FOREIGN KEY ("ogImageMediaId") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "_RequestMedia" ADD CONSTRAINT "_RequestMedia_A_fkey" FOREIGN KEY ("A") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "_RequestMedia" ADD CONSTRAINT "_RequestMedia_B_fkey" FOREIGN KEY ("B") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "_MessageMedia" ADD CONSTRAINT "_MessageMedia_A_fkey" FOREIGN KEY ("A") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "_MessageMedia" ADD CONSTRAINT "_MessageMedia_B_fkey" FOREIGN KEY ("B") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
