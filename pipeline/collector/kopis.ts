// KOPIS(공연예술통합전산망) 공연목록 수집 — 흠뻑쇼 같은 상업 콘서트는 여기 잡힌다.
// 키 발급: https://www.kopis.or.kr/por/cs/openapi/openApiList.do
import { XMLParser } from "fast-xml-parser";
import { regionFromName } from "@/lib/regions";
import { kstYmd, parseKstDate, type CollectedEvent, type Collector } from "./types";

const ENDPOINT = "https://www.kopis.or.kr/openApi/restful/pblprfr";
const PAGE_SIZE = 100;
const WINDOW_DAYS = 90; // 오늘부터 몇 일치 공연을 볼지
const CHUNK_DAYS = 31; // KOPIS는 한 번에 조회 가능한 기간이 짧아 나눠서 조회

// 장르 코드 → 우리 카테고리. 연극·뮤지컬은 소극장 공연이 너무 많아 우선 제외
const GENRES: Record<string, string> = {
  CCCD: "콘서트", // 대중음악
};

type PerformanceItem = {
  mt20id: string;
  prfnm: string;
  prfpdfrom: string; // YYYY.MM.DD
  prfpdto: string;
  fcltynm?: string;
  poster?: string;
  area?: string;
  genrenm?: string;
};

const parser = new XMLParser({ parseTagValue: false, isArray: (name) => name === "db" });

function serviceKey() {
  const key = process.env.KOPIS_SERVICE_KEY;
  if (!key) throw new Error("KOPIS_SERVICE_KEY가 설정되지 않았습니다 (.env.local 확인)");
  return key;
}

async function fetchPage(genre: string, stdate: string, eddate: string, cpage: number) {
  const params = new URLSearchParams({
    service: serviceKey(),
    stdate,
    eddate,
    cpage: String(cpage),
    rows: String(PAGE_SIZE),
    shcate: genre,
  });
  const res = await fetch(`${ENDPOINT}?${params}`, { signal: AbortSignal.timeout(30_000) });
  const text = await res.text();
  if (!res.ok) throw new Error(`KOPIS 요청 실패 (HTTP ${res.status}): ${text.slice(0, 300)}`);
  const xml = parser.parse(text) as { dbs?: { db?: PerformanceItem[] } | "" };
  if (xml.dbs === undefined) throw new Error(`KOPIS 응답 형식 오류: ${text.slice(0, 300)}`);
  return (xml.dbs && xml.dbs.db) || [];
}

function toEvent(item: PerformanceItem, category: string): CollectedEvent | null {
  const startDate = parseKstDate(item.prfpdfrom);
  if (!startDate) return null;
  return {
    title: item.prfnm.trim(),
    category,
    region: regionFromName(item.area),
    address: item.fcltynm?.trim() || null, // 목록 API는 주소 대신 공연장명만 준다
    latitude: null,
    longitude: null,
    thumbnailUrl: item.poster || null,
    startDate,
    endDate: parseKstDate(item.prfpdto),
    source: "kopis",
    sourceUrl: `https://www.kopis.or.kr/por/db/pblprfr/pblprfrView.do?menuId=MNU_00020&mt20Id=${item.mt20id}`,
  };
}

export const kopis: Collector = {
  source: "kopis",
  async collect() {
    // 기간을 나눠 조회하면 여러 구간에 걸친 공연이 중복으로 오므로 공연 ID로 합친다
    const byId = new Map<string, CollectedEvent>();
    for (const [genre, category] of Object.entries(GENRES)) {
      for (let offset = 0; offset < WINDOW_DAYS; offset += CHUNK_DAYS) {
        const stdate = kstYmd(offset);
        const eddate = kstYmd(Math.min(offset + CHUNK_DAYS, WINDOW_DAYS) - 1);
        for (let cpage = 1; ; cpage++) {
          const items = await fetchPage(genre, stdate, eddate, cpage);
          for (const item of items) {
            const event = toEvent(item, category);
            if (event) byId.set(item.mt20id, event);
          }
          if (items.length < PAGE_SIZE) break;
        }
      }
    }
    return {
      events: [...byId.values()],
      window: { from: parseKstDate(kstYmd())!, to: parseKstDate(kstYmd(WINDOW_DAYS - 1))! },
    };
  },
};
