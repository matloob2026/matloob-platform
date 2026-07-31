-- Requests Admin Module: adds the moderation-workflow statuses
-- (PENDING_REVIEW, REJECTED) to the existing RequestStatus enum, and
-- an isFeatured flag on Request. Both purely additive — every
-- existing row keeps its current status/value unchanged, and no
-- existing column, index, or constraint is touched.
--
-- ALTER TYPE ... ADD VALUE IF NOT EXISTS is natively idempotent since
-- PostgreSQL 12 (this project targets 13+ elsewhere already), so no
-- guarded DO block is needed here, unlike CREATE TYPE for a brand-new
-- enum.

ALTER TYPE "RequestStatus" ADD VALUE IF NOT EXISTS 'PENDING_REVIEW';
ALTER TYPE "RequestStatus" ADD VALUE IF NOT EXISTS 'REJECTED';

ALTER TABLE "requests" ADD COLUMN IF NOT EXISTS "isFeatured" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "requests_isFeatured_status_idx" ON "requests"("isFeatured", "status");
