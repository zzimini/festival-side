-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "detailFetchedAt" TIMESTAMP(3),
ADD COLUMN     "fee" TEXT,
ADD COLUMN     "homepage" TEXT,
ADD COLUMN     "openHours" TEXT,
-- 기존 값은 한국 자정을 UTC로 저장한 것(예: 10/17 → 10/16 15:00)이라, 한국 시간으로 되돌린 뒤 날짜만 남긴다
ALTER COLUMN "startDate" SET DATA TYPE DATE USING (("startDate" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul')::date,
ALTER COLUMN "endDate" SET DATA TYPE DATE USING (("endDate" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul')::date;

-- CreateTable
CREATE TABLE "PrepItem" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "searchKeyword" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrepItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PrepItem_eventId_idx" ON "PrepItem"("eventId");

-- AddForeignKey
ALTER TABLE "PrepItem" ADD CONSTRAINT "PrepItem_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
