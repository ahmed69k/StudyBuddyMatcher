import { Link } from "react-router-dom";

const base =
  "inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2";

const variants = {
  primary:
    "bg-gradient-to-r from-violet-600 to-violet-500 text-white shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/30 hover:-translate-y-0.5",
  secondary:
    "border border-violet-200/80 bg-white/90 text-violet-800 shadow-[var(--shadow-card)] backdrop-blur-sm hover:bg-white hover:border-violet-300",
};

/** Same visuals as `Button` — use instead of nesting `<Link><Button>` (invalid HTML). */
export default function LinkButton({
  to,
  children,
  variant = "primary",
  className = "",
}) {
  return (
    <Link to={to} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </Link>
  );
}
