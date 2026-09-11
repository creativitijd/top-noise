import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { AppShell, ProjectSidebar } from "@/components/layout/app-shell";
import { getAuth } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const auth = await getAuth();
  if (!auth) {
    redirect("/login");
  }

  const { data: projects } = await auth.supabase
    .from("projects")
    .select("*")
    .order("updated_at", { ascending: false });

  const list = projects ?? [];

  return (
    <AppShell
      sidebar={
        <Suspense fallback={<aside className="min-h-[calc(100vh-44px)] rounded-3xl bg-[#1f1b18]" />}>
          <ProjectSidebar projects={list.map(({ name, slug, industry }) => ({ name, slug, industry }))} />
        </Suspense>
      }
    >
      <main className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3 rounded-[22px] border border-[rgb(31_27_24_/_8%)] bg-white px-6 py-5">
          <div>
            <h1 className="text-[26px] font-semibold tracking-[-0.035em]">Projecten</h1>
            <p className="mt-1 text-sm text-[#635a52]">Elk merk of product krijgt een eigen stem, kalender en kanalen.</p>
          </div>
          <Link
            href="/projects/new"
            className="inline-flex items-center gap-2 rounded-full bg-[#4f8637] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#3f6b2b]"
          >
            <Plus className="size-4" />
            Nieuw project
          </Link>
        </div>
        {list.length === 0 ? (
          <div className="rounded-[22px] border border-[rgb(31_27_24_/_8%)] bg-white p-10 text-center">
            <h2 className="text-2xl font-semibold tracking-[-0.03em]">Nog geen merken</h2>
            <p className="mx-auto mt-2 max-w-md text-[#635a52]">
              Begin met het project dat je nu wilt laten groeien. Stem, pijlers en kanalen volgen in een korte onboarding.
            </p>
            <Link
              href="/projects/new"
              className="mt-6 inline-flex rounded-full bg-[#4f8637] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#3f6b2b]"
            >
              Eerste project aanmaken
            </Link>
          </div>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {list.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/projects/${project.slug}`}
                  className="block rounded-[22px] border border-[rgb(31_27_24_/_8%)] bg-white p-5 transition-colors hover:bg-[#f1f6e7]"
                >
                  <p className="text-xs font-semibold tracking-wide text-[#8b8079] uppercase">
                    {project.industry || "Merk"}
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">{project.name}</h2>
                  <p className="mt-2 line-clamp-2 text-sm text-[#635a52]">
                    {project.tone_of_voice || "Nog geen toon vastgelegd."}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </AppShell>
  );
}
