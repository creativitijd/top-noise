"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { toast } from "sonner";
import { Check, Loader2, Send, Wand2, X } from "lucide-react";
import { GoogleDataSources } from "@/components/projects/google-data-sources";
import {
  AUTOMAAT_CHANNELS,
  LEVEL_META,
  STRATEGY_LEVELS,
  postsPerMonth,
  type AutomaatChannel,
  type StrategyDocument,
  type StrategyLevel,
  type StrategyRecord,
} from "@/lib/automaat/model";
import { PLATFORM_LABELS } from "@/lib/platforms";
import {
  COUNTRY_META,
  formatHolidayLine,
  holidayPlanForPeriod,
  projectMarket,
  REGION_META,
  type BeRegion,
  type MarketCountry,
} from "@/lib/holidays";
import { cn } from "@/lib/utils";

type Step = "setup" | "snapshot" | "chat" | "proposal" | "generate";

export function AutomaatWizard({
  projectId,
  projectSlug,
  connectedChannels,
  country,
  region,
  open,
  onClose,
  embedded = false,
}: {
  projectId: string;
  projectSlug: string;
  connectedChannels: string[];
  country?: string | null;
  region?: string | null;
  open: boolean;
  onClose: () => void;
  embedded?: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("setup");
  const [pending, setPending] = useState(false);
  const [draft, setDraft] = useState<StrategyRecord | null>(null);
  const [strategy, setStrategy] = useState<StrategyRecord | null>(null);
  const [proposal, setProposal] = useState<StrategyDocument | null>(null);
  const [answer, setAnswer] = useState("");
  const [monthIndex, setMonthIndex] = useState(0);
  const [level, setLevel] = useState<StrategyLevel>("normaal");
  const [periodMonths, setPeriodMonths] = useState<3 | 6 | 9>(3);
  const [startsOn, setStartsOn] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [channels, setChannels] = useState<AutomaatChannel[]>(() => {
    const connected = AUTOMAAT_CHANNELS.filter((channel) => connectedChannels.includes(channel));
    return connected.length > 0 ? [...connected] : [...AUTOMAAT_CHANNELS];
  });
  const [result, setResult] = useState<{ created: number; written: number } | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const openRef = useRef(open);
  openRef.current = open;

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(`automaat-setup-${projectId}`);
      if (!raw) {
        return;
      }
      const saved = JSON.parse(raw) as {
        level?: StrategyLevel;
        periodMonths?: 3 | 6 | 9;
        startsOn?: string;
        channels?: AutomaatChannel[];
      };
      if (saved.level) {
        setLevel(saved.level);
      }
      if (saved.periodMonths === 3 || saved.periodMonths === 6 || saved.periodMonths === 9) {
        setPeriodMonths(saved.periodMonths);
      }
      if (saved.startsOn) {
        setStartsOn(saved.startsOn);
      }
      if (saved.channels && saved.channels.length > 0) {
        setChannels(saved.channels);
      }
    } catch {
      /* ignore corrupt setup cache */
    }
  }, [projectId]);

  useEffect(() => {
    window.sessionStorage.setItem(
      `automaat-setup-${projectId}`,
      JSON.stringify({ level, periodMonths, startsOn, channels })
    );
  }, [channels, level, periodMonths, projectId, startsOn]);

  useEffect(() => {
    if (open) {
      return;
    }
    setStep("setup");
    setPending(false);
    setStrategy(null);
    setProposal(null);
    setAnswer("");
    setMonthIndex(0);
    setResult(null);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (!embedded) {
      window.document.body.style.overflow = "hidden";
    }
    fetch(`/api/strategies?projectId=${projectId}`)
      .then(async (response) => {
        const payload = (await response.json()) as { strategy?: StrategyRecord | null; error?: string };
        if (!response.ok) {
          throw new Error(payload.error ?? "Strategie laden mislukt.");
        }
        setDraft(payload.strategy ?? null);
      })
      .catch((error: unknown) => {
        toast.error(error instanceof Error ? error.message : "Strategie laden mislukt.");
      });
    return () => {
      if (!embedded) {
        window.document.body.style.overflow = "";
      }
    };
  }, [embedded, open, projectId]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [strategy?.conversation.messages.length, step]);

  if (!open) {
    return null;
  }

  function close() {
    if (pending) {
      return;
    }
    onClose();
  }

  function resumeDraft() {
    if (!draft) {
      return;
    }
    setStrategy(draft);
    setProposal(draft.document.pillars.length > 0 ? draft.document : null);
    setLevel(draft.level);
    if (draft.conversation.done && draft.document.pillars.length > 0) {
      setStep("proposal");
    } else if (draft.document.pillars.length > 0) {
      setStep("chat");
    } else {
      setPending(true);
      setStep("snapshot");
      void propose(draft.id)
        .catch((error: unknown) => {
          toast.error(error instanceof Error ? error.message : "Draft maken mislukt.");
          setStep("setup");
        })
        .finally(() => setPending(false));
    }
  }

  async function start() {
    if (channels.length === 0) {
      toast.error("Kies minstens één kanaal.");
      return;
    }
    setPending(true);
    setStep("snapshot");
    try {
      const payload = await postJson<{ strategy: StrategyRecord }>("/api/strategies", {
        projectId,
        level,
        periodMonths,
        channels,
        startsOn,
      });
      setStrategy(payload.strategy);
      setProposal(payload.strategy.document.pillars.length > 0 ? payload.strategy.document : null);
      setStep("chat");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Starten mislukt.");
      setStep("setup");
    } finally {
      setPending(false);
    }
  }

  async function send(text: string) {
    const value = text.trim();
    if (!strategy || pending || !value) {
      return;
    }
    setPending(true);
    setAnswer("");
    try {
      const payload = await postJson<{ strategy: StrategyRecord }>(`/api/strategies/${strategy.id}/turn`, {
        answer: value,
      });
      setStrategy(payload.strategy);
      if (payload.strategy.document.pillars.length > 0) {
        setProposal(payload.strategy.document);
      }
      if (payload.strategy.conversation.done) {
        setProposal(payload.strategy.document);
        setMonthIndex(0);
        setStep("proposal");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Antwoord versturen mislukt.");
    } finally {
      setPending(false);
    }
  }

  async function propose(id: string) {
    setPending(true);
    const payload = await postJson<{ strategy: StrategyRecord }>(`/api/strategies/${id}/propose`, {});
    setStrategy(payload.strategy);
    setProposal(payload.strategy.document.pillars.length > 0 ? payload.strategy.document : null);
    setMonthIndex(0);
    setStep(payload.strategy.conversation.done ? "proposal" : "chat");
  }

  async function saveProposal(next: StrategyDocument, confirmMonth?: string) {
    if (!strategy) {
      return;
    }
    setProposal(next);
    const payload = await postJson<{ strategy: StrategyRecord }>(
      `/api/strategies/${strategy.id}`,
      { document: next, confirmMonth },
      "PATCH"
    );
    setStrategy(payload.strategy);
    setProposal(payload.strategy.document);
  }

  async function generate() {
    if (!strategy || !proposal) {
      return;
    }
    setStep("generate");
    setPending(true);
    try {
      const payload = await postJson<{ strategy: StrategyRecord; created: number; written: number }>(
        `/api/strategies/${strategy.id}/generate`,
        { document: proposal }
      );
      setResult({ created: payload.created, written: payload.written });
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kalender genereren mislukt.");
      setStep("proposal");
    } finally {
      setPending(false);
    }
  }

  const writtenCount = postsPerMonth(strategy?.level ?? level);
  const months = proposal?.monthly_focus ?? [];
  const uitgebreidPending =
    (strategy?.level ?? level) === "uitgebreid" && months.some((item) => !item.confirmed);
  const market = projectMarket({ country, region });

  return (
    <div
      className={cn(
        "flex flex-col bg-[#f5f5f4] text-[#1f1b18]",
        embedded
          ? "min-h-[calc(100vh-44px)] overflow-hidden rounded-[24px] border border-[rgb(31_27_24_/_8%)]"
          : "fixed inset-0 z-50"
      )}
    >
      <header className="flex items-center gap-3 border-b border-[rgb(31_27_24_/_8%)] px-5 py-3.5">
        <span className="flex size-9 items-center justify-center rounded-full bg-[#1f1b18] text-white">
          <Wand2 className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="font-[family-name:var(--font-heading)] text-[18px] font-semibold tracking-[-0.03em]">
            Automaat
          </p>
          <p className="text-[12.5px] text-[#8b8079]">{stepLabel(step)}</p>
        </div>
        <button
          type="button"
          onClick={close}
          className="ml-auto flex size-9 items-center justify-center rounded-full border border-[rgb(31_27_24_/_14%)] text-[#635a52] hover:bg-white"
          aria-label="Sluiten"
        >
          <X className="size-4" />
        </button>
      </header>

      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto">
        {step === "setup" ? (
          <SetupStep
            projectId={projectId}
            projectSlug={projectSlug}
            draft={draft}
            level={level}
            periodMonths={periodMonths}
            startsOn={startsOn}
            channels={channels}
            connectedChannels={connectedChannels}
            country={market.country}
            region={market.region}
            pending={pending}
            onResume={resumeDraft}
            onLevel={setLevel}
            onPeriod={setPeriodMonths}
            onStartsOn={setStartsOn}
            onChannels={setChannels}
            onStart={() => void start()}
          />
        ) : null}

        {step === "snapshot" ? (
          <div className="mx-auto flex max-w-[520px] flex-col items-center gap-3 px-5 py-24 text-center">
            <Loader2 className="size-8 animate-spin text-[#4f8637]" />
            <h2 className="font-[family-name:var(--font-heading)] text-[24px] font-semibold tracking-[-0.03em]">
              Ik maak een eerste draft uit je website-analyse
            </h2>
            <p className="text-sm text-[#635a52]">
              Daarna toets ik hem met ja/nee, zodat hij bij jouw wensen blijft passen.
            </p>
          </div>
        ) : null}

        {step === "chat" && strategy ? (
          <div className="mx-auto flex w-full max-w-[680px] flex-col gap-4 px-5 py-8 pb-36">
            {strategy.document.pillars.length > 0 ? <DraftSummary document={strategy.document} /> : null}
            {strategy.conversation.messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={cn(
                  "max-w-[85%] rounded-[22px] px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap",
                  message.role === "assistant" ? "bg-white" : "ml-auto bg-[#1f1b18] text-white"
                )}
              >
                {message.content}
              </div>
            ))}
            {pending ? (
              <div className="flex items-center gap-2 text-sm text-[#8b8079]">
                <Loader2 className="size-4 animate-spin" />
                Even nadenken…
              </div>
            ) : null}
          </div>
        ) : null}

        {step === "proposal" && proposal ? (
          <ProposalStep
            proposal={proposal}
            level={strategy?.level ?? level}
            writtenCount={writtenCount}
            monthIndex={monthIndex}
            onProposal={setProposal}
            onMonthIndex={setMonthIndex}
            onConfirmMonth={(next, month) => {
              void saveProposal(next, month).catch((error: unknown) => {
                toast.error(error instanceof Error ? error.message : "Opslaan mislukt.");
              });
            }}
          />
        ) : null}

        {step === "generate" ? (
          <div className="mx-auto flex max-w-[520px] flex-col items-center gap-3 px-5 py-24 text-center">
            {result ? (
              <>
                <span className="flex size-12 items-center justify-center rounded-full bg-[#f1f6e7] text-[#4f8637]">
                  <Check className="size-6" />
                </span>
                <h2 className="font-[family-name:var(--font-heading)] text-[24px] font-semibold tracking-[-0.03em]">
                  Kalender staat klaar
                </h2>
                <p className="text-sm text-[#635a52]">
                  {result.written} posts uitgeschreven, {result.created} concepten in totaal. Ze wachten in de
                  kalender op jouw goedkeuring.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    router.push(`/projects/${projectSlug}`);
                    router.refresh();
                  }}
                  className="mt-2 rounded-full bg-[#4f8637] px-5 py-3 text-sm font-semibold text-white"
                >
                  Naar de kalender
                </button>
              </>
            ) : (
              <>
                <Loader2 className="size-8 animate-spin text-[#4f8637]" />
                <h2 className="font-[family-name:var(--font-heading)] text-[24px] font-semibold tracking-[-0.03em]">
                  Ik plan de kalender
                </h2>
                <p className="text-sm text-[#635a52]">
                  Eerste maand voluit, daarna onderwerpen. Dit kan een minuut duren.
                </p>
              </>
            )}
          </div>
        ) : null}
      </div>

      {step === "chat" && strategy && !strategy.conversation.done ? (
        <div className="border-t border-[rgb(31_27_24_/_8%)] bg-[#f5f5f4] px-5 py-4">
          <div className="mx-auto flex w-full max-w-[680px] flex-col gap-3">
            {strategy.conversation.awaitingCorrection ? (
              <form
                className="flex items-end gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void send(answer);
                }}
              >
                <textarea
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  rows={2}
                  placeholder="Wat moet er anders? Eén zin is genoeg."
                  className="min-h-[48px] flex-1 resize-none rounded-[18px] border border-[rgb(31_27_24_/_12%)] bg-white px-4 py-3 text-sm outline-none focus:border-[#1f1b18]"
                />
                <button
                  type="submit"
                  disabled={pending || answer.trim().length < 2}
                  className="flex size-12 items-center justify-center rounded-full bg-[#4f8637] text-white disabled:opacity-50"
                  aria-label="Versturen"
                >
                  <Send className="size-4" />
                </button>
              </form>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => void send("Ja")}
                  className="rounded-[18px] bg-[#4f8637] px-4 py-3.5 text-[15px] font-semibold text-white hover:bg-[#3f6b2b] disabled:opacity-50"
                >
                  Ja
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => void send("Nee")}
                  className="rounded-[18px] bg-white px-4 py-3.5 text-[15px] font-semibold text-[#1f1b18] ring-1 ring-[rgb(31_27_24_/_12%)] hover:bg-[#1f1b18] hover:text-white disabled:opacity-50"
                >
                  Nee
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {step === "proposal" && proposal ? (
        <div className="border-t border-[rgb(31_27_24_/_8%)] bg-[#f5f5f4] px-5 py-4">
          <div className="mx-auto flex w-full max-w-[800px] flex-wrap items-center gap-2">
            <p className="mr-auto text-[12.5px] text-[#8b8079]">
              {writtenCount} posts per maand · {strategy?.period_months ?? periodMonths} maanden
            </p>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                void saveProposal(proposal).catch((error: unknown) => {
                  toast.error(error instanceof Error ? error.message : "Opslaan mislukt.");
                });
              }}
              className="rounded-full border border-[rgb(31_27_24_/_14%)] bg-white px-4 py-2 text-sm font-semibold"
            >
              Wijzigingen bewaren
            </button>
            <button
              type="button"
              disabled={pending || uitgebreidPending}
              onClick={() => void generate()}
              className="rounded-full bg-[#4f8637] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {uitgebreidPending ? "Bevestig eerst elke maand" : "Kalender maken"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SetupStep({
  projectId,
  projectSlug,
  draft,
  level,
  periodMonths,
  startsOn,
  channels,
  connectedChannels,
  country,
  region,
  pending,
  onResume,
  onLevel,
  onPeriod,
  onStartsOn,
  onChannels,
  onStart,
}: {
  projectId: string;
  projectSlug: string;
  draft: StrategyRecord | null;
  level: StrategyLevel;
  periodMonths: 3 | 6 | 9;
  startsOn: string;
  channels: AutomaatChannel[];
  connectedChannels: string[];
  country: MarketCountry;
  region: BeRegion | null;
  pending: boolean;
  onResume: () => void;
  onLevel: (level: StrategyLevel) => void;
  onPeriod: (value: 3 | 6 | 9) => void;
  onStartsOn: (value: string) => void;
  onChannels: (value: AutomaatChannel[] | ((current: AutomaatChannel[]) => AutomaatChannel[])) => void;
  onStart: () => void;
}) {
  const plan = holidayPlanForPeriod({ startsOn, periodMonths, country, region });
  const marketLabel = plan.region ? `${COUNTRY_META[country].label} (${REGION_META[plan.region].label})` : COUNTRY_META[country].label;
  const holidayPreview = [...plan.moments, ...plan.closed].slice(0, 8).map(formatHolidayLine);
  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-7 px-5 py-8">
      {draft ? (
        <button
          type="button"
          onClick={onResume}
          className="rounded-[22px] border border-[rgb(79_134_55_/_28%)] bg-[#f1f6e7] px-5 py-4 text-left"
        >
          <span className="text-[12.5px] font-semibold tracking-[0.08em] text-[#3f6b2b] uppercase">
            Open concept
          </span>
          <p className="mt-1 font-[family-name:var(--font-heading)] text-[20px] font-semibold tracking-[-0.03em]">
            Ga verder waar je was
          </p>
          <p className="mt-1 text-sm text-[#54603f]">
            {LEVEL_META[draft.level].label} · {draft.period_months} maanden · gestart {draft.starts_on}
          </p>
        </button>
      ) : null}

      <section>
        <h2 className="mb-3 font-[family-name:var(--font-heading)] text-[22px] font-semibold tracking-[-0.03em]">
          Hoe scherp wil je de draft toetsen?
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {STRATEGY_LEVELS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onLevel(item)}
              className={cn(
                "rounded-[22px] border px-4 py-4 text-left",
                level === item
                  ? "border-[#1f1b18] bg-white shadow-[0_10px_30px_rgb(31_27_24_/_6%)]"
                  : "border-[rgb(31_27_24_/_10%)] bg-white/70 hover:bg-white"
              )}
            >
              <span className="block font-[family-name:var(--font-heading)] text-[18px] font-semibold">
                {LEVEL_META[item].label}
              </span>
              <span className="mt-0.5 block text-[12.5px] font-semibold text-[#4f8637]">
                {LEVEL_META[item].time}
              </span>
              <span className="mt-2 block text-[13px] leading-snug text-[#635a52]">{LEVEL_META[item].blurb}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-[family-name:var(--font-heading)] text-[22px] font-semibold tracking-[-0.03em]">
          Periode en start
        </h2>
        <div className="flex flex-wrap gap-2">
          {([3, 6, 9] as const).map((monthsCount) => (
            <button
              key={monthsCount}
              type="button"
              onClick={() => onPeriod(monthsCount)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-semibold",
                periodMonths === monthsCount ? "bg-[#1f1b18] text-white" : "bg-white text-[#635a52]"
              )}
            >
              {monthsCount} maanden
            </button>
          ))}
        </div>
        <label className="mt-4 block text-[13px] font-medium text-[#635a52]">
          Startdatum
          <input
            type="date"
            value={startsOn}
            onChange={(event) => onStartsOn(event.target.value)}
            className="mt-1.5 block h-10 w-full max-w-xs rounded-2xl border border-[rgb(31_27_24_/_14%)] bg-white px-3 text-sm"
          />
        </label>
      </section>

      <section className="rounded-[22px] border border-[rgb(31_27_24_/_8%)] bg-white px-5 py-4">
        <h2 className="font-[family-name:var(--font-heading)] text-[18px] font-semibold tracking-[-0.03em]">
          Feestdagen · {marketLabel}
        </h2>
        <p className="mt-1 text-sm text-[#635a52]">
          Land staat op Merk. Vrije dagen krijgen geen post; momenten zoals Sinterklaas of Black Friday wel.
        </p>
        {holidayPreview.length > 0 ? (
          <p className="mt-2 text-[13px] leading-relaxed text-[#54603f]">{holidayPreview.join(" · ")}</p>
        ) : (
          <p className="mt-2 text-[13px] text-[#8b8079]">Geen feestdagen in deze periode.</p>
        )}
        <a href={`/projects/${projectSlug}/settings`} className="mt-3 inline-block text-[12.5px] font-semibold text-[#4f8637]">
          Land of regio wijzigen
        </a>
      </section>

      <section>
        <h2 className="mb-3 font-[family-name:var(--font-heading)] text-[22px] font-semibold tracking-[-0.03em]">
          Kanalen
        </h2>
        <div className="flex flex-wrap gap-2">
          {AUTOMAAT_CHANNELS.map((channel) => {
            const connected = connectedChannels.includes(channel);
            const selected = channels.includes(channel);
            return (
              <button
                key={channel}
                type="button"
                onClick={() =>
                  onChannels((current) =>
                    selected ? current.filter((item) => item !== channel) : [...current, channel]
                  )
                }
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold",
                  selected ? "bg-[#1f1b18] text-white" : "bg-white text-[#635a52]"
                )}
              >
                {PLATFORM_LABELS[channel]}
                {!connected ? <span className="ml-1 text-[11px] font-medium opacity-70">niet gekoppeld</span> : null}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[12.5px] text-[#8b8079]">
          Niet gekoppeld mag. Posts komen als concept in de kalender; publiceren kan later.
        </p>
      </section>

      {level === "eenvoudig" ? null : (
        <section className="rounded-[22px] border border-[rgb(31_27_24_/_8%)] bg-white px-5 py-4">
          <h2 className="font-[family-name:var(--font-heading)] text-[18px] font-semibold tracking-[-0.03em]">
            Site-data (optioneel)
          </h2>
          <p className="mt-1 mb-3 text-sm text-[#635a52]">
            {level === "uitgebreid"
              ? "Bij uitgebreid is een nulmeting sterk aangeraden. Alleen lezen, geen testaccount: de koppeling blijft staan tot jij hem loskoppelt."
              : "Koppel GA4 of Search Console voor een echte nulmeting. Overslaan kan altijd."}
          </p>
          <GoogleDataSources
            projectId={projectId}
            projectSlug={projectSlug}
            compact
            returnPath={`/projects/${projectSlug}/automaat`}
          />
        </section>
      )}

      <button
        type="button"
        onClick={onStart}
        disabled={pending}
        className="inline-flex w-fit items-center gap-2 rounded-full bg-[#4f8637] px-5 py-3 text-sm font-semibold text-white hover:bg-[#3f6b2b] disabled:opacity-60"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
        Draft maken
      </button>
    </div>
  );
}

function ProposalStep({
  proposal,
  level,
  writtenCount,
  monthIndex,
  onProposal,
  onMonthIndex,
  onConfirmMonth,
}: {
  proposal: StrategyDocument;
  level: StrategyLevel;
  writtenCount: number;
  monthIndex: number;
  onProposal: (value: StrategyDocument) => void;
  onMonthIndex: (value: number | ((index: number) => number)) => void;
  onConfirmMonth: (next: StrategyDocument, month: string) => void;
}) {
  const months = proposal.monthly_focus;
  const currentMonth = months[monthIndex];

  return (
    <div className="mx-auto flex w-full max-w-[800px] flex-col gap-5 px-5 py-8 pb-36">
      <div>
        <h2 className="font-[family-name:var(--font-heading)] text-[26px] font-semibold tracking-[-0.035em]">
          Voorstel
        </h2>
        <p className="mt-1 text-sm text-[#635a52]">
          Draft uit je website-analyse, bijgestuurd met ja/nee. Stuur bij wat nog scheef zit. Eerste maand schrijf ik
          voluit ({writtenCount} posts), de rest als onderwerp-concept.
        </p>
      </div>

      <Card title="Positionering">
        <Field
          label="Voor wie"
          value={proposal.positioning.for_whom}
          onChange={(value) =>
            onProposal({ ...proposal, positioning: { ...proposal.positioning, for_whom: value } })
          }
        />
        <Field
          label="Tegen welk alternatief"
          value={proposal.positioning.against_alternative}
          onChange={(value) =>
            onProposal({
              ...proposal,
              positioning: { ...proposal.positioning, against_alternative: value },
            })
          }
        />
        <Field
          label="Waarom nu"
          value={proposal.positioning.why_now}
          onChange={(value) =>
            onProposal({ ...proposal, positioning: { ...proposal.positioning, why_now: value } })
          }
        />
      </Card>

      <Card title="Doelgroep">
        <Field
          label="Moment van behoefte"
          value={proposal.audience.moment_of_need}
          onChange={(value) =>
            onProposal({ ...proposal, audience: { ...proposal.audience, moment_of_need: value } })
          }
        />
      </Card>

      <Card title="Content pillars">
        {proposal.pillars.map((pillar, index) => (
          <div
            key={pillar.id}
            className="grid gap-2 border-t border-[rgb(31_27_24_/_6%)] pt-3 first:border-0 first:pt-0 sm:grid-cols-[1fr_88px]"
          >
            <Field
              label={`Pillar ${index + 1}`}
              value={pillar.name}
              onChange={(value) =>
                onProposal({
                  ...proposal,
                  pillars: proposal.pillars.map((item) => (item.id === pillar.id ? { ...item, name: value } : item)),
                })
              }
            />
            <Field
              label="Aandeel %"
              value={String(pillar.share_pct)}
              onChange={(value) =>
                onProposal({
                  ...proposal,
                  pillars: proposal.pillars.map((item) =>
                    item.id === pillar.id ? { ...item, share_pct: Number.parseInt(value, 10) || 0 } : item
                  ),
                })
              }
            />
            <div className="sm:col-span-2">
              <Field
                label="Onderbouwing"
                value={pillar.rationale}
                onChange={(value) =>
                  onProposal({
                    ...proposal,
                    pillars: proposal.pillars.map((item) =>
                      item.id === pillar.id ? { ...item, rationale: value } : item
                    ),
                  })
                }
              />
            </div>
          </div>
        ))}
      </Card>

      {proposal.hypotheses.length > 0 ? (
        <Card title="Hypotheses">
          {proposal.hypotheses.map((item) => (
            <Field
              key={item.id}
              label={item.status}
              value={item.statement}
              onChange={(value) =>
                onProposal({
                  ...proposal,
                  hypotheses: proposal.hypotheses.map((row) =>
                    row.id === item.id ? { ...row, statement: value } : row
                  ),
                })
              }
            />
          ))}
        </Card>
      ) : null}

      {proposal.kpis.length > 0 ? (
        <Card title="KPI’s">
          {proposal.kpis.map((kpi, index) => (
            <div key={`${kpi.metric}-${index}`} className="rounded-2xl bg-[#fafaf9] px-3 py-3">
              <Field
                label="Metric"
                value={kpi.metric}
                onChange={(value) =>
                  onProposal({
                    ...proposal,
                    kpis: proposal.kpis.map((row, rowIndex) =>
                      rowIndex === index ? { ...row, metric: value } : row
                    ),
                  })
                }
              />
              <p className="mt-2 text-[12.5px] text-[#8b8079]">
                Nulmeting {kpi.baseline ?? "—"} ·{" "}
                <span className="font-semibold text-[#b8562c]">
                  {kpi.baseline_source === "geschat" ? "schatting" : "geverifieerd"}
                </span>
                {kpi.target != null ? ` · doel ${kpi.target}` : ""}
              </p>
            </div>
          ))}
        </Card>
      ) : null}

      {proposal.season.moments.length + proposal.season.closed.length > 0 ? (
        <Card title="Feestdagen">
          <p className="text-sm leading-relaxed text-[#635a52]">
            {[...proposal.season.moments, ...proposal.season.closed].map(formatHolidayLine).join(" · ")}
          </p>
          <Field
            label="Aanpak"
            value={proposal.season.notes}
            onChange={(value) => onProposal({ ...proposal, season: { ...proposal.season, notes: value } })}
          />
        </Card>
      ) : null}

      <Card title="Maandzwaartepunten">
        {level === "uitgebreid" && currentMonth ? (
          <div className="rounded-2xl bg-[#f1f6e7] px-4 py-4">
            <p className="text-[12.5px] font-semibold tracking-[0.08em] text-[#3f6b2b] uppercase">
              Maand {monthIndex + 1} van {months.length}
            </p>
            <p className="mt-1 font-[family-name:var(--font-heading)] text-[20px] font-semibold capitalize">
              {monthLabel(currentMonth.month)}
            </p>
            <Field
              label="Focus"
              value={currentMonth.focus}
              onChange={(value) =>
                onProposal({
                  ...proposal,
                  monthly_focus: proposal.monthly_focus.map((item) =>
                    item.month === currentMonth.month ? { ...item, focus: value } : item
                  ),
                })
              }
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-full bg-[#4f8637] px-4 py-2 text-sm font-semibold text-white"
                onClick={() => {
                  const next = {
                    ...proposal,
                    monthly_focus: proposal.monthly_focus.map((item) =>
                      item.month === currentMonth.month ? { ...item, confirmed: true } : item
                    ),
                  };
                  onConfirmMonth(next, currentMonth.month);
                  onMonthIndex((index) => Math.min(index + 1, months.length - 1));
                }}
              >
                Klopt
              </button>
              {monthIndex > 0 ? (
                <button
                  type="button"
                  className="rounded-full bg-white px-4 py-2 text-sm font-semibold"
                  onClick={() => onMonthIndex((index) => Math.max(index - 1, 0))}
                >
                  Vorige maand
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          months.map((item) => (
            <Field
              key={item.month}
              label={monthLabel(item.month)}
              value={item.focus}
              onChange={(value) =>
                onProposal({
                  ...proposal,
                  monthly_focus: proposal.monthly_focus.map((row) =>
                    row.month === item.month ? { ...row, focus: value } : row
                  ),
                })
              }
            />
          ))
        )}
      </Card>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[22px] border border-[rgb(31_27_24_/_8%)] bg-white px-5 py-4">
      <h3 className="mb-3 font-[family-name:var(--font-heading)] text-[18px] font-semibold tracking-[-0.03em]">
        {title}
      </h3>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-[12.5px] font-semibold tracking-[0.04em] text-[#8b8079] uppercase">
      {label}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={2}
        className="mt-1.5 w-full resize-none rounded-2xl border border-[rgb(31_27_24_/_10%)] bg-[#fafaf9] px-3 py-2 text-[14px] font-medium tracking-normal text-[#1f1b18] normal-case outline-none focus:border-[#1f1b18]"
      />
    </label>
  );
}

function DraftSummary({ document }: { document: StrategyDocument }) {
  return (
    <section className="rounded-[22px] border border-[rgb(79_134_55_/_22%)] bg-[#f1f6e7] px-5 py-4">
      <p className="text-[12.5px] font-semibold tracking-[0.08em] text-[#3f6b2b] uppercase">Eerste draft</p>
      <p className="mt-2 text-[15px] leading-relaxed text-[#1f1b18]">
        Voor {document.positioning.for_whom || "—"}, niet {document.positioning.against_alternative || "—"}.
      </p>
      {document.pillars.length > 0 ? (
        <p className="mt-2 text-[13px] leading-snug text-[#54603f]">
          {document.pillars.map((pillar) => `${pillar.name} (${pillar.share_pct}%)`).join(" · ")}
        </p>
      ) : null}
    </section>
  );
}

function stepLabel(step: Step): string {
  if (step === "setup") {
    return "Setup";
  }
  if (step === "snapshot") {
    return "Eerste draft";
  }
  if (step === "chat") {
    return "Afstemmen";
  }
  if (step === "proposal") {
    return "Voorstel";
  }
  return "Kalender";
}

function monthLabel(month: string): string {
  try {
    return format(parseISO(`${month}-01`), "MMMM yyyy", { locale: nl });
  } catch {
    return month;
  }
}

async function postJson<T>(url: string, body: unknown, method = "POST"): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? "Verzoek mislukt.");
  }
  return payload;
}
