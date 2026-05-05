import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@apollo/client/react";
import {
  GET_MY_NOTIFICATIONS,
  OPEN_NOTIFICATION,
} from "../../graphql/notifications";
import { useEffect, useMemo } from "react";
import PageHeader from "../../components/ui/PageHeader";
import Button from "../../components/ui/Button";

export default function NotificationDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, loading, error } = useQuery(GET_MY_NOTIFICATIONS, {
    fetchPolicy: "cache-and-network",
  });

  const [openNotification] = useMutation(OPEN_NOTIFICATION);

  const notification = data?.getMyNotifications?.find((n) => n.id === id);

  // ✅ mark as read once when opened
  useEffect(() => {
    if (notification && !notification.readStatus) {
      openNotification({
        variables: { notificationID: id },
      });
    }
  }, [notification, id, openNotification]);

  // ✅ SAFE DATE PARSING (handles ISO, string numbers, timestamps)
  const formattedDate = useMemo(() => {
    if (!notification?.date) return "Unknown date";

    let raw = notification.date;
    let date;

    if (typeof raw === "number") {
      date = new Date(raw);
    } else if (typeof raw === "string") {
      // if it's a numeric string (timestamp)
      if (!isNaN(raw)) {
        date = new Date(Number(raw));
      } else {
        // ISO string from Prisma
        date = new Date(raw);
      }
    } else {
      return "Invalid date";
    }

    if (isNaN(date.getTime())) {
      return "Invalid date";
    }

    return date.toLocaleString("en-GB", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [notification]);

  // Loading state
  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 pt-6">
        <p className="text-slate-600">Loading...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 pt-6">
        <p className="text-red-500">{error.message}</p>
      </div>
    );
  }

  // Not found state
  if (!notification) {
    return (
      <div className="mx-auto max-w-3xl px-4 pt-6">
        <p className="text-slate-600">Notification not found</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 pb-20">

      <PageHeader
        eyebrow="Notification"
        title={notification.subject}
        description="Details"
        action={
          <Button
            type="button"
            variant="secondary"
            className="px-4 py-2.5 text-sm"
            onClick={() => navigate("/notifications")}
          >
            ← Back
          </Button>
        }
      />

      <div className="mt-6 rounded-2xl bg-white/80 p-6 ring-1 ring-violet-100 backdrop-blur-sm shadow-sm">
        <p className="text-slate-700 leading-relaxed">
          {notification.message}
        </p>

        <div className="mt-6 flex items-center justify-between text-sm text-slate-500">
          <span>
            {notification.readStatus ? "Read" : "Unread"}
          </span>

          <span>{formattedDate}</span>
        </div>
      </div>
    </div>
  );
}