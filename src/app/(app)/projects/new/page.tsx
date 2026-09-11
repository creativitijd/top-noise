import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AppShell, ProjectSidebar } from "@/components/layout/app-shell";
import { ProjectOnboardingForm } from "@/components/projects/project-onboarding-form";
import { getAuth } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  const auth = await getAuth();
  if (!auth) {
    redirect("/login");
  }
  const { data: projects } = await auth.supabase
    .from("projects")
    .select("name, slug, industry")
    .order("updated_at", { ascending: false });

  return (
    <AppShell
      sidebar={
        <Suspense fallback={<aside className="min-h-[calc(100vh-44px)] rounded-3xl bg-[#1f1b18]" />}>
          <ProjectSidebar projects={projects ?? []} />
        </Suspense>
      }
    >
      <main className="max-w-2xl rounded-[22px] border border-[rgb(31_27_24_/_8%)] bg-white p-6">
        <h1 className="text-[26px] font-semibold tracking-[-0.035em]">Nieuw project</h1>
        <p className="mt-1 mb-6 text-sm text-[#635a52]">
          Analyseer website en styleguide, of vul het merkprofiel zelf in.
        </p>
        <ProjectOnboardingForm />
      </main>
    </AppShell>
  );
}
