"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from "date-fns";
import { nl } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { POST_STATUS_LABELS, type PostStatus } from "@/lib/platforms";
import type { Post } from "@/types/database";
import { CreatePostDialog } from "@/components/calendar/create-post-dialog";

const statusColor: Record<PostStatus, string> = {
  draft: "bg-muted text-foreground",
  approved: "bg-accent text-accent-foreground",
  scheduled: "bg-primary/15 text-primary",
  publishing: "bg-primary/15 text-primary",
  published: "bg-emerald-100 text-emerald-900",
  failed: "bg-destructive/15 text-destructive",
  rejected: "bg-muted text-muted-foreground",
};

export function MonthCalendar({
  projectId,
  projectSlug,
  posts,
}: {
  projectId: string;
  projectSlug: string;
  posts: Post[];
}) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [createDate, setCreateDate] = useState<string | null>(null);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const postsByDay = useMemo(() => {
    const map = new Map<string, Post[]>();
    for (const post of posts) {
      const key = format(new Date(post.scheduled_at), "yyyy-MM-dd");
      const list = map.get(key) ?? [];
      list.push(post);
      map.set(key, list);
    }
    return map;
  }, [posts]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm" onClick={() => setCursor((value) => addMonths(value, -1))}>
            <ChevronLeft />
          </Button>
          <h2 className="text-xl capitalize">{format(cursor, "MMMM yyyy", { locale: nl })}</h2>
          <Button variant="outline" size="icon-sm" onClick={() => setCursor((value) => addMonths(value, 1))}>
            <ChevronRight />
          </Button>
        </div>
        <Button onClick={() => setCreateDate(format(new Date(), "yyyy-MM-dd"))}>Nieuw bericht</Button>
      </div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-2xl bg-border ring-1 ring-foreground/10">
        {["ma", "di", "wo", "do", "vr", "za", "zo"].map((label) => (
          <div key={label} className="bg-muted px-3 py-2 text-xs font-medium uppercase tracking-wide">
            {label}
          </div>
        ))}
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const inMonth = day.getMonth() === cursor.getMonth();
          const dayPosts = postsByDay.get(key) ?? [];
          return (
            <button
              key={key}
              type="button"
              onClick={() => setCreateDate(key)}
              className={`min-h-28 bg-card p-2 text-left ${inMonth ? "" : "bg-muted/40 text-muted-foreground"}`}
            >
              <div className="mb-2 text-xs">{format(day, "d")}</div>
              <div className="space-y-1">
                {dayPosts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/projects/${projectSlug}/posts/${post.id}`}
                    onClick={(event) => event.stopPropagation()}
                    className="block"
                  >
                    <Badge className={`${statusColor[post.status]} max-w-full truncate`} variant="outline">
                      {post.topic}
                    </Badge>
                    <span className="sr-only">{POST_STATUS_LABELS[post.status]}</span>
                  </Link>
                ))}
              </div>
            </button>
          );
        })}
      </div>
      <CreatePostDialog
        projectId={projectId}
        projectSlug={projectSlug}
        date={createDate}
        onClose={() => setCreateDate(null)}
      />
    </div>
  );
}
