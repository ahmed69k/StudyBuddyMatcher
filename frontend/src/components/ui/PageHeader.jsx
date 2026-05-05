export default function PageHeader({
  eyebrow,
  title,
  description,
  action,
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? (
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-600/90">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-slate-600">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
