"use client";

import { PasswordInput } from "@/components/PasswordInput";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/providers/CustomerAuth";
import { AuthShell, safeNext } from "@/components/store/AuthShell";
import { Alert, Button, Field, Input } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { checkEmail, clean, isValid, required, type Errors } from "@/lib/validation";

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const verified = params.get("verified");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const found = clean({ email: checkEmail(email), password: required(password, "Password") });
    setErrors(found);
    setServerError("");
    if (!isValid(found)) return;

    setBusy(true);
    try {
      await login(email.trim(), password);
      router.replace(next);
    } catch (e) {
      // The API gives one generic message for every failed login, and we show it as is.
      setServerError(e instanceof ApiError ? e.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      {verified === "1" && <Alert tone="success">Your email address is verified. You can sign in now.</Alert>}
      {verified === "invalid" && <Alert>This verification link is not valid. Sign in and ask for a new email.</Alert>}
      {serverError && <Alert>{serverError}</Alert>}
      <Field label="Email" htmlFor="email" error={errors.email}>
        <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} invalid={!!errors.email} />
      </Field>
      <Field label="Password" htmlFor="password" error={errors.password}>
        <PasswordInput id="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} invalid={!!errors.password} />
      </Field>
      <div className="text-right text-sm">
        <Link href="/forgot-password" className="underline">
          Forgot password?
        </Link>
      </div>
      <Button type="submit" size="lg" loading={busy} className="w-full">
        Sign in
      </Button>
      <p className="text-center text-sm text-black/60">
        New here?{" "}
        <Link href={`/register?next=${encodeURIComponent(next)}`} className="font-medium text-black underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <AuthShell title="Sign in" subtitle="Welcome back. Sign in to see your orders and check out faster.">
      <LoginForm />
    </AuthShell>
  );
}
