import { notFound, redirect } from "next/navigation";
import { PostEditor } from "@/components/posts/post-editor";
import { brandColorsFromStored } from "@/lib/ai/brand-analysis";
import { getAuth, getProjectBySlug } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const auth = await getAuth();
  if (!auth) {
    redirect("/login");
  }
  const { slug, id } = await params;
  const project = await getProjectBySlug(auth.supabase, slug);
  if (!project) {
    notFound();
  }
  const { data: post } = await auth.supabase.from("posts").select("*").eq("id", id).maybeSingle();
  if (!post || post.project_id !== project.id) {
    notFound();
  }
  const { data: targets } = await auth.supabase.from("post_targets").select("*").eq("post_id", post.id);
  const { data: media } = await auth.supabase.from("media").select("*").eq("post_id", post.id);

  return (
    <PostEditor
      projectId={project.id}
      projectName={project.name}
      projectSlug={project.slug}
      brandColors={brandColorsFromStored(project.brand_analysis)}
      post={post}
      targets={targets ?? []}
      media={media ?? []}
    />
  );
}
