import { z } from "zod";
import { completeChatJson } from "@/lib/ai/generate";
import {
  LEVEL_META,
  TOPIC_COPY,
  conversationStateSchema,
  topicsForLevel,
  type ConversationState,
  type StrategyLevel,
  type StrategyTopic,
} from "@/lib/automaat/model";

const turnSchema = z.object({
  reply: z.string().min(1),
  chips: z.array(z.string()).default([]),
  accept: z.boolean().default(false),
});

export function parseConversation(value: unknown): ConversationState {
  const parsed = conversationStateSchema.safeParse(value);
  return parsed.success ? parsed.data : conversationStateSchema.parse({});
}

export async function nextConversationTurn(input: {
  level: StrategyLevel;
  brandContext: string;
  snapshot?: string | null;
  conversation: ConversationState;
  answer: string;
}): Promise<ConversationState> {
  const topics = topicsForLevel(input.level);
  const topic = topics[Math.min(input.conversation.topicIndex, topics.length - 1)] as StrategyTopic;
  const answer = input.answer.trim();
  if (answer.length < 8) {
    return {
      ...input.conversation,
      messages: [
        ...input.conversation.messages,
        { role: "user", content: input.answer },
        {
          role: "assistant",
          content: "Zeg het in je eigen woorden, ook al is het kort. Een paar woorden extra helpen al.",
          chips: TOPIC_COPY[topic].chips,
          topic,
        },
      ],
    };
  }

  const notes = { ...input.conversation.notes, [topic]: joinNote(input.conversation.notes[topic], answer) };
  const messages: ConversationState["messages"] = [
    ...input.conversation.messages,
    { role: "user", content: answer, topic },
  ];

  const maxProbes = LEVEL_META[input.level].probes;
  const forceAccept = input.level === "eenvoudig" || input.conversation.probes >= maxProbes;

  let accept = forceAccept;
  let reply = "";
  let chips: string[] = [];

  if (!forceAccept) {
    const judged = await completeChatJson({
      systemPrompt: challengeSystemPrompt(input.level, topic, input.brandContext, input.snapshot),
      userContent: [
        `Huidig onderwerp: ${TOPIC_COPY[topic].title}`,
        `Criterium: ${TOPIC_COPY[topic].enough}`,
        `Eerdere notities:\n${formatNotes(notes)}`,
        `Laatste antwoord van de gebruiker:\n${answer}`,
      ].join("\n\n"),
      temperature: 0.35,
    });
    const parsed = turnSchema.parse(judged);
    accept = parsed.accept;
    reply = parsed.reply.trim();
    chips = parsed.chips.slice(0, 4);
  }

  if (accept) {
    const nextIndex = input.conversation.topicIndex + 1;
    const done = nextIndex >= topics.length;
    if (done) {
      return {
        topicIndex: nextIndex,
        probes: 0,
        notes,
        done: true,
        messages: [
          ...messages,
          {
            role: "assistant",
            content:
              reply ||
              "Helder. Ik heb genoeg om een strategievoorstel te maken. Even geduld — ik zet pillars, KPI’s en maanden op een rij.",
            topic,
          },
        ],
      };
    }
    const nextTopic = topics[nextIndex];
    const copy = TOPIC_COPY[nextTopic];
    return {
      topicIndex: nextIndex,
      probes: 0,
      notes,
      done: false,
      messages: [
        ...messages,
        {
          role: "assistant",
          content: reply ? `${reply}\n\n${copy.question}` : copy.question,
          chips: copy.chips,
          topic: nextTopic,
        },
      ],
    };
  }

  return {
    ...input.conversation,
    probes: input.conversation.probes + 1,
    notes,
    messages: [
      ...messages,
      {
        role: "assistant",
        content: reply || "Kun je dat scherper maken? Wat is het concrete moment of getal?",
        chips: chips.length > 0 ? chips : TOPIC_COPY[topic].chips,
        topic,
      },
    ],
  };
}

function challengeSystemPrompt(
  level: StrategyLevel,
  topic: StrategyTopic,
  brandContext: string,
  snapshot?: string | null
): string {
  return `Je bent een senior marketeer in een strategiegesprek. Nederlands. Eén korte reactie.

Niveau: ${level}. Maximaal ${LEVEL_META[level].probes} keer doorvragen per onderwerp.
Onderwerp nu: ${TOPIC_COPY[topic].title}. Acceptatiecriterium: ${TOPIC_COPY[topic].enough}.

Merkcontext:
${brandContext || "Nog beperkt."}

${snapshot ? `Data-snapshot (niet live):\n${snapshot}` : "Geen GA/GSC-snapshot. Nulmetingen zijn schattingen."}

Regels:
- Vaag ("ondernemers 30-50", "meer naamsbekendheid") → accept false, stel één concretiserende vraag.
- Doel zonder getal → accept false.
- Als snapshot er is en het antwoord botst: toets het vriendelijk ("Je site trekt nu vooral X — klopt dat nog?").
- Goed genoeg → accept true. De reply mag een korte bevestiging zijn (1 zin), geen samenvatting van de hele strategie.
- Geen opsommingen van 8 bullets. Geen AI-clichés.

JSON:
{ "reply": "...", "chips": ["optie"], "accept": false }`;
}

function joinNote(previous: string | undefined, next: string): string {
  return previous ? `${previous}\n${next}` : next;
}

function formatNotes(notes: Record<string, string>): string {
  return Object.entries(notes)
    .map(([key, value]) => `- ${key}: ${value}`)
    .join("\n");
}
