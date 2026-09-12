import { requiredEnv } from "@/lib/env";

const ANGLES = [
  "Wide, airy crop with clear focal point and breathing room.",
  "Closer crop on one object or gesture, still uncluttered.",
  "Warmer light and a slightly more festive, inviting mood.",
  "Calmer editorial light, quieter and more refined.",
];

export function buildImagePrompt(input: {
  topic: string;
  visualBrief: string;
  projectName: string;
  visualGuidelines?: string | null;
  brandColors: string[];
  angle?: string;
}): string {
  const colors =
    input.brandColors.length > 0
      ? `Brand colors to echo (do not add text or logos): ${input.brandColors.join(", ")}.`
      : null;

  return [
    `Create a square 1:1 social photo for the brand "${input.projectName}".`,
    `Topic: ${input.topic}.`,
    input.visualBrief ? `Visual brief: ${input.visualBrief}` : null,
    input.visualGuidelines ? `Brand visual guidelines: ${input.visualGuidelines}` : null,
    colors,
    input.angle,
    "Photorealistic unless the brief asks otherwise. Natural lighting, no collage, no mockup UI.",
    "No text, letters, watermarks, captions, logos or brand names in the image.",
    "No borders, frames or Instagram UI. Look like a real photograph or on-brand still life.",
  ]
    .filter(Boolean)
    .join(" ");
}

export async function generateImagePngs(prompt: string, count = 4): Promise<Buffer[]> {
  const collected: Buffer[] = [];
  let lastError: Error | null = null;
  try {
    collected.push(...(await requestImages(prompt, count)));
  } catch (error) {
    lastError = error instanceof Error ? error : new Error("Beeldgeneratie mislukt.");
    if (count <= 1) {
      throw lastError;
    }
  }

  if (collected.length >= count) {
    return collected.slice(0, count);
  }

  const missing = count - collected.length;
  const settled = await Promise.allSettled(
    Array.from({ length: missing }, (_, index) =>
      requestImages(`${prompt} ${ANGLES[collected.length + index] ?? `Variation ${collected.length + index + 1}.`}`, 1)
    )
  );
  for (const result of settled) {
    if (result.status === "fulfilled") {
      collected.push(...result.value);
    } else if (result.reason instanceof Error) {
      lastError = result.reason;
    }
  }
  if (collected.length === 0) {
    throw lastError ?? new Error("Beeldgeneratie mislukt.");
  }
  return collected.slice(0, count);
}

async function requestImages(prompt: string, n: number): Promise<Buffer[]> {
  const models = uniqueModels([
    process.env.AI_IMAGE_MODEL,
    "gpt-image-1",
    "gpt-image-1-mini",
    "dall-e-3",
  ]);

  let lastError: Error | null = null;
  for (const model of models) {
    try {
      return await requestImagesWithModel(prompt, n, model);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Beeldgeneratie mislukt.");
      if (!shouldTryNextModel(lastError.message)) {
        throw lastError;
      }
    }
  }
  throw lastError ?? new Error("Beeldgeneratie mislukt.");
}

async function requestImagesWithModel(prompt: string, n: number, model: string): Promise<Buffer[]> {
  const baseUrl = (process.env.AI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const apiKey = requiredEnv("AI_API_KEY");
  const gptImage = model.startsWith("gpt-image") || model.startsWith("chatgpt-image");

  const body: Record<string, unknown> = {
    model,
    prompt,
    size: "1024x1024",
    n: gptImage || model === "dall-e-2" ? n : 1,
  };
  if (gptImage) {
    body.quality = "medium";
    body.output_format = "png";
  } else {
    body.response_format = "b64_json";
    body.quality = "standard";
  }

  const response = await fetch(`${baseUrl}/images/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(friendlyImageError(response.status, raw));
  }

  const payload = JSON.parse(raw) as {
    data?: Array<{ b64_json?: string; url?: string }>;
  };
  const rows = payload.data ?? [];
  if (rows.length === 0) {
    throw new Error("Het model gaf geen beeld terug.");
  }

  const images: Buffer[] = [];
  for (const row of rows) {
    if (row.b64_json) {
      images.push(Buffer.from(row.b64_json, "base64"));
      continue;
    }
    if (row.url) {
      const file = await fetch(row.url);
      if (!file.ok) {
        throw new Error("Gegenereerd beeld kon niet worden opgehaald.");
      }
      images.push(Buffer.from(await file.arrayBuffer()));
    }
  }
  if (images.length === 0) {
    throw new Error("Het model gaf geen beeld terug.");
  }
  return images;
}

function uniqueModels(models: Array<string | undefined>): string[] {
  return [...new Set(models.filter((model): model is string => Boolean(model)))];
}

function shouldTryNextModel(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("model") ||
    lower.includes("not found") ||
    lower.includes("does not exist") ||
    lower.includes("unknown") ||
    lower.includes("retired") ||
    lower.includes("not available")
  );
}

function friendlyImageError(status: number, detail: string): string {
  const lower = detail.toLowerCase();
  if (status === 400 && (lower.includes("moderation") || lower.includes("safety") || lower.includes("rejected"))) {
    return "Dit beeld werd geweigerd. Pas de visuele brief aan en probeer opnieuw.";
  }
  if (status === 403 || lower.includes("verification") || lower.includes("organization")) {
    return "Beeldgeneratie vereist organisatieverificatie in OpenAI, of zet AI_IMAGE_MODEL.";
  }
  const parsed = (() => {
    try {
      return JSON.parse(detail) as { error?: { message?: string } };
    } catch {
      return null;
    }
  })();
  return parsed?.error?.message
    ? `Beeldgeneratie mislukt: ${parsed.error.message}`
    : `Beeldgeneratie mislukt (${status}).`;
}
