import { useQuery } from "@apollo/client/react";
import { GET_MY_NOTIFICATIONS } from "../graphql/notifications";
import { useAuthUser } from "../hooks/useAuthUser";

export default function NotificationsPage() {
  const { user, loading: userLoading } = useAuthUser();
  const userId = user?.id;

  const {
    data,
    loading,
    error,
    refetch,
  } = useQuery(GET_MY_NOTIFICATIONS, {
    skip: !userId || userLoading, // ✅ wait for auth
    fetchPolicy: "cache-and-network",
  });

  const notifications = data?.getMyNotifications ?? [];

  if (userLoading || loading) {
    return <p>Loading notifications...</p>;
  }

  if (error) {
    return <p className="text-red-500">{error.message}</p>;
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Notifications</h2>

        <button onClick={() => refetch()}>
          Refresh
        </button>
      </div>

      {notifications.length === 0 ? (
        <p>No notifications yet</p>
      ) : (
        notifications.map((n) => (
          <div
            key={n.id}
            className="border p-3 rounded mb-2"
          >
            <h4 className="font-semibold">{n.subject}</h4>
            <p>{n.message}</p>

            <small>
              {n.readStatus ? "Read" : "Unread"} • {n.date}
            </small>
          </div>
        ))
      )}
    </div>
  );
}