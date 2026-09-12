import { completeChatJson } from "@/lib/ai/generate";
import {
  conversationStateSchema,
  strategyDocumentSchema,
  type ConversationState,
  type StrategyDocument,
  type StrategyLevel,
} from "@/lib/automaat/model";

const YES = /^(ja|klopt|oké|oke|ok|yes|akkoord|prima|goed)\b/i;
const NO = /^(nee|niet|no|fout|klopt niet)\b/i;

export type TuneQuestion = {
  id: string;
  topic: string;
  question: string;
};

export function parseConversation(value: unknown): ConversationState {
  const parsed = conversationStateSchema.safeParse(value);
  return parsed.success ? parsed.data : conversationStateSchema.parse({});
}

export function tuneQuestions(document: StrategyDocument, level: StrategyLevel): TuneQuestion[] {
  const questions: TuneQuestion[] = [];
  const pos = document.positioning;
  questions.push({
    id: "positioning",
    topic: "positioning",
    question: `Op de website lees ik: jullie zijn er voor ${orDash(pos.for_whom)}. Het alternatief waar je bewust niet voor kiest: ${orDash(pos.against_alternative)}. Klopt dat?`,
  });
  questions.push({
    id: "audience",
    topic: "audience",
    question: `Iemand heeft jullie nodig wanneer: ${orDash(document.audience.moment_of_need)}. Is dat het moment?`,
  });

  if (level !== "eenvoudig") {
    const kpi = document.kpis[0];
    questions.push({
      id: "goal",
      topic: "goal",
      question: kpi
        ? `Hoofd-KPI die ik voorstel: ${kpi.metric}, van ${kpi.baseline ?? "onbekend"} naar ${kpi.target ?? "een hoger getal"}${kpi.target_date ? ` vóór ${kpi.target_date}` : ""}. Klopt die koers?`
        : "Ik heb nog geen scherp getal. Is ‘meer aanvragen via social’ het doel voor deze periode?",
    });
    const rival = document.positioning.against_alternative || document.hypotheses[0]?.statement;
    questions.push({
      id: "competition",
      topic: "competition",
      question: rival
        ? `Tegenover het alternatief “${rival}” blijven jullie scherp. Klopt die vergelijking nog?`
        : "Klanten vergelijken jullie met een voor de hand liggend alternatief. Klopt het beeld uit de website nog?",
    });
  }

  if (document.pillars.length > 0) {
    questions.push({
      id: "pillars",
      topic: "pillars",
      question: `Content draait om: ${document.pillars.map((pillar) => `${pillar.name} (${pillar.share_pct}%)`).join(", ")}. Klopt die verdeling?`,
    });
  }

  const holidayBits = [
    ...document.season.moments.map((item) => item.name),
    ...document.season.closed.slice(0, 3).map((item) => item.name),
  ].filter(Boolean);
  if (level !== "eenvoudig" && holidayBits.length > 0) {
    questions.push({
      id: "holidays",
      topic: "holidays",
      question: `In deze periode vallen onder meer ${holidayBits.slice(0, 5).join(", ")}. Ik plan content rond die momenten, niet op vrije dagen. Klopt die aanpak?`,
    });
  }

  if (level === "uitgebreid" && pos.why_now) {
    questions.push({
      id: "why_now",
      topic: "positioning",
      question: `Waarom dit nu: ${pos.why_now}. Klopt die urgentie?`,
    });
  }

  return questions;
}

export function startTuneConversation(document: StrategyDocument, level: StrategyLevel): ConversationState {
  const questions = tuneQuestions(document, level);
  const first = questions[0];
  return {
    topicIndex: 0,
    probes: 0,
    notes: {},
    done: !first,
    awaitingCorrection: false,
    questions,
    messages: first
      ? [
          {
            role: "assistant",
            content: `Eerste draft staat. Ik toets hem in ja/nee, zodat hij bij jullie blijft passen.\n\n${first.question}`,
            chips: ["Ja", "Nee"],
            topic: first.topic,
          },
        ]
      : [],
  };
}

