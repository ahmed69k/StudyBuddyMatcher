import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import {
  GET_PROFILE,
  ADD_COURSE,
  DELETE_COURSE,
  ADD_TOPIC,
  DELETE_TOPIC,
  UPSERT_STUDY_PREFERENCE,
} from "../../graphql/profile";

import PageHeader from "../../components/ui/PageHeader";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Loading from "../../components/ui/Loading";

/* ─────────────────────────────────────────────
   Small reusable chip with a delete button
───────────────────────────────────────────── */
function Chip({ label, onDelete, tone = "violet" }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium
        ${tone === "teal"
          ? "bg-teal-50 text-teal-700 ring-1 ring-teal-200"
          : "bg-violet-50 text-violet-700 ring-1 ring-violet-200"
        }`}
    >
      {label}
      <button
        type="button"
        onClick={onDelete}
        className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-black/10 transition"
        aria-label={`Remove ${label}`}
      >
        ×
      </button>
    </span>
  );
}

/* ─────────────────────────────────────────────
   Toggle button group (pace, mode, style)
───────────────────────────────────────────── */
function ToggleGroup({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
            value === opt
              ? "bg-violet-600 text-white shadow-md"
              : "bg-white/80 text-slate-700 ring-1 ring-violet-100 hover:ring-violet-300"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Section wrapper
───────────────────────────────────────────── */
function Section({ title, description, children }) {
  return (
    <Card className="p-6">
      <div className="mb-4">
        <h2 className="text-base font-bold text-slate-900">{title}</h2>
        {description && (
          <p className="mt-0.5 text-sm text-slate-500">{description}</p>
        )}
      </div>
      {children}
    </Card>
  );
}

/* ─────────────────────────────────────────────
   Add-item input row
───────────────────────────────────────────── */
function AddItemRow({ placeholder, value, onChange, onAdd, loading }) {
  const handleKey = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onAdd();
    }
  };

  return (
    <div className="mt-4 flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKey}
        placeholder={placeholder}
        className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none ring-violet-200 placeholder:text-slate-400 focus:ring-2"
      />
      <Button
        type="button"
        variant="primary"
        className="px-5 py-2.5 text-sm"
        onClick={onAdd}
        disabled={loading || !value.trim()}
      >
        {loading ? "Adding…" : "Add"}
      </Button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main page
───────────────────────────────────────────── */
export default function StudyPreferencesPage() {
  const navigate = useNavigate();

  const { data, loading: queryLoading, error: queryError } = useQuery(
    GET_PROFILE,
    { fetchPolicy: "cache-and-network" }
  );

  const refetchOpts = { refetchQueries: [{ query: GET_PROFILE }] };

  const [addCourse, { loading: addingCourse }] = useMutation(ADD_COURSE, refetchOpts);
  const [deleteCourse] = useMutation(DELETE_COURSE, refetchOpts);
  const [addTopic, { loading: addingTopic }] = useMutation(ADD_TOPIC, refetchOpts);
  const [deleteTopic] = useMutation(DELETE_TOPIC, refetchOpts);
  const [upsertPref, { loading: savingPref }] = useMutation(
    UPSERT_STUDY_PREFERENCE,
    refetchOpts
  );

  const [courseInput, setCourseInput] = useState("");
  const [topicInput, setTopicInput] = useState("");

  // Study preference local state — seeded from server once data arrives
  const pref = data?.getProfile?.studyPreference;
  const [pace, setPace] = useState(pref?.pace ?? "Moderate");
  const [mode, setMode] = useState(pref?.mode ?? "Online");
  const [groupSize, setGroupSize] = useState(pref?.groupSize ?? 2);
  const [studyStyle, setStudyStyle] = useState(pref?.studyStyle ?? "Discussion");

  // Sync local pref state when server data first arrives
  const [prefSynced, setPrefSynced] = useState(false);
  if (pref && !prefSynced) {
    setPace(pref.pace ?? "Moderate");
    setMode(pref.mode ?? "Online");
    setGroupSize(pref.groupSize ?? 2);
    setStudyStyle(pref.studyStyle ?? "Discussion");
    setPrefSynced(true);
  }

  const courses = data?.getProfile?.courses ?? [];
  const topics = data?.getProfile?.topics ?? [];

  /* ── handlers ── */
  const handleAddCourse = async () => {
    const name = courseInput.trim();
    if (!name) return;
    try {
      await addCourse({ variables: { name } });
      setCourseInput("");
      toast.success(`"${name}" added to courses`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteCourse = async (courseId, name) => {
    try {
      await deleteCourse({ variables: { courseId } });
      toast.success(`"${name}" removed`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleAddTopic = async () => {
    const name = topicInput.trim();
    if (!name) return;
    try {
      await addTopic({ variables: { name } });
      setTopicInput("");
      toast.success(`"${name}" added to topics`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteTopic = async (topicId, name) => {
    try {
      await deleteTopic({ variables: { topicId } });
      toast.success(`"${name}" removed`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleSavePref = async () => {
    try {
      await upsertPref({
        variables: {
          pace,
          mode,
          groupSize: Number(groupSize),
          studyStyle,
        },
      });
      toast.success("Study preferences saved!");
    } catch (err) {
      toast.error(err.message);
    }
  };

  /* ── render ── */
  if (queryLoading) return <Loading />;

  if (queryError) {
    return (
      <div className="mx-auto max-w-4xl px-4 pt-6">
        <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-100">
          {queryError.message}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-6 sm:px-6 lg:px-8">
      {/* Header */}
      <PageHeader
        eyebrow="Profile"
        title="Study Preferences"
        description="Keep your courses, topics, and study style up to date — the matching service uses this to find the best study partners for you."
        action={
          <Button
            type="button"
            variant="secondary"
            className="px-4 py-2.5 text-sm"
            onClick={() => navigate("/profile")}
          >
            ← Back
          </Button>
        }
      />

      <div className="mt-8 space-y-6">

        {/* ── COURSES ── */}
        <Section
          title="Courses"
          description="Add the courses you're currently studying."
        >
          {courses.length === 0 ? (
            <p className="text-sm text-slate-400">No courses added yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {courses.map((c) => (
                <Chip
                  key={c.id}
                  label={c.name}
                  tone="violet"
                  onDelete={() => handleDeleteCourse(c.id, c.name)}
                />
              ))}
            </div>
          )}
          <AddItemRow
            placeholder="e.g. Calculus, Data Structures…"
            value={courseInput}
            onChange={setCourseInput}
            onAdd={handleAddCourse}
            loading={addingCourse}
          />
        </Section>

        {/* ── TOPICS ── */}
        <Section
          title="Topics I Need Help With"
          description="Add specific topics or subjects you're struggling with."
        >
          {topics.length === 0 ? (
            <p className="text-sm text-slate-400">No topics added yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {topics.map((t) => (
                <Chip
                  key={t.id}
                  label={t.name}
                  tone="teal"
                  onDelete={() => handleDeleteTopic(t.id, t.name)}
                />
              ))}
            </div>
          )}
          <AddItemRow
            placeholder="e.g. Integrals, Thermodynamics…"
            value={topicInput}
            onChange={setTopicInput}
            onAdd={handleAddTopic}
            loading={addingTopic}
          />
        </Section>

        {/* ── STUDY PREFERENCES ── */}
        <Section
          title="Study Preferences"
          description="Tell us how you like to study so we can find your best match."
        >
          <div className="space-y-6">

            {/* Pace */}
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">
                Study pace
              </p>
              <ToggleGroup
                options={["Slow", "Moderate", "Fast"]}
                value={pace}
                onChange={setPace}
              />
            </div>

            {/* Mode */}
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">
                Preferred mode
              </p>
              <ToggleGroup
                options={["Online", "In Person", "Hybrid"]}
                value={mode}
                onChange={setMode}
              />
            </div>

            {/* Study style */}
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">
                Study style
              </p>
              <ToggleGroup
                options={[
                  "Writing Notes",
                  "Listening",
                  "Discussion",
                  "Quiet Study",
                  "Other",
                ]}
                value={studyStyle}
                onChange={setStudyStyle}
              />
            </div>

            {/* Group size */}
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">
                Preferred group size:{" "}
                <span className="font-bold text-violet-700">{groupSize}</span>
              </p>
              <input
                type="range"
                min={1}
                max={10}
                value={groupSize}
                onChange={(e) => setGroupSize(Number(e.target.value))}
                className="w-full accent-violet-600"
              />
              <div className="mt-1 flex justify-between text-xs text-slate-400">
                <span>1 (solo)</span>
                <span>10 (large group)</span>
              </div>
            </div>

            {/* Save button */}
            <div className="flex justify-end pt-2">
              <Button
                type="button"
                variant="primary"
                className="px-6 py-3"
                onClick={handleSavePref}
                disabled={savingPref}
              >
                {savingPref ? "Saving…" : "Save preferences"}
              </Button>
            </div>
          </div>
        </Section>

      </div>
    </div>
  );
}
