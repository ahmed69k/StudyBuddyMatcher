import { useEffect, useState } from "react";
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
import { useAuthUser } from "../hooks/useAuthUser";
import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";

function parseIso(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
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
  const errMsg =
    error?.graphQLErrors?.map((e) => e.message).join(" ") ||
    error?.message ||
    "";

  const isForbidden =
    errMsg.includes("Not authorized") || errMsg.includes("authorized");

  const [joinSession, { loading: joining }] = useMutation(JOIN_SESSION, {
    refetchQueries: [
      { query: GET_SESSION, variables: { id: sessionId } },
      { query: MY_SESSIONS },
    ],
  });

  const [leaveSession, { loading: leaving }] = useMutation(LEAVE_SESSION, {
    refetchQueries: [{ query: MY_SESSIONS }],
    onCompleted: () => navigate("/sessions"),
  });

  const [cancelSession, { loading: cancelling }] = useMutation(
    CANCEL_SESSION,
    {
      refetchQueries: [{ query: MY_SESSIONS }],
      onCompleted: () => navigate("/sessions"),
    },
  );

  const [updateSession, { loading: updating }] = useMutation(UPDATE_SESSION, {
    refetchQueries: [
      { query: GET_SESSION, variables: { id: sessionId } },
      { query: MY_SESSIONS },
    ],
  });

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
  const isCreator = meId && session?.creatorId === meId;
  const isParticipant =
    meId &&
    session?.participants?.some((p) => p.userId === meId);

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
          eyebrow="Invite"
          title="Join this session"
          description="You’re not in this session yet. After joining, you’ll see full details and can coordinate with the host."
        />
        <Card className="p-8 text-center">
          <p className="text-sm text-slate-600">
            Session ID:{" "}
            <code className="rounded bg-slate-100 px-2 py-0.5 text-xs">
              {sessionId}
            </code>
          </p>
          <Button
            type="button"
            className="mt-6 w-full px-6 py-3"
            disabled={joining}
            onClick={handleJoin}
          >
            {joining ? "Joining…" : "Join session"}
          </Button>
          <Link
            to="/sessions"
            className="mt-4 inline-block text-sm font-semibold text-violet-700 hover:underline"
          >
            Back to sessions
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

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6 lg:px-8">
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
        {isCreator ? (
          <Badge tone="amber">You’re the host</Badge>
        ) : isParticipant ? (
          <Badge tone="emerald">Participant</Badge>
        ) : null}
      </div>

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
          {(session.participants ?? []).map((p) => (
            <li key={p.id} className="flex justify-between gap-2">
              <span className="font-mono text-xs">
                {p.userId === session.creatorId ? "Host · " : ""}
                {p.userId}
              </span>
              <span className="text-slate-400">
                {parseIso(p.joinedAt)?.toLocaleDateString()}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      {isCreator ? (
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
      ) : isParticipant ? (
        <Button
          type="button"
          variant="secondary"
          className="px-6 py-3"
          disabled={leaving}
          onClick={handleLeave}
        >
          {leaving ? "Leaving…" : "Leave session"}
        </Button>
      ) : null}

      {error && !isForbidden && session ? (
        <p className="mt-4 text-sm text-rose-600">{errMsg}</p>
      ) : null}
    </div>
  );
}
