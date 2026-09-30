// 행사 정보 → Claude → 준비물 초안 (구조화 출력)
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { Event } from "@/app/generated/prisma/client";

const MODEL = "claude-opus-5-5";

const PrepListSchema = z.object({
  items: z.array(
    z.object({
      name: z.string().describe("준비물 이름. 예: 바람막이"),
      reason: z.string().describe("이 행사에서 왜 필요한지 한 문장"),
      searchKeyword: z.string().describe("쿠팡에서 검색할 일반 상품명 (브랜드 없이). 예: 경량 바람막이"),
      priority: z.enum(["필수", "추천"]),
    }),
  ),
});

export type PrepDraft = z.infer<typeof PrepListSchema>["items"][number];

const SYSTEM = `당신은 한국 축제·행사 방문 가이드를 쓰는 에디터입니다. 주어진 행사 정보를 보고 방문객이 챙기면 좋은 준비물 목록을 만듭니다.

원칙:
- 이 행사의 장소·시기·시간대·프로그램에서 나오는 준비물을 고릅니다. 야외/야간/산책로/먹거리/공연 관람 등 행사 특성에 근거해야 합니다.
- 휴대폰·지갑처럼 누구나 챙기는 물건은 빼고, 이 행사라서 필요한 것만 6~10개 고릅니다.
- reason은 이 행사에 맞춘 구체적인 한 문장으로 씁니다. 행사 정보에 없는 사실(주차 요금, 셔틀 유무 등)은 지어내지 않습니다.
- searchKeyword는 쿠팡에서 바로 검색할 수 있는 일반 상품명으로, 브랜드명 없이 씁니다. 현금처럼 상품이 아닌 준비물은 빈 문자열로 둡니다.
- 필수는 없으면 방문이 불편해지는 것, 추천은 있으면 더 좋은 것입니다. 필수 먼저 나열합니다.`;

function formatDate(date: Date | null) {
  return date ? date.toISOString().slice(0, 10) : "미정";
}

function describeEvent(event: Event) {
  return [
    `행사명: ${event.title}`,
    `기간: ${formatDate(event.startDate)} ~ ${formatDate(event.endDate)}`,
    `지역: ${event.region}`,
    `주소: ${event.address ?? "정보 없음"}`,
    `운영시간: ${event.openHours ?? "정보 없음"}`,
    `요금: ${event.fee ?? "정보 없음"}`,
    `소개: ${event.description ?? "정보 없음"}`,
    `프로그램: ${event.program ?? "정보 없음"}`,
  ].join("\n");
}

export async function generatePrepList(event: Event): Promise<PrepDraft[]> {
  const client = new Anthropic();
  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: "medium", format: betaZodOutputFormat(PrepListSchema) },
    // 안전 분류기가 드물게 거절하면 서버가 다른 모델로 자동 재시도
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM,
    messages: [{ role: "user", content: describeEvent(event) }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error(`Claude가 요청을 거절했습니다: ${response.stop_details?.explanation ?? "사유 없음"}`);
  }
  if (!response.parsed_output) {
    throw new Error(`준비물 응답을 해석하지 못했습니다 (stop_reason=${response.stop_reason})`);
  }
  return response.parsed_output.items;
}
