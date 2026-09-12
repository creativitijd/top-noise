import { addDays, format, getDay, parseISO } from "date-fns";
import { nl } from "date-fns/locale";

export const MARKET_COUNTRIES = ["NL", "BE", "DE"] as const;
export type MarketCountry = (typeof MARKET_COUNTRIES)[number];

export const BE_REGIONS = ["VLG", "WAL", "BRU"] as const;
export type BeRegion = (typeof BE_REGIONS)[number];

export type HolidayKind = "closed" | "moment";

export type Holiday = {
  date: string;
  name: string;
  kind: HolidayKind;
};

export const COUNTRY_META: Record<MarketCountry, { label: string; timezone: string }> = {
  NL: { label: "Nederland", timezone: "Europe/Amsterdam" },
  BE: { label: "België", timezone: "Europe/Brussels" },
  DE: { label: "Duitsland", timezone: "Europe/Berlin" },
};

export const REGION_META: Record<BeRegion, { label: string }> = {
  VLG: { label: "Vlaanderen" },
  WAL: { label: "Wallonië" },
  BRU: { label: "Brussel" },
};

export function isMarketCountry(value: string | null | undefined): value is MarketCountry {
  return (MARKET_COUNTRIES as readonly string[]).includes(value ?? "");
}

export function isBeRegion(value: string | null | undefined): value is BeRegion {
  return (BE_REGIONS as readonly string[]).includes(value ?? "");
}

export function countryFromTimezone(timezone: string | null | undefined): MarketCountry {
  if (timezone === "Europe/Berlin") {
    return "DE";
  }
  if (timezone === "Europe/Brussels") {
    return "BE";
  }
  return "NL";
}

export function projectMarket(project: {
  country?: string | null;
  region?: string | null;
  timezone?: string | null;
}): { country: MarketCountry; region: BeRegion | null } {
  const country = isMarketCountry(project.country) ? project.country : countryFromTimezone(project.timezone);
  const region = country === "BE" ? (isBeRegion(project.region) ? project.region : "VLG") : null;
  return { country, region };
}

export function holidaysInRange(
  fromIso: string,
  toIso: string,
  country: MarketCountry,
  region: BeRegion | null = null
): Holiday[] {
  const from = fromIso.slice(0, 10);
  const to = toIso.slice(0, 10);
  const startYear = Number.parseInt(from.slice(0, 4), 10);
  const endYear = Number.parseInt(to.slice(0, 4), 10);
  const result: Holiday[] = [];
  const seen = new Set<string>();
  for (let year = startYear; year <= endYear + 1; year += 1) {
    for (const holiday of holidaysForYear(year, country, region)) {
      if (holiday.date < from || holiday.date > to || seen.has(`${holiday.date}:${holiday.name}`)) {
        continue;
      }
      seen.add(`${holiday.date}:${holiday.name}`);
      result.push(holiday);
    }
  }
  return result.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name, "nl"));
}

export function holidayPlanForPeriod(input: {
  startsOn: string;
  periodMonths: number;
  country: MarketCountry;
  region?: BeRegion | null;
}): {
  country: MarketCountry;
  region: BeRegion | null;
  closed: Array<{ date: string; name: string }>;
  moments: Array<{ date: string; name: string }>;
  notes: string;
} {
  const start = input.startsOn.slice(0, 10);
  const end = addMonthsIso(start, input.periodMonths);
  const region = input.country === "BE" ? (input.region ?? "VLG") : null;
  const holidays = holidaysInRange(start, previousDay(end), input.country, region);
  const closed = holidays.filter((item) => item.kind === "closed").map(({ date, name }) => ({ date, name }));
  const moments = holidays.filter((item) => item.kind === "moment").map(({ date, name }) => ({ date, name }));
  const market = region ? `${COUNTRY_META[input.country].label} (${REGION_META[region].label})` : COUNTRY_META[input.country].label;
  return {
    country: input.country,
    region,
    closed,
    moments,
    notes: `Markt: ${market}. Content rond commerciële momenten. Geen posts op vrije dagen; schuif naar de werkdag ernaast.`,
  };
}

export function formatHolidayLine(item: { date: string; name: string }): string {
  try {
    return `${format(parseISO(`${item.date}T12:00:00`), "d MMM", { locale: nl })} · ${item.name}`;
  } catch {
    return `${item.date} · ${item.name}`;
  }
}

export function formatHolidayPrompt(plan: {
  closed: Array<{ date: string; name: string }>;
  moments: Array<{ date: string; name: string }>;
}): string {
  const closed = plan.closed.length > 0 ? plan.closed.map(formatHolidayLine).join("; ") : "geen";
  const moments = plan.moments.length > 0 ? plan.moments.map(formatHolidayLine).join("; ") : "geen";
  return `Vrije dagen (niet posten): ${closed}\nContentmomenten (plan een post op of naast die datum): ${moments}`;
}

