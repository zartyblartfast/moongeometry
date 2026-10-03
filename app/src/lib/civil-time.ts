export type CivilTimeInfo = {
  timeZoneId: string;
  clock: string;
  date: string;
  year: number;
  zoneName: string | null;
  utcOffsetMinutes: number;
  utcOffsetLabel: string;
};

type TimeZoneLookup = (latDeg: number, lonDeg: number) => string;

let timeZoneLookupPromise: Promise<TimeZoneLookup> | null = null;

function loadTimeZoneLookup(): Promise<TimeZoneLookup> {
  timeZoneLookupPromise ??= import("@photostructure/tz-lookup").then((module) => module.default);
  return timeZoneLookupPromise;
}

export async function lookupTimeZone(latDeg: number, lonDeg: number): Promise<string | null> {
  if (
    !Number.isFinite(latDeg) ||
    !Number.isFinite(lonDeg) ||
    latDeg < -90 ||
    latDeg > 90 ||
    lonDeg < -180 ||
    lonDeg > 180
  ) {
    return null;
  }

  try {
    const lookup = await loadTimeZoneLookup();
    return lookup(latDeg, lonDeg);
  } catch {
    return null;
  }
}

function partValue(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string | null {
  return parts.find((part) => part.type === type)?.value ?? null;
}

function parseOffset(value: string): number | null {
  const normalized = value.replace("−", "-");
  const match =
    /^(?:GMT|UTC)(?:([+-])(\d{1,2})(?:(?::(\d{2})(?::(\d{2}))?)|(\d{2})(\d{2})?)?)?$/.exec(
      normalized,
    );
  if (!match) return null;
  if (!match[1]) return 0;

  const hours = Number(match[2]);
  const minutes = Number(match[3] ?? match[5] ?? "0");
  const seconds = Number(match[4] ?? match[6] ?? "0");
  if (minutes >= 60 || seconds >= 60) return null;

  const absoluteMinutes = Math.round((hours * 3600 + minutes * 60 + seconds) / 60);
  return match[1] === "-" ? -absoluteMinutes : absoluteMinutes;
}

function offsetLabel(offsetMinutes: number): string {
  const sign = offsetMinutes < 0 ? "-" : "+";
  const absolute = Math.abs(offsetMinutes);
  const hours = Math.floor(absolute / 60).toString().padStart(2, "0");
  const minutes = (absolute % 60).toString().padStart(2, "0");
  return `UTC${sign}${hours}:${minutes}`;
}

export function formatCivilTime(instant: number, timeZoneId: string): CivilTimeInfo | null {
  if (!Number.isFinite(instant)) return null;

  try {
    const civilFormatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: timeZoneId,
      hourCycle: "h23",
      hour: "2-digit",
      minute: "2-digit",
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZoneName: "short",
    });
    const offsetFormatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: timeZoneId,
      timeZoneName: "longOffset",
    });
    const civilParts = civilFormatter.formatToParts(instant);
    const offsetParts = offsetFormatter.formatToParts(instant);
    const hour = partValue(civilParts, "hour");
    const minute = partValue(civilParts, "minute");
    const day = partValue(civilParts, "day");
    const month = partValue(civilParts, "month");
    const yearText = partValue(civilParts, "year");
    const offsetText = partValue(offsetParts, "timeZoneName");
    if (!hour || !minute || !day || !month || !yearText || !offsetText) return null;

    const year = Number(yearText);
    const utcOffsetMinutes = parseOffset(offsetText);
    if (!Number.isInteger(year) || utcOffsetMinutes === null) return null;

    const shortZoneName = partValue(civilParts, "timeZoneName");
    return {
      timeZoneId,
      clock: `${hour}:${minute}`,
      date: `${day} ${month}`,
      year,
      zoneName: timeZoneId.startsWith("Etc/GMT") ? null : shortZoneName,
      utcOffsetMinutes,
      utcOffsetLabel: offsetLabel(utcOffsetMinutes),
    };
  } catch {
    return null;
  }
}
