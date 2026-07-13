import { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import api from "../utils/axios";
import { AxiosError } from "axios";
import { FaEye, FaEyeSlash, FaCheck, FaTimes } from "react-icons/fa";

interface PasswordRequirement {
    label: string;
    test: (password: string) => boolean;
}

const passwordRequirements: PasswordRequirement[] = [
    { label: "At least 8 characters", test: (pw) => pw.length >= 8 },
    { label: "One uppercase letter", test: (pw) => /[A-Z]/.test(pw) },
    { label: "One lowercase letter", test: (pw) => /[a-z]/.test(pw) },
    { label: "One number", test: (pw) => /[0-9]/.test(pw) },
    { label: "One special character", test: (pw) => /[!@#$%^&*(),.?":{}|<>]/.test(pw) },
];

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

    // Derived state — recalculated on every render, no extra useEffect needed
    const isPasswordValid = passwordRequirements.every((req) => req.test(newPassword));
    const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!token) {
            setError("Missing or invalid reset link.");
            return;
        }

        if (!isPasswordValid) {
            setError("Password does not meet the requirements.");
            return;
        }

        if (!passwordsMatch) {
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

                    {/* Live requirements checklist — only shows once user starts typing */}
                    {newPassword.length > 0 && (
                        <ul className="space-y-1 text-sm bg-gray-50 rounded-lg p-3">
                            {passwordRequirements.map((req) => {
                                const passed = req.test(newPassword);
                                return (
                                    <li
                                        key={req.label}
                                        className={`flex items-center gap-2 ${
                                            passed ? "text-green-600" : "text-gray-400"
                                        }`}
                                    >
                                        {passed ? <FaCheck size={12} /> : <FaTimes size={12} />}
                                        {req.label}
                                    </li>
                                );
                            })}
                        </ul>
                    )}

                    <input
                        type={showPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Confirm new password"
                        required
                    />
                    {confirmPassword.length > 0 && !passwordsMatch && (
                        <p className="text-red-500 text-xs">Passwords do not match</p>
                    )}

                    <button
                        type="submit"
                        disabled={busy || !token || !isPasswordValid || !passwordsMatch}
                        className={`w-full py-2 rounded-lg font-semibold transition ${
                            busy || !token || !isPasswordValid || !passwordsMatch
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