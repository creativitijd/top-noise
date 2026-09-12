import { extractColorsFromCss, uniqueHexes } from "@/lib/brand/colors";

export type WebsiteContext = {
  text: string;
  colors: string[];
  fonts: string[];
};

export async function fetchWebsiteContext(url: string): Promise<WebsiteContext> {
  const parsed = new URL(url);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Alleen http(s)-websites zijn toegestaan.");
  }

  const html = await fetchText(parsed.toString(), 12_000, "text/html,application/xhtml+xml");
  const stylesheetUrls = stylesheetHrefs(html, parsed).slice(0, 3);
  const sheets = await Promise.all(
    stylesheetUrls.map(async (href) => {
      try {
        return await fetchText(href, 5_000, "text/css,*/*;q=0.1");
      } catch {
        return "";
      }
    })
  );

  return htmlToContext(html, parsed.toString(), sheets.filter(Boolean));
}

function htmlToContext(html: string, url: string, stylesheets: string[]): WebsiteContext {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim();
  const description = html
    .match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i)?.[1]
    ?.trim();
  const themeColor =
    attr(html, /<meta[^>]+name=["']theme-color["'][^>]+content=["']([^"']+)/i) ??
    attr(html, /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']theme-color["']/i);
  const headings = [...html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)]
    .map((match) => stripTags(match[1]).slice(0, 120))
    .filter(Boolean)
    .slice(0, 20);
  const styleBlocks = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((match) => match[1]);
  const inlineStyles = [...html.matchAll(/\sstyle=["']([^"']+)["']/gi)].map((match) => match[1]);
  const css = [...styleBlocks, ...inlineStyles, ...stylesheets].join("\n");
  const colors = uniqueHexes([themeColor, ...extractColorsFromCss(css)], 12);
  const fonts = uniqueFonts([...fontsFromHtml(html), ...fontsFromCss(css)]);
  const body = stripTags(
    html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ")
  ).slice(0, 10_000);
  const candidates = extractVoiceCandidates(body);

  const text = [
    `URL: ${url}`,
    title ? `Titel: ${title}` : null,
    description ? `Meta: ${description}` : null,
    headings.length > 0 ? `Koppen: ${headings.join(" | ")}` : null,
    colors.length > 0 ? `Geobserveerde kleuren op de website: ${colors.join(", ")}` : null,
    fonts.length > 0 ? `Geobserveerde fonts: ${fonts.join(", ")}` : null,
    candidates.length > 0
      ? `Kandidaatzinnen (letterlijk van de site):\n${candidates.map((sentence) => `- ${sentence}`).join("\n")}`
      : null,
    `Inhoud: ${body}`,
  ]
    .filter(Boolean)
    .join("\n");

  return { text, colors, fonts };
}

export function extractVoiceCandidates(text: string): string[] {
  const skip =
    /cookie|privacy|inschrijv|newsletter|copyright|all rights|winkelwagen|log in|inloggen|menu|home|contact|voorwaarden/i;
  const seen = new Set<string>();
  const unique: string[] = [];
  const sentences = text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.replace(/^[-–•]\s*/, "").trim());

  for (const sentence of sentences) {
    if (sentence.length < 45 || sentence.length > 220) {
      continue;
    }
    if (skip.test(sentence)) {
      continue;
    }
    if ((sentence.match(/[|]|\//g) ?? []).length > 2) {
      continue;
    }
    const words = sentence.split(" ").length;
    if (words < 7 || words > 40) {
      continue;
    }
    const key = sentence.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(sentence);
    if (unique.length >= 12) {
      break;
    }
  }
  return unique;
}

async function fetchText(url: string, timeoutMs: number, accept: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "TopNoiseBrandAnalysis/0.3 (+https://top-noise.com)",
        Accept: accept,
      },
    });
    if (!response.ok) {
      throw new Error(`Website gaf ${response.status} terug.`);
    }
    const text = await response.text();
    return text.slice(0, 180_000);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Website reageerde te traag.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function stylesheetHrefs(html: string, base: URL): string[] {
  const hrefs: string[] = [];
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = match[0];
    if (!/rel=["'][^"']*stylesheet/i.test(tag)) {
      continue;
    }
    const href = tag.match(/href=["']([^"']+)["']/i)?.[1];
    if (!href || href.startsWith("data:")) {
      continue;
    }
    try {
      hrefs.push(new URL(href, base).toString());
    } catch {
      continue;
    }
  }
  return hrefs;
}

function fontsFromHtml(html: string): string[] {
  const fonts: string[] = [];
  for (const match of html.matchAll(/<link\b[^>]*href=["']([^"']*fonts\.googleapis\.com[^"']+)["']/gi)) {
    fonts.push(...fontsFromGoogleHref(match[1]));
  }
  for (const match of html.matchAll(/family=([^&"'#]+)/gi)) {
    fonts.push(...match[1].split("|").map((item) => decodeURIComponent(item.split(":")[0] ?? "").replace(/\+/g, " ")));
  }
  return fonts;
}

function fontsFromCss(css: string): string[] {
  const fonts: string[] = [];
  for (const match of css.matchAll(/font-family\s*:\s*([^;}{]+)/gi)) {
    const first = match[1]
      .split(",")
      .map((item) => item.trim().replace(/^["']|["']$/g, ""))
      .find((item) => item && !/^(inherit|initial|sans-serif|serif|monospace|system-ui|ui-sans-serif)$/i.test(item));
    if (first) {
      fonts.push(first);
    }
  }
  return fonts;
}

function fontsFromGoogleHref(href: string): string[] {
  try {
    const family = new URL(href, "https://fonts.googleapis.com").searchParams.get("family");
    if (!family) {
      return [];
    }
    return family.split("|").map((item) => item.split(":")[0]?.replace(/\+/g, " ").trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function uniqueFonts(fonts: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const font of fonts) {
    const name = font.replace(/\s+/g, " ").trim();
    const key = name.toLowerCase();
    if (!name || seen.has(key) || name.length > 48) {
      continue;
    }
    seen.add(key);
    result.push(name);
    if (result.length >= 6) {
      break;
    }
  }
  return result;
}

function attr(html: string, pattern: RegExp): string | undefined {
  return html.match(pattern)?.[1]?.trim();
}

function stripTags(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
