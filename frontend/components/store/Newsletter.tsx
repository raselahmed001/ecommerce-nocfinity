"use client";

import { useState } from "react";
import { useToast } from "../providers/Toast";

/** Demo form: the address is checked but not stored anywhere (the brief has no newsletter feature). */
export function Newsletter({ title }: { title: string }) {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("Enter a valid email address.");
    setError("");
    setEmail("");
    toast("Thanks for subscribing!");
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <div className="grid items-center gap-6 rounded-[1.25rem] bg-black px-6 py-8 text-white sm:rounded-[1.5rem] sm:px-16 sm:py-10 lg:grid-cols-2">
        <h2 className="display text-3xl leading-tight sm:text-4xl">{title}</h2>
        <form onSubmit={submit} noValidate className="space-y-3 lg:ml-auto lg:w-full lg:max-w-sm">
          <label className="flex h-12 items-center gap-3 rounded-full bg-white px-5 text-black">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="shrink-0 opacity-40" aria-hidden>
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="m3 7 9 6 9-6" />
            </svg>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              aria-label="Email address"
              maxLength={120}
              className="w-full bg-transparent text-sm outline-none placeholder:text-black/40"
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-red-300">
              {error}
            </p>
          )}
          <button type="submit" className="h-12 w-full rounded-full bg-white text-sm font-medium text-black transition hover:bg-neutral-200">
            Subscribe to Newsletter
          </button>
        </form>
      </div>
    </div>
  );
}
