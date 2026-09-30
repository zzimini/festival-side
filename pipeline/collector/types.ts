// 수집 출처(TourAPI, KOPIS …)가 공통으로 따르는 형태

export type CollectedEvent = {
  title: string;
  category: string;
  region: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  thumbnailUrl: string | null;
  startDate: Date;
  endDate: Date | null;
  source: string;
  sourceUrl: string;
};

export type CollectResult = {
  events: CollectedEvent[];
  // 이번 조회가 커버한 기간. 이 기간에 걸치는데 결과에 없던 기존 행사 = 출처에서 사라진 것
  window: { from: Date; to?: Date };
};

export type Collector = {
  source: string;
  collect(): Promise<CollectResult>;
};

// YYYYMMDD 또는 YYYY.MM.DD → 한국 시간 자정
export function parseKstDate(value: string | undefined): Date | null {
  const digits = value?.replaceAll(".", "");
  if (!digits || !/^\d{8}$/.test(digits)) return null;
  return new Date(`${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}T00:00:00+09:00`);
}

// 한국 시간 기준 오늘 + days → YYYYMMDD
export function kstYmd(days = 0) {
  return new Date(Date.now() + 9 * 60 * 60 * 1000 + days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)
    .replaceAll("-", "");
}
