import { useEffect, useState, useCallback } from "react";
import axios from "../utils/axios";

interface User {
  _id: string;
  name: string;
}

interface Props {
  projectId: string | null;
  open: boolean;
  onClose: () => void;
  onAssigned: () => void;
  currentAssignedUser?: string | null;
}

export default function AssignProjectModal({
  projectId,
  open,
  onClose,
  onAssigned,
  currentAssignedUser,
}: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [coordinators, setCoordinators] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedCoordinators, setSelectedCoordinators] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchUsersAndCoordinators = useCallback(async () => {
    try {
      const res = await axios.get("/admin/get-users-and-coordinators");
      if (res.data.success) {
        setUsers(res.data.users);
        setCoordinators(res.data.coordinators);

        // ✅ preselect user by ID
        if (currentAssignedUser) {
          const exists = res.data.users.find((u: User) => u._id === currentAssignedUser);
          if (exists) setSelectedUsers([currentAssignedUser]);
        }
      }
    } catch (err) {
      console.error("Error fetching users and coordinators:", err);
    }
  }, [currentAssignedUser]);

  useEffect(() => {
    if (open) {
      fetchUsersAndCoordinators();
    } else {
      setSelectedUsers([]);
      setSelectedCoordinators([]);
    }
  }, [open, fetchUsersAndCoordinators]);

  const toggleSelect = (id: string, isCoordinator: boolean) => {
    if (isCoordinator) {
      setSelectedCoordinators((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );
    } else {
      setSelectedUsers((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;

    try {
      setLoading(true);

      // ✅ Send IDs instead of names
      await axios.post("/admin/assign-project", {
        projectId,
        assignedUsers: selectedUsers,
        assignedCoordinators: selectedCoordinators,
      });

      onAssigned();
      onClose();
    } catch (err) {
      console.error("Error assigning project:", err);
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
            <h4 className="font-semibold text-gray-800 mb-2">Coordinators</h4>
            <div className="max-h-40 overflow-y-auto border rounded p-2 space-y-1">
              {coordinators.map((c) => (
                <label key={c._id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedCoordinators.includes(c._id)}
                    onChange={() => toggleSelect(c._id, true)}
                  />
                  <span>{c.name}</span>
                </label>
              ))}
              {coordinators.length === 0 && (
                <p className="text-gray-500 text-sm">No coordinators available</p>
              )}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Users</h4>
            <div className="max-h-40 overflow-y-auto border rounded p-2 space-y-1">
              {users.map((u) => (
                <label key={u._id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(u._id)}
                    onChange={() => toggleSelect(u._id, false)}
                  />
                  <span>{u.name}</span>
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
