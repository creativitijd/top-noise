import { cpSync, existsSync } from "node:fs";
import { join } from "node:path";

const standaloneDir = ".next/standalone";

if (!existsSync(standaloneDir)) {
  console.error("Standalone build not found. Run `next build` with output: 'standalone'.");
  process.exit(1);
}

cpSync(".next/static", join(standaloneDir, ".next/static"), { recursive: true });
cpSync("public", join(standaloneDir, "public"), { recursive: true });

console.log("Copied static assets into standalone output.");
