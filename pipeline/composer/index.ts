// 콘텐츠 조립기: pnpm compose 서울억새축제      (행사명 또는 이벤트 ID)
// 행사 + 준비물 → 블로그 글 HTML. 지금은 drafts/<이벤트ID>.html 미리보기 파일로 저장하고,
// publisher가 붙으면 같은 composePost 결과를 WordPress draft로 올린다.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { findEvent } from "../find-event";
import { composePost, type ComposedPost } from "./template";

const OUT_DIR = "drafts";

// 브라우저로 열어 검수하기 위한 단독 HTML (WordPress엔 post.html 조각만 올라간다)
function previewPage(post: ComposedPost) {
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${post.title.replace(/</g, "&lt;")}</title>
<style>
  body { max-width: 720px; margin: 2rem auto; padding: 0 16px; font-family: system-ui, sans-serif; line-height: 1.7; color: #222; }
  img { max-width: 100%; height: auto; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #ddd; padding: 6px 10px; text-align: left; vertical-align: top; }
  th { width: 6em; background: #f6f6f6; white-space: nowrap; }
</style>
</head>
<body>
<h1>${post.title.replace(/</g, "&lt;")}</h1>
${post.html}
</body>
</html>
`;
}

async function main() {
  const query = process.argv.slice(2).join(" ").trim();
  if (!query) throw new Error("사용법: pnpm compose <행사명 또는 이벤트 ID>");

  const event = await findEvent(query);
  if (!event) throw new Error(`행사를 찾지 못했습니다: ${query}`);
  console.log(`[composer] ${event.title} (${event.id})`);

  if (event.removedAt) console.warn("[composer] 경고: 출처에서 사라진(취소 가능성) 행사입니다");
  const lastDay = event.endDate ?? event.startDate;
  if (lastDay.toISOString().slice(0, 10) < new Date().toISOString().slice(0, 10)) {
    console.warn("[composer] 경고: 이미 끝난 행사입니다");
  }

  const prepItems = await db.prepItem.findMany({ where: { eventId: event.id } });
  if (prepItems.length === 0) {
    throw new Error(`준비물이 없습니다. 먼저 실행하세요: pnpm enrich ${event.id}`);
  }

  const post = composePost(event, prepItems);
  await mkdir(OUT_DIR, { recursive: true });
  const file = path.join(OUT_DIR, `${event.id}.html`);
  await writeFile(file, previewPage(post), "utf8");

  console.log(`[composer] 제목: ${post.title}`);
  console.log(`[composer] 미리보기 저장: ${path.resolve(file)}`);
}

main()
  .catch((err) => {
    console.error("[composer] 실패:", err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
