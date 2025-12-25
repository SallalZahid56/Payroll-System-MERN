"use client";
import { useEffect, useState, useCallback } from "react";
import { FaTrash, FaUserShield, FaUser, FaPlus } from "react-icons/fa";
import axios from "../../utils/axios";

interface User {
    _id: string;
    name: string;
    email: string;
    role: "admin" | "user" | "profile" | "manager";
}

export default function UsersSection() {
    const [users, setUsers] = useState<User[]>([]);
    const [page, setPage] = useState(1);
    const limit = 10;
    const [totalUsers, setTotalUsers] = useState(0);
    const totalPages = Math.ceil(totalUsers / limit);

    // Add User form states
    const [newName, setNewName] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [newRole, setNewRole] = useState("user");
    const [loading, setLoading] = useState(false);

    const fetchUsers = useCallback(async () => {
        try {
            const res = await axios.get(`/admin/users`, {
                params: { page, limit },
            });
            setUsers(res.data.users);
            setTotalUsers(res.data.totalUsers);
        } catch (err) {
            console.error("Error fetching users:", err);
        }
    }, [page]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName || !newEmail || !newPassword || !newRole) {
            alert("Please fill all required fields");
            return;
        }
        setLoading(true);
        try {
            await axios.post("/admin/users", {
                name: newName,
                email: newEmail,
                password: newPassword,
                role: newRole,
            });
            setNewName("");
            setNewEmail("");
            setNewPassword("");
            setNewRole("user");
            fetchUsers();
        } catch (err) {
            console.error(err);
            alert("Failed to add user");
        }
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this user?")) return;
        try {
            await axios.delete(`/admin/users/${id}`);
            fetchUsers();
        } catch (err) {
            console.error(err);
            alert("Failed to delete user");
        }
    };

    const handleToggleRole = async (id: string, currentRole: string) => {
        const newRolePrompt = prompt(
            "Enter new role: admin, user, profile, manager",
            currentRole
        );
        if (!newRolePrompt) return;

        const cleanRole = newRolePrompt.toLowerCase();
        const validRoles = ["admin", "user", "profile", "manager"];
        if (!validRoles.includes(cleanRole)) {
            alert("Invalid role");
            return;
        }

        try {
            await axios.put(`/admin/users/${id}`, { role: cleanRole });
            fetchUsers();
        } catch (err) {
            console.error(err);
            alert("Failed to update role");
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-6">User Management</h2>

            {/* Add User Form */}
            <form
                onSubmit={handleAddUser}
                className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6"
            >
                <input
                    type="text"
                    placeholder="Name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="p-2 border rounded"
                />
                <input
                    type="email"
                    placeholder="Email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="p-2 border rounded"
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="p-2 border rounded"
                />
                <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="p-2 border rounded"
                >
                    <option value="admin">Admin</option>
                    <option value="user">User</option>
                    <option value="profile">Profile</option>
                    <option value="manager">Manager</option>
                </select>
                <button
                    type="submit"
                    disabled={loading}
                    className="col-span-full bg-purple-600 text-white rounded p-2 mt-2 hover:bg-purple-700"
                >
                    {loading ? "Adding..." : <><FaPlus className="inline mr-2" /> Add User</>}
                </button>
            </form>

            {/* Users Table */}
            <div className="overflow-x-auto">
                <table className="w-full border rounded-lg">
                    <thead>
                        <tr className="bg-gray-100 text-left">
                            <th className="p-2 border">#</th>
                            <th className="p-2 border">Name</th>
                            <th className="p-2 border">Email</th>
                            <th className="p-2 border">Role</th>
                            <th className="p-2 border">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.length > 0 ? (
                            users.map((user, i) => (
                                <tr key={user._id} className="hover:bg-gray-50">
                                    <td className="p-2 border">{(page - 1) * limit + i + 1}</td>
                                    <td className="p-2 border">{user.name}</td>
                                    <td className="p-2 border">{user.email}</td>
                                    <td className="p-2 border">{user.role}</td>
                                    <td className="p-2 border flex gap-3">
                                        <button
                                            onClick={() => handleToggleRole(user._id, user.role)}
                                            className="text-blue-600 hover:text-blue-800"
                                            title="Change role"
                                        >
                                            {user.role === "admin" ? (
                                                <FaUser className="text-xl" />
                                            ) : (
                                                <FaUserShield className="text-xl" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => handleDelete(user._id)}
                                            className="text-red-600 hover:text-red-800"
                                            title="Delete user"
                                        >
                                            <FaTrash className="text-xl" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="p-2 text-center">
                                    No users found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="flex justify-between items-center mt-4">
                <p>
                    Showing {(page - 1) * limit + 1}–{Math.min(page * limit, totalUsers)} of {totalUsers}
                </p>
                <div className="flex gap-2">
                    <button
                        onClick={() => setPage((p) => Math.max(p - 1, 1))}
                        disabled={page === 1}
                        className="px-3 py-1 border rounded disabled:opacity-50"
                    >
                        ⬅
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .slice(Math.max(0, page - 2), Math.min(totalPages, page + 1))
                        .map((p) => (
                            <button
                                key={p}
                                onClick={() => setPage(p)}
                                className={`px-3 py-1 border rounded ${page === p ? "bg-purple-600 text-white" : ""}`}
                            >
                                {p}
                            </button>
                        ))}
                    <button
                        onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                        disabled={page === totalPages}
                        className="px-3 py-1 border rounded disabled:opacity-50"
                    >
                        ➡
                    </button>
                </div>
            </div>
        </div>
    );
}