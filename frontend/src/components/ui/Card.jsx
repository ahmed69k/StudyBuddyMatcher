export default function Card({
  children,
  className = "",
  elevated = true,
  dark = false,
}) {
  const shell = dark
    ? "bg-gradient-to-br from-violet-900 via-violet-800 to-indigo-900 text-white border border-white/10"
    : "bg-white/85 backdrop-blur-md border border-white/60 text-slate-800";

  const shadow = elevated ? "shadow-[var(--shadow-soft)]" : "";

  return (
    <div
      className={`rounded-[1.35rem] ${shell} ${shadow} ${className}`}
    >
      {children}
    </div>
  );
}
