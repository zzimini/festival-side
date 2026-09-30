// 한국관광공사 TourAPI(KorService2) 행사정보조회(searchFestival2) 수집.
// 문서: https://www.data.go.kr/data/15101578/openapi.do  (키 발급도 여기서)
import { regionFromLDongCode } from "@/lib/regions";
import { kstYmd, parseKstDate, type CollectedEvent, type Collector } from "./types";

const ENDPOINT = "https://apis.data.go.kr/B551011/KorService2/searchFestival2";
const PAGE_SIZE = 100;

type FestivalItem = {
  contentid: string;
  title: string;
  addr1?: string;
  addr2?: string;
  eventstartdate: string; // YYYYMMDD
  eventenddate?: string; // YYYYMMDD
  firstimage?: string;
  mapx?: string; // 경도
  mapy?: string; // 위도
  lDongRegnCd?: string;
};

type FestivalResponse = {
  response: {
    header: { resultCode: string; resultMsg: string };
    body: {
      totalCount: number;
      // 결과가 0건이면 items가 빈 문자열로 온다
      items: { item: FestivalItem[] | FestivalItem } | "";
    };
  };
};

function serviceKey() {
  const key = process.env.TOURAPI_SERVICE_KEY;
  if (!key) throw new Error("TOURAPI_SERVICE_KEY가 설정되지 않았습니다 (.env.local 확인)");
  // data.go.kr은 Encoding/Decoding 키 두 개를 주는데, 어느 쪽을 넣어도 동작하게 디코딩해 둔다
  return key.includes("%") ? decodeURIComponent(key) : key;
}

function toNumber(value: string | undefined): number | null {
  const n = Number(value);
  return value && Number.isFinite(n) && n !== 0 ? n : null;
}

function toEvent(item: FestivalItem): CollectedEvent | null {
  const startDate = parseKstDate(item.eventstartdate);
  if (!startDate) return null;
  const address = [item.addr1, item.addr2].filter(Boolean).join(" ").trim();
  return {
    title: item.title.trim(),
    category: "축제·행사",
    region: regionFromLDongCode(item.lDongRegnCd),
    address: address || null,
    latitude: toNumber(item.mapy),
    longitude: toNumber(item.mapx),
    thumbnailUrl: item.firstimage || null,
    startDate,
    endDate: parseKstDate(item.eventenddate),
    source: "tourapi",
    // TourAPI는 공개 상세 URL을 주지 않아 contentid 기반 식별 URI를 쓴다 (중복 방지 키 역할)
    sourceUrl: `tourapi://festival/${item.contentid}`,
  };
}

async function fetchPage(eventStartDate: string, pageNo: number) {
  const params = new URLSearchParams({
    serviceKey: serviceKey(),
    MobileOS: "ETC",
    MobileApp: "festival-side",
    _type: "json",
    arrange: "A",
    numOfRows: String(PAGE_SIZE),
    pageNo: String(pageNo),
    eventStartDate,
  });
  // 응답이 없을 때 크론이 멈춰 있지 않도록 타임아웃
  const res = await fetch(`${ENDPOINT}?${params}`, { signal: AbortSignal.timeout(30_000) });
  const text = await res.text();
  // 키 오류 등은 _type=json이어도 XML로 돌아온다
  if (!res.ok || !text.trimStart().startsWith("{")) {
    throw new Error(`TourAPI 요청 실패 (HTTP ${res.status}): ${text.slice(0, 300)}`);
  }
  const json = JSON.parse(text) as FestivalResponse;
  const { header, body } = json.response;
  if (header.resultCode !== "0000") {
    throw new Error(`TourAPI 오류 ${header.resultCode}: ${header.resultMsg}`);
  }
  const raw = body.items === "" ? [] : body.items.item;
  return { items: Array.isArray(raw) ? raw : [raw], totalCount: body.totalCount };
}

// 오늘 이후에도 진행 중이거나 예정인 행사 전부
export const tourapi: Collector = {
  source: "tourapi",
  async collect() {
    const from = kstYmd();
    const events: CollectedEvent[] = [];
    for (let pageNo = 1; ; pageNo++) {
      const { items, totalCount } = await fetchPage(from, pageNo);
      for (const item of items) {
        const event = toEvent(item);
        if (event) events.push(event);
      }
      if (items.length === 0 || pageNo * PAGE_SIZE >= totalCount) break;
    }
    return { events, window: { from: parseKstDate(from)! } };
  },
};
