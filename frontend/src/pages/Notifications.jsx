import { useQuery } from "@apollo/client/react";
import { GET_MY_NOTIFICATIONS } from "../graphql/notifications";
import { useAuthUser } from "../hooks/useAuthUser";
import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

export default function NotificationsPage() {
  const { user, loading: userLoading } = useAuthUser();
  const userId = user?.id;

  const navigate = useNavigate();

  const {
    data,
    loading,
    error,
    refetch,
  } = useQuery(GET_MY_NOTIFICATIONS, {
    skip: !userId || userLoading,
    fetchPolicy: "cache-and-network",
  });

  const notifications = data?.getMyNotifications ?? [];

  // 🧠 Relative time (e.g. "2 minutes ago")
  const formatRelative = (dateString) => {
    const date = new Date(Number(dateString) || dateString);
    return formatDistanceToNow(date, { addSuffix: true });
  };

  // 📅 Exact time (hover tooltip)
  const formatExact = (dateString) => {
    const date = new Date(Number(dateString) || dateString);
    return date.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-6 sm:px-6 lg:px-8">
      
      <PageHeader
        eyebrow="Inbox"
        title="Notifications"
        description="Stay updated with study sessions, buddy requests, and system alerts."
        action={
          <Button
            type="button"
            variant="secondary"
            className="px-4 py-2.5 text-sm"
            onClick={() => refetch()}
          >
            Refresh
          </Button>
        }
      />

      <section className="space-y-6">

        {/* Loading */}
        {userLoading || loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-[1.25rem] bg-white/50 ring-1 ring-violet-100"
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-100">
            {error.message}
          </div>
        ) : notifications.length === 0 ? (
          <div className="rounded-[1.35rem] bg-white/70 p-10 text-center ring-1 ring-violet-100 backdrop-blur-sm">
            <p className="font-semibold text-slate-800">
              No notifications yet
            </p>
            <p className="mt-1 text-sm text-slate-500">
              When something important happens, you’ll see it here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => navigate(`/notifications/${n.id}`)}
                className={`cursor-pointer rounded-[1.25rem] p-4 backdrop-blur-sm ring-1 transition hover:shadow-md ${
                  n.readStatus
                    ? "bg-white/70 ring-violet-100"
                    : "bg-violet-50 ring-violet-200"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  
                  <div>
                    <h4 className="font-semibold text-slate-900">
                      {n.subject}
                    </h4>
                    <p className="mt-1 text-sm text-slate-600">
                      {n.message}
                    </p>
                  </div>

                  {!n.readStatus && (
                    <span className="text-xs font-semibold text-violet-700 bg-violet-100 px-2 py-1 rounded-full">
                      New
                    </span>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                  <span>{n.readStatus ? "Read" : "Unread"}</span>

                  {/* ⏱ BEST PRACTICE DATE DISPLAY */}
                  <span
                    className="cursor-default"
                    title={formatExact(n.date)}
                  >
                    {formatRelative(n.date)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}