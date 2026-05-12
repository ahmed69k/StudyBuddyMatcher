import { Link } from "react-router-dom";
import { useMemo, useState, useEffect } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";
import {
  RECOMMEND_MATCHES,
  SEND_BUDDY_REQUEST,
  MY_OUTGOING_BUDDY_REQUESTS,
  MY_INCOMING_BUDDY_REQUESTS,
} from "../graphql/matching";
import { MY_SESSIONS, JOIN_SESSION } from "../graphql/sessions";
import { GET_MY_NOTIFICATIONS } from "../graphql/notifications";
import { useAuthUser } from "../hooks/useAuthUser";
import MatchRecommendationCard from "../components/matching/MatchRecommendationCard";
import LinkButton from "../components/ui/LinkButton";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import { canSendBuddyRequest, buddyRequestMinCompatibilityScore } from "../lib/buddyRequestThreshold";
import { buildAcceptedBuddyIdSet } from "../lib/acceptedBuddyIds";

function parseIso(raw) {
  if (raw == null || raw === "") return null;
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) return d;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (Number.isFinite(n)) {
    const d2 = new Date(n);
    return Number.isNaN(d2.getTime()) ? null : d2;
  }
  return null;
}

function sessionEndMs(start, durationMin) {
  return start.getTime() + durationMin * 60 * 1000;
}

function formatRange(start, durationMin) {
  const end = new Date(start.getTime() + durationMin * 60 * 1000);
  const opts = { hour: "numeric", minute: "2-digit" };
  return `${start.toLocaleTimeString(undefined, opts)} – ${end.toLocaleTimeString(undefined, opts)}`;
}

function DashboardAvatar({ name, imageUrl, size = "lg" }) {
  const initial = name?.trim()?.[0]?.toUpperCase() || "?";
  const sizeCls =
    size === "lg" ? "h-20 w-20 text-2xl ring-4" : "h-14 w-14 text-lg ring-2";

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        className={`${sizeCls} rounded-full object-cover shadow-xl ring-white`}
      />
    );
  }

  return (
    <div
      className={`flex ${sizeCls} shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-teal-400 font-bold text-white shadow-xl ring-white`}
    >
      {initial}
    </div>
  );
}

const quickNav = [
  {
    to: "/matches",
    label: "Matching",
    description: "Discover buddies",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
      />
    ),
  },
  {
    to: "/sessions",
    label: "Sessions",
    description: "Schedule & join",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    ),
  },
  {
    to: "/profile",
    label: "Profile",
    description: "Your public page",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M5.121 17.804A4 4 0 0112 15h0a4 4 0 016.879 2.804M15 11a3 3 0 11-6 0 3 3 0 016 0z"
      />
    ),
  },
  {
    to: "/notifications",
    label: "Notifications",
    description: "Alerts & updates",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0m6 0H9"
      />
    ),
  },
];

