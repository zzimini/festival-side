-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "removedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Event_source_removedAt_idx" ON "Event"("source", "removedAt");
