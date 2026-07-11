import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../utils/axios";
import { AxiosError } from "axios";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        setBusy(true);

        try {
            const res = await api.post("/auth/forgot-password", { email });
            setSuccess(res.data.message || "If an account exists, a reset link has been sent.");
        } catch (err) {
            const error = err as AxiosError<{ error?: string }>;
            setError(error.response?.data?.error || "Something went wrong. Please try again.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-white px-4 py-6">
            <div className="w-full max-w-md p-6 sm:p-8 shadow-lg rounded-lg">
                <h2 className="text-xl font-semibold mb-1 text-center">
                    Forgot your password?
                </h2>
                <p className="text-sm text-gray-500 mb-4 text-center">
                    Enter your email and we'll send you a reset link.
                </p>

                <form className="space-y-3" onSubmit={handleSubmit}>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Enter your email"
                        required
                    />

                    <button
                        type="submit"
                        disabled={busy}
                        className={`w-full py-2 rounded-lg font-semibold transition ${busy
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-gradient-to-r from-purple-500 to-purple-700 text-white hover:opacity-90"
                            }`}
                    >
                        {busy ? "Sending..." : "Send Reset Link"}
                    </button>

                    {error && <div className="text-red-500 text-sm text-center">{error}</div>}
                    {success && <div className="text-green-600 text-sm text-center">{success}</div>}

                    <p className="text-center text-sm text-gray-500 mt-2">
                        Remembered your password?{" "}
                        <Link to="/" className="text-purple-600 hover:underline">
                            Back to Login
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
}