// 출처 상세 API로 행사 설명·운영시간·요금·프로그램을 채운다 (목록 API엔 없는 정보)
import type { Event } from "@/app/generated/prisma/client";
import { tourApiGet } from "../collector/tourapi";

export type EventDetail = {
  description: string | null;
  openHours: string | null;
  fee: string | null;
  homepage: string | null;
  program: string | null;
};

type CommonItem = { overview?: string; homepage?: string };
type IntroItem = { playtime?: string; usetimefestival?: string; program?: string; eventplace?: string };

// TourAPI 텍스트엔 <br>이나 <a href> 같은 HTML이 섞여 온다
function clean(value: string | undefined) {
  if (!value) return null;
  const href = value.match(/href="([^"]+)"/)?.[1];
  const text = (href ?? value)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
  return text || null;
}

export async function fetchDetail(event: Event): Promise<EventDetail | null> {
  if (event.source !== "tourapi") return null; // KOPIS 등은 아직 미지원
  const contentId = event.sourceUrl.split("/").pop()!;
  const [common, intro] = await Promise.all([
    tourApiGet<CommonItem>("detailCommon2", { contentId }),
    tourApiGet<IntroItem>("detailIntro2", { contentId, contentTypeId: "15" }),
  ]);
  const c = common.items[0] ?? {};
  const i = intro.items[0] ?? {};
  return {
    description: clean(c.overview),
    openHours: clean(i.playtime),
    fee: clean(i.usetimefestival),
    homepage: clean(c.homepage),
    program: clean(i.program),
  };
}
