import { Link } from "react-router-dom";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import Card from "../ui/Card";
import {
  buddyRequestMinCompatibilityScore,
  canSendBuddyRequest,
} from "../../lib/buddyRequestThreshold";

function initials(name) {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

export default function MatchRecommendationCard({
  item,
  onSendRequest,
  busyId,
  outgoingPendingIds,
  acceptedBuddyIds = new Set(),
}) {
  const { profile, compatibilityScore, reasons } = item;
  const isPending = outgoingPendingIds?.has(profile.userId);
  const isBuddy = acceptedBuddyIds?.has(profile.userId);
  const minScore = buddyRequestMinCompatibilityScore();
  const allowedByScore = canSendBuddyRequest(compatibilityScore);
  const blockedByScore = minScore > 0 && !allowedByScore;

  return (
    <Card className="group flex flex-col overflow-hidden p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="flex gap-4">
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-teal-400 text-lg font-bold text-white shadow-lg ring-2 ring-white">
          {initials(profile.name)}
          <span className="absolute -bottom-1 -right-1 rounded-full bg-emerald-400 px-1.5 py-0.5 text-[10px] font-bold text-emerald-950 shadow">
            {compatibilityScore}%
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="truncate text-lg font-bold text-slate-900">
                {profile.name}
              </h3>
              <p className="truncate text-sm text-slate-500">
                {profile.studyMode || "Study mode"} ·{" "}
                {profile.studyPace || "pace"} pace
              </p>
            </div>
            <Badge tone={isBuddy ? "emerald" : "violet"}>{isBuddy ? "Buddies" : "Match"}</Badge>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {(profile.courses || []).slice(0, 5).map((c) => (
          <Badge key={c} tone="teal">
            {c}
          </Badge>
        ))}
        {(profile.topics || []).slice(0, 3).map((t) => (
          <Badge key={t} tone="neutral">
            {t}
          </Badge>
        ))}
      </div>

      <ul className="mt-4 space-y-1.5 border-t border-violet-100 pt-4 text-sm text-slate-600">
        {(reasons || []).slice(0, 4).map((r) => (
          <li key={r} className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400" />
            <span>{r}</span>
          </li>
        ))}
      </ul>

      {(profile.availability || []).length > 0 ? (
        <p className="mt-3 text-xs font-medium text-violet-700">
          Weekly slots (sample): {(profile.availability || []).slice(0, 3).join(" · ")}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          to={`/matches/view/${profile.userId}`}
          state={{ match: item }}
          className="text-sm font-semibold text-violet-700 underline-offset-4 hover:underline"
        >
          View profile
        </Link>
        {isBuddy ? (
          <span className="min-w-[8rem] rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-center text-sm font-semibold text-emerald-900">
            Study buddies
          </span>
        ) : (
          <Button
            type="button"
            variant={isPending || blockedByScore ? "secondary" : "primary"}
            disabled={!!busyId || isPending || blockedByScore}
            className="min-w-[8rem] px-5 py-2.5 text-sm"
            title={
              blockedByScore
                ? `Buddy requests need at least ${minScore}% compatibility (server rule). Strengthen shared courses, topics, or overlapping availability.`
                : undefined
            }
            onClick={() => onSendRequest(profile.userId)}
          >
            {busyId === profile.userId
              ? "Sending…"
              : isPending
                ? "Request sent"
                : blockedByScore
                  ? `Min ${minScore}%`
                  : "Send request"}
          </Button>
        )}
      </div>
    </Card>
  );
}
