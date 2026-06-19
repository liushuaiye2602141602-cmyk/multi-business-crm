-- Add unique index for idempotency (platformId + externalId)
CREATE UNIQUE INDEX IF NOT EXISTS "IMMessage_platformId_externalId_key" ON "IMMessage"("platformId", "externalId");

-- Add index for fast lookups
CREATE INDEX IF NOT EXISTS "IMMessage_externalId_idx" ON "IMMessage"("externalId");
