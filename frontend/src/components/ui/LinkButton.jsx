import { Link } from "react-router-dom";

/** Same visual weight as `Button` primary — use instead of nesting `<Link><Button>` (invalid HTML). */
export default function LinkButton({ to, children, className = "" }) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-violet-500/30 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 ${className}`}
    >
      {children}
    </Link>
  );
}
