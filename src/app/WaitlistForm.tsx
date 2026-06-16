"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2 } from "lucide-react";

export default function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("loading");
    setErrorMsg("");

    const { error } = await supabase
      .from("waitlist")
      .insert({ email: email.trim().toLowerCase() });

    if (error) {
      if (error.code === "23505") {
        setStatus("success");
      } else {
        setErrorMsg(error.message);
        setStatus("error");
      }
    } else {
      setStatus("success");
    }
  }

  if (status === "success") {
    return (
      <div className="flex items-center justify-center gap-2 text-sm text-green-600 dark:text-green-400 h-11">
        <CheckCircle2 className="size-4 flex-shrink-0" />
        You&apos;re on the list! We&apos;ll reach out when we launch.
      </div>
    );
  }

  return (
    <div className="space-y-2 max-w-sm mx-auto w-full">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="email"
          placeholder="Enter your email"
          className="flex-1"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === "loading"}
          required
        />
        <Button type="submit" size="lg" disabled={status === "loading"}>
          {status === "loading" ? "Joining…" : "Get early access"}
        </Button>
      </form>
      {status === "error" && (
        <p className="text-xs text-destructive">{errorMsg}</p>
      )}
    </div>
  );
}
