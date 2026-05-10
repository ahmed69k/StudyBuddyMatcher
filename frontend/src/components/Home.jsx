import { useEffect, useState } from "react";
import LinkButton from "./ui/LinkButton";

function FeatureCard({ icon, title, description }) {
  return (
    <div
      className="rounded-3xl border border-violet-100/80 bg-white/70 p-6 shadow-[var(--shadow-card)] backdrop-blur-sm transition hover:border-violet-200/90 hover:shadow-lg"
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-teal-50 text-2xl">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
    </div>
  );
}

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(!!localStorage.getItem("token"));
    const onStorage = () => setLoggedIn(!!localStorage.getItem("token"));
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <main className="relative overflow-hidden px-4 pb-20 pt-6 sm:px-6 lg:px-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgb(196_181_253_/_0.35),transparent)]"
      />

      <div className="mx-auto max-w-6xl">
        <section className="rounded-[2rem] border border-violet-100/60 bg-white/40 p-8 shadow-[var(--shadow-soft)] backdrop-blur-md sm:p-12 lg:p-14">
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_minmax(0,1.05fr)] lg:gap-12">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-violet-600">
                Study Buddy Matcher
              </p>
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-[2.5rem] lg:leading-tight">
                Find your perfect{" "}
                <span className="bg-gradient-to-r from-violet-600 via-purple-600 to-teal-500 bg-clip-text text-transparent">
                  study buddy
                </span>
              </h1>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
                Match with students who share your courses, study style, and
                availability—then plan sessions that actually fit your week.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                {loggedIn ? (
                  <>
                    <LinkButton to="/matches" className="min-w-[10.5rem] px-6 py-3">
                      Go to matches
                    </LinkButton>
                    <LinkButton
                      to="/sessions"
                      variant="secondary"
                      className="min-w-[10.5rem] px-6 py-3"
                    >
                      Study sessions
                    </LinkButton>
                  </>
                ) : (
                  <>
                    <LinkButton to="/register" className="min-w-[10.5rem] px-6 py-3">
                      Get started
                    </LinkButton>
                    <LinkButton
                      to="/login"
                      variant="secondary"
                      className="min-w-[10.5rem] px-6 py-3"
                    >
                      Log in
                    </LinkButton>
                  </>
                )}
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-md lg:max-w-none">
              <div className="aspect-[4/3] overflow-hidden rounded-3xl border border-violet-100/80 bg-gradient-to-br from-violet-100/90 via-white to-teal-50 shadow-[var(--shadow-card)]">
                <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                  <div className="flex -space-x-3">
                    {[ "from-violet-500", "from-purple-500", "from-teal-400" ].map(
                      (g, i) => (
                        <div
                          key={i}
                          className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${g} to-violet-700 text-lg font-bold text-white shadow-lg ring-4 ring-white`}
                        >
                          {["A", "B", "C"][i]}
                        </div>
                      )
                    )}
                  </div>
                  <p className="mt-6 text-sm font-semibold text-violet-900">
                    Learn together, stay on track
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    Collaborative study, without the awkward group chat noise.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon="📅"
            title="Plan study sessions"
            description="Organize study time with your buddies around real availability—not last-minute chaos."
          />
          <FeatureCard
            icon="🤝"
            title="Find study buddies"
            description="Connect with students in your courses who want the same pace and goals."
          />
          <FeatureCard
            icon="✨"
            title="Smart matching"
            description="Find partners based on preferences so your sessions feel productive, not random."
          />
        </section>
      </div>
    </main>
  );
}