export function holidayMap(holidays: Holiday[]): Map<string, Holiday[]> {
  const map = new Map<string, Holiday[]>();
  for (const holiday of holidays) {
    const list = map.get(holiday.date) ?? [];
    list.push(holiday);
    map.set(holiday.date, list);
  }
  return map;
}

function holidaysForYear(year: number, country: MarketCountry, region: BeRegion | null): Holiday[] {
  const easter = easterSunday(year);
  const items: Holiday[] = [
    { date: iso(year, 1, 1), name: "Nieuwjaarsdag", kind: "closed" },
    { date: iso(year, 2, 14), name: "Valentijnsdag", kind: "moment" },
    { date: addDaysIso(easter, 1), name: "Tweede Paasdag", kind: "closed" },
    { date: nthWeekday(year, 5, 0, 2), name: "Moederdag", kind: "moment" },
    { date: addDaysIso(easter, 39), name: "Hemelvaartsdag", kind: "closed" },
    { date: addDaysIso(easter, 50), name: "Tweede Pinksterdag", kind: "closed" },
    { date: fridayAfterThanksgiving(year), name: "Black Friday", kind: "moment" },
    { date: iso(year, 12, 25), name: "Eerste Kerstdag", kind: "closed" },
    { date: iso(year, 12, 31), name: "Oudjaar", kind: "moment" },
  ];

  if (country === "NL") {
    items.push(
      { date: kingsDay(year), name: "Koningsdag", kind: "closed" },
      { date: iso(year, 5, 5), name: "Bevrijdingsdag", kind: "moment" },
      { date: nthWeekday(year, 6, 0, 3), name: "Vaderdag", kind: "moment" },
      { date: iso(year, 12, 5), name: "Sinterklaas", kind: "moment" },
      { date: iso(year, 12, 26), name: "Tweede Kerstdag", kind: "closed" }
    );
  }

  if (country === "BE") {
    items.push(
      { date: iso(year, 5, 1), name: "Dag van de Arbeid", kind: "closed" },
      { date: nthWeekday(year, 6, 0, 2), name: "Vaderdag", kind: "moment" },
      { date: iso(year, 7, 21), name: "Nationale feestdag", kind: "closed" },
      { date: iso(year, 8, 15), name: "Maria-Hemelvaart", kind: "closed" },
      { date: iso(year, 11, 1), name: "Allerheiligen", kind: "closed" },
      { date: iso(year, 11, 11), name: "Wapenstilstand", kind: "closed" },
      { date: iso(year, 12, 6), name: "Sinterklaas", kind: "moment" }
    );
    if (region === "VLG") {
      items.push({ date: iso(year, 7, 11), name: "Vlaamse feestdag", kind: "closed" });
    }
    if (region === "WAL") {
      items.push({ date: iso(year, 9, 27), name: "Feest van de Franse Gemeenschap", kind: "closed" });
    }
    if (region === "BRU") {
      items.push({ date: iso(year, 5, 8), name: "Irisfeest", kind: "closed" });
    }
  }

  if (country === "DE") {
    items.push(
      { date: addDaysIso(easter, -2), name: "Goede Vrijdag", kind: "closed" },
      { date: iso(year, 5, 1), name: "Tag der Arbeit", kind: "closed" },
      { date: iso(year, 10, 3), name: "Tag der Deutschen Einheit", kind: "closed" },
      { date: iso(year, 12, 6), name: "Nikolaustag", kind: "moment" },
      { date: iso(year, 12, 26), name: "Tweede Kerstdag", kind: "closed" }
    );
  }

  return items;
}

function easterSunday(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return iso(year, month, day);
}

function kingsDay(year: number): string {
  const date = iso(year, 4, 27);
  return getDay(parseISO(`${date}T12:00:00`)) === 0 ? iso(year, 4, 26) : date;
}

function fridayAfterThanksgiving(year: number): string {
  return addDaysIso(nthWeekday(year, 11, 4, 4), 1);
}

function nthWeekday(year: number, month: number, weekday: number, n: number): string {
  const first = parseISO(`${iso(year, month, 1)}T12:00:00`);
  const delta = (weekday - getDay(first) + 7) % 7;
  return format(addDays(first, delta + (n - 1) * 7), "yyyy-MM-dd");
}

function addMonthsIso(start: string, months: number): string {
  const date = parseISO(`${start}T12:00:00`);
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return format(next, "yyyy-MM-dd");
}

function previousDay(isoDate: string): string {
  return format(addDays(parseISO(`${isoDate}T12:00:00`), -1), "yyyy-MM-dd");
}

function addDaysIso(isoDate: string, days: number): string {
  return format(addDays(parseISO(`${isoDate}T12:00:00`), days), "yyyy-MM-dd");
}

function iso(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
