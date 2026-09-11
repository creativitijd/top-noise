import { NextResponse } from "next/server";
import { requiredEnv } from "@/lib/env";
import { processDueJobs } from "@/lib/jobs/process";
import { jsonError } from "@/lib/http";

function authorize(request: Request) {
  const header = request.headers.get("authorization");
  const expected = `Bearer ${requiredEnv("CRON_SECRET")}`;
  return header === expected;
}

export async function GET(request: Request) {
  if (!authorize(request)) {
    return jsonError("Niet gemachtigd.", 401);
  }
  const result = await processDueJobs();
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  return GET(request);
}
