import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuth, assertProjectAccess } from "@/lib/auth/session";
import { handleRouteError, jsonError } from "@/lib/http";

const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const auth = await getAuth();
    if (!auth) {
      return jsonError("Niet ingelogd.", 401);
    }

    const form = await request.formData();
    const projectId = z.string().uuid().parse(String(form.get("projectId") ?? ""));
    const file = form.get("stylebook");
    if (!(file instanceof File) || file.size === 0) {
      return jsonError("Kies een stylboekbestand.");
    }
    if (file.size > MAX_BYTES) {
      return jsonError("Stylboek is groter dan 8 MB.");
    }

    const project = await assertProjectAccess(auth.supabase, projectId);
    const ext = extensionFor(file.name, file.type);
    const path = `${project.organization_id}/${project.id}/stylebook.${ext}`;

    const { error: uploadError } = await auth.supabase.storage.from("stylebooks").upload(path, file, {
      upsert: true,
      contentType: file.type || undefined,
    });
    if (uploadError) {
      return jsonError(uploadError.message, 500);
    }

    const { data: signed } = await auth.supabase.storage.from("stylebooks").createSignedUrl(path, 60 * 60 * 24 * 7);
    const { data: updated, error } = await auth.supabase
      .from("projects")
      .update({
        stylebook_path: path,
        stylebook_url: signed?.signedUrl ?? null,
      })
      .eq("id", project.id)
      .select("*")
      .single();
    if (error || !updated) {
      return jsonError(error?.message ?? "Stylboek opslaan mislukt.", 500);
    }

    return NextResponse.json({ project: updated });
  } catch (error) {
    return handleRouteError(error);
  }
}

function extensionFor(name: string, type: string): string {
  const fromName = name.split(".").pop()?.toLowerCase();
  if (fromName && ["pdf", "png", "jpg", "jpeg", "webp"].includes(fromName)) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }
  if (type.includes("pdf")) {
    return "pdf";
  }
  if (type.includes("png")) {
    return "png";
  }
  if (type.includes("webp")) {
    return "webp";
  }
  return "bin";
}
