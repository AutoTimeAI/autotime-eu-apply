"use client";

/**
 * Floating "Send feedback" control mounted in DashboardShell. Posts to
 * /api/feedback, the only in-app write path into beta_feedback - before
 * this, testers had no way to submit feedback except replying to email.
 * Deliberately minimal: a toggle button and an inline form, no modal
 * primitive, matching the shell's current lack of one.
 */
import { useState } from "react";
import { usePathname } from "next/navigation";
import { getStatusTone } from "../lib/status-tone";

const CATEGORIES = [
  "Onboarding",
  "Job analysis",
  "Application readiness",
  "Country/sponsorship guidance",
  "Bug",
  "Other",
] as const;

export function FeedbackWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [rating, setRating] = useState<string>("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setCategory(CATEGORIES[0]);
    setRating("");
    setMessage("");
    setStatus(null);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!message.trim()) {
      setStatus("Add a message before sending.");
      return;
    }

    setSubmitting(true);
    setStatus("Sending...");

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          rating: rating ? Number(rating) : undefined,
          message: message.trim(),
          productArea: category,
          route: pathname ?? undefined,
        }),
      });
      const body = (await response.json()) as { data: { id: string } | null; error: string | null };

      if (!response.ok || body.error || !body.data) {
        setStatus(body.error ?? "Feedback could not be sent. Try again shortly.");
        setSubmitting(false);
        return;
      }

      setStatus("Thanks - your feedback was sent.");
      setMessage("");
      setRating("");
      setSubmitting(false);
    } catch {
      setStatus("Request could not be completed. Try again shortly.");
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        className="button-primary feedback-widget-toggle"
        onClick={() => setOpen(true)}
      >
        Send feedback
      </button>
    );
  }

  return (
    <div className="feedback-widget-panel" role="dialog" aria-labelledby="feedback-widget-title">
      <div className="section-heading">
        <h2 id="feedback-widget-title">Send feedback</h2>
        <button
          type="button"
          aria-label="Close feedback form"
          onClick={() => {
            setOpen(false);
            reset();
          }}
        >
          x
        </button>
      </div>

      <form onSubmit={submit}>
        <label htmlFor="feedback-category">Category</label>
        <select
          id="feedback-category"
          value={category}
          disabled={submitting}
          onChange={(event) => setCategory(event.target.value)}
        >
          {CATEGORIES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <label htmlFor="feedback-rating">Rating (optional, 1-5)</label>
        <input
          id="feedback-rating"
          type="number"
          min={1}
          max={5}
          value={rating}
          disabled={submitting}
          onChange={(event) => setRating(event.target.value)}
        />

        <label htmlFor="feedback-message">Your feedback</label>
        <textarea
          id="feedback-message"
          rows={5}
          value={message}
          disabled={submitting}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="What worked, what was confusing, or anything you'd change..."
        />

        <button type="submit" className="button-primary" disabled={submitting}>
          {submitting ? "Sending..." : "Send feedback"}
        </button>
      </form>

      {status ? (
        <p className={`status-banner ${getStatusTone(status)}`}>{status}</p>
      ) : null}
    </div>
  );
}
