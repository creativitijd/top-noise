import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { AppShell, ProjectSidebar } from "@/components/layout/app-shell";
import { getAuth, getProjectBySlug } from "@/lib/auth/session";
import { brandProgress } from "@/lib/brand/completeness";

export const dynamic = "force-dynamic";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const auth = await getAuth();
  if (!auth) {
    redirect("/login");
  }
  const { slug } = await params;
  const project = await getProjectBySlug(auth.supabase, slug);
  if (!project) {
    notFound();
  }

  const [{ data: projects }, { data: posts }, { data: pillars }] = await Promise.all([
    auth.supabase.from("projects").select("name, slug, industry").order("updated_at", { ascending: false }),
    auth.supabase.from("posts").select("status").eq("project_id", project.id),
    auth.supabase.from("content_pillars").select("id").eq("project_id", project.id),
  ]);

  const storedAnalysis = project.brand_analysis;
  const analysisRecord =
    storedAnalysis && typeof storedAnalysis === "object" && !Array.isArray(storedAnalysis)
      ? (storedAnalysis as {
          audiences?: unknown;
          writingSamples?: unknown;
          primaryColors?: unknown;
          supportingColors?: unknown;
          colorPalette?: unknown;
        })
      : null;
  const audienceCount = Array.isArray(analysisRecord?.audiences) ? analysisRecord.audiences.length : 0;
  const writingSampleCount = Array.isArray(analysisRecord?.writingSamples)
    ? analysisRecord.writingSamples.filter((sample) => typeof sample === "string" && sample.trim().length >= 24).length
    : 0;
  const colorCount =
    (Array.isArray(analysisRecord?.primaryColors) ? analysisRecord.primaryColors.length : 0) +
    (Array.isArray(analysisRecord?.supportingColors) ? analysisRecord.supportingColors.length : 0) +
    (Array.isArray(analysisRecord?.colorPalette) ? analysisRecord.colorPalette.length : 0);

  const brand = brandProgress({
    name: project.name,
    websiteUrl: project.website_url,
    industry: project.industry,
    toneOfVoice: project.tone_of_voice,
    targetAudience: project.target_audience,
    goals: project.goals,
    visualGuidelines: project.visual_guidelines,
    stylebookPath: project.stylebook_path,
    audienceCount,
    writingSampleCount,
    colorCount,
    pillarCount: (pillars ?? []).length,
  });

  const counts = {
    draft: (posts ?? []).filter((post) => post.status === "draft" || post.status === "rejected").length,
    scheduled: (posts ?? []).filter(
      (post) => post.status === "scheduled" || post.status === "publishing" || post.status === "approved"
    ).length,
    published: (posts ?? []).filter((post) => post.status === "published").length,
    brandDone: brand.done,
    brandTotal: brand.total,
  };

  return (
    <AppShell
      sidebar={
        <Suspense fallback={<aside className="min-h-[calc(100vh-44px)] rounded-3xl bg-[#1f1b18]" />}>
          <ProjectSidebar project={project} projects={projects ?? []} counts={counts} />
        </Suspense>
      }
    >
      {children}
    </AppShell>
  );
}
