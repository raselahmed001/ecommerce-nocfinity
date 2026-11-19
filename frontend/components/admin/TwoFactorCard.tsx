"use client";

import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { useAdminAuth } from "@/components/admin/AdminAuth";
import { Card } from "@/components/admin/parts";
import { PasswordInput } from "@/components/PasswordInput";
import { useToast } from "@/components/providers/Toast";
import { Alert, Badge, Button, Field, Input } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import type { User } from "@/lib/types";

interface Setup {
  secret: string;
  otpauth_uri: string;
}

/** Turn two-factor authentication (authenticator app) on or off for the signed-in staff member. */
export function TwoFactorCard() {
  const { user, setUser } = useAdminAuth();
  const toast = useToast();
  const enabled = !!user?.two_factor_enabled;

  const [setup, setSetup] = useState<Setup | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [disabling, setDisabling] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      setError(e instanceof ApiError ? (Object.values(e.errors)[0]?.[0] ?? e.message) : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const start = () =>
    run(async () => {
      const res = await api<Setup>("/admin/two-factor/setup", { method: "POST", scope: "admin" });
      setSetup(res.data);
    });

  const confirm = (event: React.FormEvent) => {
    event.preventDefault();
    return run(async () => {
      const res = await api<User>("/admin/two-factor/confirm", { method: "POST", scope: "admin", body: { code } });
      setUser(res.data);
      setSetup(null);
      setCode("");
      toast("Two-factor authentication is on.");
    });
  };

  const disable = (event: React.FormEvent) => {
    event.preventDefault();
    return run(async () => {
      const res = await api<User>("/admin/two-factor/disable", { method: "POST", scope: "admin", body: { password, code } });
      setUser(res.data);
      setDisabling(false);
      setPassword("");
      setCode("");
      toast("Two-factor authentication is off.");
    });
  };

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">Two-factor authentication</h2>
        <Badge tone={enabled ? "green" : "gray"}>{enabled ? "On" : "Off"}</Badge>
      </div>
      {error && <Alert>{error}</Alert>}

      {!enabled && !setup && (
        <>
          <p className="text-sm text-neutral-500">Ask for a code from an authenticator app (Google Authenticator, Authy, 1Password) every time you sign in.</p>
          <Button type="button" shape="rounded" loading={busy} onClick={start}>
            Set up 2FA
          </Button>
        </>
      )}

      {!enabled && setup && (
        <form onSubmit={confirm} className="space-y-4" noValidate>
          <p className="text-sm text-neutral-500">Scan this QR code with your authenticator app, then enter the 6-digit code it shows.</p>
          <div className="inline-block rounded-lg bg-white p-3">
            <QRCodeSVG value={setup.otpauth_uri} size={160} />
          </div>
          <p className="text-xs text-neutral-500">
            Cannot scan? Enter this key by hand: <code className="break-all font-mono">{setup.secret}</code>
          </p>
          <Field label="Code" htmlFor="tf-code">
            <Input id="tf-code" inputMode="numeric" autoComplete="one-time-code" maxLength={7} value={code} onChange={(e) => setCode(e.target.value)} className="!rounded-lg" />
          </Field>
          <Button type="submit" shape="rounded" loading={busy}>
            Turn on
          </Button>
        </form>
      )}

      {enabled && !disabling && (
        <Button type="button" variant="outline" shape="rounded" onClick={() => setDisabling(true)}>
          Turn off 2FA
        </Button>
      )}

      {enabled && disabling && (
        <form onSubmit={disable} className="space-y-4" noValidate>
          <p className="text-sm text-neutral-500">Enter your password and a current code to turn it off.</p>
          <Field label="Password" htmlFor="tf-password">
            <PasswordInput id="tf-password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="!rounded-lg" />
          </Field>
          <Field label="Code" htmlFor="tf-off-code">
            <Input id="tf-off-code" inputMode="numeric" autoComplete="one-time-code" maxLength={7} value={code} onChange={(e) => setCode(e.target.value)} className="!rounded-lg" />
          </Field>
          <Button type="submit" shape="rounded" loading={busy}>
            Turn off
          </Button>
        </form>
      )}
    </Card>
  );
}
