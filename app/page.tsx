import Link from "next/link";
import { db } from "@/lib/db";
import { REGIONS } from "@/lib/regions";

// 새 글이 발행되면 최대 1분 안에 목록에 나타난다
export const revalidate = 60;

export default async function Home() {
  const posts = await db.post.findMany({
    orderBy: { updatedAt: "desc" },
    take: 20,
    select: { id: true, title: true, status: true, updatedAt: true },
  });

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-16">
      <h1 className="text-2xl font-semibold">블로그 글</h1>
      {posts.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          아직 발행된 글이 없습니다. <code>pnpm publish-post &lt;행사명&gt;</code>으로 올려보세요.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {posts.map((post) => (
            <li key={post.id}>
              <Link
                href={`/posts/${post.id}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 px-4 py-3 hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:border-zinc-600 dark:hover:bg-zinc-900"
              >
                <span className="font-medium">{post.title}</span>
                <span className="flex shrink-0 items-center gap-2 text-xs text-zinc-500">
                  {post.status !== "published" && (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">검수 대기</span>
                  )}
                  {post.updatedAt.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })} →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-16 text-2xl font-semibold">행사 목록 엑셀 다운로드</h2>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        DB에 수집된 행사 중 기간·지역 조건에 맞는 것을 .xlsx로 받습니다. 비워두면 전체.
      </p>

      <form action="/api/events/export" method="get" className="mt-8 flex flex-col gap-4">
        <div className="flex gap-4">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            시작
            <input type="date" name="from" className="rounded border border-zinc-300 px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-900" />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm">
            종료
            <input type="date" name="to" className="rounded border border-zinc-300 px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-900" />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          지역
          <select name="region" className="rounded border border-zinc-300 px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-900">
            <option value="">전체</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="rounded bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900">
          엑셀 다운로드
        </button>
      </form>
    </main>
  );
}
