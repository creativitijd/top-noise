"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBrowserSupabase } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/projects";
  const [mode, setMode] = useState<"login" | "signup">(
    searchParams.get("tab") === "signup" ? "signup" : "login"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      const supabase = createBrowserSupabase();
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        });
        if (error) {
          throw error;
        }
        toast.success("Account aangemaakt. Bevestig je e-mail als dat gevraagd wordt, en log daarna in.");
        setMode("login");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        throw error;
      }
      router.push(next);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Inloggen mislukt.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          className="h-11 rounded-full px-4"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Wachtwoord</Label>
        <Input
          id="password"
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          className="h-11 rounded-full px-4"
          minLength={8}
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>
      <Button type="submit" className="h-11 w-full rounded-full bg-[#4f8637] text-white hover:bg-[#3f6b2b]" disabled={pending}>
        {pending ? "Even geduld…" : mode === "login" ? "Inloggen" : "Account maken"}
      </Button>
      <button
        type="button"
        className="w-full text-sm text-muted-foreground underline-offset-4 hover:underline"
        onClick={() => setMode(mode === "login" ? "signup" : "login")}
      >
        {mode === "login" ? "Nog geen account? Maak er een." : "Al een account? Log in."}
      </button>
    </form>
  );
}
