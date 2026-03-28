import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import axios from "../../utils/axios";
import AssignProjectModal from "../../components/AssignProjectModal";

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

export default function FixedUnassignedTable() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterOption, setFilterOption] = useState("All");

  const [editRowId, setEditRowId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Project>>({});

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);

  useEffect(() => {
    fetchUnassignedProjects();
  }, []);

  const filteredProjects = projects.filter((p) => {
    if (filterOption === "All") return true;
    if (filterOption === "Single Entry") return p.fixed_option === "Single Entry";
    if (filterOption === "Multi Entry") return ["Double Entry","Triple Entry","Fourth Entry","Fifth Entry"].includes(p.fixed_option || "");
    if (filterOption === "Lumpsum") return p.fixed_option === "Lumpsum";
    return true;
  });

  const fetchUnassignedProjects = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/admin/get-all-projects");
      setProjects(Array.isArray(res.data.projects) ? res.data.projects : []);
    } catch (err) {
      console.error(err);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  // ---------------- EDIT SECTION ----------------
  const startEdit = (project: Project) => {
    setEditRowId(project._id);
    setEditData({ ...project });
  };

  const cancelEdit = () => {
    setEditRowId(null);
    setEditData({});
  };

  const handleInputChange = <K extends keyof Project>(
    field: K,
    value: Project[K]
  ) => {
    setEditData((prev) => ({ ...prev, [field]: value }));
  };

  const saveEdit = async (id: string) => {
    try {
      await axios.put(`/admin/update-project/${id}`, editData);
      setEditRowId(null);
      fetchUnassignedProjects();
    } catch (err) {
      console.error("Failed to save project:", err);
    }
  };

  // ---------------- Assign Modal ----------------
  const closeAssignModal = () => {
    setShowAssignModal(false);
    setSelectedProjectId(null);
  };

  // ---------------- GO TO PROJECT (NEW) ----------------
  const handleGoToProject = async (projectId: string) => {
    try {
      // 1️⃣ Update project status
      await axios.put(`/admin/update-project-status/${projectId}`, { status: "In Work" });

      // 2️⃣ Fetch project details
      const res = await axios.get(`/admin/get-project-details/${projectId}`);
      if (!res.data.success || !res.data.googleSheetUrl) {
        alert("Google Sheet URL not found.");
        return;
      }

      // 3️⃣ Call write-project-columns to ensure worker columns
      const writeRes = await axios.post(`/admin/write-project-columns/${projectId}`);
      if (!writeRes.data.success) {
        alert(writeRes.data.message || "Failed to process project columns.");
        return;
      }

      // 4️⃣ Open Google Sheet
      window.open(res.data.googleSheetUrl, "_blank");

      // 5️⃣ Refresh table
      fetchUnassignedProjects();
    } catch (err) {
      console.error("Error opening project:", err);
      alert("Failed to open the project.");
    }
  };

  // ---------------- RENDER CELL ----------------
  const renderCell = (p: Project, field: keyof Project) => {
    if (editRowId === p._id) {
      const isNumeric =
        typeof p[field] === "number" ||
        [
          "lumpsum_price",
          "profile_price_per_entry",
          "price_worker_one",
          "price_worker_two",
          "price_worker_three",
          "price_worker_four",
          "price_worker_five",
        ].includes(field);

      const isDateField = field === "deadline";

      return (
        <input
          type={isDateField ? "date" : isNumeric ? "number" : "text"}
          value={
            isDateField && editData.deadline
              ? new Date(editData.deadline).toISOString().split("T")[0]
              : editData[field] ?? ""
          }
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            handleInputChange(
              field,
              isNumeric
                ? (Number(e.target.value) as Project[keyof Project])
                : (e.target.value as Project[keyof Project])
            )
          }
          className="w-full px-2 py-1 border rounded"
        />
      );
    }

    if (field === "deadline" && p.deadline) {
      return new Date(p.deadline).toLocaleDateString();
    }

    return p[field] ?? "—";
  };

  // ---------------- TABLE RENDER ----------------
  return (
    <div className="bg-white shadow-xl rounded-2xl p-6 overflow-x-auto">
      <h2 className="text-2xl font-bold mb-4 text-purple-800">
        📋 Fixed Unassigned Projects
      </h2>

      <div className="flex items-center justify-between mb-3 gap-3">
        <div>
          <select
            value={filterOption}
            onChange={(e) => setFilterOption(e.target.value)}
            className="border rounded px-3 py-1 text-sm mr-2"
          >
            <option value="All">All</option>
            <option value="Single Entry">Single Entry</option>
            <option value="Multi Entry">Multi Entry</option>
            <option value="Lumpsum">Lumpsum</option>
          </select>
          <button
            onClick={() => { setFilterOption('All'); }}
            className="px-3 py-1 bg-gray-200 rounded text-sm"
          >
            Reset
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => { setShowAssignModal(true); setSelectedProjectId(null); }}
            className="px-3 py-1 bg-green-600 text-white rounded text-sm"
          >
            Assign All ({filteredProjects.length})
          </button>
          <button
            onClick={fetchUnassignedProjects}
            className="px-3 py-1 bg-gray-200 rounded text-sm"
          >
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-gray-500">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="text-center text-gray-500">No unassigned projects found.</div>
      ) : (
        <table className="min-w-full text-sm text-left border-collapse">
          <thead className="bg-purple-100 text-gray-800">
            <tr>
              {[
                "Project ID",
                "Project Name",
                "Profile Name",
                "Sheet Name",
                "Created At",
                "Deadline",
                "Project Type",
                "Fixed Option",
                "Lumpsum",
                "PPE",
                "Worker 1",
                "Worker 2",
                "Worker 3",
                "Worker 4",
                "Worker 5",
                "Shift",
                "Status",
                "Profile Type",
                "Edit",
                "Assign",
                "Open Project", // NEW COLUMN
              ].map((header) => (
                <th key={header} className="p-3 border-r font-semibold whitespace-nowrap">
                  {header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {filteredProjects.map((p) => (
              <tr key={p._id} className="hover:bg-purple-50 border-b border-gray-200">
                <td className="p-3 border-r">{renderCell(p, "project_id")}</td>
                <td className="p-3 border-r">{renderCell(p, "project_name")}</td>
                <td className="p-3 border-r">{renderCell(p, "profile_name")}</td>
                <td className="p-3 border-r">{renderCell(p, "sheet_name")}</td>
                <td className="p-3 border-r">
                  {p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}
                </td>

                <td className="p-3 border-r">{renderCell(p, "deadline")}</td>
                <td className="p-3 border-r">{renderCell(p, "project_type")}</td>
                <td className="p-3 border-r">{renderCell(p, "fixed_option")}</td>
                <td className="p-3 border-r">{renderCell(p, "lumpsum_price")}</td>
                <td className="p-3 border-r">{renderCell(p, "profile_price_per_entry")}</td>
                <td className="p-3 border-r">{renderCell(p, "price_worker_one")}</td>
                <td className="p-3 border-r">{renderCell(p, "price_worker_two")}</td>
                <td className="p-3 border-r">{renderCell(p, "price_worker_three")}</td>
                <td className="p-3 border-r">{renderCell(p, "price_worker_four")}</td>
                <td className="p-3 border-r">{renderCell(p, "price_worker_five")}</td>
                <td className="p-3 border-r">{renderCell(p, "shift")}</td>
                <td className="p-3 border-r">{renderCell(p, "status")}</td>
                <td className="p-3 border-r">{renderCell(p, "profile_type")}</td>

                {/* EDIT */}
                <td className="p-3 border-r text-center">
                  {editRowId === p._id ? (
                    <>
                      <button
                        onClick={() => saveEdit(p._id)}
                        className="px-3 py-1 bg-green-600 text-white rounded text-xs mr-2"
                      >
                        💾 Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="px-3 py-1 bg-gray-500 text-white rounded text-xs"
                      >
                        ✖ Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => startEdit(p)}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-xs"
                    >
                      ✏ Edit
                    </button>
                  )}
                </td>

                {/* ASSIGN */}
                <td className="p-3 text-center">
                  <button
                    className="px-3 py-1 bg-purple-600 text-white rounded text-xs"
                    onClick={() => { setSelectedProjectId(p._id); setShowAssignModal(true); }}
                  >
                    ➕ Assign
                  </button>
                </td>

                {/* GO TO PROJECT — NEW */}
                <td className="p-3 text-center">
                  <button
                    onClick={() => handleGoToProject(p.project_id)}
                    className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                  >
                    🚀 Go to Project
                  </button>
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      )}

      <AssignProjectModal
        projectId={selectedProjectId}
        projectIds={showAssignModal && !selectedProjectId ? filteredProjects.map(p => p._id) : undefined}
        open={showAssignModal}
        onClose={closeAssignModal}
        onAssigned={fetchUnassignedProjects}
      />
    </div>
  );
}
