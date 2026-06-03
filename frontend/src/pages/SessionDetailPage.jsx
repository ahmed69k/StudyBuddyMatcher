import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@apollo/client/react";
import {
  GET_SESSION,
  UPDATE_SESSION,
  JOIN_SESSION,
  LEAVE_SESSION,
  CANCEL_SESSION,
  MY_SESSIONS,
} from "../graphql/sessions";
import { GET_ALL_USERS_LABELS } from "../graphql/auth";
import { useAuthUser } from "../hooks/useAuthUser";
import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import SessionFeedbackModal from "../components/sessions/SessionFeedbackModal";

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

function toDatetimeLocalValue(iso) {
  const d = parseIso(iso);
  if (!d) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function SessionDetailPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthUser();

  const { data, loading, error, refetch } = useQuery(GET_SESSION, {
    variables: { id: sessionId ?? "" },
    skip: !sessionId,
    fetchPolicy: "network-only",
    errorPolicy: "all",
  });

  const session = data?.session;

  const { data: labelsData, loading: labelsLoading } = useQuery(
    GET_ALL_USERS_LABELS,
    {
      skip: !(session?.participants?.length > 0),
      fetchPolicy: "cache-first",
    },
  );

  const nameById = useMemo(() => {
    const m = new Map();
    for (const u of labelsData?.getAllUsers ?? []) {
      if (u?.id != null && u?.username != null) m.set(String(u.id), u.username);
    }
    return m;
  }, [labelsData?.getAllUsers]);

  const errMsg =
    error?.graphQLErrors?.map((e) => e.message).join(" ") ||
    error?.message ||
    "";

  const isForbidden =
    errMsg.includes("Not authorized") || errMsg.includes("authorized");

  const refetchMySessions = useMemo(
    () =>
      user?.id
        ? [{ query: MY_SESSIONS, fetchPolicy: "network-only" }]
        : [],
    [user?.id],
  );

  const [joinSession, { loading: joining }] = useMutation(JOIN_SESSION, {
    refetchQueries: [
      { query: GET_SESSION, variables: { id: sessionId } },
      ...refetchMySessions,
    ],
  });

  const [leaveSession, { loading: leaving }] = useMutation(LEAVE_SESSION, {
    refetchQueries: refetchMySessions,
    onCompleted: () => navigate("/sessions"),
  });

  const [cancelSession, { loading: cancelling }] = useMutation(
    CANCEL_SESSION,
    {
      refetchQueries: refetchMySessions,
      onCompleted: () => navigate("/sessions"),
    },
  );

  const [updateSession, { loading: updating }] = useMutation(UPDATE_SESSION, {
    refetchQueries: [
      { query: GET_SESSION, variables: { id: sessionId } },
      ...refetchMySessions,
    ],
  });

  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTopic, setEditTopic] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDateTime, setEditDateTime] = useState("");
  const [editDuration, setEditDuration] = useState(60);
  const [editSessionType, setEditSessionType] = useState("ONLINE");
  const [editContactInfo, setEditContactInfo] = useState("");

  useEffect(() => {
    if (!session) return;
    setEditTopic(session.topic ?? "");
    setEditDescription(session.description ?? "");
    setEditDateTime(toDatetimeLocalValue(session.dateTime));
    setEditDuration(session.duration ?? 60);
    setEditSessionType(session.sessionType ?? "ONLINE");
    setEditContactInfo(session.contactInfo ?? "");
  }, [session]);

  const meId = user?.id;

  const participantDisplayName = (participant) => {
    const uid = String(participant.userId);
    const fromList = (nameById.get(uid) ?? "").trim();
    if (fromList) return fromList;
    if (meId && uid === String(meId) && user?.username) return user.username;
    return null;
  };

  const viewerIsHost = !!(meId && session?.viewerIsHost);
  const viewerHasJoined = !!(meId && session?.viewerHasJoined);
  const viewerInvitePending = !!(meId && session?.viewerInvitePending);

  const handleJoin = async () => {
    if (!sessionId || !meId) return;
    await joinSession({
      variables: { sessionId, userId: meId },
    });
    await refetch();
  };

  const handleLeave = async () => {
    if (!sessionId || !meId) return;
    if (!confirm("Leave this session?")) return;
    await leaveSession({ variables: { sessionId, userId: meId } });
  };

  const handleCancel = async () => {
    if (!sessionId || !meId) return;
    if (!confirm("Cancel this session for everyone? This cannot be undone."))
      return;
    await cancelSession({ variables: { sessionId, userId: meId } });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!sessionId) return;
    const iso = new Date(editDateTime).toISOString();
    await updateSession({
      variables: {
        sessionId,
        input: {
          topic: editTopic.trim(),
          description: editDescription.trim() || null,
          dateTime: iso,
          duration: Number(editDuration),
          sessionType: editSessionType,
          contactInfo: editContactInfo.trim() || null,
        },
      },
    });
    setEditing(false);
  };

  if (loading && !session) {
    return (
      <div className="mx-auto max-w-3xl px-4 pt-10">
        <div className="h-48 animate-pulse rounded-3xl bg-white/50 ring-1 ring-violet-100" />
      </div>
    );
  }

  if (!loading && !session && isForbidden && meId) {
    return (
      <div className="mx-auto max-w-lg px-4 pb-24 pt-10">
        <PageHeader
          eyebrow="Session"
          title="No access"
          description="This session exists, but you don’t have an invite. Ask the host to add you as a study buddy invite, or open it from your Sessions list after you’re invited."
        />
        <Card className="p-8 text-center">
          <Link
            to="/sessions"
            className="inline-block text-sm font-semibold text-violet-700 hover:underline"
          >
            ← Back to sessions
          </Link>
        </Card>
      </div>
    );
  }

  if (!loading && !session && !isForbidden) {
    return (
      <div className="mx-auto max-w-lg px-4 pb-24 pt-10 text-center">
        <Card className="p-10">
          <p className="font-semibold text-slate-900">Session not found</p>
          <p className="mt-2 text-sm text-slate-600">
            Check the link or ask the host for a new invite.
          </p>
          <Link
            to="/sessions"
            className="mt-6 inline-block font-semibold text-violet-700"
          >
            ← Sessions
          </Link>
        </Card>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const start = parseIso(session.dateTime);
  const sessionEnded =
    !!start &&
    start.getTime() + (Number(session.duration) || 0) * 60 * 1000 < Date.now();

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6 lg:px-8">
      <SessionFeedbackModal
        session={session}
        meId={meId}
        isOpen={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
      />
      <PageHeader
        eyebrow="Session"
        title={session.topic}
        description={
          start
            ? `${start.toLocaleString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })} · ${session.duration} min`
            : ""
        }
        action={
          <Link
            to="/sessions"
            className="rounded-xl px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50"
          >
            ← All sessions
          </Link>
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        <Badge tone={session.sessionType === "ONLINE" ? "violet" : "teal"}>
          {session.sessionType === "ONLINE" ? "Online" : "In person"}
        </Badge>
        {viewerIsHost ? (
          <Badge tone="amber">You’re the host</Badge>
        ) : viewerInvitePending ? (
          <Badge tone="violet">Invited — join to participate</Badge>
        ) : viewerHasJoined ? (
          <Badge tone="emerald">Joined</Badge>
        ) : null}
      </div>

      {viewerInvitePending ? (
        <Card className="mb-6 border border-violet-200 bg-violet-50/80 p-6">
          <p className="text-sm font-semibold text-violet-900">
            You’re invited to this session
          </p>
          <p className="mt-2 text-sm text-violet-800">
            Join to see the meeting link or location and appear in the participant list.
          </p>
          <Button
            type="button"
            className="mt-4 px-6 py-3"
            disabled={joining}
            onClick={handleJoin}
          >
            {joining ? "Joining…" : "Join session"}
          </Button>
        </Card>
      ) : null}

      {session.description ? (
        <Card className="mb-6 p-6">
          <h2 className="text-sm font-bold text-violet-800">Description</h2>
          <p className="mt-2 whitespace-pre-wrap text-slate-700">
            {session.description}
          </p>
        </Card>
      ) : null}

      {session.contactInfo ? (
        <Card className="mb-6 p-6">
          <h2 className="text-sm font-bold text-violet-800">Link / location</h2>
          <p className="mt-2 break-all font-mono text-sm text-slate-800">
            {session.contactInfo}
          </p>
          <Button
            type="button"
            variant="secondary"
            className="mt-4 px-4 py-2 text-sm"
            onClick={() =>
              window.navigator.clipboard?.writeText(session.contactInfo)
            }
          >
            Copy
          </Button>
        </Card>
      ) : null}

      <Card className="mb-6 p-6">
        <h2 className="text-sm font-bold text-violet-800">Participants</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-700">
          {(session.participants ?? []).map((p) => {
            const resolved = participantDisplayName(p);
            const label = resolved ?? (labelsLoading ? "…" : "Unknown user");
            return (
            <li key={p.id} className="flex justify-between gap-2">
              <span className="text-sm text-slate-800">
                {String(p.userId) === String(session.creatorId) ? "Host · " : ""}
                {label}
              </span>
              <span className="text-slate-400">
                {parseIso(p.joinedAt)?.toLocaleDateString()}
              </span>
            </li>
          );
          })}
        </ul>
      </Card>

      {viewerIsHost ? (
        <>
          {!editing ? (
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="secondary"
                className="px-5 py-3"
                onClick={() => setEditing(true)}
              >
                Edit session
              </Button>
              <Button
                type="button"
                variant="danger"
                className="px-5 py-3"
                disabled={cancelling}
                onClick={handleCancel}
              >
                {cancelling ? "Cancelling…" : "Cancel session"}
              </Button>
            </div>
          ) : (
            <Card className="p-6">
              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Topic
                  </label>
                  <input
                    required
                    value={editTopic}
                    onChange={(e) => setEditTopic(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-violet-300"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Description
                  </label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={3}
                    className="mt-1 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-violet-300"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      Date & time
                    </label>
                    <input
                      required
                      type="datetime-local"
                      value={editDateTime}
                      onChange={(e) => setEditDateTime(e.target.value)}
                      className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-violet-300"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      Duration (min)
                    </label>
                    <select
                      value={editDuration}
                      onChange={(e) => setEditDuration(Number(e.target.value))}
                      className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-violet-300"
                    >
                      <option value={30}>30</option>
                      <option value={45}>45</option>
                      <option value={60}>60</option>
                      <option value={90}>90</option>
                      <option value={120}>120</option>
                    </select>
                  </div>
                </div>
                <div>
                  <span className="text-sm font-medium text-slate-700">
                    Type
                  </span>
                  <div className="mt-2 flex gap-2">
                    {["ONLINE", "IN_PERSON"].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setEditSessionType(t)}
                        className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                          editSessionType === t
                            ? "bg-violet-600 text-white"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {t === "ONLINE" ? "Online" : "In person"}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Contact / link
                  </label>
                  <input
                    value={editContactInfo}
                    onChange={(e) => setEditContactInfo(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-violet-300"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button type="submit" disabled={updating} className="px-6 py-3">
                    {updating ? "Saving…" : "Save changes"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="px-6 py-3"
                    onClick={() => setEditing(false)}
                  >
                    Done
                  </Button>
                </div>
              </form>
            </Card>
          )}
        </>
      ) : viewerHasJoined && !viewerIsHost ? (
        <div className="flex flex-wrap gap-3">
          {sessionEnded ? (
            <Button
              type="button"
              className="px-6 py-3"
              onClick={() => setFeedbackOpen(true)}
            >
              Give feedback
            </Button>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            className="px-6 py-3"
            disabled={leaving}
            onClick={handleLeave}
          >
            {leaving ? "Leaving…" : "Leave session"}
          </Button>
        </div>
      ) : null}

      {error && !isForbidden && session ? (
        <p className="mt-4 text-sm text-rose-600">{errMsg}</p>
      ) : null}
    </div>
  );
}
