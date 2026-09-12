"use client";

import { useRouter } from "next/navigation";
import { AutomaatWizard } from "@/components/automaat/automaat-wizard";

export function AutomaatPage({
  projectId,
  projectSlug,
  connectedChannels,
  country,
  region,
}: {
  projectId: string;
  projectSlug: string;
  connectedChannels: string[];
  country?: string | null;
  region?: string | null;
}) {
  const router = useRouter();

  return (
    <AutomaatWizard
      projectId={projectId}
      projectSlug={projectSlug}
      connectedChannels={connectedChannels}
      country={country}
      region={region}
      open
      embedded
      onClose={() => router.push(`/projects/${projectSlug}`)}
    />
  );
}
