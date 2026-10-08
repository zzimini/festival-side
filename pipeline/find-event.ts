// CLI 인자(행사명 또는 이벤트 ID)로 행사 하나를 찾는다 — enricher·composer 공용
import { db } from "@/lib/db";

export async function findEvent(query: string) {
  const byId = await db.event.findUnique({ where: { id: query } });
  if (byId) return byId;
  const matches = await db.event.findMany({ where: { title: query, removedAt: null } });
  if (matches.length > 1) throw new Error(`"${query}" 행사가 ${matches.length}건입니다. 이벤트 ID로 지정해 주세요.`);
  return matches[0] ?? null;
}
