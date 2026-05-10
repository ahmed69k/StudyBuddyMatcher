// -- change menna — Register: visible errors, toast, redirect after signup, SPA login link (rollback: follow ORIGINAL comments below)
import { gql } from "@apollo/client";
import { useMutation } from "@apollo/client/react";
// ORIGINAL: import { useQuery, useMutation } from "@apollo/client/react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
// ORIGINAL: no import from "react-router-dom"
import toast from "react-hot-toast";
// ORIGINAL: no "react-hot-toast" import

const REGISTER = gql`
    mutation Register($input: createUserInput!){
        register(input:$input){
            username
        }
    }
`;

// -- change menna — maps Apollo/network errors to user-facing text (rollback: delete entire function)
// ORIGINAL: (no helper — errors were only console.log in catch)
function registerErrorMessage(err) {
    if (!err) return "Something went wrong.";
    const net = err.networkError;
    if (net) {
        const msg = net.message || "";
        if (msg.includes("Failed to fetch") || net.statusCode === 0) {
            return "Cannot reach the API. Start the GraphQL gateway (port 4001) and backend, then try again.";
        }
        return msg || "Network error.";
    }
    const gqlErr = err.graphQLErrors?.[0];
    if (gqlErr?.message) return gqlErr.message;
    return err.message || "Registration failed.";
}

export default function Register(){
    // -- change menna — navigate after success; loading from mutation; formError state (rollback: remove navigate, formError, and { loading } below)
    const navigate = useNavigate();
    const [register, { loading }] = useMutation(REGISTER);
    // ORIGINAL: const [register] = useMutation(REGISTER);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [username, setUsername] = useState("");
    const [university, setUniversity] = useState("");
    const [academicYear, setAcademicYear] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [profilePicture, setProfilePicture] = useState("");
    const [formError, setFormError] = useState("");
    // ORIGINAL: (no formError state)

    const handleSubmit = async (e) => {
        e.preventDefault();
        // -- change menna — full submit handler (rollback: replace entire function body with ORIGINAL block below)
        // ORIGINAL handleSubmit body:
        // try {
        //   await register({
        //     variables: {
        //       input: {
        //         email,
        //         password,
        //         username,
        //         university,
        //         academicYear: Number(academicYear),
        //         phoneNumber,
        //         profilePicture,
        //       },
        //     },
        //   });
        //   console.log("User added successfully!");
        // } catch (err) {
        //   console.log(err);
        // }
        setFormError("");
        const yearNum = Number(academicYear);
        if (!academicYear || Number.isNaN(yearNum)) {
            const msg = "Please select an academic year.";
            setFormError(msg);
            toast.error(msg);
            return;
        }
        try {
            await register({
                variables: {
                    input: {
                        email: email.trim(),
                        password,
                        username: username.trim(),
                        university: university.trim() || undefined,
                        academicYear: yearNum,
                        phoneNumber: phoneNumber.trim() || undefined,
                        profilePicture: profilePicture.trim() || undefined,
                    },
                },
            });
            toast.success("Account created. You can sign in now.");
            navigate("/login");
        } catch (err) {
            const msg = registerErrorMessage(err);
            setFormError(msg);
            toast.error(msg);
        }
    };

    // Generate academic years from 2026 to 2036
    const currentYear = 2026;
    const academicYears = Array.from({ length: 11 }, (_, i) => currentYear + i);

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                        Create Account
                    </h1>
                    <p className="text-gray-600">Join our community today</p>
                </div>

                {/* Form Card */}
                <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-8 space-y-5">
                    {/* -- change menna — inline error banner (rollback: remove this whole conditional) */}
                    {formError ? (
                        <p
                            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
                            role="alert"
                        >
                            {formError}
                        </p>
                    ) : null}
                    {/* Email Input */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            Email Address
                        </label>
                        <input 
                            type="email"
                            placeholder="you@example.com" 
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                            required
                        />
                    </div>

                    {/* Password Input */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            Password
                        </label>
                        <input 
                            type="password" 
                            placeholder="Enter your password" 
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                            required
                        />
                    </div>

                    {/* Username Input */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Username
                        </label>
                        <input 
                            placeholder="Choose a username" 
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                            required
                        />
                    </div>

                    {/* University Input */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path d="M12 14l9-5-9-5-9 5 9 5z" />
                                <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                            </svg>
                            University
                        </label>
                        <input 
                            placeholder="Your university name" 
                            onChange={(e) => setUniversity(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                        />
                    </div>

                    {/* Academic Year Selection */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Academic Year
                        </label>
                        <select 
                            value={academicYear}
                            onChange={(e) => setAcademicYear(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none bg-white cursor-pointer"
                            required
                        >
                            <option value="" disabled>Select academic year</option>
                            {academicYears.map(year => (
                                <option key={year} value={year}>
                                    {year} - {year + 1}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Phone Number Input */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            Phone Number
                        </label>
                        <input 
                            type="tel"
                            placeholder="+1 234 567 8900" 
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                        />
                    </div>

                    {/* Profile Picture Input */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Profile Picture URL
                        </label>
                        <input 
                            placeholder="https://example.com/avatar.jpg" 
                            onChange={(e) => setProfilePicture(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                        />
                    </div>

                    {/* Submit Button */}
                    {/* -- change menna — disabled + loading label while mutation runs (rollback: restore ORIGINAL button only) */}
                    {/* ORIGINAL:
                    <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 rounded-xl hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200 mt-6"
                    >
                        Create Account
                    </button>
                    */}
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 rounded-xl hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200 mt-6 disabled:pointer-events-none disabled:opacity-50"
                    >
                        {loading ? "Creating account…" : "Create Account"}
                    </button>

                    {/* Login Link */}
                    {/* -- change menna — SPA navigation (rollback: restore ORIGINAL <a href>) */}
                    {/* ORIGINAL:
                    <p className="text-center text-sm text-gray-600 mt-4">
                        Already have an account?{" "}
                        <a href="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
                            Sign in
                        </a>
                    </p>
                    */}
                    <p className="text-center text-sm text-gray-600 mt-4">
                        Already have an account?{" "}
                        <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
                            Sign in
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
}