import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import {
  MY_INCOMING_BUDDY_REQUESTS,
  MY_OUTGOING_BUDDY_REQUESTS,
  RESPOND_TO_BUDDY_REQUEST,
  CANCEL_BUDDY_REQUEST,
} from "../../graphql/matching";
import { GET_ALL_USERS_LABELS } from "../../graphql/auth";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import Card from "../ui/Card";
import SegmentedTabs from "../ui/SegmentedTabs";

/** Fallback when a user id is not in `getAllUsers` (uses same shape as legacy short-id display). */
function shortId(id) {
  if (id == null || id === "") return "";
  const s = String(id);
  return s.length > 10 ? `${s.slice(0, 6)}…${s.slice(-4)}` : s;
}

function statusTone(status) {
  switch (status) {
    case "PENDING":
      return "amber";
    case "ACCEPTED":
      return "emerald";
    case "DECLINED":
      return "rose";
    case "CANCELLED":
      return "neutral";
    default:
      return "neutral";
  }
}

export default function BuddyRequestsPanel() {
  const [tab, setTab] = useState("incoming");

  const { data: incData, loading: incLoading, error: incError } = useQuery(
    MY_INCOMING_BUDDY_REQUESTS,
    { fetchPolicy: "cache-and-network" },
  );
  const { data: outData, loading: outLoading, error: outError } = useQuery(
    MY_OUTGOING_BUDDY_REQUESTS,
    { fetchPolicy: "cache-and-network" },
  );

  const { data: labelsData } = useQuery(GET_ALL_USERS_LABELS, {
    fetchPolicy: "cache-first",
  });

  const usernameById = useMemo(() => {
    const m = new Map();
    for (const u of labelsData?.getAllUsers ?? []) {
      if (u?.id != null) m.set(String(u.id), u.username || "");
    }
    return m;
  }, [labelsData?.getAllUsers]);

  const displayName = (userId) => {
    const key = userId != null ? String(userId) : "";
    const name = usernameById.get(key);
    if (name && String(name).trim()) return String(name).trim();
    return shortId(userId);
  };

  const [respond, { loading: responding }] = useMutation(
    RESPOND_TO_BUDDY_REQUEST,
    {
      refetchQueries: [
        { query: MY_INCOMING_BUDDY_REQUESTS },
        { query: MY_OUTGOING_BUDDY_REQUESTS },
      ],
    },
  );

  const [cancelRequest, { loading: cancelling }] = useMutation(
    CANCEL_BUDDY_REQUEST,
    {
      refetchQueries: [
        { query: MY_INCOMING_BUDDY_REQUESTS },
        { query: MY_OUTGOING_BUDDY_REQUESTS },
      ],
    },
  );

  const incoming = incData?.myIncomingBuddyRequests ?? [];
  const outgoing = outData?.myOutgoingBuddyRequests ?? [];

  const counts = useMemo(() => {
    const incomingPending = incoming.filter((r) => r.status === "PENDING")
      .length;
    const outgoingPending = outgoing.filter((r) => r.status === "PENDING")
      .length;
    const accepted =
      incoming.filter((r) => r.status === "ACCEPTED").length +
      outgoing.filter((r) => r.status === "ACCEPTED").length;
    return { incomingPending, outgoingPending, accepted };
  }, [incoming, outgoing]);

  const tabs = [
    { id: "incoming", label: "Incoming", badge: counts.incomingPending },
    { id: "outgoing", label: "Outgoing", badge: counts.outgoingPending },
    { id: "accepted", label: "Accepted", badge: counts.accepted },
  ];

  const visibleRows = useMemo(() => {
    if (tab === "incoming") {
      return incoming
        .filter((r) => r.status === "PENDING")
        .map((r) => ({ ...r, role: "incoming" }));
    }
    if (tab === "outgoing") {
      return outgoing.map((r) => ({ ...r, role: "outgoing" }));
    }
    const accInc = incoming
      .filter((r) => r.status === "ACCEPTED")
      .map((r) => ({ ...r, role: "incoming" }));
    const accOut = outgoing
      .filter((r) => r.status === "ACCEPTED")
      .map((r) => ({ ...r, role: "outgoing" }));
    return [...accInc, ...accOut].sort(
      (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt),
    );
  }, [tab, incoming, outgoing]);

  const loading = incLoading || outLoading;
  const queryError = incError || outError;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Buddy requests</h2>
          <p className="text-sm text-slate-600">
            Accept or decline incoming invites; track what you’ve sent.
          </p>
        </div>
        <SegmentedTabs tabs={tabs} active={tab} onChange={setTab} />
      </div>

      <Card className="p-0 overflow-hidden">
        {queryError ? (
          <div className="p-12 text-center">
            <p className="font-medium text-rose-800">Could not load buddy requests</p>
            <p className="mt-1 text-sm text-rose-700/90">{queryError.message}</p>
            <p className="mt-3 text-xs text-slate-500">
              Check the browser Network tab for the GraphQL response, or restart{" "}
              <span className="font-medium text-slate-600">graphql-gateway</span> after updating
              subgraphs so the gateway schema matches the services.
            </p>
          </div>
        ) : loading ? (
          <div className="p-12 text-center text-slate-500">Loading requests…</div>
        ) : visibleRows.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-medium text-slate-800">Nothing here yet</p>
            <p className="mt-1 text-sm text-slate-500">
              {tab === "incoming"
                ? "When someone sends you a request, it will show up here."
                : tab === "outgoing"
                  ? "Send a request from recommended matches above."
                  : "Accepted connections will appear here."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-violet-100">
            {visibleRows.map((row) => (
              <li
                key={`${row.role}-${row.id}`}
                className="flex flex-col gap-4 p-5 transition-colors hover:bg-violet-50/40 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-teal-100 text-sm font-bold text-violet-800">
                    {row.role === "incoming" ? "→" : "←"}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">
                      {row.role === "incoming"
                        ? `From ${displayName(row.requesterId)}`
                        : `To ${displayName(row.receiverId)}`}
                    </p>
                    {row.message ? (
                      <p className="mt-0.5 text-sm text-slate-600">
                        “{row.message}”
                      </p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge tone={statusTone(row.status)}>{row.status}</Badge>
                      <span className="text-xs text-slate-400">
                        {new Date(row.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {tab === "incoming" && row.status === "PENDING" ? (
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      variant="success"
                      className="px-4 py-2 text-sm"
                      disabled={responding}
                      onClick={() =>
                        respond({
                          variables: {
                            requestId: row.id,
                            decision: "ACCEPT",
                          },
                        })
                      }
                    >
                      Accept
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      className="px-4 py-2 text-sm"
                      disabled={responding}
                      onClick={() =>
                        respond({
                          variables: {
                            requestId: row.id,
                            decision: "DECLINE",
                          },
                        })
                      }
                    >
                      Decline
                    </Button>
                  </div>
                ) : null}

                {tab === "outgoing" &&
                row.role === "outgoing" &&
                row.status === "PENDING" ? (
                  <div className="flex shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      className="px-4 py-2 text-sm text-slate-600 ring-1 ring-slate-200"
                      disabled={cancelling}
                      onClick={() =>
                        cancelRequest({ variables: { requestId: row.id } })
                      }
                    >
                      {cancelling ? "…" : "Withdraw"}
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
