export default function Badge({
  children,
  tone = "neutral",
  className = "",
}) {
  const tones = {
    neutral: "bg-slate-100 text-slate-700 ring-slate-200",
    violet: "bg-violet-100 text-violet-800 ring-violet-200",
    teal: "bg-teal-100 text-teal-800 ring-teal-200",
    amber: "bg-amber-100 text-amber-900 ring-amber-200",
    rose: "bg-rose-100 text-rose-800 ring-rose-200",
    emerald: "bg-emerald-100 text-emerald-900 ring-emerald-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