export async function nextTuneTurn(input: {
  level: StrategyLevel;
  brandContext: string;
  snapshot?: string | null;
  conversation: ConversationState;
  document: StrategyDocument;
  answer: string;
}): Promise<{ conversation: ConversationState; document: StrategyDocument }> {
  const questions =
    input.conversation.questions.length > 0
      ? input.conversation.questions
      : tuneQuestions(input.document, input.level);
  const conversation = { ...input.conversation, questions };
  const answer = input.answer.trim();
  if (!answer) {
    return { conversation, document: input.document };
  }

  const current = questions[Math.min(conversation.topicIndex, Math.max(questions.length - 1, 0))];
  if (!current || conversation.done) {
    return {
      conversation: { ...conversation, done: true },
      document: input.document,
    };
  }

  const messages = [...conversation.messages, { role: "user" as const, content: answer, topic: current.topic }];

  if (conversation.awaitingCorrection) {
    const document = await applyCorrection({
      document: input.document,
      topic: current.topic,
      correction: answer,
      brandContext: input.brandContext,
      snapshot: input.snapshot,
    });
    const refreshed = refreshQuestions(document, input.level, questions);
    return {
      document,
      conversation: advance(conversation, messages, refreshed, current.id, `Aangepast: ${answer}`),
    };
  }

  if (YES.test(answer)) {
    return {
      document: input.document,
      conversation: advance(conversation, messages, questions, current.id, "bevestigd"),
    };
  }

  if (NO.test(answer)) {
    return {
      document: input.document,
      conversation: {
        ...conversation,
        questions,
        awaitingCorrection: true,
        notes: { ...conversation.notes, [current.id]: joinNote(conversation.notes[current.id], "nee") },
        messages: [
          ...messages,
          {
            role: "assistant",
            content: "Wat moet er anders? Eén zin is genoeg.",
            topic: current.topic,
          },
        ],
      },
    };
  }

  const document = await applyCorrection({
    document: input.document,
    topic: current.topic,
    correction: answer,
    brandContext: input.brandContext,
    snapshot: input.snapshot,
  });
  const refreshed = refreshQuestions(document, input.level, questions);
  return {
    document,
    conversation: advance(conversation, messages, refreshed, current.id, answer),
  };
}

function advance(
  conversation: ConversationState,
  messages: ConversationState["messages"],
  questions: TuneQuestion[],
  questionId: string,
  note: string
): ConversationState {
  const nextIndex = conversation.topicIndex + 1;
  const notes = { ...conversation.notes, [questionId]: joinNote(conversation.notes[questionId], note) };
  if (nextIndex >= questions.length) {
    return {
      ...conversation,
      topicIndex: nextIndex,
      probes: 0,
      notes,
      questions,
      awaitingCorrection: false,
      done: true,
      messages: [
        ...messages,
        {
          role: "assistant",
          content: "Helder. De draft is bijgestuurd. Check hieronder of de kaart klopt, daarna plan ik de kalender.",
        },
      ],
    };
  }
  const next = questions[nextIndex];
  return {
    ...conversation,
    topicIndex: nextIndex,
    probes: 0,
    notes,
    questions,
    awaitingCorrection: false,
    done: false,
    messages: [
      ...messages,
      {
        role: "assistant",
        content: next.question,
        chips: ["Ja", "Nee"],
        topic: next.topic,
      },
    ],
  };
}

async function applyCorrection(input: {
  document: StrategyDocument;
  topic: string;
  correction: string;
  brandContext: string;
  snapshot?: string | null;
}): Promise<StrategyDocument> {
  const parsed = await completeChatJson({
    systemPrompt: `Je past een bestaande strategiekaart aan. Nederlands. Wijzig alleen wat de gebruiker corrigeert. Rest identiek laten.
Als het over feestdagen gaat: pas season.notes, season.moments of season.closed aan. Verzin geen extra data.

JSON: dezelfde vorm als het input-document.`,
    userContent: [
      `Onderdeel: ${input.topic}`,
      `Correctie van de gebruiker:\n${input.correction}`,
      input.brandContext ? `Merkprofiel:\n${input.brandContext}` : null,
      input.snapshot ? `Snapshot:\n${input.snapshot}` : null,
      `Huidige kaart:\n${JSON.stringify(input.document)}`,
    ]
      .filter(Boolean)
      .join("\n\n"),
    temperature: 0.25,
  });
  return strategyDocumentSchema.parse({ ...input.document, ...(parsed as object) });
}

function refreshQuestions(
  document: StrategyDocument,
  level: StrategyLevel,
  existing: TuneQuestion[]
): TuneQuestion[] {
  const next = new Map(tuneQuestions(document, level).map((question) => [question.id, question]));
  return existing.map((question) => next.get(question.id) ?? question);
}

function joinNote(previous: string | undefined, next: string): string {
  return previous ? `${previous}\n${next}` : next;
}

function orDash(value: string): string {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "—";
}