export default function DashboardPage() {
  const { user, loading: userLoading } = useAuthUser();
  const userId = user?.id;
  const displayName = user?.username?.trim() || "there";

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const {
    data: recData,
    loading: recLoading,
    error: recError,
    refetch: refetchMatches,
  } = useQuery(RECOMMEND_MATCHES, {
    variables: { userId: userId ?? "", maxResults: 6 },
    skip: !userId,
    fetchPolicy: "cache-and-network",
  });

  const { data: outData } = useQuery(MY_OUTGOING_BUDDY_REQUESTS, {
    skip: !userId,
    fetchPolicy: "cache-and-network",
  });

  const { data: incData } = useQuery(MY_INCOMING_BUDDY_REQUESTS, {
    skip: !userId,
    fetchPolicy: "cache-and-network",
  });

  const { data: sessionData, loading: sessionsLoading, error: sessionsError } = useQuery(
    MY_SESSIONS,
    {
      skip: !userId,
      fetchPolicy: "cache-and-network",
    },
  );

  const {
    data: notifData,
    loading: notifLoading,
    error: notifError,
  } = useQuery(GET_MY_NOTIFICATIONS, {
    skip: !userId,
    fetchPolicy: "cache-and-network",
  });

  const [sendRequest] = useMutation(SEND_BUDDY_REQUEST, {
    refetchQueries: [
      { query: MY_OUTGOING_BUDDY_REQUESTS },
      { query: MY_INCOMING_BUDDY_REQUESTS },
    ],
  });

  const [joinSession, { loading: joinBusy }] = useMutation(JOIN_SESSION, {
    refetchQueries: [{ query: MY_SESSIONS, fetchPolicy: "network-only" }],
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

  const upcomingSessions = useMemo(() => {
    const sessions = sessionData?.sessions ?? [];
    const nowMs = Date.now();
    void tick;
    const up = [];
    for (const s of sessions) {
      const dt = parseIso(s.dateTime);
      if (!dt) continue;
      const dur = Number(s.duration) || 0;
      if (sessionEndMs(dt, dur) > nowMs) up.push({ ...s, _dt: dt });
    }
    up.sort((a, b) => a._dt - b._dt);
    return up.slice(0, 4);
  }, [sessionData?.sessions, tick]);

  const notifications = notifData?.getMyNotifications ?? [];
  const previewNotifications = useMemo(
    () => [...notifications].sort((a, b) => Number(b.date) - Number(a.date)).slice(0, 5),
    [notifications],
  );
  const unreadNotifCount = useMemo(
    () => notifications.filter((n) => !n.readStatus).length,
    [notifications],
  );

  const recommendations = recData?.recommendMatches ?? [];
  const profileMissing =
    recError?.message?.includes("No user profile found") ?? false;

  const handleSend = async (receiverId) => {
    const row = recommendations.find((r) => r.profile.userId === receiverId);
    if (!row) {
      toast.error("Match data is missing. Refresh and try again.");
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
        variables: { input: { receiverId, message: null } },
      });
      toast.success("Buddy request sent.");
    } catch (e) {
      toast.error(e?.message || "Could not send request");
    } finally {
      setBusyReceiverId(null);
    }
  };

  const formatNotifRelative = (dateString) => {
    const date = new Date(Number(dateString) || dateString);
    if (Number.isNaN(date.getTime())) return "";
    return formatDistanceToNow(date, { addSuffix: true });
  };

  return (
    <main className="relative overflow-hidden px-4 pb-24 pt-6 sm:px-6 lg:px-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgb(196_181_253_/_0.35),transparent)]"
      />

      <div className="mx-auto max-w-6xl space-y-10">
        {/* Welcome */}
        <section className="overflow-hidden rounded-[2rem] border border-violet-200/60 bg-gradient-to-br from-violet-100/90 via-white to-teal-50/80 p-8 shadow-[var(--shadow-soft)] backdrop-blur-md sm:p-10 lg:p-12">
          <div className="flex flex-col items-center gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
              <DashboardAvatar
                name={user?.username}
                imageUrl={user?.profilePicture}
              />
              <div className="text-center sm:text-left">
                <p className="text-sm font-semibold uppercase tracking-wide text-violet-600">
                  Your dashboard
                </p>
                <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                  Welcome,{" "}
                  <span className="bg-gradient-to-r from-violet-600 to-teal-500 bg-clip-text text-transparent">
                    {userLoading ? "…" : displayName}
                  </span>
                  !
                </h1>
                <p className="mt-3 max-w-xl text-base text-slate-600 sm:text-lg">
                  Find study partners, keep an eye on upcoming sessions, and stay on top of invites — all in one place.
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                  <LinkButton to="/matches" className="min-w-[11rem] px-6 py-3">
                    Find study buddies
                  </LinkButton>
                  <LinkButton
                    to="/sessions/new"
                    variant="secondary"
                    className="min-w-[11rem] px-6 py-3"
                  >
                    Plan a session
                  </LinkButton>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Quick navigation */}
        <section>
          <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-violet-600/90">
            Quick navigation
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {quickNav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="group flex items-center gap-4 rounded-2xl border border-violet-100/90 bg-white/80 p-4 shadow-[var(--shadow-card)] backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-lg"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-teal-50 text-violet-700 transition group-hover:from-violet-200 group-hover:to-teal-100">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {item.icon}
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-900">{item.label}</p>
                  <p className="text-xs text-slate-500">{item.description}</p>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
            <span className="rounded-lg bg-white/60 px-2 py-1 ring-1 ring-violet-100">
              <Link to="/matches/setup" className="font-semibold text-violet-700 hover:underline">
                Matching profile
              </Link>
            </span>
            <span className="rounded-lg bg-white/60 px-2 py-1 ring-1 ring-violet-100">
              <Link to="/availability" className="font-semibold text-violet-700 hover:underline">
                Weekly availability
              </Link>
            </span>
            <span className="rounded-lg bg-white/60 px-2 py-1 ring-1 ring-violet-100">
              <Link to="/settings" className="font-semibold text-violet-700 hover:underline">
                Account settings
              </Link>
            </span>
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Upcoming sessions */}
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-teal-400 text-lg shadow-md">
                  📅
                </span>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Upcoming sessions</h2>
                  <p className="text-xs text-slate-500">Next on your calendar</p>
                </div>
              </div>
              <Link
                to="/sessions"
                className="text-sm font-semibold text-violet-700 hover:underline"
              >
                View all
              </Link>
            </div>

            <Card className="overflow-hidden p-0">
              {sessionsLoading ? (
                <div className="space-y-3 p-5">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-20 animate-pulse rounded-xl bg-violet-50/80 ring-1 ring-violet-100"
                    />
                  ))}
                </div>
              ) : sessionsError ? (
                <div className="p-5 text-sm text-rose-800">{sessionsError.message}</div>
              ) : upcomingSessions.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="font-semibold text-slate-800">No upcoming sessions</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Create one with your buddies or join an invite from the sessions page.
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    <LinkButton to="/sessions/new" className="px-5 py-2.5 text-sm">
                      New session
                    </LinkButton>
                    <LinkButton to="/sessions" variant="secondary" className="px-5 py-2.5 text-sm">
                      Browse sessions
                    </LinkButton>
                  </div>
                </div>
              ) : (
                <ul className="divide-y divide-violet-100">
                  {upcomingSessions.map((s) => (
                    <li key={s.id} className="p-5 transition-colors hover:bg-violet-50/40">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <h3 className="truncate text-base font-bold text-slate-900">{s.topic}</h3>
                          <p className="mt-0.5 text-sm text-slate-600">
                            {s._dt.toLocaleDateString(undefined, {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}{" "}
                            · {formatRange(s._dt, Number(s.duration) || 0)}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Badge tone={s.sessionType === "ONLINE" ? "violet" : "teal"}>
                              {s.sessionType === "ONLINE" ? "Online" : "In person"}
                            </Badge>
                            {s.viewerIsHost ? (
                              <Badge tone="amber">Hosting</Badge>
                            ) : s.viewerInvitePending ? (
                              <Badge tone="violet">Invited</Badge>
                            ) : s.viewerHasJoined ? (
                              <Badge tone="emerald">Joined</Badge>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          {s.viewerInvitePending && userId ? (
                            <Button
                              type="button"
                              variant="success"
                              className="px-4 py-2 text-sm"
                              disabled={joinBusy}
                              onClick={() =>
                                void joinSession({
                                  variables: { sessionId: s.id, userId },
                                })
                                  .then(() => toast.success("You're in — session updated."))
                                  .catch((e) =>
                                    toast.error(e?.message || "Could not join session"),
                                  )
                              }
                            >
                              {joinBusy ? "Joining…" : "Accept invite"}
                            </Button>
                          ) : null}
                          <LinkButton
                            to={`/sessions/${s.id}`}
                            variant="secondary"
                            className="px-4 py-2 text-sm"
                          >
                            {s.viewerHasJoined || s.viewerIsHost ? "Open session" : "View details"}
                          </LinkButton>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>

          {/* Notifications */}
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-teal-400 text-lg shadow-md">
                  🔔
                </span>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Notifications</h2>
                  <p className="text-xs text-slate-500">
                    {unreadNotifCount > 0
                      ? `${unreadNotifCount} unread`
                      : "Latest updates"}
                  </p>
                </div>
              </div>
              <Link
                to="/notifications"
                className="text-sm font-semibold text-violet-700 hover:underline"
              >
                View all
              </Link>
            </div>

            <Card className="overflow-hidden p-0">
              {notifLoading ? (
                <div className="space-y-3 p-5">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-16 animate-pulse rounded-xl bg-violet-50/80 ring-1 ring-violet-100"
                    />
                  ))}
                </div>
              ) : notifError ? (
                <div className="p-5 text-sm text-rose-800">{notifError.message}</div>
              ) : previewNotifications.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="font-semibold text-slate-800">{"You're all caught up"}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Buddy requests and session updates will show up here.
                  </p>
                  <LinkButton
                    to="/notifications"
                    variant="secondary"
                    className="mt-4 px-5 py-2.5 text-sm"
                  >
                    Open inbox
                  </LinkButton>
                </div>
              ) : (
                <ul className="divide-y divide-violet-100">
                  {previewNotifications.map((n) => (
                    <li key={n.id}>
                      <Link
                        to={`/notifications/${n.id}`}
                        className={`block p-4 transition hover:bg-violet-50/50 ${
                          !n.readStatus ? "bg-violet-50/30" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900">{n.subject}</p>
                            <p className="mt-0.5 line-clamp-2 text-sm text-slate-600">{n.message}</p>
                          </div>
                          {!n.readStatus ? (
                            <span className="shrink-0 rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                              New
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-2 text-xs text-slate-400">
                          {formatNotifRelative(n.date)}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>
        </div>

        {/* Recommended buddies */}
        <section className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Recommended study buddies</h2>
              <p className="mt-1 text-sm text-slate-600">
                Based on your courses, topics, availability, and study preferences.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <LinkButton to="/matches" variant="secondary" className="px-4 py-2 text-sm">
                Full matching page
              </LinkButton>
              <Button
                type="button"
                variant="secondary"
                className="px-4 py-2 text-sm"
                onClick={() => void refetchMatches()}
              >
                Refresh
              </Button>
            </div>
          </div>

          {userLoading || recLoading ? (
            <div className="flex gap-5 overflow-x-auto pb-2 lg:grid lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-80 min-w-[17rem] shrink-0 animate-pulse rounded-[1.35rem] bg-white/50 ring-1 ring-violet-100 lg:min-w-0"
                />
              ))}
            </div>
          ) : profileMissing ? (
            <Card className="border border-dashed border-violet-300 bg-white/70 p-10 text-center backdrop-blur-sm">
              <p className="text-lg font-semibold text-slate-900">Set up your matching profile</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
                Add courses and preferences so we can suggest study partners.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <LinkButton to="/matches/setup">Matching profile</LinkButton>
                <LinkButton to="/availability" variant="secondary">
                  Availability
                </LinkButton>
              </div>
            </Card>
          ) : recError ? (
            <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-100">
              {recError.message}
            </div>
          ) : recommendations.length === 0 ? (
            <Card className="p-10 text-center ring-1 ring-violet-100">
              <p className="font-semibold text-slate-800">No peers to show yet</p>
              <p className="mt-1 text-sm text-slate-500">
                When more students overlap your courses, suggestions appear here automatically.
              </p>
              <LinkButton to="/matches" variant="secondary" className="mt-4 px-5 py-2.5 text-sm">
                Open matching
              </LinkButton>
            </Card>
          ) : (
            <div className="flex gap-5 overflow-x-auto pb-3 pt-1 [scrollbar-width:thin] lg:grid lg:grid-cols-3 lg:overflow-visible">
              {recommendations.map((item) => (
                <div
                  key={item.profile.userId}
                  className="min-w-[18rem] max-w-md shrink-0 lg:min-w-0 lg:max-w-none"
                >
                  <MatchRecommendationCard
                    item={item}
                    busyId={busyReceiverId}
                    outgoingPendingIds={outgoingPendingIds}
                    acceptedBuddyIds={acceptedBuddyIds}
                    onSendRequest={handleSend}
                    showInviteToStudy
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
