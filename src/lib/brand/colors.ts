export type ColorSwatch = {
  hex: string;
  name: string;
  usage: string;
};

const HEX_RE = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;
const RGB_RE = /rgba?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})/gi;
const NAMED_VAR_RE =
  /--[\w-]*(?:brand|primary|accent|secondary|cta|terra|green|purple|blue|coral|gold)[\w-]*\s*:\s*([^;]+)/gi;

export function normalizeHex(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  const rgb = trimmed.match(/^rgba?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})/i);
  if (rgb) {
    return toHex(clampByte(rgb[1]), clampByte(rgb[2]), clampByte(rgb[3]));
  }
  let hex = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  const short = hex.match(/^#([0-9a-fA-F]{3})([0-9a-fA-F])?$/);
  if (short) {
    const [r, g, b] = short[1].split("");
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  const long = hex.match(/^#([0-9a-fA-F]{6})([0-9a-fA-F]{2})?$/);
  if (long) {
    return `#${long[1]}`.toUpperCase();
  }
  return null;
}

export function extractHexFromText(text: string): string[] {
  const counts = new Map<string, number>();
  for (const match of text.matchAll(HEX_RE)) {
    bump(counts, normalizeHex(match[0]), 2);
  }
  for (const match of text.matchAll(RGB_RE)) {
    bump(counts, toHex(clampByte(match[1]), clampByte(match[2]), clampByte(match[3])), 1);
  }
  return rankHexes(counts);
}

export function extractColorsFromCss(css: string, boostNamedVars = true): string[] {
  const counts = new Map<string, number>();
  for (const match of css.matchAll(HEX_RE)) {
    bump(counts, normalizeHex(match[0]), 1);
  }
  for (const match of css.matchAll(RGB_RE)) {
    bump(counts, toHex(clampByte(match[1]), clampByte(match[2]), clampByte(match[3])), 1);
  }
  if (boostNamedVars) {
    for (const match of css.matchAll(NAMED_VAR_RE)) {
      bump(counts, normalizeHex(match[1]), 8);
    }
  }
  return rankHexes(counts);
}

export function uniqueHexes(values: Array<string | null | undefined>, limit = 12): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const hex = normalizeHex(value);
    if (!hex || seen.has(hex)) {
      continue;
    }
    seen.add(hex);
    result.push(hex);
    if (result.length >= limit) {
      break;
    }
  }
  return result;
}

export function emptySwatch(): ColorSwatch {
  return { hex: "#CCCCCC", name: "", usage: "" };
}

export function toSwatch(hex: string, name = "", usage = ""): ColorSwatch {
  return { hex: normalizeHex(hex) ?? hex, name, usage };
}

function rankHexes(counts: Map<string, number>): string[] {
  return [...counts.entries()]
    .filter(([hex]) => usableBrandColor(hex) || counts.get(hex)! >= 6)
    .sort((a, b) => {
      const aScore = a[1] + (isNeutral(a[0]) ? -4 : 0) + (isExtreme(a[0]) ? -6 : 0);
      const bScore = b[1] + (isNeutral(b[0]) ? -4 : 0) + (isExtreme(b[0]) ? -6 : 0);
      return bScore - aScore;
    })
    .map(([hex]) => hex)
    .slice(0, 16);
}

function usableBrandColor(hex: string): boolean {
  return !isExtreme(hex) && !isNeutral(hex);
}

function isNeutral(hex: string): boolean {
  const { r, g, b } = rgb(hex);
  return Math.max(r, g, b) - Math.min(r, g, b) < 16;
}

function isExtreme(hex: string): boolean {
  const { r, g, b } = rgb(hex);
  const lum = (r + g + b) / 3;
  return lum < 14 || lum > 242;
}

function rgb(hex: string): { r: number; g: number; b: number } {
  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
  };
}

function toHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

function clampByte(value: string): number {
  return Math.min(255, Math.max(0, Number.parseInt(value, 10) || 0));
}

function bump(counts: Map<string, number>, hex: string | null, weight: number) {
  if (!hex) {
    return;
  }
  counts.set(hex, (counts.get(hex) ?? 0) + weight);
}
