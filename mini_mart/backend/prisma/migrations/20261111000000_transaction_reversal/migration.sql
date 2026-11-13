ALTER TABLE "qm_transactions"
ADD COLUMN "reversed_at" TIMESTAMPTZ,
ADD COLUMN "reversed_by_id" UUID;
