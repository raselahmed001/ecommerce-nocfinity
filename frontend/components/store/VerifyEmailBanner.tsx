"use client";

import { useState } from "react";
import { useAuth } from "@/components/providers/CustomerAuth";
import { useToast } from "@/components/providers/Toast";
import { ApiError, api } from "@/lib/api";

/** Shown to a signed-in customer whose email address is not verified yet. */
export function VerifyEmailBanner() {
  const { user } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  if (!user || user.email_verified !== false) return null;

  const resend = async () => {
    setBusy(true);
    try {
      await api("/auth/email/resend", { method: "POST", scope: "customer" });
      toast("Verification email sent. Please check your inbox.");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Could not send the email.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div role="status" className="bg-[#fff4d6] px-4 py-2 text-center text-sm text-black">
      Please verify your email address ({user.email}) to place orders.{" "}
      <button type="button" onClick={resend} disabled={busy} className="font-medium underline disabled:opacity-50">
        {busy ? "Sending..." : "Resend email"}
      </button>
    </div>
  );
}
