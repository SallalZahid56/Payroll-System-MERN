import { useState, useEffect } from "react";
import axios from "../../utils/axios";
import AssignProjectModal from "../../components/AssignProjectModal";

interface Project {
  _id: string;
  project_id: string;
  project_name: string;
  profile_name: string;
  sheet_name: string;
  fixed_option?: string;
  shift?: string;
  assigned_to?: string;
  assigned_to_ids?: string | string[];
}

export default function ManagerHourlyAssignedProjectTable() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedAssignedUser, setSelectedAssignedUser] = useState<string | null>(null);

  const fetchHourlyProjects = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await axios.get("/manager/get-hourly-assigned-projects", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setProjects(res.data.projects || []);
    } catch (err) {
      console.error("Error fetching hourly projects:", err);
      setProjects([]);
    }
  };

  useEffect(() => {
    fetchHourlyProjects();
  }, []);

  const openAssignModal = (project: Project) => {
    setSelectedProjectId(project._id);

    let assignedUserId: string | null = null;
    if (Array.isArray(project.assigned_to_ids)) {
      assignedUserId = project.assigned_to_ids[0];
    } else if (typeof project.assigned_to_ids === "string") {
      assignedUserId = project.assigned_to_ids.split(",")[0];
    }

    setSelectedAssignedUser(assignedUserId);
    setShowAssignModal(true);
  };

  const closeAssignModal = () => {
    setShowAssignModal(false);
    setSelectedProjectId(null);
    setSelectedAssignedUser(null);
    fetchHourlyProjects(); // refresh after modal closes
  };

  const handleGoToProject = async (projectId: string) => {
    try {
      const res = await axios.get(`/manager/get-hourly-sheet-url/${projectId}`);
      if (!res.data.success || !res.data.googleSheetUrl) {
        return alert("Google Sheet URL not found.");
      }
      window.open(res.data.googleSheetUrl, "_blank");
    } catch (err) {
      console.error(err);
      alert("Could not open the project.");
    }
  };

  return (
    <div className="bg-white shadow-xl rounded-2xl p-6 overflow-x-auto mt-10">
      <h2 className="text-2xl font-bold mb-4 text-purple-800">⏱ Hourly Assigned Projects</h2>

      {projects.length === 0 ? (
        <div className="text-center text-gray-500">No hourly Assigned projects found.</div>
      ) : (
        <table className="min-w-full text-sm border-collapse">
          <thead className="bg-purple-100 text-gray-800">
            <tr>
              <th className="p-3 border-r">Project ID</th>
              <th className="p-3 border-r">Project Name</th>
              <th className="p-3 border-r">Profile Name</th>
              <th className="p-3 border-r">Sheet Name</th>
              <th className="p-3 border-r">Fixed Option</th>
              <th className="p-3 border-r">Shift</th>
              <th className="p-3 border-r">Assigned To</th>
              <th className="p-3 border-r">Assign</th>
              <th className="p-3 border-r">Go To Project</th>
              <th className="p-3 border-r">Hourly Calculation</th>
              <th className="p-3 border-r">Mark Completed</th>
            </tr>
          </thead>

          <tbody>
            {projects.map((p) => (
              <tr key={p._id} className="hover:bg-purple-50 border-b">
                <td className="p-3 border-r">{p.project_id}</td>
                <td className="p-3 border-r">{p.project_name}</td>
                <td className="p-3 border-r">{p.profile_name}</td>
                <td className="p-3 border-r">{p.sheet_name}</td>
                <td className="p-3 border-r">{p.fixed_option || "—"}</td>
                <td className="p-3 border-r">{p.shift || "—"}</td>
                <td className="p-3 border-r">{p.assigned_to || "—"}</td>

                <td className="p-3 text-center">
                  <button
                    onClick={() => openAssignModal(p)}
                    className="px-3 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700"
                  >
                    🔁 Assign
                  </button>
                </td>

                <td className="p-3 text-center">
                  <button
                    onClick={() => handleGoToProject(p.project_id)}
                    className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                  >
                    🚀 Go
                  </button>
                </td>

                <td className="p-3 text-center">
                  <button className="px-3 py-1 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700">
                    ⏱ Calculate
                  </button>
                </td>

                <td className="p-3 text-center">
                  <button className="px-3 py-1 bg-gray-700 text-white rounded text-xs hover:bg-gray-800">
                    ✔ Done
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
        onAssigned={fetchHourlyProjects} // refresh after assignment
        currentAssignedUsers={selectedAssignedUser ? [selectedAssignedUser] : []}
      />
    </div>
  );
}
