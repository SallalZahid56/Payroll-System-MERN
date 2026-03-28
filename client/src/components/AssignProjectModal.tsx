import { useEffect, useState, useCallback } from "react";
import axios from "../utils/axios";

interface User {
  _id: string;
  name: string;
  role?: "user" | "manager";
}

interface Props {
  projectId?: string | null;
  projectIds?: string[] | null; // when provided, assign to multiple projects
  open: boolean;
  onClose: () => void;
  onAssigned: () => void;
  currentAssignedUsers?: string[];
}

export default function AssignProjectModal({
  projectId,
  projectIds,
  open,
  onClose,
  onAssigned,
  currentAssignedUsers,
}: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const filteredUsers: User[] = users.filter((u) =>
    u.name.toLowerCase().includes(userSearch.toLowerCase())
  );

  const fetchUsers = useCallback(async () => {
    try {
      const res = await axios.get("/admin/get-users-and-coordinators");
      if (res.data.success) {
        const mergedUsers: User[] = [
          ...res.data.managers.map((m: User) => ({ ...m, role: "manager" })),
          ...res.data.users.map((u: User) => ({ ...u, role: "user" })),
        ];

        setUsers(mergedUsers);

        if (currentAssignedUsers && currentAssignedUsers.length > 0) {
          //  Preselect all previously assigned users
          const existingIds = mergedUsers
            .filter(u => currentAssignedUsers.includes(u._id))
            .map(u => u._id);
          setSelectedUsers(existingIds);
        }
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  }, [currentAssignedUsers]);

  useEffect(() => {
    if (open) {
      fetchUsers();
    } else {
      setSelectedUsers([]);
    }
  }, [open, fetchUsers]);

  const toggleSelect = (id: string) => {
    setSelectedUsers((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    const targets: string[] = projectIds && projectIds.length > 0 ? projectIds : projectId ? [projectId] : [];
    if (targets.length === 0) return;

    try {
      setLoading(true);

      for (const pid of targets) {
        await axios.post("/admin/assign-project", {
          projectId: pid,
          assignedUsers: selectedUsers,
        });
      }

      onAssigned();
      onClose();
    } catch (err) {
      console.error("Error assigning project(s):", err);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-3 text-gray-600 hover:text-gray-900 text-lg"
        >
          &times;
        </button>

        <h3 className="text-xl font-bold mb-4 text-purple-700">Assign Project</h3>

        <form onSubmit={handleAssign} className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Users & Managers</h4>
            <input
              type="text"
              placeholder="Search user..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="w-full mb-2 px-3 py-1 border rounded"
            />
            <div className="max-h-60 overflow-y-auto border rounded p-2 space-y-1">
              {filteredUsers.map((u) => (
                <label key={u._id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(u._id)}
                    onChange={() => toggleSelect(u._id)}
                  />
                  <span>{u.name} {u.role === "manager" && "(Manager)"}</span>
                </label>
              ))}
              {users.length === 0 && (
                <p className="text-gray-500 text-sm">No users available</p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-all w-full font-medium"
          >
            {loading ? "Saving..." : "Save Assignment"}
          </button>
        </form>
      </div>
    </div>
  );
}
