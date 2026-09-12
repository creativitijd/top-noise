"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Link2,
  LogOut,
  Pencil,
  Sparkles,
  Wand2,
} from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Project } from "@/types/database";

export function ProjectSidebar({
  project,
  projects,
  counts,
}: {
  project?: Project | null;
  projects: Pick<Project, "name" | "slug" | "industry">[];
  counts?: { draft: number; scheduled: number; published: number; brandDone?: number; brandTotal?: number };
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const filter = searchParams.get("filter");
  const base = project ? `/projects/${project.slug}` : "/projects";
  const brandIncomplete =
    typeof counts?.brandDone === "number" &&
    typeof counts.brandTotal === "number" &&
    counts.brandDone < counts.brandTotal;

  const links = project
    ? [
        {
          href: base,
          label: "Kalender",
          icon: Calendar,
          count: null,
          match: () =>
            (pathname === base && !filter) || pathname.startsWith(`${base}/posts/`),
        },
        {
          href: `${base}/automaat`,
          label: "Automaat",
          icon: Wand2,
          count: null,
          match: () => pathname.startsWith(`${base}/automaat`),
        },
        {
          href: `${base}?filter=draft`,
          label: "Concepten",
          icon: Pencil,
          count: counts?.draft,
          match: () => pathname === base && filter === "draft",
        },
        {
          href: `${base}?filter=scheduled`,
          label: "Gepland",
          icon: Clock,
          count: counts?.scheduled,
          match: () => pathname === base && filter === "scheduled",
        },
        {
          href: `${base}?filter=published`,
          label: "Gepubliceerd",
          icon: CheckCircle2,
          count: counts?.published,
          match: () => pathname === base && filter === "published",
        },
        {
          href: `${base}/analytics`,
          label: "Resultaten",
          icon: BarChart3,
          count: null,
          match: () => pathname.startsWith(`${base}/analytics`),
        },
        {
          href: `${base}/channels`,
          label: "Kanalen",
          icon: Link2,
          count: null,
          match: () => pathname.startsWith(`${base}/channels`),
        },
        {
          href: `${base}/settings`,
          label: "Merk",
          icon: Sparkles,
          count:
            typeof counts?.brandDone === "number" && typeof counts.brandTotal === "number"
              ? `${counts.brandDone}/${counts.brandTotal}`
              : null,
          match: () => pathname.startsWith(`${base}/settings`),
        },
      ]
    : [
        { href: "/projects", label: "Projecten", icon: Calendar, count: null, match: () => pathname === "/projects" },
        { href: "/projects/new", label: "Nieuw project", icon: Sparkles, count: null, match: () => pathname === "/projects/new" },
      ];

  async function signOut() {
    const supabase = createBrowserSupabase();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initial = (project?.name ?? "P").slice(0, 1).toUpperCase();

  return (
    <div className="flex min-h-[calc(100vh-44px)] flex-col gap-3 lg:sticky lg:top-[22px]">
      <BrandMark href="/projects" />
      <aside className="flex flex-1 flex-col gap-5 rounded-3xl bg-[#1f1b18] p-4 text-white">
        {project ? (
        <Link
          href="/projects"
          className="flex w-full items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.07] p-2.5 text-left hover:bg-white/12"
        >
          <span className="flex size-[30px] items-center justify-center rounded-[10px] bg-[#c2572c] text-[13px] font-bold">
            {initial}
          </span>
          <span className="min-w-0 truncate text-[13.5px] leading-tight font-semibold">{project.name}</span>
        </Link>
      ) : null}
      {projects.length > 1 && project ? (
        <div className="px-1">
          {projects
            .filter((item) => item.slug !== project.slug)
            .slice(0, 4)
            .map((item) => (
              <Link
                key={item.slug}
                href={`/projects/${item.slug}`}
                className="block truncate rounded-lg px-2 py-1 text-xs text-white/50 hover:text-white"
              >
                {item.name}
              </Link>
            ))}
        </div>
      ) : null}
      {projects.length > 0 && !project ? (
        <div className="flex flex-col gap-0.5 px-1">
          {projects.slice(0, 8).map((item) => (
            <Link
              key={item.slug}
              href={`/projects/${item.slug}`}
              className="truncate rounded-lg px-2 py-1.5 text-[13px] text-white/60 hover:text-white"
            >
              {item.name}
            </Link>
          ))}
        </div>
      ) : null}
      <nav className="flex flex-col gap-0.5">
        {links.map((link) => {
          const Icon = link.icon;
          const active = link.match();
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm",
                active ? "bg-white font-semibold text-[#1f1b18]" : "font-medium text-white/70 hover:bg-white/8 hover:text-white"
              )}
            >
              <Icon className="size-[17px]" />
              {link.label}
              {link.count != null ? (
                <span
                  className={cn(
                    "ml-auto text-[11.5px] font-semibold",
                    active
                      ? "text-[#1f1b18]/45"
                      : (link.label === "Gepland" && typeof link.count === "number" && link.count > 0) ||
                          (link.label === "Merk" && brandIncomplete)
                        ? "rounded-full bg-[#c2572c] px-1.5 py-0.5 text-white"
                        : "text-white/45"
                  )}
                >
                  {link.count}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto space-y-3">
        <div className="rounded-[18px] bg-white/8 p-4">
          <p className="font-[family-name:var(--font-heading)] text-base font-semibold tracking-[-0.02em]">
            Nog 6 dagen proef
          </p>
          <p className="mt-1 mb-3.5 text-[12.5px] text-white/60">Upgrade en hou je hele kalender.</p>
          <Link
            href="/login?tab=signup"
            className="block rounded-full bg-white py-2.5 text-center text-[13.5px] font-semibold text-[#1f1b18]"
          >
            Upgraden
          </Link>
        </div>
        <button
          type="button"
          onClick={() => void signOut()}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/55 hover:text-white"
        >
          <LogOut className="size-4" />
          Uitloggen
        </button>
      </div>
      </aside>
    </div>
  );
}

export function AppShell({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full bg-[#f5f5f4] p-[22px]">
      <div className="mx-auto grid max-w-[1440px] items-start gap-4 lg:grid-cols-[236px_minmax(0,1fr)]">
        {sidebar}
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
