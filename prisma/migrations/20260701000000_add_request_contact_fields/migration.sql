-- Requests polish pass: optional owner-supplied contact info (phone/
-- WhatsApp/email) with a per-field visibility toggle, replacing the
-- Country/Currency selection previously required on the create-
-- request form. Purely additive columns — every existing row keeps
-- working unchanged (all default to hidden/null).

ALTER TABLE "requests" ADD COLUMN IF NOT EXISTS "contactPhone" TEXT;
ALTER TABLE "requests" ADD COLUMN IF NOT EXISTS "contactPhoneVisible" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "requests" ADD COLUMN IF NOT EXISTS "contactWhatsapp" TEXT;
ALTER TABLE "requests" ADD COLUMN IF NOT EXISTS "contactWhatsappVisible" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "requests" ADD COLUMN IF NOT EXISTS "contactEmail" TEXT;
ALTER TABLE "requests" ADD COLUMN IF NOT EXISTS "contactEmailVisible" BOOLEAN NOT NULL DEFAULT false;
