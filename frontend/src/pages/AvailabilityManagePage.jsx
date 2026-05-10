import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "@apollo/client/react";
import toast from "react-hot-toast";
import {
  ADD_AVAILABILITY,
  DELETE_AVAILABILITY,
  GET_MY_AVAILABILITY,
  UPDATE_AVAILABILITY,
} from "../graphql/availability";
import PageHeader from "../components/ui/PageHeader";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const HOURS = Array.from({ length: 25 }, (_, i) => i);

function sortSlots(list) {
  const order = new Map(DAYS.map((d, i) => [d, i]));
  return [...(list || [])].sort((a, b) => {
    const da = order.get(a.dayOfWeek) ?? 99;
    const db = order.get(b.dayOfWeek) ?? 99;
    if (da !== db) return da - db;
    return a.startHour - b.startHour || a.endHour - b.endHour;
  });
}

function formatSlot(s) {
  return `${s.dayOfWeek} · ${s.startHour}:00–${s.endHour}:00`;
}

export default function AvailabilityManagePage() {
  const { data, loading, error, refetch } = useQuery(GET_MY_AVAILABILITY, {
    fetchPolicy: "cache-and-network",
  });

  const [addSlot] = useMutation(ADD_AVAILABILITY, {
    refetchQueries: [{ query: GET_MY_AVAILABILITY }],
  });
  const [updateSlot] = useMutation(UPDATE_AVAILABILITY, {
    refetchQueries: [{ query: GET_MY_AVAILABILITY }],
  });
  const [removeSlot] = useMutation(DELETE_AVAILABILITY, {
    refetchQueries: [{ query: GET_MY_AVAILABILITY }],
  });

  const [day, setDay] = useState("Monday");
  const [startHour, setStartHour] = useState(14);
  const [endHour, setEndHour] = useState(17);
  const [busy, setBusy] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editDay, setEditDay] = useState("Monday");
  const [editStart, setEditStart] = useState(9);
  const [editEnd, setEditEnd] = useState(12);

  const slots = useMemo(() => sortSlots(data?.getMyAvailability), [data?.getMyAvailability]);

  const beginEdit = (s) => {
    setEditingId(s.id);
    setEditDay(s.dayOfWeek);
    setEditStart(s.startHour);
    setEditEnd(s.endHour);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (startHour >= endHour) {
      toast.error("End time must be after start time.");
      return;
    }
    setBusy(true);
    try {
      await addSlot({
        variables: {
          input: {
            days: [{ dayOfWeek: day, startHour, endHour }],
          },
        },
      });
      toast.success("Availability slot added. Matching will refresh from this schedule.");
      await refetch();
    } catch (err) {
      toast.error(err.message || "Could not add slot");
    } finally {
      setBusy(false);
    }
  };

  const handleSaveEdit = async (id) => {
    if (editStart >= editEnd) {
      toast.error("End time must be after start time.");
      return;
    }
    setBusy(true);
    try {
      await updateSlot({
        variables: {
          id,
          input: {
            dayOfWeek: editDay,
            startHour: editStart,
            endHour: editEnd,
          },
        },
      });
      toast.success("Slot updated.");
      setEditingId(null);
      await refetch();
    } catch (err) {
      toast.error(err.message || "Could not update slot");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remove this availability slot?")) return;
    setBusy(true);
    try {
      await removeSlot({ variables: { id } });
      toast.success("Slot removed.");
      if (editingId === id) setEditingId(null);
      await refetch();
    } catch (err) {
      toast.error(err.message || "Could not delete slot");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Schedule"
        title="Study availability"
        description="Add weekly time windows when you can study. The matching service uses overlaps with other students’ windows for compatibility scores, and publishes updates when your schedule changes."
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              to="/matches"
              className="rounded-xl px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50"
            >
              Back to matches
            </Link>
            <Link
              to="/matches/setup"
              className="rounded-xl border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-800 hover:border-violet-300"
            >
              Matching profile
            </Link>
          </div>
        }
      />

      <Card className="p-6 sm:p-8">
        {error ? (
          <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-100">
            {error.message}
          </div>
        ) : null}

        <h2 className="text-base font-bold text-slate-900">Your slots</h2>
        <p className="mt-1 text-sm text-slate-600">
          You can add several slots per week. Overlapping entries on the same day are blocked.
        </p>

        {loading && !data ? (
          <p className="mt-6 text-slate-500">Loading…</p>
        ) : slots.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-violet-200 bg-violet-50/40 px-4 py-6 text-sm text-slate-600">
            No slots yet. Add at least one window so buddies can see when you are free.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-200">
            {slots.map((s) => (
              <li key={s.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                {editingId === s.id ? (
                  <div className="flex flex-wrap items-end gap-3">
                    <label className="text-xs font-medium text-slate-600">
                      Day
                      <select
                        value={editDay}
                        onChange={(e) => setEditDay(e.target.value)}
                        className="mt-1 block w-40 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      >
                        {DAYS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs font-medium text-slate-600">
                      Start
                      <select
                        value={editStart}
                        onChange={(e) => setEditStart(Number(e.target.value))}
                        className="mt-1 block w-24 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      >
                        {HOURS.slice(0, 24).map((h) => (
                          <option key={h} value={h}>
                            {h}:00
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs font-medium text-slate-600">
                      End
                      <select
                        value={editEnd}
                        onChange={(e) => setEditEnd(Number(e.target.value))}
                        className="mt-1 block w-24 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      >
                        {HOURS.slice(1, 25).map((h) => (
                          <option key={h} value={h}>
                            {h}:00
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                ) : (
                  <p className="font-medium text-slate-900">{formatSlot(s)}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {editingId === s.id ? (
                    <>
                      <Button
                        type="button"
                        variant="secondary"
                        className="px-4 py-2 text-sm"
                        disabled={busy}
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        className="px-4 py-2 text-sm"
                        disabled={busy}
                        onClick={() => handleSaveEdit(s.id)}
                      >
                        Save
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        className="px-4 py-2 text-sm"
                        disabled={busy}
                        onClick={() => beginEdit(s)}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        className="px-4 py-2 text-sm"
                        disabled={busy}
                        onClick={() => handleDelete(s.id)}
                      >
                        Delete
                      </Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={handleAdd} className="mt-10 space-y-4 border-t border-slate-100 pt-8">
          <h3 className="text-sm font-bold text-slate-900">Add a slot</h3>
          <div className="flex flex-wrap items-end gap-4">
            <label className="text-xs font-medium text-slate-600">
              Day
              <select
                value={day}
                onChange={(e) => setDay(e.target.value)}
                className="mt-1 block w-full min-w-[10rem] rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none ring-violet-200 focus:ring-2"
              >
                {DAYS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-slate-600">
              Start (hour)
              <select
                value={startHour}
                onChange={(e) => setStartHour(Number(e.target.value))}
                className="mt-1 block w-full min-w-[6rem] rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none ring-violet-200 focus:ring-2"
              >
                {HOURS.slice(0, 24).map((h) => (
                  <option key={h} value={h}>
                    {h}:00
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-slate-600">
              End (hour)
              <select
                value={endHour}
                onChange={(e) => setEndHour(Number(e.target.value))}
                className="mt-1 block w-full min-w-[6rem] rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none ring-violet-200 focus:ring-2"
              >
                {HOURS.slice(1, 25).map((h) => (
                  <option key={h} value={h}>
                    {h}:00
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit" disabled={busy} className="px-6 py-3">
              {busy ? "Saving…" : "Add slot"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
