import { REGIONS } from "@/lib/regions";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-16">
      <h1 className="text-2xl font-semibold">행사 목록 엑셀 다운로드</h1>
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
