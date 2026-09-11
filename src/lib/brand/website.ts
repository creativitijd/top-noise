export async function fetchWebsiteContext(url: string): Promise<string> {
  const parsed = new URL(url);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Alleen http(s)-websites zijn toegestaan.");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(parsed.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "TopNoiseBrandAnalysis/0.3 (+https://top-noise.com)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!response.ok) {
      throw new Error(`Website gaf ${response.status} terug.`);
    }
    const html = await response.text();
    return htmlToContext(html, parsed.toString());
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Website reageerde te traag.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function htmlToContext(html: string, url: string): string {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim();
  const description = html
    .match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i)?.[1]
    ?.trim();
  const headings = [...html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)]
    .map((match) => stripTags(match[1]).slice(0, 120))
    .filter(Boolean)
    .slice(0, 20);
  const body = stripTags(
    html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ")
  ).slice(0, 10_000);

  return [
    `URL: ${url}`,
    title ? `Titel: ${title}` : null,
    description ? `Meta: ${description}` : null,
    headings.length > 0 ? `Koppen: ${headings.join(" | ")}` : null,
    `Inhoud: ${body}`,
  ]
    .filter(Boolean)
    .join("\n");
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
