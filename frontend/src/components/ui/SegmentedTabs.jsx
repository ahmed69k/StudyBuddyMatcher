export default function SegmentedTabs({ tabs, active, onChange, className = "" }) {
  return (
    <div
      role="tablist"
      className={`inline-flex flex-wrap gap-1 rounded-2xl bg-white/70 p-1 shadow-inner ring-1 ring-violet-100 backdrop-blur-sm ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`relative rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
              isActive
                ? "bg-gradient-to-r from-violet-600 to-violet-500 text-white shadow-md"
                : "text-slate-600 hover:bg-violet-50/80 hover:text-violet-800"
            }`}
          >
            <span className="flex items-center gap-2">
              {tab.label}
              {typeof tab.badge === "number" && tab.badge > 0 ? (
                <span
                  className={`min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold ${
                    isActive
                      ? "bg-white/25 text-white"
                      : "bg-rose-500 text-white"
                  }`}
                >
                  {tab.badge > 9 ? "9+" : tab.badge}
                </span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
