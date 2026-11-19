"use client";

import { PasswordInput } from "@/components/PasswordInput";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAdminAuth } from "@/components/admin/AdminAuth";
import { Alert, Button, Field, Input } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { checkEmail, clean, isValid, required, type Errors } from "@/lib/validation";

export default function AdminLoginPage() {
  const { user, loading, login } = useAdminAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/admin");
  }, [loading, user, router]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const found = clean({ email: checkEmail(email), password: required(password, "Password") });
    setErrors(found);
    setServerError("");
    if (!isValid(found)) return;

    setBusy(true);
    try {
      await login(email.trim(), password);
      router.replace("/admin");
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <p className="display text-2xl">Shop.co</p>
        <h1 className="mt-1 text-lg font-semibold">Admin sign in</h1>
        <p className="mt-1 text-sm text-neutral-500">For staff only.</p>

        <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
          {serverError && <Alert>{serverError}</Alert>}
          <Field label="Email" htmlFor="email" error={errors.email}>
            <Input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} invalid={!!errors.email} />
          </Field>
          <Field label="Password" htmlFor="password" error={errors.password}>
            <PasswordInput id="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} invalid={!!errors.password} />
          </Field>
          <Button type="submit" shape="rounded" loading={busy} className="w-full">
            Sign in
          </Button>
        </form>
      </div>
    </div>
  );
}
