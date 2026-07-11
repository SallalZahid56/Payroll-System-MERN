import { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import api from "../utils/axios";
import { AxiosError } from "axios";
import { FaEye, FaEyeSlash } from "react-icons/fa";

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token") || "";

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!token) {
            setError("Missing or invalid reset link.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setBusy(true);
        try {
            const res = await api.post("/auth/reset-password", { token, newPassword });
            setSuccess(res.data.message || "Password reset successfully!");
            setTimeout(() => navigate("/"), 2000);
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
                    Reset your password
                </h2>
                <p className="text-sm text-gray-500 mb-4 text-center">
                    Enter a new password for your account.
                </p>

                {!token && (
                    <div className="text-red-500 text-sm text-center mb-3">
                        Invalid or missing reset token. Please use the link from your email.
                    </div>
                )}

                <form className="space-y-3" onSubmit={handleSubmit}>
                    <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="New password"
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

                    <input
                        type={showPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Confirm new password"
                        required
                    />

                    <button
                        type="submit"
                        disabled={busy || !token}
                        className={`w-full py-2 rounded-lg font-semibold transition ${busy || !token
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-gradient-to-r from-purple-500 to-purple-700 text-white hover:opacity-90"
                            }`}
                    >
                        {busy ? "Resetting..." : "Reset Password"}
                    </button>

                    {error && <div className="text-red-500 text-sm text-center">{error}</div>}
                    {success && <div className="text-green-600 text-sm text-center">{success}</div>}

                    <p className="text-center text-sm text-gray-500 mt-2">
                        <Link to="/" className="text-purple-600 hover:underline">
                            Back to Login
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
}