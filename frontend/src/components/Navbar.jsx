import { useState, useEffect } from "react";
import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";

const GET_ME= gql`
    query{
  me {
    username
    email
    profilePicture
  }
}
`

export default function Navbar() {
    const {data, loading, error} = useQuery(GET_ME)
    const user = data?.me
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);


    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            setIsLoggedIn(true);
        }

        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);
    if(loading) return <>Loading...</>
    if(error) console.log(error)
    const handleLogout = () => {
        localStorage.removeItem("token");
        setIsLoggedIn(false);
        window.location.href = "/login";
    };

    return (
        <>
            <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${
                scrolled 
                    ? "bg-white/90 backdrop-blur-xl shadow-2xl" 
                    : "bg-white/80 backdrop-blur-md"
            }`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        {/* Logo and Brand */}
                        <div className="flex items-center space-x-3 group cursor-pointer">
                            <div className="text-2xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent tracking-tight">
                                Study Buddy Matcher
                            </div>
                        </div>

                        {/* Desktop Navigation Links */}
                        <div className="hidden md:flex items-center space-x-1">
                            {[
                                { name: "Home", href: "/", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
                            ].map((item) => (
                                <a
                                    key={item.name}
                                    href={item.href}
                                    className="group relative px-4 py-2 rounded-xl text-gray-700 hover:text-blue-600 transition-all duration-300 font-medium overflow-hidden"
                                >
                                    <span className="relative z-10 flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
                                        </svg>
                                        {item.name}
                                    </span>
                                    <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-purple-50 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-xl"></div>
                                </a>
                            ))}
                        </div>

                        {/* Desktop Auth Section */}
                        <div className="hidden md:flex items-center space-x-4">
                            {isLoggedIn ? (
                                <div className="relative">
                                    <button
                                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                                        className="flex items-center space-x-3 group focus:outline-none"
                                    >
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                            <div className="relative w-10 h-5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-105 transition-all duration-300">
                                                <span className="text-white text-sm font-bold">
                                                    <img src={user?.profilePicture} alt={user?.username.charAt(0)} className="rounded"></img>
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-semibold text-gray-800 m-0">{user?.username}</p>
                                        </div>
                                        <svg className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${isProfileOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>

                                    {/* Dropdown Menu */}
                                    {isProfileOpen && (
                                        <div className="absolute right-0 mt-3 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-slideDown">
                                            <div className="p-4 bg-gradient-to-r from-blue-600 to-purple-600">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur">
                                                        <span className="text-white text-lg font-bold"><img src={user?.profilePicture} alt={user?.username.charAt(0)} className="rounded"></img></span>
                                                    </div>
                                                    <div>
                                                        <p className="text-white font-semibold m-0">{user?.username}</p>
                                                        <p className="text-white/80 text-sm m-0">{user?.email}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="p-2">
                                                {[
                                                    { name: "Profile", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z", onClick: () => {} },
                                                    { name: "Settings", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z", onClick: () => {} },
                                                    { divider: true },
                                                    { name: "Logout", icon: "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1", onClick: handleLogout, danger: true }
                                                ].map((item, idx) => (
                                                    item.divider ? (
                                                        <div key={idx} className="border-t border-gray-100 my-2"></div>
                                                    ) : (
                                                        <button
                                                            key={idx}
                                                            onClick={item.onClick}
                                                            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                                                                item.danger 
                                                                    ? "text-red-600 hover:bg-red-50" 
                                                                    : "text-gray-700 hover:bg-gray-50"
                                                            }`}
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
                                                            </svg>
                                                            <span className="font-medium">{item.name}</span>
                                                        </button>
                                                    )
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center space-x-3">
                                    <a
                                        href="/login"
                                        className="px-5 py-2.5 text-blue-600 hover:text-blue-700 font-semibold transition-all duration-300 rounded-xl hover:bg-blue-50"
                                    >
                                        Sign In
                                    </a>
                                    <a
                                        href="/register"
                                        className="relative group px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 overflow-hidden"
                                    >
                                        <span className="relative z-10">Get Started</span>
                                        <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 transform translate-x-full group-hover:translate-x-0 transition-transform duration-300"></div>
                                    </a>
                                </div>
                            )}
                        </div>

                        {/* Mobile Menu Button */}
                        <div className="md:hidden">
                            <button
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 text-gray-700 hover:text-blue-600 transition-all duration-300"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl opacity-0 hover:opacity-10 transition-opacity duration-300"></div>
                                <svg className="w-6 h-6 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    {isMenuOpen ? (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    ) : (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                                    )}
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Menu */}
                <div className={`md:hidden transition-all duration-500 overflow-hidden ${isMenuOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="bg-white/95 backdrop-blur-xl border-t border-gray-100 py-4">
                        <div className="space-y-1 px-4">
                            {[
                                { name: "Home", href: "/", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
                            ].map((item) => (
                                <a
                                    key={item.name}
                                    href={item.href}
                                    className="flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-700 hover:text-blue-600 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-300 font-medium"
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
                                    </svg>
                                    <span>{item.name}</span>
                                </a>
                            ))}
                            
                            <div className="pt-4 mt-4 border-t border-gray-100">
                                {isLoggedIn ? (
                                    <button
                                        onClick={() => {
                                            handleLogout();
                                            setIsMenuOpen(false);
                                        }}
                                        className="flex items-center space-x-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-all duration-300 font-medium w-full"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                        </svg>
                                        <span>Logout</span>
                                    </button>
                                ) : (
                                    <div className="space-y-2">
                                        <a
                                            href="/login"
                                            className="flex items-center justify-center px-4 py-3 rounded-xl text-blue-600 font-semibold hover:bg-blue-50 transition-all duration-300"
                                            onClick={() => setIsMenuOpen(false)}
                                        >
                                            Sign In
                                        </a>
                                        <a
                                            href="/register"
                                            className="flex items-center justify-center px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                                            onClick={() => setIsMenuOpen(false)}
                                        >
                                            Get Started
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Spacer to prevent content from hiding under fixed navbar */}
            <div className="h-20"></div>

            <style jsx>{`
                @keyframes slideDown {
                    from {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .animate-slideDown {
                    animation: slideDown 0.3s ease-out;
                }
            `}</style>
        </>
    );
}