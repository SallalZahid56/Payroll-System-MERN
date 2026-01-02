import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";

import axios from "../../utils/axios";

interface Project {
  _id: string;
  project_id: string;
  project_name: string;
  profile_name: string;
  sheet_name: string;
  created_at?: string;
  deadline?: string;
  project_type?: string;
  fixed_option?: string;
  lumpsum_price?: number;
  profile_price_per_entry?: number;
  price_worker_one?: number;
  price_worker_two?: number;
  price_worker_three?: number;
  price_worker_four?: number;
  price_worker_five?: number;
  shift?: string;
  status?: string;
  profile_type?: string;
}

export default function UnpricedAssignedTable() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const [editRowId, setEditRowId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Project>>({});

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/admin/get-unpriced-assigned-projects");
      setProjects(res.data.projects || []);
    } catch (err) {
      console.error(err);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (project: Project) => {
    setEditRowId(project._id);
    setEditData({ ...project });
  };

  const cancelEdit = () => {
    setEditRowId(null);
    setEditData({});
  };

  const handleInputChange = <K extends keyof Project>(field: K, value: Project[K]) => {
    setEditData((prev) => ({ ...prev, [field]: value }));
  };

  const saveEdit = async (id: string) => {
    try {
      await axios.put(`/admin/update-project/${id}`, editData);
      setEditRowId(null);
      fetchProjects();
    } catch (err) {
      console.error("Failed to save project:", err);
    }
  };

  const renderCell = (p: Project, field: keyof Project) => {
    if (editRowId === p._id) {
      const isNumeric =
        typeof p[field] === "number" ||
        ["lumpsum_price", "profile_price_per_entry", "price_worker_one", "price_worker_two", "price_worker_three", "price_worker_four", "price_worker_five"].includes(field);
      const isDateField = field === "deadline";

      return (
        <input
          type={isDateField ? "date" : isNumeric ? "number" : "text"}
          value={isDateField && editData.deadline ? new Date(editData.deadline).toISOString().split("T")[0] : editData[field] ?? ""}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            handleInputChange(field, isNumeric ? (Number(e.target.value) as Project[keyof Project]) : (e.target.value as Project[keyof Project]))
          }
          className={`px-2 py-1 border rounded w-full ${field === "profile_price_per_entry" ? "w-32" : ""}`}
        />
      );
    }

    if (field === "deadline" && p.deadline) return new Date(p.deadline).toLocaleDateString();

    return p[field] ?? "—";
  };

  return (
    <div className="bg-white shadow-xl rounded-2xl p-6 overflow-x-auto">
      <h2 className="text-2xl font-bold mb-4 text-purple-800">
        📋 Unpriced Assigned Projects
      </h2>

      {loading ? (
        <div className="text-center text-gray-500">Loading...</div>
      ) : projects.length === 0 ? (
        <div className="text-center text-gray-500">No projects found.</div>
      ) : (
        <table className="min-w-full text-sm border-collapse">
          <thead className="bg-purple-100 text-gray-800">
            <tr>
              {["Project ID", "Project Name", "Profile Name", "Sheet Name", "Created", "Deadline", "Type", "Fixed Option", "Lumpsum", "Profile Price", "Worker 1", "Worker 2", "Worker 3", "Worker 4", "Worker 5", "Shift", "Status", "Profile Type", "Edit"].map(h => (
                <th key={h} className="p-3 border-r font-semibold whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {projects.map(p => (
              <tr key={p._id} className="hover:bg-purple-50 border-b">
                <td className="p-3 border-r">{renderCell(p, "project_id")}</td>
                <td className="p-3 border-r">{renderCell(p, "project_name")}</td>
                <td className="p-3 border-r">{renderCell(p, "profile_name")}</td>
                <td className="p-3 border-r">{renderCell(p, "sheet_name")}</td>
                <td className="p-3 border-r">{p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}</td>
                <td className="p-3 border-r">{renderCell(p, "deadline")}</td>
                <td className="p-3 border-r">{renderCell(p, "project_type")}</td>
                <td className="p-3 border-r">{renderCell(p, "fixed_option")}</td>
                <td className="p-3 border-r">{renderCell(p, "lumpsum_price")}</td>
                <td className="p-3 border-r min-w-[140px]">{renderCell(p, "profile_price_per_entry")}</td>
                <td className="p-3 border-r">{renderCell(p, "price_worker_one")}</td>
                <td className="p-3 border-r">{renderCell(p, "price_worker_two")}</td>
                <td className="p-3 border-r">{renderCell(p, "price_worker_three")}</td>
                <td className="p-3 border-r">{renderCell(p, "price_worker_four")}</td>
                <td className="p-3 border-r">{renderCell(p, "price_worker_five")}</td>
                <td className="p-3 border-r">{renderCell(p, "shift")}</td>
                <td className="p-3 border-r">{renderCell(p, "status")}</td>
                <td className="p-3 border-r">{renderCell(p, "profile_type")}</td>
                <td className="p-3 text-center">
                  {editRowId === p._id ? (
                    <>
                      <button onClick={() => saveEdit(p._id)} className="px-3 py-1 bg-green-600 text-white rounded text-xs mr-2">Save</button>
                      <button onClick={cancelEdit} className="px-3 py-1 bg-gray-500 text-white rounded text-xs">Cancel</button>
                    </>
                  ) : (
                    <button onClick={() => startEdit(p)} className="px-3 py-1 bg-blue-600 text-white rounded text-xs">Edit</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
