import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-3">
          <p className="text-sm font-medium tracking-[0.2em] text-primary uppercase">Promo</p>
          <h1 className="text-4xl leading-tight">Commandocentrum voor merken</h1>
          <p className="text-muted-foreground">
            Plan, keur goed, publiceer en meet content voor al je projecten — zonder browser-timers of
            losse spreadsheets.
          </p>
        </div>
        <div className="rounded-2xl bg-card p-6 ring-1 ring-foreground/10">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
