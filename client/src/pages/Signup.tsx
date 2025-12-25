import { useEffect, useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useNavigate, Link } from "react-router-dom";
import loginSignupImg from "../assets/login-signup.jpg";

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

export default function Signup() {
    const [showPassword, setShowPassword] = useState(false);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const navigate = useNavigate();

    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    // ✅ Google signup
    useEffect(() => {
        interface GoogleResponse {
            credential: string;
        }

        const handleGoogleResponse = async (response: GoogleResponse) => {
            try {
                const res = await fetch("http://localhost:5000/api/auth/google-signup", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token: response.credential }),
                });

                const data = await res.json();

                if (!res.ok) {
                    setError(data.error || "Google signup failed");
                    return;
                }

                // ✅ Store token and role
                localStorage.setItem("token", data.token);
                localStorage.setItem("role", data.user.role);

                setSuccess("Google signup/login successful! Redirecting...");
                setTimeout(() => {
                    if (data.user.role === "admin") navigate("/admin-dashboard");
                    else navigate("/user-dashboard");
                }, 1000);
            } catch (err) {
                console.error("Google signup error:", err);
                setError("Network error. Please try again.");
            }
        };

        if (window.google && googleClientId) {
            window.google.accounts.id.initialize({
                client_id: googleClientId,
                callback: handleGoogleResponse,
            });

            window.google.accounts.id.renderButton(
                document.getElementById("googleSignUpBtn")!,
                {
                    theme: "outline",
                    size: "large",
                    width: "100%",
                    text: "signup_with",
                    shape: "rectangular",
                }
            );
        }
    }, [googleClientId, navigate]);

    // ✅ Form submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!name.trim()) return setError("Name is required");
        if (!email.trim()) return setError("Email is required");
        if (!/\S+@\S+\.\S+/.test(email)) return setError("Invalid email format");
        if (!phone.trim()) return setError("Phone number is required");
        if (!/^\+?\d{10,15}$/.test(phone)) return setError("Invalid phone number");
        if (!password.trim()) return setError("Password is required");
        if (password.length < 6) return setError("Password must be at least 6 characters long");

        setBusy(true);
        try {
            const res = await fetch("http://localhost:5000/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, phone, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Signup failed. Please try again.");
                setBusy(false);
                return;
            }

            setSuccess("Signup successful! Redirecting...");
            setTimeout(() => navigate("/user-dashboard"), 1500);
        } catch (err) {
            console.error("Signup error:", err);
            setError("Network error. Please try again later.");
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
                        alt="Signup illustration"
                        className="w-full h-full object-cover"
                    />
                </div>

                {/* Right Form */}
                <div className="w-full md:w-1/2 p-6 sm:p-8 flex flex-col justify-center overflow-y-auto">
                    <div className="mb-4 text-center md:text-left">
                        <h1 className="text-2xl font-bold flex justify-center md:justify-start items-center gap-2">
                            <span className="text-orange-500 text-3xl">I</span>
                            <span className="text-blue-500 text-3xl">N</span>
                            <span className="text-green-500 text-3xl">F</span>
                            <span className="text-pink-500 text-3xl">O</span>
                            <span className="text-gray-900 ml-2">
                                Info<span className="font-bold">Nav</span>
                            </span>
                        </h1>
                        <div className="mt-2 h-1 w-24 mx-auto md:mx-0 bg-gradient-to-r from-purple-400 to-purple-700"></div>
                    </div>

                    <h2 className="text-xl font-semibold mb-1 text-center md:text-left">
                        Create an Account
                    </h2>
                    <p className="text-sm text-gray-500 mb-4 text-center md:text-left">
                        Please fill in the details to sign up
                    </p>

                    <form className="space-y-3" onSubmit={handleSubmit}>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            type="text"
                            placeholder="Full Name"
                            required
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />

                        <input
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            type="email"
                            placeholder="Email"
                            required
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />

                        <input
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            type="tel"
                            placeholder="Phone Number"
                            required
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />

                        <div className="relative">
                            <input
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                type={showPassword ? "text" : "password"}
                                placeholder="Password"
                                required
                                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-2.5 text-gray-500 text-lg"
                            >
                                {showPassword ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>

                        <button
                            disabled={busy}
                            type="submit"
                            className={`w-full py-2 rounded-lg font-semibold transition ${busy
                                ? "bg-gray-400 cursor-not-allowed"
                                : "bg-gradient-to-r from-purple-500 to-purple-700 text-white hover:opacity-90"
                                }`}
                        >
                            {busy ? "Signing up..." : "Signup"}
                        </button>

                        {error && <div className="text-red-500 text-sm text-center">{error}</div>}
                        {success && <div className="text-green-600 text-sm text-center">{success}</div>}

                        <div className="text-center text-sm text-gray-500">or</div>

                        <div id="googleSignUpBtn" className="flex justify-center mt-2"></div>

                        <p className="text-center text-sm text-gray-500 mt-2 mb-2">
                            Already have an account?{" "}
                            <Link to="/" className="text-purple-600 hover:underline">
                                Login
                            </Link>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
}
