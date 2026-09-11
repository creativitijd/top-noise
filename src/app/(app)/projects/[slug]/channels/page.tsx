import { notFound, redirect } from "next/navigation";
import { ChannelManager } from "@/components/channels/channel-manager";
import { getAuth, getProjectBySlug } from "@/lib/auth/session";
import type { ChannelPublic } from "@/types/database";

export const dynamic = "force-dynamic";

const CHANNEL_COLUMNS =
  "id, project_id, platform, status, account_label, external_id, meta, token_expires_at, created_at, updated_at";

export default async function ChannelsPage({
  params,
}: {
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
  const { data: channels } = await auth.supabase
    .from("channels")
    .select(CHANNEL_COLUMNS)
    .eq("project_id", project.id);

  return (
    <main className="rounded-[22px] border border-[rgb(31_27_24_/_8%)] bg-white p-6">
      <ChannelManager projectId={project.id} channels={(channels ?? []) as ChannelPublic[]} />
    </main>
  );
}
