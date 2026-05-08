import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { useQuery } from "@apollo/client/react";
import { MY_SESSIONS } from "../graphql/sessions";
import PageHeader from "../components/ui/PageHeader";
import LinkButton from "../components/ui/LinkButton";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import SegmentedTabs from "../components/ui/SegmentedTabs";

function parseIso(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatRange(start, durationMin) {
  const end = new Date(start.getTime() + durationMin * 60 * 1000);
  const opts = { hour: "numeric", minute: "2-digit" };
  return `${start.toLocaleTimeString(undefined, opts)} – ${end.toLocaleTimeString(undefined, opts)}`;
}

function sessionBucket(date, now) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const t = new Date(now);
  t.setHours(0, 0, 0, 0);
  const diff = (d - t) / (86400 * 1000);
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff > 1 && diff <= 7) return "thisWeek";
  return diff > 7 ? "later" : "past";
}

export default function StudySessionsPage() {
  const [filter, setFilter] = useState("upcoming");

  const { data, loading, error } = useQuery(MY_SESSIONS, {
    fetchPolicy: "cache-and-network",
  });

  const sessions = data?.sessions ?? [];
  const now = new Date();

  const { upcoming, past } = useMemo(() => {
    const up = [];
    const pa = [];
    for (const s of sessions) {
      const dt = parseIso(s.dateTime);
      if (!dt) continue;
      if (dt >= now) up.push({ ...s, _dt: dt });
      else pa.push({ ...s, _dt: dt });
    }
    up.sort((a, b) => a._dt - b._dt);
    pa.sort((a, b) => b._dt - a._dt);
    return { upcoming: up, past: pa };
  }, [sessions, now]);

  const displayed = filter === "upcoming" ? upcoming : past;

  const grouped = useMemo(() => {
    const order = ["today", "tomorrow", "thisWeek", "later", "past"];
    const map = { today: [], tomorrow: [], thisWeek: [], later: [], past: [] };
    for (const s of displayed) {
      const b =
        filter === "past"
          ? "past"
          : sessionBucket(s._dt, now);
      const key =
        b === "past"
          ? "past"
          : b === "today"
            ? "today"
            : b === "tomorrow"
              ? "tomorrow"
              : b === "thisWeek"
                ? "thisWeek"
                : "later";
      map[key].push(s);
    }
    return { map, order };
  }, [displayed, filter, now]);

  const sectionLabels = {
    today: "Today",
    tomorrow: "Tomorrow",
    thisWeek: "This week",
    later: "Later",
    past: "Past",
  };

  return (
    <div className="relative mx-auto max-w-6xl px-4 pb-32 pt-6 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Schedule"
        title="Study sessions"
        description="Your upcoming and past sessions — create a new one anytime."
        action={
          <LinkButton to="/sessions/new">New session</LinkButton>
        }
      />

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SegmentedTabs
          tabs={[
            { id: "upcoming", label: "Upcoming" },
            { id: "past", label: "Past" },
          ]}
          active={filter}
          onChange={setFilter}
        />
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-2xl bg-white/50 ring-1 ring-violet-100"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error.message}
        </div>
      ) : displayed.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-lg font-semibold text-slate-900">
            {filter === "upcoming" ? "No upcoming sessions" : "No past sessions"}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Plan a focused block with your buddies — it only takes a minute.
          </p>
          <LinkButton to="/sessions/new" className="mt-6 px-6 py-3">
            Create session
          </LinkButton>
        </Card>
      ) : (
        <div className="space-y-10">
          {grouped.order.map((key) => {
            const list = grouped.map[key];
            if (!list?.length) return null;
            return (
              <section key={key}>
                <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-violet-600/80">
                  {sectionLabels[key]}
                </h2>
                <ul className="space-y-4">
                  {list.map((s) => (
                    <li key={s.id}>
                      <Link
                        to={`/sessions/${s.id}`}
                        className="block rounded-[1.35rem] outline-none transition-transform hover:scale-[1.01] focus-visible:ring-2 focus-visible:ring-violet-400"
                      >
                        <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 gap-4">
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-teal-400 text-2xl shadow-lg">
                            📚
                          </div>
                          <div className="min-w-0">
                            <h3 className="truncate text-lg font-bold text-slate-900">
                              {s.topic}
                            </h3>
                            <p className="text-sm text-slate-600">
                              {s._dt.toLocaleDateString(undefined, {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                              })}{" "}
                              · {formatRange(s._dt, s.duration)}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <Badge
                                tone={
                                  s.sessionType === "ONLINE" ? "violet" : "teal"
                                }
                              >
                                {s.sessionType === "ONLINE"
                                  ? "Online"
                                  : "In person"}
                              </Badge>
                              <span className="text-xs text-slate-400">
                                {s.participants?.length ?? 0} participant
                                {(s.participants?.length ?? 0) === 1 ? "" : "s"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          {filter === "upcoming" && s.contactInfo ? (
                            <Button
                              type="button"
                              variant="secondary"
                              className="px-4 py-2 text-sm"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                window.navigator.clipboard?.writeText(
                                  s.contactInfo,
                                );
                              }}
                            >
                              Copy link / info
                            </Button>
                          ) : null}
                        </div>
                      </Card>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      <Link
        to="/sessions/new"
        className="fixed bottom-8 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-teal-500 text-2xl font-light text-white shadow-2xl shadow-violet-500/40 transition-transform hover:scale-105 active:scale-95"
        title="Create study session"
      >
        +
      </Link>
    </div>
  );
}
