-- Profile UX polish: two additive, optional columns on user_profiles only.
ALTER TABLE "user_profiles" ADD COLUMN "contactPhone" TEXT;
ALTER TABLE "user_profiles" ADD COLUMN "preferredContactMethod" TEXT;
