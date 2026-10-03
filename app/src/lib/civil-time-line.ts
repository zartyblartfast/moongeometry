import type { CivilTimeInfo } from "./civil-time.ts";

export function composeCivilTimeLine(value: CivilTimeInfo, meanSolarYear: number): string {
  const zoneName = value.zoneName ? ` ${value.zoneName}` : "";
  const year = value.year !== meanSolarYear ? ` ${value.year}` : "";
  return `Civil time: ${value.clock}${zoneName}, ${value.date}${year} · ${value.utcOffsetLabel}.`;
}
