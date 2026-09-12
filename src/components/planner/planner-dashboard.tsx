"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  isWeekend,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { nl } from "date-fns/locale";
import { Check, ChevronDown, ChevronLeft, ChevronRight, Pencil, Plus, Search, Wand2 } from "lucide-react";
import { AutomaatWizard } from "@/components/automaat/automaat-wizard";
import { CreatePostDialog } from "@/components/calendar/create-post-dialog";
import { PLATFORM_LABELS, type Platform } from "@/lib/platforms";
import {
  matchesPlannerFilter,
  PLATFORM_CARD,
  PLATFORM_CHIP,
  primaryPlatform,
  type CalendarPost,
} from "@/lib/planner/style";
import { cn } from "@/lib/utils";
import type { ChannelPublic } from "@/types/database";

const WEEKDAY_LABELS = ["MA", "DI", "WO", "DO", "VR", "ZA", "ZO"];
const WEEK_HOURS = ["08:00", "10:00", "12:00", "17:00"];

export function PlannerDashboard({
  projectId,
  projectSlug,
  posts,
  channels,
  filter,
}: {
  projectId: string;
  projectSlug: string;
  posts: CalendarPost[];
  channels: Pick<ChannelPublic, "platform" | "status">[];
  filter: string | null;
}) {
  const [cursor, setCursor] = useState(() => new Date());
  const [view, setView] = useState<"week" | "month">("week");
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState<Platform | "all">("all");
  const [channelOpen, setChannelOpen] = useState(false);
  const [createDate, setCreateDate] = useState<string | null>(null);
  const [automaatOpen, setAutomaatOpen] = useState(false);

  const connected = channels.filter((channel) => channel.status === "connected");
  const now = new Date();

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return posts.filter((post) => {
      if (!matchesPlannerFilter(post.status, filter)) {
        return false;
      }
      if (platform !== "all" && !(post.post_targets ?? []).some((target) => target.platform === platform)) {
        return false;
      }
      if (!needle) {
        return true;
      }
      return [post.topic, post.title, post.explanation]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(needle));
    });
  }, [filter, platform, posts, query]);

  const monthPosts = posts.filter((post) => isSameMonth(new Date(post.scheduled_at), now));
  const pendingReview = monthPosts.filter((post) => post.status === "draft").length;
  const planned = monthPosts.filter((post) => post.status !== "rejected").length;
  const ready = monthPosts.filter(
    (post) => post.status === "scheduled" || post.status === "publishing" || post.status === "published"
  ).length;
  const fill = planned > 0 ? Math.round((ready / planned) * 100) : 0;
  const nextPost = posts
    .filter(
      (post) =>
        (post.status === "scheduled" || post.status === "publishing") && new Date(post.scheduled_at) >= now
    )
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))[0];

  const monthName = format(now, "MMMM", { locale: nl });
  const monthLabel = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  const weekDays = eachDayOfInterval({
    start: startOfWeek(cursor, { weekStartsOn: 1 }),
    end: endOfWeek(cursor, { weekStartsOn: 1 }),
  });
  const monthDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 }),
  });

  const postsByDay = useMemo(() => {
    const map = new Map<string, CalendarPost[]>();
    for (const post of filtered) {
      const key = format(new Date(post.scheduled_at), "yyyy-MM-dd");
      const list = map.get(key) ?? [];
      list.push(post);
      map.set(key, list);
    }
    return map;
  }, [filtered]);

  const calendarTitle = format(cursor, "MMMM yyyy", { locale: nl });
  const featuredId = nextPost?.id;

  function shift(delta: number) {
    setCursor((value) => (view === "week" ? addWeeks(value, delta) : addMonths(value, delta)));
  }

  return (
    <main className="flex min-w-0 flex-col gap-4">
      <div className="flex items-center gap-3.5 rounded-[20px] border border-[rgb(31_27_24_/_8%)] bg-white px-[18px] py-3">
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-[rgb(31_27_24_/_4.5%)] px-3.5 py-2">
          <Search className="size-4 shrink-0 text-[#8b8079]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Zoek een post, thema of kanaal…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-[#8b8079]"
          />
        </label>
        <span className="hidden text-[13px] font-medium text-[#8b8079] sm:inline">Publiceert naar</span>
        <div className="flex items-center">
          {(connected.length > 0 ? connected : [{ platform: "facebook" as const }, { platform: "instagram" as const }, { platform: "linkedin" as const }]).map(
            (channel, index) => {
              const chip = PLATFORM_CHIP[channel.platform];
              return (
                <span
                  key={`${channel.platform}-${index}`}
                  className={cn(
                    "flex size-[30px] items-center justify-center rounded-full border-2 border-white text-[11.5px] font-bold",
                    chip.bg,
                    chip.fg,
                    index > 0 && "-ml-2"
                  )}
                >
                  {chip.label}
                </span>
              );
            }
          )}
          <Link
            href={`/projects/${projectSlug}/channels`}
            className="-ml-2 flex size-[30px] items-center justify-center rounded-full border-2 border-white bg-[#1f1b18] text-sm font-semibold text-white"
          >
            +
          </Link>
        </div>
      </div>

      <div className="grid gap-3.5 xl:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
        <div className="relative overflow-hidden rounded-[22px] bg-[linear-gradient(105deg,#e4efd2,#f3f6e6_62%,#fbf1e8)] px-7 py-[26px]">
          <div className="absolute top-[-40px] right-[-30px] size-[220px] rounded-full bg-white/45" />
          <div className="absolute right-10 bottom-[-60px] size-[140px] rounded-full bg-[rgb(194_87_44_/_12%)]" />
          <div className="relative max-w-[30ch]">
            <h1 className="mb-2 text-[26px] leading-[1.08] font-semibold tracking-[-0.035em]">
              {planned === 0
                ? "Nog geen maandplan"
                : `${monthLabel} staat voor ${fill}% klaar`}
            </h1>
            <p className="mb-[18px] text-[14.5px] text-[#54603f]">
              {pendingReview > 0
                ? `Nog ${pendingReview} post${pendingReview === 1 ? "" : "s"} wachten op jouw goedkeuring. Daarna loopt de maand vanzelf.`
                : planned === 0
                  ? "Maak je eerste bericht, of laat Top Noise een maandplan voorstellen."
                  : "Alles wat gepland staat, kan vanzelf online."}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCreateDate(format(now, "yyyy-MM-dd"))}
                className="inline-flex items-center gap-2 rounded-full bg-[#4f8637] px-[18px] py-[11px] text-sm font-semibold text-white hover:bg-[#3f6b2b]"
              >
                <Plus className="size-[15px]" />
                Nieuw bericht
              </button>
              <button
                type="button"
                onClick={() => setAutomaatOpen(true)}
                className="inline-flex items-center gap-2 rounded-full bg-[#1f1b18] px-[18px] py-[11px] text-sm font-semibold text-white hover:bg-black"
              >
                <Wand2 className="size-[15px]" />
                Automaat
              </button>
              {pendingReview > 0 ? (
                <Link
                  href={`/projects/${projectSlug}?filter=draft`}
                  className="rounded-full bg-white px-[18px] py-[11px] text-sm font-semibold text-[#3f6b2b] hover:bg-[#f4f8ee]"
                >
                  {pendingReview} posts nakijken
                </Link>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3.5 rounded-[22px] border border-[rgb(31_27_24_/_8%)] bg-white px-[22px] py-5">
          <span className="text-[12.5px] font-semibold tracking-[0.1em] text-[#8b8079] uppercase">Deze maand</span>
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <span className="block font-[family-name:var(--font-heading)] text-[26px] leading-none font-semibold tracking-[-0.04em]">
                {planned}
              </span>
              <span className="text-[12.5px] text-[#8b8079]">posts gepland</span>
            </div>
            <div>
              <span className="block font-[family-name:var(--font-heading)] text-[26px] leading-none font-semibold tracking-[-0.04em] text-[#b8562c]">
                {pendingReview}
              </span>
              <span className="text-[12.5px] text-[#8b8079]">wachten op jou</span>
            </div>
          </div>
          <div>
            <div className="mb-1.5 flex justify-between text-[12.5px] text-[#8b8079]">
              <span>Maandplan gevuld</span>
              <span className="font-semibold text-[#1f1b18]">{fill}%</span>
            </div>
            <div className="h-[7px] overflow-hidden rounded-full bg-[rgb(31_27_24_/_8%)]">
              <span className="block h-full rounded-full bg-[#4f8637]" style={{ width: `${fill}%` }} />
            </div>
          </div>
          <div className="mt-auto flex items-center gap-2 border-t border-[rgb(31_27_24_/_8%)] pt-3.5">
            <span className="flex size-[26px] shrink-0 items-center justify-center rounded-[9px] bg-[#f1f6e7] text-[#4f8637]">
              <Check className="size-3.5" />
            </span>
            <span className="text-[12.5px] text-[#635a52]">
              {nextPost ? (
                <>
                  Volgende publicatie{" "}
                  <strong className="text-[#1f1b18]">
                    {format(new Date(nextPost.scheduled_at), "EEEE HH:mm", { locale: nl })}
                  </strong>
                </>
              ) : (
                "Nog geen publicatie gepland"
              )}
            </span>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[24px] border border-[rgb(31_27_24_/_8%)] bg-white">
        <div className="flex flex-wrap items-center gap-3 border-b border-[rgb(31_27_24_/_8%)] px-5 py-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => shift(-1)}
              className="flex size-[30px] items-center justify-center rounded-full border border-[rgb(31_27_24_/_14%)] text-[#635a52] hover:bg-[rgb(31_27_24_/_5%)]"
              aria-label="Vorige"
            >
              <ChevronLeft className="size-3.5" />
            </button>
            <span className="font-[family-name:var(--font-heading)] text-[21px] font-semibold tracking-[-0.035em] capitalize">
              {calendarTitle}
            </span>
            <button
              type="button"
              onClick={() => shift(1)}
              className="flex size-[30px] items-center justify-center rounded-full border border-[rgb(31_27_24_/_14%)] text-[#635a52] hover:bg-[rgb(31_27_24_/_5%)]"
              aria-label="Volgende"
            >
              <ChevronRight className="size-3.5" />
            </button>
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setChannelOpen((open) => !open)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[rgb(31_27_24_/_14%)] px-3.5 py-1.5 text-[13px] font-medium text-[#635a52] hover:bg-[rgb(31_27_24_/_5%)]"
            >
              {platform === "all" ? "Alle kanalen" : PLATFORM_LABELS[platform]}
              <ChevronDown className="size-3.5" />
            </button>
            {channelOpen ? (
              <div className="absolute top-full left-0 z-20 mt-1 min-w-40 rounded-2xl border border-[rgb(31_27_24_/_8%)] bg-white p-1 shadow-lg">
                <button
                  type="button"
                  className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => {
                    setPlatform("all");
                    setChannelOpen(false);
                  }}
                >
                  Alle kanalen
                </button>
                {(["facebook", "instagram", "linkedin", "wordpress"] as Platform[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => {
                      setPlatform(item);
                      setChannelOpen(false);
                    }}
                  >
                    {PLATFORM_LABELS[item]}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAutomaatOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[rgb(31_27_24_/_14%)] px-3.5 py-1.5 text-[13px] font-medium text-[#635a52] hover:bg-[rgb(31_27_24_/_5%)]"
            >
              <Wand2 className="size-3.5" />
              Automaat
            </button>
            <button
              type="button"
              onClick={() => setCursor(new Date())}
              className="rounded-full border border-[rgb(31_27_24_/_14%)] px-3.5 py-1.5 text-[13px] font-medium text-[#635a52] hover:bg-[rgb(31_27_24_/_5%)]"
            >
              Vandaag
            </button>
            <div className="flex rounded-full bg-[rgb(31_27_24_/_6%)] p-[3px]">
              <button
                type="button"
                onClick={() => setView("week")}
                className={cn(
                  "rounded-full px-[15px] py-1.5 text-[13px] font-semibold",
                  view === "week" ? "bg-[#1f1b18] text-white" : "text-[#635a52]"
                )}
              >
                Week
              </button>
              <button
                type="button"
                onClick={() => setView("month")}
                className={cn(
                  "rounded-full px-[15px] py-1.5 text-[13px] font-semibold",
                  view === "month" ? "bg-[#1f1b18] text-white" : "text-[#635a52]"
                )}
              >
                Maand
              </button>
            </div>
          </div>
        </div>

        {view === "week" ? (
          <WeekGrid
            days={weekDays}
            postsByDay={postsByDay}
            projectSlug={projectSlug}
            featuredId={featuredId}
            onCreate={(key) => setCreateDate(key)}
          />
        ) : (
          <MonthGrid
            days={monthDays}
            cursor={cursor}
            postsByDay={postsByDay}
            projectSlug={projectSlug}
            onCreate={(key) => setCreateDate(key)}
          />
        )}
      </div>

      <CreatePostDialog
        projectId={projectId}
        projectSlug={projectSlug}
        date={createDate}
        onClose={() => setCreateDate(null)}
      />
      <AutomaatWizard
        projectId={projectId}
        projectSlug={projectSlug}
        connectedChannels={connected.map((channel) => channel.platform)}
        open={automaatOpen}
        onClose={() => setAutomaatOpen(false)}
      />
    </main>
  );
}

function WeekGrid({
  days,
  postsByDay,
  projectSlug,
  featuredId,
  onCreate,
}: {
  days: Date[];
  postsByDay: Map<string, CalendarPost[]>;
  projectSlug: string;
  featuredId?: string;
  onCreate: (key: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[760px]">
        <div className="grid grid-cols-[64px_repeat(7,minmax(0,1fr))] border-b border-[rgb(31_27_24_/_8%)]">
          <span />
          {days.map((day) => {
            const weekend = isWeekend(day);
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "border-l border-[rgb(31_27_24_/_6%)] px-2 py-3 text-center",
                  weekend && "bg-[#fafaf9]"
                )}
              >
                <span className={cn("block text-[11px] font-semibold tracking-[0.08em]", weekend ? "text-[#c4bcb6]" : "text-[#aaa09a]")}>
                  {WEEKDAY_LABELS[day.getDay() === 0 ? 6 : day.getDay() - 1]}
                </span>
                <span
                  className={cn(
                    "mt-1 inline-flex size-[30px] items-center justify-center rounded-full font-[family-name:var(--font-heading)] text-[17px] font-semibold tracking-[-0.02em]",
                    isToday(day) && "bg-[#1f1b18] text-white",
                    weekend && !isToday(day) && "text-[#aaa09a]"
                  )}
                >
                  {format(day, "d")}
                </span>
              </div>
            );
          })}
        </div>
        <div className="grid min-h-[440px] grid-cols-[64px_repeat(7,minmax(0,1fr))]">
          <div className="flex flex-col border-r border-[rgb(31_27_24_/_6%)]">
            {WEEK_HOURS.map((hour) => (
              <span key={hour} className="h-[110px] pt-2 pr-2.5 text-right text-[11.5px] font-medium text-[#aaa09a]">
                {hour}
              </span>
            ))}
          </div>
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayPosts = postsByDay.get(key) ?? [];
            const weekend = isWeekend(day);
            return (
              <div
                key={key}
                className={cn(
                  "flex flex-col gap-2 border-l border-[rgb(31_27_24_/_6%)] p-2.5",
                  weekend && "bg-[#fafaf9]"
                )}
              >
                {dayPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    projectSlug={projectSlug}
                    featured={post.id === featuredId}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => onCreate(key)}
                  className="rounded-[14px] border border-dashed border-[rgb(31_27_24_/_16%)] px-2 py-2.5 text-center text-[11.5px] font-semibold text-[#aaa09a] hover:border-[#4f8637] hover:text-[#4f8637]"
                >
                  + post
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MonthGrid({
  days,
  cursor,
  postsByDay,
  projectSlug,
  onCreate,
}: {
  days: Date[];
  cursor: Date;
  postsByDay: Map<string, CalendarPost[]>;
  projectSlug: string;
  onCreate: (key: string) => void;
}) {
  return (
    <div>
      <div className="grid grid-cols-7 border-b border-[rgb(31_27_24_/_8%)]">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label} className="px-3.5 py-2.5 text-[11px] font-semibold tracking-[0.08em] text-[#aaa09a]">
            {label}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const inMonth = isSameMonth(day, cursor);
          const weekend = isWeekend(day);
          const dayPosts = postsByDay.get(key) ?? [];
          return (
            <button
              key={key}
              type="button"
              onClick={() => onCreate(key)}
              className={cn(
                "flex min-h-[104px] flex-col gap-1.5 border-t border-l border-[rgb(31_27_24_/_6%)] px-2.5 py-2 text-left",
                (!inMonth || weekend) && "bg-[#fafaf9]"
              )}
            >
              <span
                className={cn(
                  "text-xs font-semibold",
                  !inMonth && "text-[#c4bcb6]",
                  inMonth && isToday(day) && "text-[#4f8637]",
                  inMonth && !isToday(day) && "text-[#635a52]"
                )}
              >
                {format(day, "d")}
              </span>
              {dayPosts.slice(0, 3).map((post) => {
                const platform = primaryPlatform(post);
                const palette = platform ? PLATFORM_CARD[platform] : null;
                return (
                  <Link
                    key={post.id}
                    href={`/projects/${projectSlug}/posts/${post.id}`}
                    onClick={(event) => event.stopPropagation()}
                    className={cn(
                      "flex items-center gap-1.5 rounded-[9px] px-2 py-1 text-[11px] leading-tight font-semibold",
                      palette ? `${palette.monthBg} ${palette.monthFg}` : "bg-muted text-foreground"
                    )}
                  >
                    <span className={cn("size-1.5 shrink-0 rounded-full", palette?.dot ?? "bg-[#8b8079]")} />
                    <span className="truncate">{post.topic}</span>
                  </Link>
                );
              })}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PostCard({
  post,
  projectSlug,
  featured,
}: {
  post: CalendarPost;
  projectSlug: string;
  featured?: boolean;
}) {
  const platform = primaryPlatform(post);
  const palette = platform ? PLATFORM_CARD[platform] : null;
  const chip = platform ? PLATFORM_CHIP[platform] : null;
  const time = format(new Date(post.scheduled_at), "HH:mm");
  const image = post.media?.[0]?.public_url;

  return (
    <Link
      href={`/projects/${projectSlug}/posts/${post.id}`}
      className={cn(
        "rounded-[14px] p-2.5 hover:shadow-[0_10px_22px_-12px_rgb(31_27_24_/_50%)]",
        featured
          ? "border border-[rgb(31_27_24_/_10%)] bg-white shadow-[0_20px_38px_-20px_rgb(31_27_24_/_55%)]"
          : palette?.card ?? "border border-[rgb(31_27_24_/_8%)] bg-white"
      )}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="mb-2 h-[52px] w-full rounded-[9px] object-cover" />
      ) : featured ? (
        <span className="mb-2 block h-[74px] rounded-[9px] bg-[linear-gradient(135deg,#f3d9c6,#e9c3a6)]" />
      ) : null}
      <span className="mb-1.5 block text-[12.5px] leading-tight font-semibold">{post.topic}</span>
      {featured && post.explanation ? (
        <span className="mb-2 block text-[11.5px] leading-snug text-[#8b8079]">{post.explanation}</span>
      ) : null}
      <span className="flex items-center gap-1.5">
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold",
            featured ? "bg-[rgb(31_27_24_/_7%)] text-[#635a52]" : `${palette?.timeBg ?? "bg-muted"} ${palette?.timeFg ?? ""}`
          )}
        >
          {time}
        </span>
        {featured ? (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-[#1f1b18] px-2.5 py-1 text-[11px] font-semibold text-white">
            <Pencil className="size-[11px]" />
            Bewerk
          </span>
        ) : chip ? (
          <span
            className={cn(
              "ml-auto flex size-[17px] items-center justify-center rounded-full text-[9px] font-bold text-white",
              chip.badge
            )}
          >
            {chip.label}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
