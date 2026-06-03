import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@apollo/client/react";
import { GET_USER_PROFILE_MATCHING, UPSERT_USER_PROFILE } from "../graphql/matching";
import { useAuthUser } from "../hooks/useAuthUser";
import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";

function splitList(s) {
  return s
    .split(/[,;\n]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

export default function MatchingProfileSetupPage() {
  const navigate = useNavigate();
  const { user, loading: userLoading } = useAuthUser();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [coursesStr, setCoursesStr] = useState("");
  const [topicsStr, setTopicsStr] = useState("");
  const [studyPace, setStudyPace] = useState("Moderate");
  const [studyMode, setStudyMode] = useState("In Person");
  const [preferredGroupSize, setPreferredGroupSize] = useState(2);
  const [studyStyle, setStudyStyle] = useState("Discussion");

  const { data: profileData, loading: profileLoading, refetch: refetchMatchingProfile } = useQuery(
    GET_USER_PROFILE_MATCHING,
    {
      variables: { userId: user?.id ?? "" },
      skip: !user?.id,
      fetchPolicy: "cache-and-network",
    }
  );

  const [upsert, { loading: saving, error }] = useMutation(UPSERT_USER_PROFILE);

  const matchingProfile = profileData?.userProfile;
  const lastHydratedKey = useRef(null);

  useEffect(() => {
    const p = matchingProfile;
    if (!p?.userId) return;
    const key = `${p.userId}:${p.updatedAt ?? ""}`;
    if (lastHydratedKey.current === key) return;
    lastHydratedKey.current = key;
    setName(p.name || "");
    setEmail(p.email || "");
    setCoursesStr((p.courses || []).join(", "));
    setTopicsStr((p.topics || []).join(", "));
    if (p.studyPace) setStudyPace(p.studyPace);
    if (p.studyMode) setStudyMode(p.studyMode);
    if (p.preferredGroupSize != null) setPreferredGroupSize(p.preferredGroupSize);
    if (p.studyStyle) setStudyStyle(p.studyStyle);
  }, [matchingProfile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.id) return;

    const { data: fresh } = await refetchMatchingProfile({ userId: user.id });
    const availability = fresh?.userProfile?.availability ?? [];

    await upsert({
      variables: {
        profile: {
          userId: user.id,
          name: name.trim() || user.username || "Student",
          email: email.trim() || user.email || null,
          courses: splitList(coursesStr),
          topics: splitList(topicsStr),
          studyPace,
          studyMode,
          preferredGroupSize: Number(preferredGroupSize) || 2,
          studyStyle,
          availability,
        },
      },
    });

    navigate("/matches");
  };

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-6 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Prerequisite"
        title="Matching profile"
        description="Courses and study preferences feed the matching service. Weekly availability is managed separately and syncs automatically for overlap scoring."
        action={
          <Link
            to="/matches"
            className="rounded-xl px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50"
          >
            Back to matches
          </Link>
        }
      />

      <Card className="p-6 sm:p-8">
        {userLoading || profileLoading ? (
          <p className="text-slate-600">Loading account…</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error ? (
              <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-100">
                {error.message}
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-slate-700">
                  Display name
                </label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={user?.username || "Your name"}
                  className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none ring-violet-200 focus:ring-2"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-slate-700">
                  Email (optional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={user?.email || ""}
                  className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none ring-violet-200 focus:ring-2"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Courses <span className="font-normal text-slate-500">(comma-separated)</span>
              </label>
              <input
                value={coursesStr}
                onChange={(e) => setCoursesStr(e.target.value)}
                placeholder="Calculus, Physics, Biology"
                className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none ring-violet-200 focus:ring-2"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Topics <span className="font-normal text-slate-500">(comma-separated)</span>
              </label>
              <input
                value={topicsStr}
                onChange={(e) => setTopicsStr(e.target.value)}
                placeholder="Thermodynamics, Integrals"
                className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none ring-violet-200 focus:ring-2"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Study pace
                </label>
                <select
                  value={studyPace}
                  onChange={(e) => setStudyPace(e.target.value)}
                  className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none ring-violet-200 focus:ring-2"
                >
                  <option value="Slow">Slow</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Fast">Fast</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Study mode
                </label>
                <select
                  value={studyMode}
                  onChange={(e) => setStudyMode(e.target.value)}
                  className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none ring-violet-200 focus:ring-2"
                >
                  <option value="In Person">In person</option>
                  <option value="Online">Online</option>
                  <option value="Hybrid">Hybrid</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Preferred group size
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={preferredGroupSize}
                  onChange={(e) => setPreferredGroupSize(e.target.value)}
                  className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none ring-violet-200 focus:ring-2"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Study style
                </label>
                <input
                  value={studyStyle}
                  onChange={(e) => setStudyStyle(e.target.value)}
                  placeholder="Discussion, Quiet, …"
                  className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none ring-violet-200 focus:ring-2"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-violet-100 bg-violet-50/50 px-4 py-4">
              <p className="text-sm font-medium text-slate-800">Weekly availability</p>
              <p className="mt-1 text-sm text-slate-600">
                Add time windows per weekday on the availability page. Updates publish to the matching service so
                compatibility scores stay in sync.
              </p>
              <Link
                to="/availability"
                className="mt-3 inline-flex text-sm font-semibold text-violet-700 underline-offset-4 hover:underline"
              >
                Manage availability →
              </Link>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                className="px-5 py-3"
                onClick={() => navigate("/matches")}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !user?.id} className="px-6 py-3">
                {saving ? "Saving…" : "Save & continue"}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
