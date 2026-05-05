import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@apollo/client/react";
import { UPSERT_USER_PROFILE } from "../graphql/matching";
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
  const [availabilityStr, setAvailabilityStr] = useState("");

  const [upsert, { loading: saving, error }] = useMutation(UPSERT_USER_PROFILE);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.id) return;

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
          availability: splitList(availabilityStr),
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
        description="This data powers recommendations and buddy requests in the matching service. Align it later with your main profile / preferences when those flows are ready."
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
        {userLoading ? (
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

            <div>
              <label className="text-sm font-medium text-slate-700">
                Availability hints <span className="font-normal text-slate-500">(comma-separated, e.g. Tue afternoon)</span>
              </label>
              <textarea
                value={availabilityStr}
                onChange={(e) => setAvailabilityStr(e.target.value)}
                rows={2}
                placeholder="Mon morning, Wed 1–5pm"
                className="mt-1.5 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none ring-violet-200 focus:ring-2"
              />
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
