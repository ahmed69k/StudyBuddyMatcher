/**
 * Mirrors matching-service `BUDDY_REQUEST_MIN_COMPATIBILITY_SCORE` (default 40).
 * Set `VITE_BUDDY_REQUEST_MIN_COMPATIBILITY_SCORE` in the frontend env to the same value as the matching container when you override it.
 * Use `0` to allow any score (dev only).
 */
export function buddyRequestMinCompatibilityScore() {
  const raw = import.meta.env.VITE_BUDDY_REQUEST_MIN_COMPATIBILITY_SCORE;
  if (raw === undefined || raw === "") return 40;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 40;
}

export function canSendBuddyRequest(compatibilityScore) {
  const min = buddyRequestMinCompatibilityScore();
  if (min <= 0) return true;
  return compatibilityScore >= min;
}
