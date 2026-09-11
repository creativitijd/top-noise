import { Suspense } from "react";
import { BrandMark } from "@/components/brand/brand-mark";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-[#010001] px-6 py-16 text-white">
      <div className="w-full max-w-md space-y-8">
        <BrandMark light />
        <div className="space-y-3">
          <h1 className="text-4xl font-black tracking-tight">Social Media op Autopilot</h1>
          <p className="text-white/60">
            Plan, keur goed en publiceer content voor al je merken — met AI, kalender en echte metingen.
          </p>
        </div>
        <div className="rounded-2xl bg-white p-6 text-foreground shadow-xl">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
