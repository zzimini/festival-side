// 법정동 시/도 코드(lDongRegnCd) → 지역명. TourAPI KorService2는 areacode 대신 이 코드를 준다.
export const REGION_BY_LDONG_CODE: Record<string, string> = {
  "11": "서울",
  "12": "전남광주", // 전남광주통합특별시 (2026 통합)
  "26": "부산",
  "27": "대구",
  "28": "인천",
  "29": "전남광주", // 통합 이전 광주 코드
  "30": "대전",
  "31": "울산",
  "36": "세종",
  "41": "경기",
  "42": "강원", // 강원특별자치도 이전 코드
  "43": "충북",
  "44": "충남",
  "45": "전북", // 전북특별자치도 이전 코드
  "46": "전남광주", // 통합 이전 전남 코드
  "47": "경북",
  "48": "경남",
  "50": "제주",
  "51": "강원",
  "52": "전북",
};

export const REGIONS = [...new Set(Object.values(REGION_BY_LDONG_CODE))];

// 세종처럼 시/군/구까지 붙은 긴 코드(36110)로 오는 경우가 있어 앞 두 자리로 매칭
export function regionFromLDongCode(code: string | undefined) {
  return REGION_BY_LDONG_CODE[(code ?? "").slice(0, 2)] ?? "기타";
}

// "서울특별시", "전라남도", "강원특별자치도" 같은 시/도 이름 → 지역명 (KOPIS 등 코드 없이 이름만 주는 출처용)
const REGION_BY_NAME_PREFIX: [string, string][] = [
  ["서울", "서울"],
  ["부산", "부산"],
  ["대구", "대구"],
  ["인천", "인천"],
  ["광주", "전남광주"],
  ["대전", "대전"],
  ["울산", "울산"],
  ["세종", "세종"],
  ["경기", "경기"],
  ["강원", "강원"],
  ["충청북", "충북"],
  ["충북", "충북"],
  ["충청남", "충남"],
  ["충남", "충남"],
  ["전라북", "전북"],
  ["전북", "전북"],
  ["전라남", "전남광주"],
  ["전남", "전남광주"],
  ["경상북", "경북"],
  ["경북", "경북"],
  ["경상남", "경남"],
  ["경남", "경남"],
  ["제주", "제주"],
];

export function regionFromName(name: string | undefined) {
  const trimmed = (name ?? "").trim();
  return REGION_BY_NAME_PREFIX.find(([prefix]) => trimmed.startsWith(prefix))?.[1] ?? "기타";
}
