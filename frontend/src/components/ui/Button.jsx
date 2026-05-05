/**
 * @param {'primary' | 'secondary' | 'ghost' | 'danger' | 'success'} variant
 */
export default function Button({
  children,
  variant = "primary",
  className = "",
  disabled,
  type = "button",
  ...props
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-45";

  const variants = {
    primary:
      "bg-gradient-to-r from-violet-600 to-violet-500 text-white shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/30 hover:-translate-y-0.5 active:translate-y-0",
    secondary:
      "bg-white/90 text-violet-800 border border-violet-200/80 shadow-[var(--shadow-card)] backdrop-blur-sm hover:bg-white hover:border-violet-300",
    ghost:
      "bg-transparent text-violet-700 hover:bg-violet-50/80",
    danger:
      "bg-rose-500 text-white shadow-md hover:bg-rose-600",
    success:
      "bg-emerald-500 text-white shadow-md hover:bg-emerald-600",
  };

  return (
    <button
      type={type}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
