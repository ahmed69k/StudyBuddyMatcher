import { useMutation } from "@apollo/client/react";
import { gql } from "@apollo/client";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const LOGIN = gql`
    mutation($input: loginUserInput!){
    login(input: $input) {
        token
    }
}
`

export default function Login(){
    const [login] = useMutation(LOGIN);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);
        
        try{
            const {data} = await login({
                variables:{
                    input:{
                        email,
                        password
                    }
                }
            })
            localStorage.setItem("token", data.login.token)
            console.log("User logged in successfully!")
            navigate("/")
        }
        catch(err){
            console.log(err.message);
            setError(err.message || "Login failed. Please check your credentials.");
        }
        finally{
            setIsLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl mb-4 shadow-lg">
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                        </svg>
                    </div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                        Welcome Back
                    </h1>
                    <p className="text-gray-600">Sign in to your account</p>
                </div>

                {/* Form Card */}
                <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-8 space-y-5">
                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
                            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm">{error}</span>
                        </div>
                    )}

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
                            value={email}
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
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                            required
                        />
                    </div>

                    {/* Forgot Password Link */}
                    <div className="flex justify-end">
                        <a href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors">
                            Forgot password?
                        </a>
                    </div>

                    {/* Submit Button */}
                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 rounded-xl hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200 mt-6 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                        {isLoading ? (
                            <div className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Signing in...
                            </div>
                        ) : (
                            "Sign In"
                        )}
                    </button>

                    {/* Sign Up Link */}
                    <p className="text-center text-sm text-gray-600 mt-4">
                        Don't have an account?{' '}
                        <a href="/register" className="text-blue-600 hover:text-blue-700 font-semibold">
                            Create account
                        </a>
                    </p>

                    {/* Demo Credentials Hint (Optional) */}
                    <div className="mt-6 pt-4 border-t border-gray-200">
                        <p className="text-xs text-center text-gray-500">
                            Demo credentials? Contact your administrator
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
}