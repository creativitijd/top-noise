import { NextResponse } from "next/server";
import { z } from "zod";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function readJson<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  const body: unknown = await request.json();
  return schema.parse(body);
}

export function handleRouteError(error: unknown) {
  if (error instanceof z.ZodError) {
    const first = error.issues[0];
    return jsonError(first?.message ?? "Ongeldige invoer", 422);
  }
  if (error instanceof Error) {
    return jsonError(error.message, 500);
  }
  return jsonError("Onbekende fout", 500);
}
