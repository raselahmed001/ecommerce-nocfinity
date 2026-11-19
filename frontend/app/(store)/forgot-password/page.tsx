"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthShell } from "@/components/store/AuthShell";
import { Alert, Button, Field, Input } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { checkEmail } from "@/lib/validation";

function ForgotForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [done, setDone] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const problem = checkEmail(email);
    setError(problem);
    if (problem) return;

    setBusy(true);
    try {
      const res = await api("/auth/forgot-password", { method: "POST", body: { email: email.trim() } });
      setDone(res.message);
    } catch (e) {
      setError(e instanceof ApiError ? (e.field("email") ?? e.message) : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="space-y-4">
        <Alert tone="success">{done}</Alert>
        <p className="text-sm text-black/60">Check your inbox (the link expires in 60 minutes).</p>
        <Link href="/login" className="block text-center text-sm underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <Field label="Email" htmlFor="email" error={error}>
        <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} invalid={!!error} />
      </Field>
      <Button type="submit" size="lg" loading={busy} className="w-full">
        Send reset link
      </Button>
      <Link href="/login" className="block text-center text-sm underline">
        Back to sign in
      </Link>
    </form>
  );
}

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Forgot password" subtitle="Enter your email and we will send you a link to choose a new password.">
      <ForgotForm />
    </AuthShell>
  );
}
