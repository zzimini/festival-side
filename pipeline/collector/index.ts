// 수집기 진입점: pnpm collect           (전체 출처)
//               pnpm collect kopis     (특정 출처만)
import { db } from "@/lib/db";
import type { Prisma } from "@/app/generated/prisma/client";
import { kopis } from "./kopis";
import { tourapi } from "./tourapi";
import type { Collector } from "./types";

const COLLECTORS: Collector[] = [tourapi, kopis];

// 이번 수집 결과가 기존 유효 행사 수의 이 비율보다 적으면 API 이상으로 보고 삭제 표시를 건너뛴다
const MIN_RESULT_RATIO = 0.5;
// 한 번에 동시에 보내는 upsert 수 (Neon 왕복 지연 때문에 순차 처리는 느림)
const UPSERT_CONCURRENCY = 20;

async function run(collector: Collector) {
  const log = (msg: string) => console.log(`[collector:${collector.source}] ${msg}`);
  const runStartedAt = new Date();

  log("수집 시작");
  const { events, window } = await collector.collect();
  log(`${events.length}건 수신, DB 저장 중...`);

  // 이번 조회 기간에 걸쳐 있어서 결과에 나왔어야 할 기존 행사
  const expectedInRun: Prisma.EventWhereInput = {
    source: collector.source,
    removedAt: null,
    OR: [{ endDate: { gte: window.from } }, { endDate: null, startDate: { gte: window.from } }],
    ...(window.to && { startDate: { lte: window.to } }),
  };
  const activeBefore = await db.event.count({ where: expectedInRun });

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
  log(`${events.length}건 upsert`);

  if (events.length < activeBefore * MIN_RESULT_RATIO) {
    console.warn(
      `[collector:${collector.source}] 경고: 수신 ${events.length}건 < 기존 유효 ${activeBefore}건의 ${MIN_RESULT_RATIO * 100}% — API 이상 가능성, 삭제 표시 건너뜀`,
    );
    return;
  }

  const { count: removed } = await db.event.updateMany({
    where: { ...expectedInRun, lastSeenAt: { lt: runStartedAt } },
    data: { removedAt: runStartedAt },
  });
  log(`완료: 출처에서 사라진 행사 ${removed}건 삭제 표시`);
}

async function main() {
  const only = process.argv[2];
  const targets = only ? COLLECTORS.filter((c) => c.source === only) : COLLECTORS;
  if (targets.length === 0) throw new Error(`알 수 없는 출처: ${only} (가능: ${COLLECTORS.map((c) => c.source).join(", ")})`);

  // 한 출처가 실패해도 나머지는 계속 수집
  let failed = 0;
  for (const collector of targets) {
    const missing = collector.requiredEnv.filter((name) => !process.env[name]);
    if (missing.length > 0) {
      console.log(`[collector:${collector.source}] 건너뜀: ${missing.join(", ")} 미설정`);
      continue;
    }
    try {
      await run(collector);
    } catch (err) {
      failed++;
      console.error(`[collector:${collector.source}] 실패:`, err);
    }
  }
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error("[collector] 실패:", err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
