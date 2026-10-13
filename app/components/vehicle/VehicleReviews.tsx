"use client";

import { useMemo, useState } from "react";
import { Star, Loader2, AlertCircle, MessageSquare } from "lucide-react";

interface Review {
  id: number;
  rating: number;
  comment: string | null;
  createdAt: string;
  authorName: string | null;
}

const inputCls =
  "w-full px-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FFC700]/40 bg-card text-content";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function VehicleReviews({
  vehicleId,
  initialReviews,
  canReview,
}: {
  vehicleId: number;
  initialReviews: Review[];
  /** True only for a signed-in customer — the backend enforces this too. */
  canReview: boolean;
}) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  // Adopt a fresh set of reviews handed down by the server. Adjusted during
  // render (React's documented pattern) rather than in an effect, so the list
  // never renders one frame with the previous server data.
  const [seenInitial, setSeenInitial] = useState(initialReviews);
  if (initialReviews !== seenInitial) {
    setSeenInitial(initialReviews);
    setReviews(initialReviews);
  }

  const { average, count } = useMemo(() => {
    if (reviews.length === 0) return { average: 0, count: 0 };
    const total = reviews.reduce((sum, r) => sum + r.rating, 0);
    return {
      average: Math.round((total / reviews.length) * 10) / 10,
      count: reviews.length,
    };
  }, [reviews]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setDone(false);

    if (rating < 1) return setError("Select a star rating.");
    if (comment.trim().length < 3) {
      return setError("Please write a few words about the car.");
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleId, rating, comment: comment.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        review?: Review;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Could not submit the review.");

      if (data.review) setReviews((prev) => [data.review!, ...prev]);
      setComment("");
      setRating(0);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit the review.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      id="reviews"
      className="mt-10 rounded-2xl border border-line bg-card p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-extrabold text-content">
          Owner Reviews
        </h2>
        {count > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-2xl font-extrabold text-content">
              {average}
            </span>
            <div>
              <div className="flex gap-0.5" aria-hidden="true">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    size={14}
                    className={
                      i <= Math.round(average)
                        ? "text-[#FFC700] fill-[#FFC700]"
                        : "text-content-faint"
                    }
                  />
                ))}
              </div>
              <p className="text-[11px] text-content-muted">
                {count} review{count === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Write form — shown only to signed-in customers. */}
      {canReview && (
        <form
          onSubmit={submit}
          className="mt-5 rounded-xl border border-line bg-surface p-4"
        >
          <p className="text-sm font-semibold text-content">
            Share your experience
          </p>

          <div
            className="mt-3 flex items-center gap-1"
            onMouseLeave={() => setHover(0)}
          >
            <span className="mr-2 text-sm text-content-muted">Rating</span>
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setRating(i)}
                onMouseEnter={() => setHover(i)}
                aria-label={`${i} star${i === 1 ? "" : "s"}`}
                aria-pressed={rating === i}
                className="p-0.5"
              >
                <Star
                  size={22}
                  className={
                    i <= (hover || rating)
                      ? "text-[#FFC700] fill-[#FFC700]"
                      : "text-content-faint"
                  }
                />
              </button>
            ))}
          </div>

          <textarea
            value={comment}
            onChange={(e) => {
              setComment(e.target.value);
              setError("");
              setDone(false);
            }}
            rows={3}
            maxLength={2000}
            placeholder="What did you like or dislike? How was the buying experience?"
            className={inputCls + " mt-3 resize-none"}
          />

          {error && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-red-400">
              <AlertCircle size={13} aria-hidden="true" />
              {error}
            </p>
          )}
          {done && (
            <p className="mt-2 text-xs text-emerald-400">
              Thanks — your review has been published.
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#FFC700] px-5 py-2.5 text-sm font-bold text-[#15130a] transition hover:brightness-110 disabled:opacity-50"
          >
            {submitting && <Loader2 size={15} className="animate-spin" />}
            Submit review
          </button>
        </form>
      )}

      {/* List */}
      <div className="mt-6">
        {reviews.length === 0 ? (
          <div className="py-10 text-center">
            <MessageSquare
              size={24}
              className="mx-auto mb-2 text-content-faint"
              aria-hidden="true"
            />
            <p className="text-sm text-content-muted">
              No reviews for this car yet.
            </p>
            {!canReview && (
              <p className="mt-1 text-xs text-content-faint">
                Sign in to be the first to review it.
              </p>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {reviews.map((r) => (
              <li key={r.id} className="flex gap-3 py-4">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FFC700]/15 text-xs font-bold text-[#FFC700]"
                  aria-hidden="true"
                >
                  {r.authorName ?? "?"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-content">
                      {r.authorName ?? "Verified owner"}
                    </span>
                    <span className="text-[11px] text-content-faint">
                      {formatDate(r.createdAt)}
                    </span>
                  </div>
                  <div
                    className="mt-1 flex gap-0.5"
                    aria-label={`${r.rating} out of 5`}
                  >
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        size={12}
                        aria-hidden="true"
                        className={
                          i <= r.rating
                            ? "text-[#FFC700] fill-[#FFC700]"
                            : "text-content-faint"
                        }
                      />
                    ))}
                  </div>
                  {r.comment && (
                    <p className="mt-1.5 text-sm leading-6 text-content-muted">
                      {r.comment}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
