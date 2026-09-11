import { notFound, redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { ProjectNav } from "@/components/layout/project-nav";
import { getAuth, getProjectBySlug } from "@/lib/auth/session";

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

  return (
    <>
      <AppHeader
        title={project.name}
        subtitle={project.industry ?? "Merkproject"}
        actions={<ProjectNav slug={project.slug} />}
      />
      {children}
    </>
  );
}
