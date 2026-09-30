// 행사 목록 → 엑셀(.xlsx) 버퍼
import ExcelJS from "exceljs";
import type { Event } from "@/app/generated/prisma/client";

// DATE 컬럼 → YYYY-MM-DD 문자열 (엑셀 타임존 혼동 방지)
function formatDate(date: Date | null) {
  return date ? date.toISOString().slice(0, 10) : "";
}

export async function buildEventsWorkbook(events: Event[]) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("행사");

  sheet.columns = [
    { header: "행사명", key: "title", width: 40 },
    { header: "카테고리", key: "category", width: 12 },
    { header: "지역", key: "region", width: 8 },
    { header: "시작일", key: "startDate", width: 12 },
    { header: "종료일", key: "endDate", width: 12 },
    { header: "주소", key: "address", width: 50 },
    { header: "운영시간", key: "openHours", width: 16 },
    { header: "요금", key: "fee", width: 16 },
    { header: "홈페이지", key: "homepage", width: 30 },
    { header: "위도", key: "latitude", width: 12 },
    { header: "경도", key: "longitude", width: 12 },
    { header: "썸네일", key: "thumbnailUrl", width: 40 },
    { header: "출처", key: "source", width: 10 },
    { header: "원본", key: "sourceUrl", width: 30 },
  ];

  for (const e of events) {
    sheet.addRow({
      ...e,
      startDate: formatDate(e.startDate),
      endDate: formatDate(e.endDate),
    });
  }

  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = { from: "A1", to: "N1" };

  return workbook.xlsx.writeBuffer();
}
