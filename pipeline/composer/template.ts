// 행사 + 준비물 → 블로그 글 (제목·요약·본문 HTML). 본문은 WordPress 에디터에 그대로 들어가는 조각이다.
import type { Event, PrepItem } from "@/app/generated/prisma/client";

const BRAND = "놀자달력";

const SOURCE_LABELS: Record<string, string> = {
  tourapi: "한국관광공사 TourAPI",
  kopis: "KOPIS 공연예술통합전산망",
};

export type ComposedPost = {
  title: string;
  excerpt: string;
  html: string;
};

function esc(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// 여러 줄 텍스트 → 줄마다 <p> (빈 줄 제거)
function paragraphs(text: string) {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${esc(line)}</p>`)
    .join("\n");
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

// DATE 컬럼은 UTC 자정으로 오므로 UTC 기준으로 읽어야 하루 밀리지 않는다
function formatDate(date: Date, withYear = true) {
  const md = `${date.getUTCMonth() + 1}월 ${date.getUTCDate()}일(${WEEKDAYS[date.getUTCDay()]})`;
  return withYear ? `${date.getUTCFullYear()}년 ${md}` : md;
}

export function formatDateRange(start: Date, end: Date | null) {
  if (!end || end.getTime() === start.getTime()) return formatDate(start);
  return `${formatDate(start)} ~ ${formatDate(end, end.getUTCFullYear() !== start.getUTCFullYear())}`;
}

function mapUrl(event: Event) {
  if (event.latitude != null && event.longitude != null) {
    return `https://map.kakao.com/link/map/${encodeURIComponent(event.title)},${event.latitude},${event.longitude}`;
  }
  return event.address ? `https://map.kakao.com/link/search/${encodeURIComponent(event.address)}` : null;
}

function link(url: string, label: string) {
  return `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}</a>`;
}

function infoTable(event: Event) {
  const rows: [string, string][] = [["기간", esc(formatDateRange(event.startDate, event.endDate))]];
  if (event.address) rows.push(["장소", esc(event.address)]);
  if (event.openHours) rows.push(["운영시간", esc(event.openHours).replace(/\n/g, "<br>")]);
  if (event.fee) rows.push(["요금", esc(event.fee).replace(/\n/g, "<br>")]);
  if (event.homepage?.startsWith("http")) rows.push(["홈페이지", link(event.homepage, event.homepage)]);
  const body = rows.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join("\n");
  return `<table>\n<tbody>\n${body}\n</tbody>\n</table>`;
}

function prepSection(items: PrepItem[]) {
  const groups = (["필수", "추천"] as const)
    .map((priority) => ({ priority, items: items.filter((i) => i.priority === priority) }))
    .filter((g) => g.items.length > 0);
  return groups
    .map(
      (g) =>
        `<h3>${g.priority} 준비물</h3>\n<ul>\n` +
        g.items.map((i) => `<li><strong>${esc(i.name)}</strong> — ${esc(i.reason)}</li>`).join("\n") +
        "\n</ul>",
    )
    .join("\n");
}

export function composePost(event: Event, prepItems: PrepItem[]): ComposedPost {
  const year = event.startDate.getUTCFullYear();
  const dateRange = formatDateRange(event.startDate, event.endDate);
  const items = [...prepItems].sort((a, b) => a.sortOrder - b.sortOrder);
  const mustHave = items.filter((i) => i.priority === "필수").map((i) => i.name);

  const title = `${event.title} ${year} 일정·요금·준비물 총정리`;
  const excerpt =
    `${dateRange} ${event.region}에서 열리는 ${event.title}의 일정과 장소, 요금, 그리고 가기 전에 챙기면 좋은 준비물` +
    (mustHave.length ? `(${mustHave.slice(0, 3).join(", ")} 등)` : "") +
    "을 정리했습니다.";

  const sections: string[] = [];

  sections.push(`<p>${esc(excerpt)}</p>`);
  if (event.thumbnailUrl) {
    sections.push(`<figure><img src="${esc(event.thumbnailUrl)}" alt="${esc(event.title)}" loading="lazy" /></figure>`);
  }

  sections.push(`<h2>${esc(event.title)} 한눈에 보기</h2>\n${infoTable(event)}`);

  if (event.description) sections.push(`<h2>어떤 행사인가요?</h2>\n${paragraphs(event.description)}`);
  if (event.program) sections.push(`<h2>주요 프로그램</h2>\n${paragraphs(event.program)}`);

  if (items.length) {
    sections.push(
      `<h2>가기 전에 챙기세요: 준비물 체크리스트</h2>\n` +
        `<p>${esc(event.title)}의 장소와 시기, 프로그램을 기준으로 골랐습니다. 필수는 꼭, 추천은 여유가 되면 챙기세요.</p>\n` +
        prepSection(items),
    );
  }

  const map = mapUrl(event);
  if (event.address || map) {
    sections.push(
      `<h2>찾아가는 길</h2>\n` +
        (event.address ? `<p>${esc(event.address)}</p>\n` : "") +
        (map ? `<p>${link(map, "카카오맵에서 위치 보기")}</p>` : ""),
    );
  }

  const sourceLabel = SOURCE_LABELS[event.source];
  const sourceText = sourceLabel
    ? event.sourceUrl.startsWith("http")
      ? `행사 정보 출처: ${link(event.sourceUrl, sourceLabel)}`
      : `행사 정보 출처: ${esc(sourceLabel)}`
    : null;
  sections.push(
    `<hr />\n<p><small>일정·요금·프로그램은 주최 측 사정으로 바뀔 수 있으니 방문 전 공식 안내를 꼭 확인하세요.` +
      (sourceText ? `<br>${sourceText}` : "") +
      `<br>전국 축제 일정은 ${BRAND}에서 확인할 수 있어요.</small></p>`,
  );

  return { title, excerpt, html: sections.join("\n\n") };
}
