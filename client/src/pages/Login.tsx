import { useEffect, useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import loginSignupImg from "../assets/login-signup.jpg";
import { useNavigate, Link } from "react-router-dom";
import api from "../utils/axios";
import { AxiosError } from "axios";

declare global {
    interface Window {
        google?: {
            accounts: {
                id: {
                    initialize: (options: {
                        client_id: string;
                        callback: (response: { credential: string }) => void;
                    }) => void;
                    renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
                };
            };
        };
    }
}

export default function Login() {
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const navigate = useNavigate();
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    // ✅ Google login
    useEffect(() => {
        interface GoogleResponse {
            credential: string;
        }

        const handleGoogleLogin = async (response: GoogleResponse) => {
            try {
                const res = await api.post("/auth/google-signup", {
                    token: response.credential,
                });

                const data = res.data;

                localStorage.setItem("token", data.token);
                localStorage.setItem("role", data.user.role);

                setSuccess("Login successful! Redirecting...");
                setTimeout(() => {
                    if (data.user.role === "admin") navigate("/admin-dashboard");
                    else if (data.user.role === "manager") navigate("/manager-dashboard");
                    else navigate("/user-dashboard");
                }, 1000);
            } catch (err) {
                const error = err as AxiosError<{ error?: string }>;
                setError(error.response?.data?.error || "Invalid credentials");
            }
        };

        if (window.google && googleClientId) {
            window.google.accounts.id.initialize({
                client_id: googleClientId,
                callback: handleGoogleLogin,
            });

            window.google.accounts.id.renderButton(
                document.getElementById("googleLoginBtn")!,
                {
                    theme: "outline",
                    size: "large",
                    width: "100%",
                    text: "signin_with",
                    shape: "rectangular",
                }
            );
        }
    }, [googleClientId, navigate]);

    // Email + password login
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        setBusy(true);

        try {
            const res = await api.post("/auth/login", { email, password });

            const data = res.data;

            localStorage.setItem("token", data.token);
            localStorage.setItem("role", data.user.role);

            setSuccess("Login successful! Redirecting...");
            setTimeout(() => {
                if (data.user.role === "admin") navigate("/admin-dashboard");
                else if (data.user.role === "manager") navigate("/manager-dashboard");
                else navigate("/user-dashboard");
            }, 1000);
        } catch (err) {
            const error = err as AxiosError<{ error?: string }>;
            setError(error.response?.data?.error || "Invalid credentials");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-white px-4 py-6">
            <div className="flex flex-col md:flex-row w-full max-w-5xl h-auto md:h-[90vh] shadow-lg rounded-lg overflow-hidden">
                {/* Left Image */}
                <div className="w-full md:w-1/2 hidden md:block">
                    <img
                        src={loginSignupImg}
                        alt="Login illustration"
                        className="w-full h-full object-cover"
                    />
                </div>

                {/* Right Form */}
                <div className="w-full md:w-1/2 p-6 sm:p-8 flex flex-col justify-center overflow-y-auto">
                    {/* Header */}
                    <div className="mb-4 text-center md:text-left">
                        <h1 className="text-2xl font-bold flex justify-center md:justify-start items-center gap-2">
                            <span className="text-orange-500 text-3xl">I</span>
                            <span className="text-blue-500 text-3xl">N</span>
                            <span className="text-green-500 text-3xl">F</span>
                            <span className="text-pink-500 text-3xl">O</span>
                            <span className="text-gray-900 ml-2">
                                INFO<span className="font-bold">NAV</span>
                            </span>
                        </h1>
                        <div className="mt-2 h-1 w-24 mx-auto md:mx-0 bg-gradient-to-r from-purple-400 to-purple-700"></div>
                    </div>

                    <h2 className="text-xl font-semibold mb-1 text-center md:text-left">
                        Login to your Account
                    </h2>
                    <p className="text-sm text-gray-500 mb-4 text-center md:text-left">
                        Welcome back! Please enter your details.
                    </p>

                    <form className="space-y-3" onSubmit={handleSubmit}>
                        {/* Email */}
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="Enter your email"
                            required
                        />

                        {/* Password */}
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                placeholder="Enter your password"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-2.5 text-gray-500 text-lg"
                            >
                                {showPassword ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>

                        {/* Remember + Forgot */}
                        <div className="flex items-center justify-between text-sm">
                            <label className="flex items-center">
                                <input type="checkbox" className="mr-2" /> Remember me
                            </label>
                            <Link to="/forgot-password" className="text-purple-600 hover:underline">
                                Forgot Password?
                            </Link>
                        </div>

                        {/* Login Button */}
                        <button
                            type="submit"
                            disabled={busy}
                            className={`w-full py-2 rounded-lg font-semibold transition ${busy
                                ? "bg-gray-400 cursor-not-allowed"
                                : "bg-gradient-to-r from-purple-500 to-purple-700 text-white hover:opacity-90"
                                }`}
                        >
                            {busy ? "Logging in..." : "Login"}
                        </button>

                        {/* Messages */}
                        {error && <div className="text-red-500 text-sm text-center">{error}</div>}
                        {success && <div className="text-green-600 text-sm text-center">{success}</div>}

                        <div className="text-center text-sm text-gray-500">or</div>

                        {/* Google button */}
                        <div id="googleLoginBtn" className="w-full flex justify-center mt-2"></div>

                        <p className="text-center text-sm text-gray-500 mt-2 mb-2">
                            Don’t have an account?{" "}
                            <Link to="/signup" className="text-purple-600 hover:underline">
                                Signup
                            </Link>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
}
