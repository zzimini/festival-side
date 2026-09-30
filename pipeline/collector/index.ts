// 수집기 진입점: pnpm collect  (기본: 오늘 이후 진행/예정 행사)
//   특정 날짜부터: pnpm collect 20261001
import { db } from "@/lib/db";
import type { Prisma } from "@/app/generated/prisma/client";
import { collectFestivals, parseKstDate } from "./tourapi";

const SOURCE = "tourapi";
// 이번 수집 결과가 기존 유효 행사 수의 이 비율보다 적으면 API 이상으로 보고 삭제 표시를 건너뛴다
const MIN_RESULT_RATIO = 0.5;
// 한 번에 동시에 보내는 upsert 수 (Neon 왕복 지연 때문에 순차 처리는 느림)
const UPSERT_CONCURRENCY = 20;

function todayKst() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10).replaceAll("-", "");
}

async function main() {
  const from = process.argv[2] ?? todayKst();
  const fromDate = parseKstDate(from);
  if (!fromDate) throw new Error(`날짜 형식은 YYYYMMDD: ${from}`);
  const runStartedAt = new Date();

  // 이번 조회(eventStartDate=from)에 나왔어야 할 행사 = from 이후에도 진행 중이거나 예정인 것
  const expectedInRun: Prisma.EventWhereInput = {
    source: SOURCE,
    removedAt: null,
    OR: [{ endDate: { gte: fromDate } }, { endDate: null, startDate: { gte: fromDate } }],
  };
  const activeBefore = await db.event.count({ where: expectedInRun });

  console.log(`[collector] TourAPI 행사 수집 시작 (eventStartDate=${from})`);
  const events = await collectFestivals(from);
  console.log(`[collector] ${events.length}건 수신, DB 저장 중...`);

  for (let i = 0; i < events.length; i += UPSERT_CONCURRENCY) {
    await Promise.all(
      events.slice(i, i + UPSERT_CONCURRENCY).map((event) => {
        const { source, sourceUrl, ...data } = event;
        return db.event.upsert({
          where: { source_sourceUrl: { source, sourceUrl } },
          create: { ...event, lastSeenAt: runStartedAt },
          update: { ...data, lastSeenAt: runStartedAt, removedAt: null }, // 사라졌다 재등장하면 복구
        });
      }),
    );
  }
  console.log(`[collector] ${events.length}건 upsert`);

  if (events.length < activeBefore * MIN_RESULT_RATIO) {
    console.warn(
      `[collector] 경고: 수신 ${events.length}건 < 기존 유효 ${activeBefore}건의 ${MIN_RESULT_RATIO * 100}% — API 이상 가능성, 삭제 표시 건너뜀`,
    );
    return;
  }

  const { count: removed } = await db.event.updateMany({
    where: { ...expectedInRun, lastSeenAt: { lt: runStartedAt } },
    data: { removedAt: runStartedAt },
  });
  console.log(`[collector] 완료: 출처에서 사라진 행사 ${removed}건 삭제 표시`);
}

main()
  .catch((err) => {
    console.error("[collector] 실패:", err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
