// GET /api/events/export?from=2026-10-01&to=2026-10-31&region=서울
// 기간과 겹치는 행사를 엑셀로 내려준다. 파라미터는 모두 선택.
import { db } from "@/lib/db";
import { buildEventsWorkbook } from "@/lib/events-xlsx";
import type { Prisma } from "@/app/generated/prisma/client";

function parseDate(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return new Date(`${value}T00:00:00+09:00`);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = parseDate(searchParams.get("from"));
  const to = parseDate(searchParams.get("to"));
  const region = searchParams.get("region") || undefined;

  const where: Prisma.EventWhereInput = { region };
  if (to) where.startDate = { lte: to };
  if (from) {
    // 종료일이 없으면 시작일 하루짜리 행사로 본다
    where.OR = [{ endDate: { gte: from } }, { endDate: null, startDate: { gte: from } }];
  }

  const events = await db.event.findMany({ where, orderBy: [{ startDate: "asc" }, { title: "asc" }] });
  const buffer = await buildEventsWorkbook(events);

  const filename = `행사목록_${searchParams.get("from") ?? "전체"}_${searchParams.get("to") ?? ""}.xlsx`;
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="events.xlsx"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
