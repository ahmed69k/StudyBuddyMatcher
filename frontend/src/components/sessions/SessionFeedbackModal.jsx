import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { SESSION_FEEDBACK, SUBMIT_FEEDBACK } from "../../graphql/feedback";
import { GET_ALL_USERS_LABELS } from "../../graphql/auth";
import Button from "../ui/Button";
import Card from "../ui/Card";

const RATING_FIELDS = [
  { key: "overallRating", label: "Overall" },
  { key: "punctuality", label: "Punctuality" },
  { key: "helpfulness", label: "Helpfulness" },
  { key: "communication", label: "Communication" },
];

function emptyForm() {
  return {
    overallRating: "",
    punctuality: "",
    helpfulness: "",
    communication: "",
    noShow: false,
    comment: "",
  };
}

export default function SessionFeedbackModal({ session, meId, isOpen, onClose }) {
  const sessionId = session?.id ?? "";

  const { data: labelsData } = useQuery(GET_ALL_USERS_LABELS, {
    skip: !isOpen,
    fetchPolicy: "cache-first",
  });

  const nameById = useMemo(() => {
    const m = new Map();
    for (const u of labelsData?.getAllUsers ?? []) {
      if (u?.id != null && u?.username != null) m.set(String(u.id), u.username);
    }
    return m;
  }, [labelsData?.getAllUsers]);

  const {
    data: fbData,
    loading: fbLoading,
    error: fbError,
    refetch: refetchFeedback,
  } = useQuery(SESSION_FEEDBACK, {
    variables: { sessionId },
    skip: !isOpen || !sessionId,
    fetchPolicy: "network-only",
  });

  const [submitFeedback, { loading: submitting }] = useMutation(SUBMIT_FEEDBACK, {
    onCompleted: () => {
      void refetchFeedback();
      setForm(emptyForm());
      setFormError("");
    },
    onError: (err) => {
      setFormError(err.message || "Could not submit feedback");
    },
  });

  const otherUserIds = useMemo(() => {
    const ids = [];
    const seen = new Set();
    for (const p of session?.participants ?? []) {
      const uid = String(p.userId);
      if (!meId || uid === String(meId)) continue;
      if (seen.has(uid)) continue;
      seen.add(uid);
      ids.push(uid);
    }
    return ids;
  }, [session?.participants, meId]);

  const myFeedbackByReviewee = useMemo(() => {
    const m = new Map();
    const rows = fbData?.sessionFeedback ?? [];
    for (const row of rows) {
      if (String(row.reviewerId) === String(meId)) {
        m.set(String(row.revieweeId), row);
      }
    }
    return m;
  }, [fbData?.sessionFeedback, meId]);

  const unratedIds = useMemo(
    () => otherUserIds.filter((id) => !myFeedbackByReviewee.has(id)),
    [otherUserIds, myFeedbackByReviewee],
  );

  const [selectedRevieweeId, setSelectedRevieweeId] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setSelectedRevieweeId("");
      setForm(emptyForm());
      setFormError("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || unratedIds.length === 0) return;
    if (!selectedRevieweeId || !unratedIds.includes(selectedRevieweeId)) {
      setSelectedRevieweeId(unratedIds[0]);
      setForm(emptyForm());
      setFormError("");
    }
  }, [isOpen, unratedIds, selectedRevieweeId]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const displayName = (userId) => {
    const u = String(userId);
    const isHost = session && String(session.creatorId) === u;
    const name = (nameById.get(u) ?? "").trim();
    const base = name || `User ${u.slice(0, 8)}…`;
    return isHost ? `${base} (host)` : base;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!sessionId || !selectedRevieweeId) return;

    const nums = {};
    for (const { key } of RATING_FIELDS) {
      const n = Number(form[key]);
      if (!Number.isInteger(n) || n < 1 || n > 5) {
        setFormError("Please choose a score from 1 to 5 for each category.");
        return;
      }
      nums[key] = n;
    }

    await submitFeedback({
      variables: {
        input: {
          sessionId,
          revieweeId: selectedRevieweeId,
          overallRating: nums.overallRating,
          punctuality: nums.punctuality,
          helpfulness: nums.helpfulness,
          communication: nums.communication,
          noShow: !!form.noShow,
          comment: form.comment?.trim() || null,
        },
      },
    });
  };

  if (!isOpen || !session) return null;

  const backdrop = (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <Card className="p-6 shadow-2xl ring-1 ring-violet-100">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2
                id="feedback-modal-title"
                className="text-lg font-bold text-slate-900"
              >
                Session feedback
              </h2>
              <p className="mt-1 text-sm text-slate-600">{session.topic}</p>
            </div>
            <button
              type="button"
              className="rounded-lg px-2 py-1 text-sm font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              onClick={onClose}
            >
              Close
            </button>
          </div>

          {fbLoading ? (
            <p className="mt-6 text-sm text-slate-600">Loading feedback…</p>
          ) : fbError ? (
            <p className="mt-6 text-sm text-rose-700">
              {fbError.message}
            </p>
          ) : otherUserIds.length === 0 ? (
            <p className="mt-6 text-sm text-slate-600">
              There is no one else listed on this session to rate.
            </p>
          ) : unratedIds.length === 0 ? (
            <p className="mt-6 text-sm font-medium text-emerald-800">
              You have submitted feedback for everyone in this session. Thank you.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Who are you rating?
                </label>
                <select
                  value={selectedRevieweeId}
                  onChange={(e) => {
                    setSelectedRevieweeId(e.target.value);
                    setForm(emptyForm());
                    setFormError("");
                  }}
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-300"
                >
                  {unratedIds.map((uid) => (
                    <option key={uid} value={uid}>
                      {displayName(uid)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {RATING_FIELDS.map(({ key, label }) => (
                  <div key={key}>
                    <label className="text-sm font-medium text-slate-700">
                      {label} (1–5)
                    </label>
                    <select
                      required
                      value={form[key]}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, [key]: e.target.value }))
                      }
                      className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-300"
                    >
                      <option value="">Choose…</option>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.noShow}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, noShow: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                />
                Mark as no-show
              </label>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Comment (optional)
                </label>
                <textarea
                  value={form.comment}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, comment: e.target.value }))
                  }
                  rows={3}
                  className="mt-1 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-300"
                  placeholder="Anything that helps others study together…"
                />
              </div>

              {formError ? (
                <p className="text-sm text-rose-700">{formError}</p>
              ) : null}

              <div className="flex flex-wrap gap-3 pt-2">
                <Button type="submit" className="px-6 py-3" disabled={submitting}>
                  {submitting ? "Sending…" : "Submit feedback"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="px-6 py-3"
                  onClick={onClose}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {otherUserIds.length > 0 && myFeedbackByReviewee.size > 0 ? (
            <div className="mt-6 border-t border-slate-100 pt-4">
              <p className="text-xs font-bold uppercase tracking-wider text-violet-600/80">
                Already submitted
              </p>
              <ul className="mt-2 space-y-1 text-sm text-slate-600">
                {[...myFeedbackByReviewee.entries()].map(([rid, row]) => (
                  <li key={rid}>
                    {displayName(rid)} — overall {row.overallRating}/5
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );

  return backdrop;
}
