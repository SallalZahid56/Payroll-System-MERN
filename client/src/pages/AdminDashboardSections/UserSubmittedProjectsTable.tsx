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

const multiEntryOptions = [
  "Double Entry",
  "Triple Entry",
  "Fourth Entry",
  "Fifth Entry",
];


export default function UserSubmittedProjectsTable() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterOption, setFilterOption] = useState("All");

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/user/get-pending-projects");
      setProjects(res.data.projects || []);
    } catch (err) {
      console.error("Error fetching user projects:", err);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Filtered projects based on fixed_option
  const filteredProjects = projects.filter((p) => {
    if (filterOption === "All") return true;

    if (filterOption === "Single Entry") {
      return p.fixed_option === "Single Entry";
    }

    if (filterOption === "Multi Entry") {
      return multiEntryOptions.includes(p.fixed_option || "");
    }

    if (filterOption === "Lumpsum") {
      return p.fixed_option === "Lumpsum";
    }

    return true;
  });


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
    } catch (err) {
      console.error("Error opening project:", err);
      alert("Failed to open the project.");
    }
  };

  const handleSubmitProject = async (projectId: string) => {
    const confirm = window.confirm(
      "Are you sure you want to submit this project?"
    );
    if (!confirm) return;

    try {
      await axios.put(`/user/submit-project/${projectId}`);
      alert("Project submitted successfully!");
      fetchProjects();
    } catch (err) {
      console.error("Error submitting project:", err);
      alert("Failed to submit project");
    }
  };

  // 🔹 Submit all filtered projects
  const handleSubmitAllProjects = async () => {
    if (filteredProjects.length === 0) {
      alert("No projects to submit.");
      return;
    }

    const confirm = window.confirm(
      `Are you sure you want to submit ${filteredProjects.length} projects?`
    );
    if (!confirm) return;

    try {
      for (const project of filteredProjects) {
        await axios.put(`/user/submit-project/${project._id}`);
      }
      alert("All projects submitted successfully!");
      fetchProjects();
    } catch (err) {
      console.error("Error submitting all projects:", err);
      alert("Failed to submit all projects");
    }
  };

  return (
    <div className="bg-white shadow-xl rounded-2xl p-6">
      <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
        <h2 className="text-2xl font-bold text-purple-800">
          Assigned Projects for working and submission
        </h2>

        <div className="flex gap-3">
          {/* 🔹 Fixed Option Filter */}
          <select
            value={filterOption}
            onChange={(e) => setFilterOption(e.target.value)}
            className="border rounded px-3 py-1 text-sm"
          >
            <option value="All">All</option>
            <option value="Single Entry">Single Entry</option>
            <option value="Multi Entry">Multi Entry</option>
            <option value="Lumpsum">Lumpsum</option>
          </select>

          {/* 🔹 Submit All Button */}
          <button
            onClick={handleSubmitAllProjects}
            className="px-4 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
          >
            📤 Submit All
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-gray-500">Loading projects...</div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-center text-gray-500">
          No projects found.
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
            {filteredProjects.map((p) => (
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
