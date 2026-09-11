import { AppHeader } from "@/components/layout/app-header";
import { ProjectOnboardingForm } from "@/components/projects/project-onboarding-form";

export default function NewProjectPage() {
  return (
    <>
      <AppHeader title="Nieuw project" subtitle="Leg de stem vast voordat je content maakt." />
      <main className="mx-auto w-full max-w-2xl px-6 py-8">
        <div className="rounded-2xl bg-card p-6 ring-1 ring-foreground/10">
          <ProjectOnboardingForm />
        </div>
      </main>
    </>
  );
}
