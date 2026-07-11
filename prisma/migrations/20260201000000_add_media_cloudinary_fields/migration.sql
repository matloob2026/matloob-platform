-- Phase 3 (Cloudinary integration): additive columns on "media" only.
-- No other table is touched. Both are optional/defaulted so this is
-- safe to apply to a table that may already have rows.

ALTER TABLE "media" ADD COLUMN "cloudinaryPublicId" TEXT;
ALTER TABLE "media" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
