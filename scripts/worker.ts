const intervalMs = 60_000;

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Ontbrekende omgevingsvariabele: ${name}`);
  }
  return value;
}

async function tick() {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  const secret = required("CRON_SECRET");
  const response = await fetch(`${base}/api/cron/publish`, {
    headers: { authorization: `Bearer ${secret}` },
  });
  const body = await response.text();
  console.log(new Date().toISOString(), response.status, body);
}

void tick().catch((error: unknown) => {
  console.error(error);
});
setInterval(() => {
  void tick().catch((error: unknown) => {
    console.error(error);
  });
}, intervalMs);
