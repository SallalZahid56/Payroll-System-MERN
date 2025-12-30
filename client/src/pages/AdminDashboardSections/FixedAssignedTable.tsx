import { useEffect, useState } from "react";
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
  profile_price_per_entry?: number;
  fixed_option?: string;
  lumpsum_price?: number;
  price_worker_one?: number;
  price_worker_two?: number;
  price_worker_three?: number;
  price_worker_four?: number;
  price_worker_five?: number;
  shift?: string;
  assigned_to?: string; // single assigned user name (optional)
  assigned_to_ids?: string; // single or multiple assigned user IDs as comma-separated
  google_sheet_url?: string;
}

export default function FixedAssignedTable() {
  const [assignedProjects, setAssignedProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [editRowId, setEditRowId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Project>>({});
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedAssignedUsers, setSelectedAssignedUsers] = useState<string[]>([]);

  useEffect(() => {
    fetchAssignedProjects();
  }, []);

  const fetchAssignedProjects = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/admin/get-assigned-projects");
      const projectsArray = Array.isArray(res.data)
        ? res.data
        : res.data.projects && Array.isArray(res.data.projects)
          ? res.data.projects
          : [];
      setAssignedProjects(projectsArray);
    } catch (err) {
      console.error("Error fetching assigned projects:", err);
      setAssignedProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (project: Project) => {
    setEditRowId(project._id);
    setEditData({ ...project });
  };

  const handleCancelEdit = () => {
    setEditRowId(null);
    setEditData({});
  };

  const handleInputChange = <K extends keyof Project>(field: K, value: Project[K]) => {
    setEditData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (id: string) => {
    try {
      await axios.put(`/admin/update-project/${id}`, editData);
      setEditRowId(null);
      fetchAssignedProjects();
    } catch (err) {
      console.error("Error saving project:", err);
    }
  };

  // ✅ Open Assign Modal and preselect assigned user by ID
  const openAssignModal = (project: Project) => {
    setSelectedProjectId(project._id);

    // Pass all assigned user IDs
    const assignedUserIds = project.assigned_to_ids
      ? project.assigned_to_ids.split(",") // all assigned user IDs
      : [];

    setSelectedAssignedUsers(assignedUserIds);
    setShowAssignModal(true);
  };

  const closeAssignModal = () => {
    setShowAssignModal(false);
    setSelectedProjectId(null);
    setSelectedAssignedUsers([]);
  };

  const renderCell = (project: Project, field: keyof Project) => {
    if (editRowId === project._id) {
      const isDateField = field === "deadline";
      return (
        <input
          type={isDateField ? "date" : "text"}
          value={
            isDateField && editData.deadline
              ? new Date(editData.deadline).toISOString().split("T")[0]
              : editData[field] ?? ""
          }
          onChange={(e) =>
            handleInputChange(
              field,
              isDateField
                ? (new Date(e.target.value).toISOString() as Project[keyof Project])
                : (e.target.value as Project[keyof Project])
            )
          }
          className="w-full px-2 py-1 border rounded focus:ring focus:ring-purple-300"
        />
      );
    }
    if (field === "deadline" && project.deadline) {
      return new Date(project.deadline).toLocaleDateString();
    }
    return project[field] ?? "—";
  };


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
      fetchAssignedProjects();
    } catch (err) {
      console.error("Error opening project:", err);
      alert("Failed to open the project.");
    }
  };



  return (
    <div className="bg-white shadow-xl rounded-2xl p-6 overflow-x-auto">
      <h2 className="text-2xl font-bold mb-4 text-purple-800">
        📋 Fixed Assigned Projects
      </h2>

      {loading ? (
        <div className="text-center text-gray-500">Loading projects...</div>
      ) : assignedProjects.length === 0 ? (
        <div className="text-center text-gray-500">No assigned projects found.</div>
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
                "Profile Price",
                "Fixed Option",
                "Lumpsum Price",
                "Worker 1",
                "Worker 2",
                "Worker 3",
                "Worker 4",
                "Worker 5",
                "Shift",
                "Assigned To",
                "Edit",
                "Reassign",
                "Open Project",
              ].map((header) => (
                <th
                  key={header}
                  className="p-3 border-r font-semibold whitespace-nowrap"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {assignedProjects.map((p) => (
              <tr key={p._id} className="hover:bg-purple-50 border-b border-gray-200">
                <td className="p-3 border-r">{p.project_id}</td>
                <td className="p-3 border-r">{renderCell(p, "project_name")}</td>
                <td className="p-3 border-r">{renderCell(p, "profile_name")}</td>
                <td className="p-3 border-r">{renderCell(p, "sheet_name")}</td>
                <td className="p-3 border-r">
                  {p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}
                </td>
                <td className="p-3 border-r">{renderCell(p, "deadline")}</td>
                <td className="p-3 border-r">{renderCell(p, "profile_price_per_entry")}</td>
                <td className="p-3 border-r">{renderCell(p, "fixed_option")}</td>
                <td className="p-3 border-r">{renderCell(p, "lumpsum_price")}</td>
                <td className="p-3 border-r">{renderCell(p, "price_worker_one")}</td>
                <td className="p-3 border-r">{renderCell(p, "price_worker_two")}</td>
                <td className="p-3 border-r">{renderCell(p, "price_worker_three")}</td>
                <td className="p-3 border-r">{renderCell(p, "price_worker_four")}</td>
                <td className="p-3 border-r">{renderCell(p, "price_worker_five")}</td>
                <td className="p-3 border-r">{renderCell(p, "shift")}</td>
                <td className="p-3 border-r">{renderCell(p, "assigned_to")}</td>

                <td className="p-3 text-center space-x-2 border-r">
                  {editRowId === p._id ? (
                    <>
                      <button
                        onClick={() => handleSave(p._id)}
                        className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                      >
                        💾 Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-3 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600"
                      >
                        ✖ Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleEditClick(p)}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                    >
                      ✏ Edit
                    </button>
                  )}
                </td>

                <td className="p-3 text-center border-r">
                  <button
                    onClick={() => openAssignModal(p)}
                    className="px-3 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700"
                  >
                    🔁 Reassign
                  </button>
                </td>
                {/* Go to Project column */}
                <td className="p-3 text-center border-r">
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
        open={showAssignModal}
        onClose={closeAssignModal}
        onAssigned={fetchAssignedProjects}
        currentAssignedUsers={selectedAssignedUsers} // preselect user by ID
      />
    </div>
  );
}
