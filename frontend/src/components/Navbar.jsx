import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useQuery } from "@apollo/client/react";
import { GET_ME } from "../graphql/auth";

const navClass = ({ isActive }) =>
  `relative flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 ${
    isActive
      ? "bg-violet-100/90 text-violet-900"
      : "text-slate-600 hover:bg-violet-50/80 hover:text-violet-800"
  }`;

function Avatar({ name, imageUrl, size = "md" }) {
  const initial = name?.trim()?.[0]?.toUpperCase() || "?";
  const sizeCls =
    size === "lg" ? "h-12 w-12 text-base" : "h-10 w-10 text-sm";

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        className={`${sizeCls} rounded-full object-cover ring-2 ring-white shadow-md`}
      />
    );
  }

  return (
    <div
      className={`flex ${sizeCls} items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-teal-400 font-bold text-white shadow-md ring-2 ring-white`}
    >
      {initial}
    </div>
  );
}

export default function Navbar() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);

    const handleScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const { data, loading, error } = useQuery(GET_ME, {
    skip: !isLoggedIn,
    fetchPolicy: "cache-and-network",
  });

  const user = data?.me;

  useEffect(() => {
    if (error?.message?.includes("Unauthorized") || error?.message?.includes("Not authenticated")) {
      localStorage.removeItem("token");
      setIsLoggedIn(false);
    }
  }, [error]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    setIsProfileOpen(false);
    navigate("/login");
  };

  const mainLinks = [
    {
      name: "Home",
      to: "/",
      icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
    },
    ...(isLoggedIn
      ? [
          {
            name: "Matches",
            to: "/matches",
            icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
          },
          {
            name: "Match setup",
            to: "/matches/setup",
            icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
          },
          {
            name: "Sessions",
            to: "/sessions",
            icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
          },
        ]
      : []),
  ];

  const showUserLoading = isLoggedIn && loading;

  return (
    <>
      <nav
        className={`fixed top-0 z-50 w-full transition-all duration-300 ${
          scrolled
            ? "border-b border-violet-100/80 bg-white/90 shadow-[var(--shadow-soft)] backdrop-blur-xl"
            : "border-b border-transparent bg-white/75 backdrop-blur-md"
        }`}
      >
        <div className="mx-auto flex h-[4.25rem] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <NavLink
            to="/"
            end
            className="text-xl font-extrabold tracking-tight text-slate-900"
          >
            <span className="bg-gradient-to-r from-violet-600 via-purple-600 to-teal-500 bg-clip-text text-transparent">
              Study Buddy
            </span>
          </NavLink>

          <div className="hidden items-center gap-1 md:flex">
            {mainLinks.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === "/"} className={navClass}>
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d={item.icon}
                  />
                </svg>
                <span>{item.name}</span>
              </NavLink>
            ))}
          </div>

          <div className="hidden items-center gap-3 md:flex">
            {isLoggedIn ? (
              showUserLoading ? (
                <span className="text-sm text-slate-400">…</span>
              ) : (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center gap-3 rounded-2xl py-1 pl-1 pr-3 transition-colors hover:bg-violet-50"
                  >
                    <Avatar name={user?.username} imageUrl={user?.profilePicture} />
                    <span className="max-w-[10rem] truncate text-sm font-semibold text-slate-800">
                      {user?.username ?? "Account"}
                    </span>
                    <svg
                      className={`h-4 w-4 text-slate-500 transition-transform ${isProfileOpen ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {isProfileOpen ? (
                    <div className="animate-slide-down absolute right-0 mt-3 w-72 overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-2xl">
                      <div className="bg-gradient-to-r from-violet-600 to-teal-600 p-4">
                        <div className="flex items-center gap-3">
                          <Avatar
                            name={user?.username}
                            imageUrl={user?.profilePicture}
                            size="lg"
                          />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-white">
                              {user?.username}
                            </p>
                            <p className="truncate text-sm text-white/85">
                              {user?.email}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="p-2">
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 font-medium text-rose-600 transition-colors hover:bg-rose-50"
                        >
                          <svg
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                            />
                          </svg>
                          Log out
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )
            ) : (
              <div className="flex items-center gap-2">
                <NavLink
                  to="/login"
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50"
                >
                  Sign in
                </NavLink>
                <NavLink
                  to="/register"
                  className="rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-transform hover:-translate-y-0.5 hover:shadow-xl"
                >
                  Get started
                </NavLink>
              </div>
            )}
          </div>

          <div className="flex md:hidden">
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-slate-700 transition-colors hover:bg-violet-100"
              aria-expanded={isMenuOpen}
              aria-label="Menu"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        <div
          className={`md:hidden transition-[max-height] duration-300 ease-out ${
            isMenuOpen ? "max-h-[28rem] border-t border-violet-100" : "max-h-0 overflow-hidden"
          }`}
        >
          <div className="space-y-1 bg-white/95 px-4 py-4 backdrop-blur-xl">
            {mainLinks.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-3 rounded-xl px-4 py-3 font-medium text-slate-700 hover:bg-gradient-to-r hover:from-violet-50 hover:to-teal-50 hover:text-violet-800"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
                </svg>
                {item.name}
              </NavLink>
            ))}
            <div className="mt-3 border-t border-violet-100 pt-3">
              {isLoggedIn ? (
                <button
                  type="button"
                  onClick={() => {
                    handleLogout();
                    setIsMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 font-medium text-rose-600 hover:bg-rose-50"
                >
                  Log out
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  <NavLink
                    to="/login"
                    className="rounded-xl py-3 text-center font-semibold text-violet-700"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign in
                  </NavLink>
                  <NavLink
                    to="/register"
                    className="rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 py-3 text-center font-semibold text-white shadow-md"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Get started
                  </NavLink>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="h-[4.25rem]" aria-hidden />
    </>
  );
}
