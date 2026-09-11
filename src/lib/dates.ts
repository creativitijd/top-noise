import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export const DEFAULT_TIMEZONE = "Europe/Brussels";

export function scheduledAtForDay(dateIso: string, timezone = DEFAULT_TIMEZONE, hour = 9): string {
  const date = dateIso.slice(0, 10);
  return fromZonedTime(`${date}T${String(hour).padStart(2, "0")}:00:00`, timezone).toISOString();
}

export function formatDateTime(iso: string, timezone = DEFAULT_TIMEZONE): string {
  return formatInTimeZone(iso, timezone, "d MMM yyyy HH:mm");
}
