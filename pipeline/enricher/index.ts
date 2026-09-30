// 준비물 생성기: pnpm enrich 서울억새축제      (행사명 또는 이벤트 ID)
// 1) 출처 상세 API로 설명·운영시간 등을 채우고  2) Claude로 준비물 초안을 만들어 저장한다.
// 기존 준비물은 새 초안으로 교체된다.
import { db } from "@/lib/db";
import { fetchDetail } from "./detail";
import { generatePrepList } from "./prep";

async function findEvent(query: string) {
  const byId = await db.event.findUnique({ where: { id: query } });
  if (byId) return byId;
  const matches = await db.event.findMany({ where: { title: query, removedAt: null } });
  if (matches.length > 1) throw new Error(`"${query}" 행사가 ${matches.length}건입니다. 이벤트 ID로 지정해 주세요.`);
  return matches[0] ?? null;
}

async function main() {
  const query = process.argv.slice(2).join(" ").trim();
  if (!query) throw new Error("사용법: pnpm enrich <행사명 또는 이벤트 ID>");

  let event = await findEvent(query);
  if (!event) throw new Error(`행사를 찾지 못했습니다: ${query}`);
  console.log(`[enricher] ${event.title} (${event.id})`);

  if (!event.detailFetchedAt) {
    const detail = await fetchDetail(event);
    if (detail) {
      event = await db.event.update({ where: { id: event.id }, data: { ...detail, detailFetchedAt: new Date() } });
      console.log(`[enricher] 상세 정보 저장: 운영시간=${event.openHours ?? "-"}, 요금=${event.fee ?? "-"}`);
    }
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.log("[enricher] ANTHROPIC_API_KEY 미설정 — 준비물 생성은 건너뜀 (.env.local에 추가)");
    return;
  }

  const items = await generatePrepList(event);
  await db.$transaction([
    db.prepItem.deleteMany({ where: { eventId: event.id } }),
    db.prepItem.createMany({ data: items.map((item, sortOrder) => ({ ...item, sortOrder, eventId: event.id })) }),
  ]);

  console.log(`[enricher] 준비물 ${items.length}개 저장:`);
  for (const item of items) console.log(`  [${item.priority}] ${item.name} — ${item.reason} (검색어: ${item.searchKeyword || "-"})`);
}

main()
  .catch((err) => {
    console.error("[enricher] 실패:", err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
