import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { Link } from "react-router-dom";

const BACKEND_CHECK = gql`
  query BackendCheck {
    __typename
  }
`;

export default function Home() {
  const { loading, error, data } = useQuery(BACKEND_CHECK);

  return (
    <main className="mx-auto flex min-h-[calc(100vh-80px)] w-full max-w-6xl items-center px-6 py-12">
      <section className="grid w-full items-center gap-8 rounded-3xl border border-white/70 bg-white/80 p-8 shadow-card backdrop-blur md:grid-cols-[1.35fr_0.65fr] md:p-12">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-brand-700">
            StudyBuddyMatcher
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight text-surface-900 md:text-6xl">
            Find study partners who match your courses, schedule, and study style.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            This is the frontend foundation on the malak branch. Next we will
            replace screens with your Figma UI and connect each workflow to the
            GraphQL gateway.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/register"
              className="rounded-full bg-brand-600 px-6 py-3 font-bold text-white shadow-soft transition hover:bg-brand-700"
            >
              Create account
            </Link>
            <Link
              to="/login"
              className="rounded-full border border-brand-200 bg-white px-6 py-3 font-bold text-brand-700 transition hover:border-brand-400"
            >
              Log in
            </Link>
          </div>
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-slate-500">
            Backend gateway
          </p>
          {loading && (
            <p className="mt-3 text-xl font-black text-slate-900">
              Checking connection...
            </p>
          )}
          {error && (
            <>
              <p className="mt-3 text-xl font-black text-red-600">
                Not connected
              </p>
              <p className="mt-2 break-words text-sm text-slate-500">
                {error.message}
              </p>
            </>
          )}
          {data && (
            <>
              <p className="mt-3 text-xl font-black text-emerald-600">
                Connected
              </p>
              <p className="mt-2 text-sm text-slate-500">
                GraphQL endpoint: http://localhost:4001/
              </p>
            </>
          )}
        </aside>
      </section>
    </main>
  );
}
