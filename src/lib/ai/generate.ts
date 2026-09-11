import { requiredEnv } from "@/lib/env";
import { generatedContentSchema, type GeneratedContent } from "@/lib/ai/prompts";

export type ChatContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export async function generateJsonContent(input: {
  systemPrompt: string;
  userPrompt: string;
}): Promise<GeneratedContent> {
  const parsed = await completeChatJson({
    systemPrompt: input.systemPrompt,
    userContent: input.userPrompt,
    model: process.env.AI_MODEL ?? "gpt-4o-mini",
    temperature: 0.85,
  });
  return generatedContentSchema.parse(parsed);
}

export async function completeChatJson(input: {
  systemPrompt: string;
  userContent: string | ChatContentPart[];
  model?: string;
  temperature?: number;
}): Promise<unknown> {
  const baseUrl = (process.env.AI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const apiKey = requiredEnv("AI_API_KEY");
  const model = input.model ?? process.env.AI_MODEL ?? "gpt-4o-mini";

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: input.temperature ?? 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: input.systemPrompt },
        { role: "user", content: input.userContent },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`AI-verzoek mislukt (${response.status}): ${detail.slice(0, 400)}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Leeg antwoord van het AI-model.");
  }

  return JSON.parse(content) as unknown;
}
