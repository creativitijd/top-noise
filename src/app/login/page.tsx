import { Suspense } from "react";
import { BrandMark } from "@/components/brand/brand-mark";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-[#f5f5f4] px-6 py-16 text-[#1f1b18]">
      <div className="w-full max-w-md space-y-8">
        <BrandMark />
        <div className="space-y-3">
          <h1 className="text-4xl font-semibold tracking-tight">Social media, zonder dagelijkse stress</h1>
          <p className="text-[#635a52]">
            Plan, keur goed en publiceer content voor al je merken — met AI, kalender en echte metingen.
          </p>
        </div>
        <div className="rounded-[28px] border border-[rgb(31_27_24_/_8%)] bg-white p-6 shadow-[0_20px_50px_-30px_rgb(31_27_24_/_30%)]">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
