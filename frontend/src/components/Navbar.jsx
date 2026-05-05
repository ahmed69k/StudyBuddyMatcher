import { useState, useEffect, useMemo } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useQuery } from "@apollo/client/react";
import { GET_ME } from "../graphql/auth";
import { GET_MY_NOTIFICATIONS } from "../graphql/notifications";

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

  // 🔔 Notifications query
  const { data: notifData } = useQuery(GET_MY_NOTIFICATIONS, {
    skip: !isLoggedIn,
    fetchPolicy: "cache-and-network",
  });

  const unreadCount = useMemo(() => {
    return (
      notifData?.getMyNotifications?.filter((n) => !n.readStatus).length || 0
    );
  }, [notifData]);

  useEffect(() => {
    if (
      error?.message?.includes("Unauthorized") ||
      error?.message?.includes("Not authenticated")
    ) {
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

          {/* NAV LINKS */}
          <div className="hidden items-center gap-1 md:flex">
            {mainLinks.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={navClass}
              >
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

          {/* RIGHT SIDE */}
          <div className="hidden items-center gap-3 md:flex">
            {isLoggedIn ? (
              showUserLoading ? (
                <span className="text-sm text-slate-400">…</span>
              ) : (
                <div className="relative flex items-center gap-2">

                  {/* 🔔 NOTIFICATIONS BUTTON */}
                  <button
                    onClick={() => navigate("/notifications")}
                    className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-slate-700 transition hover:bg-violet-100"
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
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0m6 0H9"
                      />
                    </svg>

                    {unreadCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[11px] font-bold text-white shadow">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* PROFILE */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsProfileOpen(!isProfileOpen)}
                      className="flex items-center gap-3 rounded-2xl py-1 pl-1 pr-3 transition-colors hover:bg-violet-50"
                    >
                      <Avatar
                        name={user?.username}
                        imageUrl={user?.profilePicture}
                      />
                      <span className="max-w-[10rem] truncate text-sm font-semibold text-slate-800">
                        {user?.username ?? "Account"}
                      </span>
                    </button>

                    {isProfileOpen && (
                  <div className="absolute right-0 mt-3 w-72 overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-2xl">
                    
                    {/* HEADER */}
                    <div className="p-4 bg-gradient-to-r from-violet-600 to-teal-600 text-white">
                      <p className="font-semibold">{user?.username}</p>
                      <p className="text-sm opacity-80">{user?.email}</p>
                    </div>

                    {/* ACTIONS */}
                    <div className="p-2">

                      {/* PROFILE */}
                      <button
                        onClick={() => {
                          navigate("/profile");
                          setIsProfileOpen(false);
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-slate-700 hover:bg-violet-50 hover:text-violet-800 transition"
                      >
                        <svg
                          className="h-5 w-5 text-violet-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M5.121 17.804A4 4 0 0112 15h0a4 4 0 016.879 2.804M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        Profile
                      </button>

                      {/* SETTINGS */}
                      <button
                        onClick={() => {
                          navigate("/settings");
                          setIsProfileOpen(false);
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-slate-700 hover:bg-violet-50 hover:text-violet-800 transition"
                      >
                        <svg
                          className="h-5 w-5 text-violet-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M12 8a4 4 0 100 8 4 4 0 000-8zm9 4a7.978 7.978 0 01-.21 1.79l2.11 1.65-2 3.46-2.49-1a8.06 8.06 0 01-1.55.9l-.38 2.65h-4l-.38-2.65a8.06 8.06 0 01-1.55-.9l-2.49 1-2-3.46 2.11-1.65A8 8 0 013 12c0-.61.07-1.2.21-1.79L1.1 8.56l2-3.46 2.49 1c.49-.36 1.01-.68 1.55-.9L7.52 2h4l.38 2.65c.54.22 1.06.54 1.55.9l2.49-1 2 3.46-2.11 1.65c.14.59.21 1.18.21 1.79z"
                          />
                        </svg>
                        Settings
                      </button>

                      {/* DIVIDER */}
                      <div className="my-2 border-t border-violet-100" />

                      {/* LOGOUT */}
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-rose-600 hover:bg-rose-50 transition"
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
                )}
                  </div>
                </div>
              )
            ) : (
              <div className="flex items-center gap-2">
                <NavLink to="/login">Sign in</NavLink>
                <NavLink to="/register">Get started</NavLink>
              </div>
            )}
          </div>

          {/* MOBILE BUTTON */}
          <button
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            ☰
          </button>
        </div>
      </nav>

      <div className="h-[4.25rem]" />
    </>
  );
}