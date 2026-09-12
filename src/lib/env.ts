function read(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

export function requiredEnv(name: string): string {
  const value = read(name);
  if (!value) {
    throw new Error(`Ontbrekende omgevingsvariabele: ${name}`);
  }
  return value;
}

export function appUrl(): string {
  return read("APP_URL") ?? read("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000";
}

export function googleOAuthConfigured(): boolean {
  return Boolean(read("GOOGLE_CLIENT_ID") && read("GOOGLE_CLIENT_SECRET"));
}

export function supabasePublicConfig() {
  return {
    url: requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  };
}
