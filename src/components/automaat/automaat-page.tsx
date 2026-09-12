"use client";

import { useRouter } from "next/navigation";
import { AutomaatWizard } from "@/components/automaat/automaat-wizard";

export function AutomaatPage({
  projectId,
  projectSlug,
  connectedChannels,
}: {
  projectId: string;
  projectSlug: string;
  connectedChannels: string[];
}) {
  const router = useRouter();

  return (
    <AutomaatWizard
      projectId={projectId}
      projectSlug={projectSlug}
      connectedChannels={connectedChannels}
      open
      embedded
      onClose={() => router.push(`/projects/${projectSlug}`)}
    />
  );
}
