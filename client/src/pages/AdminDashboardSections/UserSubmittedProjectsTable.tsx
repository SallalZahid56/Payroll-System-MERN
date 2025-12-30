import { useEffect, useState } from "react";
import axios from "../../utils/axios";

interface Project {
  _id: string;
  project_id: string;
  project_name: string;
  profile_name: string;
  sheet_name: string;
  fixed_option?: string;
  shift?: string;
  google_sheet_url?: string;
}

export default function UserSubmittedProjectsTable() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      // API we will connect later
      const res = await axios.get("/user/get-pending-projects");
      setProjects(res.data.projects || []);
    } catch (err) {
      console.error("Error fetching user projects:", err);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleGoToProject = (projectId: string) => {
    const url = `/admin/get-sheet-url/${projectId}`;
    window.open(url, "_blank");
  };

  const handleSubmitProject = async (projectId: string) => {
  const confirm = window.confirm("Are you sure you want to submit this project?");
  if (!confirm) return; // Exit if user cancels

  try {
    await axios.put(`/user/submit-project/${projectId}`);
    alert("Project submitted successfully!");
    fetchProjects();
  } catch (err) {
    console.error("Error submitting project:", err);
    alert("Failed to submit project");
  }
};


  return (
    <div className="bg-white shadow-xl rounded-2xl p-6 overflow-x-auto">
      <h2 className="text-2xl font-bold mb-4 text-purple-800">
      Assigned Projects for working and submission
      </h2>

      {loading ? (
        <div className="text-center text-gray-500">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="text-center text-gray-500">
          No projects assigned.
        </div>
      ) : (
        <table className="min-w-full text-sm border-collapse">
          <thead className="bg-purple-100 text-gray-800">
            <tr>
              {[
                "Project ID",
                "Project Name",
                "Profile Name",
                "Sheet Name",
                "Fixed Option",
                "Shift",
                "Go to Project",
                "Submit Project",
              ].map((h) => (
                <th key={h} className="p-3 border-r font-semibold">
                  {h}
                </th>
              ))}
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

                <td className="p-3 text-center border-r">
                  <button
                    onClick={() => handleGoToProject(p.project_id)}
                    className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                  >
                    🚀 Go
                  </button>
                </td>

                <td className="p-3 text-center">
                  <button
                    onClick={() => handleSubmitProject(p._id)}
                    className="px-3 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700"
                  >
                    📤 Submit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
