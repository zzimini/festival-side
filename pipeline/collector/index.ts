// 수집기 진입점: pnpm collect  (기본: 오늘 이후 진행/예정 행사)
//   특정 날짜부터: pnpm collect 20261001
import { db } from "@/lib/db";
import { collectFestivals } from "./tourapi";

function todayKst() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10).replaceAll("-", "");
}

async function main() {
  const from = process.argv[2] ?? todayKst();
  console.log(`[collector] TourAPI 행사 수집 시작 (eventStartDate=${from})`);

  const events = await collectFestivals(from);
  console.log(`[collector] ${events.length}건 수신, DB 저장 중...`);

  for (const event of events) {
    const { source, sourceUrl, ...data } = event;
    await db.event.upsert({
      where: { source_sourceUrl: { source, sourceUrl } },
      create: event,
      update: data,
    });
  }
  console.log(`[collector] 완료: ${events.length}건 upsert`);
}

main()
  .catch((err) => {
    console.error("[collector] 실패:", err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
