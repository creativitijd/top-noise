import Link from "next/link";
import { SignOutButton } from "@/components/auth/sign-out-button";

export function AppHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="border-b bg-card/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <div className="min-w-0">
          <Link href="/projects" className="text-xs font-medium tracking-[0.22em] text-primary uppercase">
            Promo
          </Link>
          <h1 className="truncate text-2xl">{title}</h1>
          {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          {actions}
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
