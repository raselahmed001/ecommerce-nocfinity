"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/CustomerAuth";
import { useToast } from "@/components/providers/Toast";
import { Stars } from "@/components/store/Stars";
import { Alert, Button, Field, Input, Textarea } from "@/components/ui";
import { ApiError, api, type ApiMeta } from "@/lib/api";
import { date } from "@/lib/format";
import type { Review, ReviewSummary, ReviewViewer } from "@/lib/types";

interface Loaded {
  reviews: Review[];
  summary: ReviewSummary;
  viewer: ReviewViewer | null;
  meta: ApiMeta | null;
}

/** "All Reviews" block of the product page: summary, list, and a form for customers who bought the product. */
export function Reviews({ slug }: { slug: string }) {
  const { user, loading: authLoading } = useAuth();
  const [page, setPage] = useState(1);
  const [tick, setTick] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const reload = () => setTick((value) => value + 1);
  const signedIn = !!user;

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    api<Review[]>(`/products/${encodeURIComponent(slug)}/reviews`, { scope: signedIn ? "customer" : undefined, query: { page } })
      .then((res) => {
        if (cancelled) return;
        const extra = res as unknown as { summary: ReviewSummary; viewer: ReviewViewer | null };
        setLoaded({ reviews: res.data, summary: extra.summary, viewer: extra.viewer, meta: res.meta ?? null });
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [slug, page, tick, signedIn, authLoading]);

  const summary = loaded?.summary;
  const viewer = loaded?.viewer ?? null;
  const meta = loaded?.meta ?? null;

  return (
    <section className="mt-16" aria-labelledby="reviews">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-black/10 pb-4">
        <h2 id="reviews" className="display text-2xl sm:text-3xl">
          All reviews {summary && <span className="text-lg text-black/50">({summary.count})</span>}
        </h2>
        {summary && summary.count > 0 && <Stars rating={summary.average} />}
      </div>

      {summary && summary.count > 0 && (
        <dl className="mt-4 grid max-w-sm gap-1 text-sm">
          {Object.entries(summary.distribution)
            .sort(([a], [b]) => Number(b) - Number(a))
            .map(([star, count]) => (
              <div key={star} className="flex items-center gap-3">
                <dt className="w-10 shrink-0 text-black/60">{star} star</dt>
                <dd className="h-2 flex-1 overflow-hidden rounded-full bg-black/10">
                  <span className="block h-full bg-[#ffc633]" style={{ width: `${(count / summary.count) * 100}%` }} />
                </dd>
                <dd className="w-6 text-right text-black/60">{count}</dd>
              </div>
            ))}
        </dl>
      )}

      {!loaded ? (
        <p className="mt-6 text-sm text-black/60">Loading reviews...</p>
      ) : loaded.reviews.length === 0 ? (
        <p className="mt-6 text-sm text-black/60">No reviews yet.</p>
      ) : (
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {loaded.reviews.map((review) => (
            <li key={review.id} className="rounded-[1.25rem] border border-black/10 p-5 sm:p-6">
              <Stars rating={review.rating} />
              <p className="mt-3 font-bold">
                {review.author} <span className="text-sm font-normal text-success">Verified buyer</span>
              </p>
              {/* Plain text: React escapes it, so HTML in a review can never run. */}
              {review.title && <p className="mt-1 font-medium">{review.title}</p>}
              <p className="mt-2 whitespace-pre-line text-sm text-black/60 sm:text-base">{review.body}</p>
              <p className="mt-3 text-xs text-black/40">Posted on {date(review.created_at)}</p>
            </li>
          ))}
        </ul>
      )}

      {meta && meta.last_page > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-full border border-black/10 px-4 py-2 disabled:opacity-40">
            Previous
          </button>
          <span>
            {meta.current_page} / {meta.last_page}
          </span>
          <button type="button" disabled={page >= meta.last_page} onClick={() => setPage(page + 1)} className="rounded-full border border-black/10 px-4 py-2 disabled:opacity-40">
            Next
          </button>
        </div>
      )}

      <div className="mt-8 max-w-xl">
        {!authLoading && !user && (
          <p className="text-sm text-black/60">
            <Link href={`/login?next=/products/${slug}`} className="underline">
              Sign in
            </Link>{" "}
            to review this product if you bought it.
          </p>
        )}

        {user && viewer && !viewer.has_purchased && <p className="text-sm text-black/60">Only customers who bought this product can review it.</p>}
        {user && viewer && viewer.has_purchased && !viewer.email_verified && <Alert tone="info">Verify your email address to write a review.</Alert>}

        {user && viewer?.can_review && (
          // The key restarts the form with the saved review after it is submitted or deleted.
          <ReviewForm key={viewer.review ? `${viewer.review.id}-${viewer.review.rating}-${viewer.review.body}` : "new"} slug={slug} existing={viewer.review} onChanged={() => { setPage(1); reload(); }} />
        )}
      </div>
    </section>
  );
}

function ReviewForm({ slug, existing, onChanged }: { slug: string; existing: Review | null; onChanged: () => void }) {
  const toast = useToast();
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [title, setTitle] = useState(existing?.title ?? "");
  const [body, setBody] = useState(existing?.body ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const found: Record<string, string> = {};
    if (rating < 1) found.rating = "Choose a rating from 1 to 5 stars.";
    if (body.trim().length < 3) found.body = "Write at least a few words.";
    setErrors(found);
    setError("");
    if (Object.keys(found).length) return;

    setBusy(true);
    try {
      await api(`/products/${encodeURIComponent(slug)}/reviews`, {
        method: "POST",
        scope: "customer",
        body: { rating, title: title.trim() || null, body: body.trim() },
      });
      toast("Thank you for your review.");
      onChanged();
    } catch (e) {
      if (e instanceof ApiError) {
        setErrors(Object.fromEntries(Object.entries(e.errors).map(([k, v]) => [k, v[0]])));
        if (Object.keys(e.errors).length === 0) setError(e.message);
      } else setError("Could not save your review.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    try {
      await api(`/products/${encodeURIComponent(slug)}/reviews`, { method: "DELETE", scope: "customer" });
      toast("Review deleted.");
      onChanged();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not delete your review.");
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4 rounded-[1.25rem] border border-black/10 p-5 sm:p-6">
      <h3 className="font-bold">{existing ? "Edit your review" : "Write a review"}</h3>
      {error && <Alert>{error}</Alert>}
      <Field label="Rating" htmlFor="rating-1" error={errors.rating}>
        <div className="flex gap-1" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              id={`rating-${n}`}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              onClick={() => setRating(n)}
              className={`text-3xl leading-none ${n <= rating ? "text-[#ffc633]" : "text-black/15"}`}
            >
              ★
            </button>
          ))}
        </div>
      </Field>
      <Field label="Title (optional)" htmlFor="review-title" error={errors.title}>
        <Input id="review-title" value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label="Your review" htmlFor="review-body" error={errors.body}>
        <Textarea id="review-body" rows={4} value={body} maxLength={2000} onChange={(e) => setBody(e.target.value)} invalid={!!errors.body} />
      </Field>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={busy}>
          {existing ? "Update review" : "Submit review"}
        </Button>
        {existing && (
          <Button type="button" variant="outline" onClick={remove}>
            Delete my review
          </Button>
        )}
      </div>
    </form>
  );
}
