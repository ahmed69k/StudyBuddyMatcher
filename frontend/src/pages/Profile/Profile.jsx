import { useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import { GET_ME } from "../../graphql/user";
import {
  MY_INCOMING_BUDDY_REQUESTS,
  MY_OUTGOING_BUDDY_REQUESTS,
} from "../../graphql/matching";
import { buildAcceptedBuddyIdSet } from "../../lib/acceptedBuddyIds";
import { useNavigate } from "react-router-dom";
import { FiSettings } from "react-icons/fi";
import Loading from "../../components/ui/Loading";

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-violet-100/60">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-900">
        {value || "Not set"}
      </p>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl bg-white/70 p-4 ring-1 ring-violet-100 text-center">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-900">{value ?? "-"}</p>
    </div>
  );
}

export default function ProfilePage() {
  const { data, loading, error } = useQuery(GET_ME, {
    fetchPolicy: "cache-and-network",
  });

  /** Same queries / variables as Matching — stays in sync when buddy requests change (shared Apollo cache). */
  const { data: incBuddyData, loading: incBuddyLoading } = useQuery(
    MY_INCOMING_BUDDY_REQUESTS,
    { fetchPolicy: "cache-and-network" },
  );
  const { data: outBuddyData, loading: outBuddyLoading } = useQuery(
    MY_OUTGOING_BUDDY_REQUESTS,
    { fetchPolicy: "cache-and-network" },
  );

  const studyBuddyCount = useMemo(
    () =>
      buildAcceptedBuddyIdSet(
        outBuddyData?.myOutgoingBuddyRequests,
        incBuddyData?.myIncomingBuddyRequests,
      ).size,
    [
      outBuddyData?.myOutgoingBuddyRequests,
      incBuddyData?.myIncomingBuddyRequests,
    ],
  );

  const buddyStatsLoading = incBuddyLoading || outBuddyLoading;

  const navigate = useNavigate();
  const user = data?.me;

  if (loading) {
    return (
      <Loading/>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-rose-500">{error.message}</div>
    );
  }

  if (!user) {
    return <div className="p-6">No user found</div>;
  }

  const avatar =
    user.profilePicture ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${user.username}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      
      {/* HEADER */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-violet-600 font-medium">Account</p>
          <h1 className="text-3xl font-bold text-slate-900">
            Profile Overview
          </h1>
          <p className="text-slate-500 mt-1">
            A snapshot of your account information
          </p>
        </div>

        <div className="flex gap-2">

          <button
            onClick={() => navigate("/settings")}
            className="rounded-xl bg-white/80 p-3 text-slate-700 ring-1 ring-violet-100 hover:text-violet-700 hover:bg-white"
          >
            <FiSettings className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT PANEL (PROFILE IDENTITY) */}
        <div className="rounded-3xl bg-white/70 p-6 ring-1 ring-violet-100 backdrop-blur-sm">

          <div className="flex flex-col items-center text-center">
            <img
              src={avatar}
              className="h-24 w-24 rounded-full ring-2 ring-violet-200 object-cover"
            />

            <h2 className="mt-4 text-xl font-bold text-slate-900">
              {user.username}
            </h2>

            <p className="text-sm text-slate-500">{user.email}</p>

            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {user.university && (
                <span className="px-3 py-1 text-xs rounded-full bg-violet-50 text-violet-700">
                  {user.university}
                </span>
              )}

              {user.academicYear !== null && (
                <span className="px-3 py-1 text-xs rounded-full bg-teal-50 text-teal-700">
                  Year {user.academicYear}
                </span>
              )}
            </div>
          </div>

          {/* QUICK STATS */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <StatCard
              label="Friends"
              value={buddyStatsLoading ? null : studyBuddyCount}
            />
            <StatCard label="ID" value={user.id?.slice(0, 6)} />
          </div>
        </div>

        {/* RIGHT PANEL (INFO SECTIONS) */}
        <div className="lg:col-span-2 rounded-3xl bg-white/70 p-6 ring-1 ring-violet-100 backdrop-blur-sm">

          <h3 className="text-lg font-bold text-slate-900 mb-4">
            Account Details
          </h3>

          <div className="divide-y divide-violet-100/60">
            <InfoRow label="Username" value={user.username} />
            <InfoRow label="Email" value={user.email} />
            <InfoRow label="Phone" value={user.phoneNumber} />
            <InfoRow label="University" value={user.university} />
            <InfoRow label="Academic Year" value={user.academicYear} />
          </div>
        </div>
      </div>
    </div>
  );
}