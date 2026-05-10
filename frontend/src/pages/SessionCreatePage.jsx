import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@apollo/client/react";
import { CREATE_SESSION, MY_SESSIONS } from "../graphql/sessions";
import {
  MY_INCOMING_BUDDY_REQUESTS,
  MY_OUTGOING_BUDDY_REQUESTS,
} from "../graphql/matching";
import { buildAcceptedBuddyIdSet } from "../lib/acceptedBuddyIds";
import { useAuthUser } from "../hooks/useAuthUser";
import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import LinkButton from "../components/ui/LinkButton";

export default function SessionCreatePage() {
  const navigate = useNavigate();
  const { user, loading: userLoading } = useAuthUser();

  const { data: incomingBuddies } = useQuery(MY_INCOMING_BUDDY_REQUESTS, {
    variables: { status: "ACCEPTED" },
    skip: !user?.id,
    fetchPolicy: "cache-first",
  });
  const { data: outgoingBuddies } = useQuery(MY_OUTGOING_BUDDY_REQUESTS, {
    variables: { status: "ACCEPTED" },
    skip: !user?.id,
    fetchPolicy: "cache-first",
  });

  const inviteParticipantUserIds = useMemo(() => {
    const set = buildAcceptedBuddyIdSet(
      outgoingBuddies?.myOutgoingBuddyRequests,
      incomingBuddies?.myIncomingBuddyRequests,
    );
    return Array.from(set);
  }, [
    incomingBuddies?.myIncomingBuddyRequests,
    outgoingBuddies?.myOutgoingBuddyRequests,
  ]);

  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [duration, setDuration] = useState(60);
  const [sessionType, setSessionType] = useState("ONLINE");
  const [contactInfo, setContactInfo] = useState("");

  const [createSession, { loading: saving, error }] = useMutation(
    CREATE_SESSION,
    {
      /**
       * Do not use `refetchQueries` for MySessions here: it can finish after this `update` and
       * replace the cache with an empty list (stale gateway/cache), wiping the new session.
       */
      update(cache, { data }, { variables: mutVars }) {
        const created = data?.createSession;
        const uid = mutVars?.input?.creatorId;
        if (!created?.id || !uid) return;
        let list = [];
        try {
          const prev = cache.readQuery({
            query: MY_SESSIONS,
          });
          list = prev?.sessions ?? [];
        } catch {
          list = [];
        }
        if (list.some((s) => s.id === created.id)) return;
        const sessionForCache = {
          __typename: "StudySession",
          id: created.id,
          topic: created.topic,
          description: created.description ?? null,
          dateTime: created.dateTime,
          duration: created.duration,
          sessionType: created.sessionType,
          creatorId: created.creatorId,
          contactInfo: created.contactInfo ?? null,
          participants: (created.participants ?? []).map((p) => ({
            __typename: "SessionParticipant",
            id: p.id,
            userId: p.userId,
            joinedAt: p.joinedAt,
          })),
          createdAt: created.createdAt,
          updatedAt: created.updatedAt,
          viewerIsHost: created.viewerIsHost ?? true,
          viewerHasJoined: created.viewerHasJoined ?? true,
          viewerInvitePending: created.viewerInvitePending ?? false,
        };
        cache.writeQuery({
          query: MY_SESSIONS,
          data: { sessions: [...list, sessionForCache] },
        });
      },
    },
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.id || !dateTime) return;

    const iso = new Date(dateTime).toISOString();

    const { data: result } = await createSession({
      variables: {
        input: {
          topic: topic.trim(),
          description: description.trim() || null,
          dateTime: iso,
          duration: Number(duration),
          sessionType,
          creatorId: user.id,
          contactInfo: contactInfo.trim() || null,
          inviteParticipantUserIds,
        },
      },
    });

    const newId = result?.createSession?.id;
    navigate(newId ? `/sessions/${newId}` : "/sessions");
  };

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-6 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Plan"
        title="Create study session"
        description="Pick a topic, time, and format. Accepted study buddies get an invite—they choose when to join."
        action={
          <Link
            to="/sessions"
            className="rounded-xl px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50"
          >
            Cancel
          </Link>
        }
      />

      <Card dark className="p-6 sm:p-8">
        {userLoading ? (
          <p className="text-white/80">Loading…</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error ? (
              <div className="rounded-xl bg-rose-500/20 px-4 py-3 text-sm text-rose-100 ring-1 ring-rose-400/30">
                {error.message}
              </div>
            ) : null}

            <div>
              <label className="block text-sm font-medium text-violet-100">
                Topic
              </label>
              <input
                required
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Calculus exam prep"
                className="mt-2 w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white placeholder:text-violet-300/80 focus:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-400/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-violet-100">
                Description <span className="text-violet-300">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Goals, chapter range, materials…"
                className="mt-2 w-full resize-none rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white placeholder:text-violet-300/80 focus:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-400/50"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-violet-100">
                  Date & time
                </label>
                <input
                  required
                  type="datetime-local"
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white focus:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-400/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-violet-100">
                  Duration
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="mt-2 w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white focus:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-400/50"
                >
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={90}>1.5 hours</option>
                  <option value={120}>2 hours</option>
                </select>
              </div>
            </div>

            <div>
              <span className="block text-sm font-medium text-violet-100">
                Session type
              </span>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  { id: "ONLINE", label: "Online" },
                  { id: "IN_PERSON", label: "In person" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSessionType(opt.id)}
                    className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
                      sessionType === opt.id
                        ? "bg-teal-400 text-violet-950 shadow-lg"
                        : "bg-white/10 text-white hover:bg-white/20"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-violet-100">
                Meeting link or location{" "}
                <span className="text-violet-300">(optional)</span>
              </label>
              <input
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
                placeholder="Zoom link, room number, library floor…"
                className="mt-2 w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white placeholder:text-violet-300/80 focus:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-400/50"
              />
            </div>

            <p className="text-sm text-violet-200/90">
              {inviteParticipantUserIds.length > 0
                ? `Accepted study buddies (${inviteParticipantUserIds.length}) are added as participants so they see this session in their list and can leave if needed.`
                : "When you have accepted study buddies, they are added automatically on create so everyone sees the same session."}
            </p>

            <div className="flex justify-end gap-3 pt-4">
              <Link to="/sessions">
                <Button type="button" variant="secondary" className="px-5 py-3">
                  Back
                </Button>
              </Link>
              <Button
                type="submit"
                variant="primary"
                disabled={saving || !user?.id}
                className="min-w-[8rem] px-6 py-3"
              >
                {saving ? "Saving…" : "Create session"}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
