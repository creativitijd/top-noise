import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuth, assertProjectAccess } from "@/lib/auth/session";
import { completeChatJson } from "@/lib/ai/generate";
import { buildRewriteSystemPrompt } from "@/lib/ai/prompts";
import { aiTellReasons, voiceFromStored } from "@/lib/ai/voice";
import { handleRouteError, jsonError, readJson } from "@/lib/http";
import { PLATFORM_LABELS, isPlatform } from "@/lib/platforms";

const schema = z.object({
  projectId: z.string().uuid(),
  platform: z.string(),
  content: z.string().min(1),
  instruction: z.enum(["rewrite", "shorter", "question", "warm", "zakelijk", "speels"]),
});

const resultSchema = z.object({
  content: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const auth = await getAuth();
    if (!auth) {
      return jsonError("Niet ingelogd.", 401);
    }
    const body = await readJson(request, schema);
    if (!isPlatform(body.platform)) {
      return jsonError("Onbekend platform.");
    }
    const project = await assertProjectAccess(auth.supabase, body.projectId);
    const voice = voiceFromStored(project.brand_analysis, project.tone_of_voice);

    const instructions: Record<typeof body.instruction, string> = {
      rewrite: "Herschrijf frisser en natuurlijker, in dezelfde lengte. Behoud de boodschap. Klinkt het als AI, dan is het fout.",
      shorter: "Maak de post duidelijk korter. Behoud de kern en de merkstem.",
      question: "Houd de post, maar eindig met één concrete vraag die bij dit merk past — geen geforceerde CTA.",
      warm: "Iets warmer en persoonlijker, zonder extra zoetigheid of brochuretaal. Blijf in de merkstem.",
      zakelijk: "Iets strakker, niet corporater of formeler dan de website zelf.",
      speels: "Iets lichter. Alleen een emoji als de merkstem dat ook zou doen.",
    };

    const parsed = await completeChatJson({
      systemPrompt: buildRewriteSystemPrompt({
        platformLabel: PLATFORM_LABELS[body.platform],
        instruction: instructions[body.instruction],
        voice,
      }),
      userContent: body.content,
      temperature: 0.55,
    });

    let result = resultSchema.parse(parsed);
    if (aiTellReasons(result.content).length > 0) {
      const retry = await completeChatJson({
        systemPrompt: buildRewriteSystemPrompt({
          platformLabel: PLATFORM_LABELS[body.platform],
          instruction:
            "De vorige versie klinkt te veel als AI. Herschrijf menselijker, dichter bij de voorbeeldzinnen van de website.",
          voice,
        }),
        userContent: result.content,
        temperature: 0.4,
      });
      result = resultSchema.parse(retry);
    }

    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
