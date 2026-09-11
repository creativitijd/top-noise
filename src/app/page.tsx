import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const auth = await getAuth();
  redirect(auth ? "/projects" : "/login");
}
