import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { buttonVariants } from "@/components/ui/button";
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

  return (
    <>
      <AppHeader
        title="Projecten"
        subtitle="Elk merk of product krijgt een eigen stem, kalender en kanalen."
        actions={
          <Link href="/projects/new" className={buttonVariants()}>
            <Plus data-icon="inline-start" />
            Nieuw project
          </Link>
        }
      />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-8">
        {!projects || projects.length === 0 ? (
          <div className="rounded-2xl bg-card p-10 text-center ring-1 ring-foreground/10">
            <h2 className="text-2xl">Nog geen merken</h2>
            <p className="mx-auto mt-2 max-w-md text-muted-foreground">
              Begin met het project dat je nu wilt laten groeien. Stem, pijlers en kanalen volgen in een
              korte onboarding.
            </p>
            <Link href="/projects/new" className={`${buttonVariants()} mt-6`}>
              Eerste project aanmaken
            </Link>
          </div>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {projects.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/projects/${project.slug}`}
                  className="block rounded-2xl bg-card p-5 ring-1 ring-foreground/10 transition-colors hover:bg-muted/40"
                >
                  <p className="text-xs tracking-wide text-muted-foreground uppercase">
                    {project.industry || "Merk"}
                  </p>
                  <h2 className="mt-1 text-2xl">{project.name}</h2>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                    {project.tone_of_voice || "Nog geen toon vastgelegd."}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
