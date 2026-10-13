-- Test-drive ownership (Sprint 1, tenant isolation & customer privacy).
--
-- `TestDrive` had no owner column at all. Every customer-scoped read therefore
-- had nothing to scope on, and the public POST route could not associate an
-- authenticated applicant with the record it created.
--
-- Additive and reversible: the column is nullable, existing rows keep a NULL
-- owner (which the application reads as "guest booking"), and rolling back is a
-- single DROP COLUMN. No row is rewritten and no data is deleted.
--
-- Mirrored into prisma/schema.prisma so the frontend client matches the
-- database. The NestJS backend owns the shared migration history — apply this
-- file there too so the two schemas do not drift.

ALTER TABLE "TestDrive" ADD COLUMN "userId" INTEGER;

-- A deleted user keeps their request history (the dealership still needs it);
-- the link is cleared instead of cascading.
ALTER TABLE "TestDrive"
  ADD CONSTRAINT "TestDrive_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "TestDrive_userId_idx" ON "TestDrive"("userId");
