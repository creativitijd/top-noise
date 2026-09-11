import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { nl } from "date-fns/locale";

export const DEFAULT_TIMEZONE = "Europe/Brussels";

export function scheduledAtForDay(dateIso: string, timezone = DEFAULT_TIMEZONE, hour = 9): string {
  const date = dateIso.slice(0, 10);
  return fromZonedTime(`${date}T${String(hour).padStart(2, "0")}:00:00`, timezone).toISOString();
}

export function formatDateTime(iso: string, timezone = DEFAULT_TIMEZONE): string {
  return formatInTimeZone(iso, timezone, "d MMM yyyy HH:mm", { locale: nl });
}

export function formatPostWhen(iso: string, timezone = DEFAULT_TIMEZONE): string {
  return formatInTimeZone(iso, timezone, "EEE d MMM · HH:mm", { locale: nl });
}

export function formatPostPreviewWhen(iso: string, timezone = DEFAULT_TIMEZONE): string {
  return formatInTimeZone(iso, timezone, "EEE HH:mm", { locale: nl });
}

export function formatSavedAgo(iso: string): string {
  const elapsed = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(elapsed) || elapsed < 20_000) {
    return "Opgeslagen zojuist";
  }
  if (elapsed < 60_000) {
    return "Opgeslagen 1 min geleden";
  }
  if (elapsed < 3_600_000) {
    return `Opgeslagen ${Math.floor(elapsed / 60_000)} min geleden`;
  }
  if (elapsed < 86_400_000) {
    return `Opgeslagen ${Math.floor(elapsed / 3_600_000)} uur geleden`;
  }
  return `Opgeslagen ${formatDateTime(iso)}`;
}
