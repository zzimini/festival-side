// Prisma 클라이언트 — 파이프라인·Next.js 앱 모두 여기서 DB를 읽는다.
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL이 설정되지 않았습니다 (.env.local 확인)");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

// dev 서버 핫리로드마다 커넥션이 새로 생기지 않도록 전역에 캐시
export const db = globalForPrisma.prisma ?? createClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
