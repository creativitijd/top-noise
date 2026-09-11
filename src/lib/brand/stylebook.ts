import { extractText } from "unpdf";
import type { ChatContentPart } from "@/lib/ai/generate";

const MAX_BYTES = 8 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export type StylebookInput = {
  text: string;
  images: ChatContentPart[];
};

export async function parseStylebook(file: File): Promise<StylebookInput> {
  if (file.size > MAX_BYTES) {
    throw new Error("Stylboek is groter dan 8 MB.");
  }

  const buffer = new Uint8Array(await file.arrayBuffer());
  const type = file.type || guessType(file.name);

  if (type === "application/pdf") {
    const extracted = await extractText(buffer, { mergePages: true });
    const text = extracted.text.slice(0, 20_000);
    if (!text.trim()) {
      throw new Error("Dit PDF-bestand bevat geen leesbare tekst. Upload ook een PNG of JPG van de kernpagina's.");
    }
    return { text: `Stylboek (${file.name}):\n${text}`, images: [] };
  }

  if (IMAGE_TYPES.has(type)) {
    const base64 = Buffer.from(buffer).toString("base64");
    return {
      text: `Stylboek-afbeelding: ${file.name}`,
      images: [{ type: "image_url", image_url: { url: `data:${type};base64,${base64}` } }],
    };
  }

  throw new Error("Upload een PDF, PNG, JPG of WebP.");
}

function guessType(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) {
    return "application/pdf";
  }
  if (lower.endsWith(".png")) {
    return "image/png";
  }
  if (lower.endsWith(".webp")) {
    return "image/webp";
  }
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  return "";
}
