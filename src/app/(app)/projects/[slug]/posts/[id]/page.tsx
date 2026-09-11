import { notFound, redirect } from "next/navigation";
import { PostEditor } from "@/components/posts/post-editor";
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
    <main className="mx-auto w-full max-w-6xl px-6 py-8">
      <PostEditor
        projectId={project.id}
        post={post}
        targets={targets ?? []}
        media={media ?? []}
      />
    </main>
  );
}
