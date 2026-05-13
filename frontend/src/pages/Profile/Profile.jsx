import { useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import { GET_ME } from "../../graphql/user";
import {
  MY_INCOMING_BUDDY_REQUESTS,
  MY_OUTGOING_BUDDY_REQUESTS,
} from "../../graphql/matching";
import { GET_PROFILE } from "../../graphql/profile";
import { buildAcceptedBuddyIdSet } from "../../lib/acceptedBuddyIds";
import { useNavigate } from "react-router-dom";
import { FiSettings, FiEdit2 } from "react-icons/fi";
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

function Chip({ label, tone = "violet" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium
        ${tone === "teal"
          ? "bg-teal-50 text-teal-700 ring-1 ring-teal-200"
          : "bg-violet-50 text-violet-700 ring-1 ring-violet-200"
        }`}
    >
      {label}
    </span>
  );
}

function PrefBadge({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex flex-col items-center rounded-2xl bg-violet-50/60 p-3 ring-1 ring-violet-100 text-center">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

export default function ProfilePage() {
  const { data, loading, error } = useQuery(GET_ME, {
    fetchPolicy: "cache-and-network",
  });

  const { data: incBuddyData, loading: incBuddyLoading } = useQuery(
    MY_INCOMING_BUDDY_REQUESTS,
    { fetchPolicy: "cache-and-network" },
  );
  const { data: outBuddyData, loading: outBuddyLoading } = useQuery(
    MY_OUTGOING_BUDDY_REQUESTS,
    { fetchPolicy: "cache-and-network" },
  );

  const { data: profileData, loading: profileLoading } = useQuery(GET_PROFILE, {
    fetchPolicy: "cache-and-network",
  });

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
  const profile = profileData?.getProfile;
  const courses = profile?.courses ?? [];
  const topics = profile?.topics ?? [];
  const pref = profile?.studyPreference;

  if (loading) return <Loading />;
  if (error) return <div className="p-6 text-rose-500">{error.message}</div>;
  if (!user) return <div className="p-6">No user found</div>;

  const avatar =
    user.profilePicture ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${user.username}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">

      {/* HEADER */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-violet-600 font-medium">Account</p>
          <h1 className="text-3xl font-bold text-slate-900">Profile Overview</h1>
          <p className="text-slate-500 mt-1">A snapshot of your account information</p>
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

      {/* TOP GRID — identity + account details */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT — identity */}
        <div className="rounded-3xl bg-white/70 p-6 ring-1 ring-violet-100 backdrop-blur-sm">
          <div className="flex flex-col items-center text-center">
            <img
              src={avatar}
              className="h-24 w-24 rounded-full ring-2 ring-violet-200 object-cover"
            />
            <h2 className="mt-4 text-xl font-bold text-slate-900">{user.username}</h2>
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

          <div className="mt-6 grid grid-cols-2 gap-3">
            <StatCard label="Study Buddies" value={buddyStatsLoading ? null : studyBuddyCount} />
            <StatCard label="ID" value={user.id?.slice(0, 6)} />
          </div>
        </div>

        {/* RIGHT — account details */}
        <div className="lg:col-span-2 rounded-3xl bg-white/70 p-6 ring-1 ring-violet-100 backdrop-blur-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Account Details</h3>
          <div className="divide-y divide-violet-100/60">
            <InfoRow label="Username" value={user.username} />
            <InfoRow label="Email" value={user.email} />
            <InfoRow label="Phone" value={user.phoneNumber} />
            <InfoRow label="University" value={user.university} />
            <InfoRow label="Academic Year" value={user.academicYear} />
          </div>
        </div>
      </div>

      {/* STUDY PREFERENCES PANEL */}
      <div className="mt-6 rounded-3xl bg-white/70 p-6 ring-1 ring-violet-100 backdrop-blur-sm">

        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Study Preferences</h3>
            <p className="text-sm text-slate-500 mt-0.5">
              Courses, topics, and how you like to study
            </p>
          </div>
          <button
            onClick={() => navigate("/profile/preferences")}
            className="flex items-center gap-2 rounded-xl bg-white/80 px-4 py-2.5 text-sm font-semibold text-violet-700 ring-1 ring-violet-100 hover:bg-white hover:ring-violet-300 transition"
          >
            <FiEdit2 className="h-4 w-4" />
            Edit
          </button>
        </div>

        {profileLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-8 animate-pulse rounded-xl bg-violet-50" />
            ))}
          </div>
        ) : (
          <div className="space-y-6">

            {/* Courses */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-violet-600/80">
                Courses
              </p>
              {courses.length === 0 ? (
                <p className="text-sm text-slate-400">
                  No courses added —{" "}
                  <button
                    onClick={() => navigate("/profile/preferences")}
                    className="text-violet-600 hover:underline"
                  >
                    add some
                  </button>
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {courses.map((c) => (
                    <Chip key={c.id} label={c.name} tone="violet" />
                  ))}
                </div>
              )}
            </div>

            {/* Topics */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-teal-600/80">
                Topics I Need Help With
              </p>
              {topics.length === 0 ? (
                <p className="text-sm text-slate-400">
                  No topics added —{" "}
                  <button
                    onClick={() => navigate("/profile/preferences")}
                    className="text-violet-600 hover:underline"
                  >
                    add some
                  </button>
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {topics.map((t) => (
                    <Chip key={t.id} label={t.name} tone="teal" />
                  ))}
                </div>
              )}
            </div>

            {/* Study preference breakdown */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Study Style
              </p>
              {!pref ? (
                <p className="text-sm text-slate-400">
                  No preferences set —{" "}
                  <button
                    onClick={() => navigate("/profile/preferences")}
                    className="text-violet-600 hover:underline"
                  >
                    set them now
                  </button>
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <PrefBadge label="Pace" value={pref.pace} />
                  <PrefBadge label="Mode" value={pref.mode} />
                  <PrefBadge label="Group size" value={pref.groupSize} />
                  <PrefBadge label="Style" value={pref.studyStyle} />
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
