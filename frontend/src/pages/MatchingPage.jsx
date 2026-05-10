import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import toast from "react-hot-toast";
import {
  RECOMMEND_MATCHES,
  SEND_BUDDY_REQUEST,
  MY_OUTGOING_BUDDY_REQUESTS,
  MY_INCOMING_BUDDY_REQUESTS,
} from "../graphql/matching";
import { useAuthUser } from "../hooks/useAuthUser";
import BuddyRequestsPanel from "../components/matching/BuddyRequestsPanel";
import MatchRecommendationCard from "../components/matching/MatchRecommendationCard";
import Button from "../components/ui/Button";
import PageHeader from "../components/ui/PageHeader";
import { canSendBuddyRequest, buddyRequestMinCompatibilityScore } from "../lib/buddyRequestThreshold";
import { buildAcceptedBuddyIdSet } from "../lib/acceptedBuddyIds";

export default function MatchingPage() {
  const { user, loading: userLoading } = useAuthUser();
  const userId = user?.id;

  const {
    data,
    loading: recLoading,
    error: recError,
    refetch,
  } = useQuery(RECOMMEND_MATCHES, {
    variables: { userId: userId ?? "", maxResults: 12 },
    skip: !userId,
    fetchPolicy: "cache-and-network",
  });

  const { data: outData } = useQuery(MY_OUTGOING_BUDDY_REQUESTS, {
    fetchPolicy: "cache-and-network",
  });

  const { data: incData } = useQuery(MY_INCOMING_BUDDY_REQUESTS, {
    fetchPolicy: "cache-and-network",
  });

  const [sendRequest] = useMutation(SEND_BUDDY_REQUEST, {
    refetchQueries: [
      { query: MY_OUTGOING_BUDDY_REQUESTS },
      { query: MY_INCOMING_BUDDY_REQUESTS },
    ],
  });

  const [busyReceiverId, setBusyReceiverId] = useState(null);

  const outgoingPendingIds = useMemo(() => {
    const set = new Set();
    for (const r of outData?.myOutgoingBuddyRequests ?? []) {
      if (r.status === "PENDING") set.add(r.receiverId);
    }
    return set;
  }, [outData]);

  const acceptedBuddyIds = useMemo(
    () =>
      buildAcceptedBuddyIdSet(
        outData?.myOutgoingBuddyRequests,
        incData?.myIncomingBuddyRequests,
      ),
    [outData, incData],
  );

  const recommendations = data?.recommendMatches ?? [];

  const handleSend = async (receiverId) => {
    const row = recommendations.find((r) => r.profile.userId === receiverId);
    if (!row) {
      toast.error("Match data is missing. Refresh the list and try again.");
      return;
    }
    if (!canSendBuddyRequest(row.compatibilityScore)) {
      toast.error(
        `Compatibility must be at least ${buddyRequestMinCompatibilityScore()}% to send a request.`,
      );
      return;
    }
    if (acceptedBuddyIds.has(receiverId)) {
      toast.error("You are already study buddies with this user.");
      return;
    }
    setBusyReceiverId(receiverId);
    try {
      await sendRequest({
        variables: {
          input: { receiverId, message: null },
        },
      });
      toast.success("Buddy request sent.");
    } catch (e) {
      toast.error(e?.message || "Could not send request");
    } finally {
      setBusyReceiverId(null);
    }
  };

  const profileMissing =
    recError?.message?.includes("No user profile found") ?? false;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Discover"
        title="Matching"
        description="Find study partners ranked by shared courses, topics, availability, and study preferences — then send a buddy request."
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Link
              to="/availability"
              className="rounded-xl border border-violet-200 bg-white/90 px-4 py-2.5 text-sm font-semibold text-violet-800 shadow-[var(--shadow-card)] backdrop-blur-sm hover:border-violet-300"
            >
              Weekly availability
            </Link>
            <Link
              to="/matches/setup"
              className="rounded-xl border border-violet-200 bg-white/90 px-4 py-2.5 text-sm font-semibold text-violet-800 shadow-[var(--shadow-card)] backdrop-blur-sm hover:border-violet-300"
            >
              Matching profile
            </Link>
            <Button
              type="button"
              variant="secondary"
              className="px-4 py-2.5 text-sm"
              onClick={() => refetch()}
            >
              Refresh list
            </Button>
          </div>
        }
      />

      <section className="mb-14 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-slate-900">
            Recommended study buddies
          </h2>
          {!recLoading && recommendations.length > 0 ? (
            <span className="text-sm font-medium text-slate-500">
              {recommendations.length} suggestions
            </span>
          ) : null}
        </div>

        {userLoading || recLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-72 animate-pulse rounded-[1.35rem] bg-white/50 ring-1 ring-violet-100"
              />
            ))}
          </div>
        ) : profileMissing ? (
          <div className="rounded-[1.35rem] border border-dashed border-violet-300 bg-white/70 p-10 text-center backdrop-blur-sm">
            <p className="text-lg font-semibold text-slate-900">
              Complete your matching profile first
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
              The matching service needs a stored profile (courses and preferences) before it can rank partners.
              Add your weekly availability on the availability page, then use Refresh list.
            </p>
          </div>
        ) : recError ? (
          <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-100">
            {recError.message}
          </div>
        ) : recommendations.length === 0 ? (
          <div className="rounded-[1.35rem] bg-white/70 p-10 text-center ring-1 ring-violet-100 backdrop-blur-sm">
            <p className="font-semibold text-slate-800">No peers to show yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Once more students join with overlapping courses, matches will
              appear automatically.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {recommendations.map((item) => (
              <MatchRecommendationCard
                key={item.profile.userId}
                item={item}
                busyId={busyReceiverId}
                outgoingPendingIds={outgoingPendingIds}
                acceptedBuddyIds={acceptedBuddyIds}
                onSendRequest={handleSend}
              />
            ))}
          </div>
        )}
      </section>

      <BuddyRequestsPanel />
    </div>
  );
}
