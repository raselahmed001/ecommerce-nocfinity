"use client";

import { PasswordInput } from "@/components/PasswordInput";
import { useState } from "react";
import { useAdminAuth } from "@/components/admin/AdminAuth";
import { Card, PageHeader } from "@/components/admin/parts";
import { TwoFactorCard } from "@/components/admin/TwoFactorCard";
import { useToast } from "@/components/providers/Toast";
import { Alert, Badge, Button, Field, Input } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import type { User } from "@/lib/types";
import { checkPassword, clean, isValid, required, type Errors } from "@/lib/validation";

export default function ProfilePage() {
  const { user, setUser } = useAdminAuth();
  const toast = useToast();
  const [name, setName] = useState(user?.name ?? "");
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);

  const changingPassword = password !== "" || current !== "" || confirmation !== "";

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const found = clean({
      name: required(name, "Name", 2),
      current_password: changingPassword && !current ? "Enter your current password." : undefined,
      password: changingPassword ? checkPassword(password) : undefined,
      password_confirmation: changingPassword && password !== confirmation ? "Passwords do not match." : undefined,
    });
    setErrors(found);
    setServerError("");
    if (!isValid(found)) return;

    setBusy(true);
    try {
      const res = await api<User>("/admin/profile", {
        method: "PUT",
        scope: "admin",
        body: changingPassword
          ? { name: name.trim(), current_password: current, password, password_confirmation: confirmation }
          : { name: name.trim() },
      });
      setUser(res.data);
      setCurrent("");
      setPassword("");
      setConfirmation("");
      toast(changingPassword ? "Profile and password updated." : "Profile updated.");
    } catch (e) {
      if (e instanceof ApiError) {
        setErrors(Object.fromEntries(Object.entries(e.errors).map(([k, v]) => [k, v[0]])));
        if (Object.keys(e.errors).length === 0) setServerError(e.message);
      } else setServerError("Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const r = "!rounded-lg";

  return (
    <>
      <PageHeader title="My profile" description="Update your name and password." />
      <div className="grid max-w-3xl gap-6">
        <Card>
          <dl className="grid gap-3 text-sm sm:grid-cols-[8rem_1fr]">
            <dt className="text-neutral-500">Email</dt>
            <dd>{user?.email}</dd>
            <dt className="text-neutral-500">Roles</dt>
            <dd className="flex flex-wrap gap-1">{user?.roles?.map((role) => <Badge key={role} tone="blue">{role}</Badge>)}</dd>
          </dl>
        </Card>

        <form onSubmit={submit} noValidate>
          <Card className="space-y-4">
            {serverError && <Alert>{serverError}</Alert>}
            <Field label="Name" htmlFor="p-name" error={errors.name}>
              <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} invalid={!!errors.name} maxLength={100} className={r} />
            </Field>

            <h2 className="pt-2 font-semibold">Change password</h2>
            <p className="-mt-2 text-xs text-neutral-500">Leave these empty to keep your current password. Changing it signs you out on other devices.</p>
            <Field label="Current password" htmlFor="p-current" error={errors.current_password}>
              <PasswordInput id="p-current" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} invalid={!!errors.current_password} className={r} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="New password" htmlFor="p-new" error={errors.password}>
                <PasswordInput id="p-new" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} invalid={!!errors.password} className={r} />
              </Field>
              <Field label="Confirm new password" htmlFor="p-confirm" error={errors.password_confirmation}>
                <PasswordInput id="p-confirm" autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} invalid={!!errors.password_confirmation} className={r} />
              </Field>
            </div>
            <div className="flex justify-end">
              <Button type="submit" shape="rounded" loading={busy}>
                Save changes
              </Button>
            </div>
          </Card>
        </form>

        <TwoFactorCard />
      </div>
    </>
  );
}
