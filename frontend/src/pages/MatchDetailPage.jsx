import { useMemo } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@apollo/client/react";
import {
  RECOMMEND_MATCHES,
  SEND_BUDDY_REQUEST,
  MY_OUTGOING_BUDDY_REQUESTS,
} from "../graphql/matching";
import { useAuthUser } from "../hooks/useAuthUser";
import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";

function initials(name) {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

export default function MatchDetailPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const stateMatch = location.state?.match;

  const { user, loading: userLoading } = useAuthUser();

  const { data, loading } = useQuery(RECOMMEND_MATCHES, {
    variables: { userId: user?.id ?? "", maxResults: 20 },
    skip: !user?.id,
    fetchPolicy: "cache-and-network",
  });

  const { data: outData } = useQuery(MY_OUTGOING_BUDDY_REQUESTS, {
    fetchPolicy: "cache-and-network",
  });

  const [sendRequest, { loading: sending }] = useMutation(SEND_BUDDY_REQUEST, {
    refetchQueries: [{ query: MY_OUTGOING_BUDDY_REQUESTS }],
  });

  const item = useMemo(() => {
    if (stateMatch?.profile?.userId === userId) return stateMatch;
    const list = data?.recommendMatches ?? [];
    return list.find((m) => m.profile.userId === userId) ?? null;
  }, [stateMatch, data, userId]);

  const outgoingPending = (outData?.myOutgoingBuddyRequests ?? []).some(
    (r) => r.receiverId === userId && r.status === "PENDING",
  );

  const handleSend = async () => {
    if (!userId) return;
    await sendRequest({
      variables: { input: { receiverId: userId, message: null } },
    });
  };

  if (userLoading || loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 pt-10">
        <div className="h-64 animate-pulse rounded-3xl bg-white/50 ring-1 ring-violet-100" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="mx-auto max-w-xl px-4 pb-24 pt-10 text-center">
        <Card className="p-10">
          <p className="text-lg font-semibold text-slate-900">
            Match not available
          </p>
          <p className="mt-2 text-sm text-slate-600">
            This profile isn’t in your current recommendations. Open Matching and
            select someone from the list, or wait until your overlap updates.
          </p>
          <Button
            type="button"
            className="mt-6 px-6 py-3"
            onClick={() => navigate("/matches")}
          >
            Back to matching
          </Button>
        </Card>
      </div>
    );
  }

  const { profile, compatibilityScore, reasons } = item;

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Match detail"
        title={profile.name}
        description="Compatibility breakdown and actions — messaging will plug in when your messaging subgraph is wired."
        action={
          <Link
            to="/matches"
            className="rounded-xl px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50"
          >
            ← All matches
          </Link>
        }
      />

      <Card dark className="mb-6 overflow-hidden p-8">
        <div className="flex flex-wrap items-start gap-6">
          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-2xl font-bold text-white ring-2 ring-white/30">
            {initials(profile.name)}
            <span className="absolute -bottom-2 -right-2 rounded-full bg-teal-400 px-2 py-0.5 text-xs font-bold text-violet-950">
              {compatibilityScore}%
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-violet-200">
              {profile.studyMode || "Mode"} · {profile.studyPace || "pace"} pace
              {profile.preferredGroupSize != null
                ? ` · Group ~${profile.preferredGroupSize}`
                : ""}
            </p>
            {profile.email ? (
              <p className="mt-1 truncate text-sm text-white/80">{profile.email}</p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              {(profile.courses ?? []).map((c) => (
                <Badge key={c} tone="teal">
                  {c}
                </Badge>
              ))}
              {(profile.topics ?? []).map((t) => (
                <Badge key={t} tone="neutral">
                  {t}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card className="mb-6 p-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-violet-700">
          Why you match
        </h2>
        <ul className="mt-4 space-y-2 text-slate-700">
          {(reasons ?? []).map((r) => (
            <li key={r} className="flex gap-2 text-sm">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400" />
              {r}
            </li>
          ))}
        </ul>
        {(profile.availability ?? []).length > 0 ? (
          <p className="mt-4 text-sm font-medium text-violet-800">
            Availability: {(profile.availability ?? []).join(" · ")}
          </p>
        ) : null}
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          disabled={sending || outgoingPending}
          className="px-6 py-3"
          onClick={handleSend}
        >
          {sending
            ? "Sending…"
            : outgoingPending
              ? "Request pending"
              : "Send buddy request"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="px-6 py-3"
          disabled
          title="Connect messaging service to enable chat"
        >
          Message (soon)
        </Button>
      </div>
    </div>
  );
}
