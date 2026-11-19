"use client";

import { PasswordInput } from "@/components/PasswordInput";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/providers/CustomerAuth";
import { AuthShell, safeNext } from "@/components/store/AuthShell";
import { Alert, Button, Field, Input } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { checkEmail, checkPassword, clean, isValid, required, type Errors } from "@/lib/validation";

function RegisterForm() {
  const { register } = useAuth();
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", password_confirmation: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: event.target.value });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const found = clean({
      name: required(form.name, "Name", 2),
      email: checkEmail(form.email),
      phone: form.phone && !/^[0-9+\-\s()]+$/.test(form.phone) ? "Use digits, spaces and + - ( ) only." : undefined,
      password: checkPassword(form.password),
      password_confirmation: form.password !== form.password_confirmation ? "Passwords do not match." : undefined,
    });
    setErrors(found);
    setServerError("");
    if (!isValid(found)) return;

    setBusy(true);
    try {
      await register({ ...form, name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() || undefined });
      router.replace(next);
    } catch (e) {
      if (e instanceof ApiError) {
        // Show the API's field messages under the matching inputs.
        setErrors(Object.fromEntries(Object.entries(e.errors).map(([key, messages]) => [key, messages[0]])));
        if (Object.keys(e.errors).length === 0) setServerError(e.message);
      } else {
        setServerError("Could not create the account.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      {serverError && <Alert>{serverError}</Alert>}
      <Field label="Full name" htmlFor="name" error={errors.name}>
        <Input id="name" autoComplete="name" value={form.name} onChange={set("name")} invalid={!!errors.name} maxLength={100} />
      </Field>
      <Field label="Email" htmlFor="email" error={errors.email}>
        <Input id="email" type="email" autoComplete="email" value={form.email} onChange={set("email")} invalid={!!errors.email} />
      </Field>
      <Field label="Phone (optional)" htmlFor="phone" error={errors.phone}>
        <Input id="phone" type="tel" autoComplete="tel" value={form.phone} onChange={set("phone")} invalid={!!errors.phone} />
      </Field>
      <Field label="Password" htmlFor="password" error={errors.password} hint="At least 8 characters with upper and lower case letters, a number and a symbol.">
        <PasswordInput id="password" autoComplete="new-password" value={form.password} onChange={set("password")} invalid={!!errors.password} />
      </Field>
      <Field label="Confirm password" htmlFor="password_confirmation" error={errors.password_confirmation}>
        <PasswordInput id="password_confirmation" autoComplete="new-password" value={form.password_confirmation} onChange={set("password_confirmation")} invalid={!!errors.password_confirmation} />
      </Field>
      <Button type="submit" size="lg" loading={busy} className="w-full">
        Create account
      </Button>
      <p className="text-center text-sm text-black/60">
        Already have an account?{" "}
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-medium text-black underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}

export default function RegisterPage() {
  return (
    <AuthShell title="Create account" subtitle="Save your details for faster checkout and track your orders.">
      <RegisterForm />
    </AuthShell>
  );
}
