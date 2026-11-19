"use client";

import { PasswordInput } from "@/components/PasswordInput";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { AuthShell } from "@/components/store/AuthShell";
import { Alert, Button, Field } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { checkPassword, clean, isValid, type Errors } from "@/lib/validation";

function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";
  const email = params.get("email") ?? "";
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!token || !email) {
    return (
      <div className="space-y-4">
        <Alert>This reset link is not valid. Please request a new one.</Alert>
        <Link href="/forgot-password" className="block text-center text-sm underline">
          Request a new link
        </Link>
      </div>
    );
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const found = clean({
      password: checkPassword(password),
      password_confirmation: password !== confirmation ? "Passwords do not match." : undefined,
    });
    setErrors(found);
    setServerError("");
    if (!isValid(found)) return;

    setBusy(true);
    try {
      await api("/auth/reset-password", { method: "POST", body: { token, email, password, password_confirmation: confirmation } });
      setDone(true);
      setTimeout(() => router.replace("/login"), 2000);
    } catch (e) {
      if (e instanceof ApiError) setServerError(e.field("email") ?? e.field("password") ?? e.message);
      else setServerError("Could not reset the password.");
    } finally {
      setBusy(false);
    }
  };

  if (done) return <Alert tone="success">Your password was changed. Redirecting you to sign in...</Alert>;

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      {serverError && <Alert>{serverError}</Alert>}
      <p className="text-sm text-black/60">
        Choose a new password for <strong>{email}</strong>.
      </p>
      <Field label="New password" htmlFor="password" error={errors.password} hint="At least 8 characters with upper and lower case letters, a number and a symbol.">
        <PasswordInput id="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} invalid={!!errors.password} />
      </Field>
      <Field label="Confirm new password" htmlFor="confirm" error={errors.password_confirmation}>
        <PasswordInput id="confirm" autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} invalid={!!errors.password_confirmation} />
      </Field>
      <Button type="submit" size="lg" loading={busy} className="w-full">
        Reset password
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell title="Reset password">
      <ResetForm />
    </AuthShell>
  );
}
