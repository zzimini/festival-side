// 발행기: pnpm publish-post 서울억새축제            → draft(검수 대기)로 저장
//         pnpm publish-post --publish 서울억새축제  → 바로 published
// composer 결과를 Post 테이블에 저장하면 Vercel의 /posts/[id]에 노출된다 (WordPress 도메인 준비 전 테스트용 발행처).
// 행사당 글 1개라 다시 실행하면 같은 글이 갱신된다.
import { db } from "@/lib/db";
import { composePost } from "../composer/template";
import { findEvent } from "../find-event";

const SITE_URL = process.env.SITE_URL ?? "https://festival-side.vercel.app";

async function main() {
  const args = process.argv.slice(2);
  const publish = args.includes("--publish");
  const query = args.filter((a) => a !== "--publish").join(" ").trim();
  if (!query) throw new Error("사용법: pnpm publish-post [--publish] <행사명 또는 이벤트 ID>");

  const event = await findEvent(query);
  if (!event) throw new Error(`행사를 찾지 못했습니다: ${query}`);
  console.log(`[publisher] ${event.title} (${event.id})`);
  if (event.removedAt) console.warn("[publisher] 경고: 출처에서 사라진(취소 가능성) 행사입니다");

  const prepItems = await db.prepItem.findMany({ where: { eventId: event.id } });
  if (prepItems.length === 0) {
    throw new Error(`준비물이 없습니다. 먼저 실행하세요: pnpm enrich ${event.id}`);
  }

  const { title, excerpt, html } = composePost(event, prepItems);
  const existing = await db.post.findUnique({ where: { eventId: event.id } });
  // 이미 published인 글은 재발행해도 draft로 내리지 않는다
  const status = publish || existing?.status === "published" ? "published" : "draft";
  const publishedAt = status === "published" ? (existing?.publishedAt ?? new Date()) : null;

  const post = await db.post.upsert({
    where: { eventId: event.id },
    create: { eventId: event.id, title, excerpt, html, status, publishedAt },
    update: { title, excerpt, html, status, publishedAt },
  });

  console.log(`[publisher] ${existing ? "갱신" : "새 글"} (${status}): ${post.title}`);
  console.log(`[publisher] ${SITE_URL}/posts/${post.id}  (반영까지 최대 1분)`);
}

main()
  .catch((err) => {
    console.error("[publisher] 실패:", err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
