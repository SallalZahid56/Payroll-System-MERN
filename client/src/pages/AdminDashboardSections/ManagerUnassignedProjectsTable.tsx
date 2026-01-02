import AssignProjectModal from "../../components/AssignProjectModal";
import { useState } from "react";
import axios from "../../utils/axios";

interface Project {
  _id: string;
  project_id: string;
  project_name: string;
  profile_name: string;
  sheet_name: string;
  fixed_option?: string;
  created_at?: string;
  deadline?: string;
  shift?: string;
  assigned_to?: string;
}

interface Props {
  projects: Project[];
  refresh: () => void;
}

export default function ManagerUnassignedProjectsTable({ projects, refresh }: Props) {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const openAssignModal = (projectId: string) => {
    setSelectedProjectId(projectId);
    setShowAssignModal(true);
  };

  const closeAssignModal = () => {
    setShowAssignModal(false);
    setSelectedProjectId(null);
  };


  const handleGoToProject = async (projectId: string) => {
    try {
      await axios.put(`/admin/update-project-status/${projectId}`, {
        status: "In Work",
      });

      const res = await axios.get(`/admin/get-project-details/${projectId}`);
      if (!res.data.success || !res.data.googleSheetUrl) {
        alert("Google Sheet URL not found.");
        return;
      }

      await axios.post(`/admin/write-project-columns/${projectId}`);

      window.open(res.data.googleSheetUrl, "_blank");
      refresh();
    } catch (err) {
      console.error(err);
      alert("Could not open the project.");
    }
  };



  return (
    <div className="bg-white shadow-xl rounded-2xl p-6 overflow-x-auto">
      <h2 className="text-2xl font-bold mb-4 text-purple-800">📋 Fixed Unassigned Projects</h2>
      {projects.length === 0 ? (
        <div className="text-center text-gray-500">No unassigned projects found.</div>
      ) : (
        <table className="min-w-full text-sm border-collapse">
          <thead className="bg-purple-100 text-gray-800">
            <tr>
              <th className="p-3 border-r">Project ID</th>
              <th className="p-3 border-r">Project Name</th>
              <th className="p-3 border-r">Profile Name</th>
              <th className="p-3 border-r">Sheet Name</th>
              <th className="p-3 border-r">Fixed Option</th>
              <th className="p-3 border-r">Created At</th>
              <th className="p-3 border-r">Deadline</th>
              <th className="p-3 border-r">Shift</th>
              <th className="p-3 border-r">Assigned To</th>
              <th className="p-3 border-r">Assign To</th>
              <th className="p-3 border-r">Go To Project</th>
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
                <td className="p-3 border-r">{p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}</td>
                <td className="p-3 border-r">{p.deadline ? new Date(p.deadline).toLocaleDateString() : "—"}</td>
                <td className="p-3 border-r">{p.shift || "—"}</td>
                <td className="p-3 border-r">{p.assigned_to || "—"}</td>
                <td className="p-3 text-center">
                  <button className="px-3 py-1 bg-purple-600 text-white rounded text-xs" onClick={() => openAssignModal(p._id)}>
                    ➕ Assign
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
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <AssignProjectModal projectId={selectedProjectId} open={showAssignModal} onClose={closeAssignModal} onAssigned={refresh} />
    </div>
  );
}
