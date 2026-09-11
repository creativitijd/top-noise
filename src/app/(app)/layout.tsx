import { redirect } from "next/navigation";
import { getAuth, ensureOrganization } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const auth = await getAuth();
  if (!auth) {
    redirect("/login");
  }
  await ensureOrganization(auth.supabase);
  return <div className="flex min-h-full flex-1 flex-col">{children}</div>;
}
