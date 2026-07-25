-- Profile UX polish: two additive, optional columns on user_profiles only.
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "contactPhone" TEXT;
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "preferredContactMethod" TEXT;
