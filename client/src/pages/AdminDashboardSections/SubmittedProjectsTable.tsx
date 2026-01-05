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
  assigned_to?: string;
  google_sheet_url?: string;
}

interface ApproveRequestBody {
  projectId: string;
  salaries?: { worker: string; salary: number }[];
  lumpsumPrice?: number;
}

const multiEntryOptions = [
  "Double Entry",
  "Triple Entry",
  "Fourth Entry",
  "Fifth Entry",
];

export default function SubmittedProjectsTable() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterOption, setFilterOption] = useState("All");

  useEffect(() => {
    fetchSubmittedProjects();
  }, []);

  const fetchSubmittedProjects = async () => {
    try {
      const res = await axios.get("/admin/submitted-projects");
      setProjects(res.data.data || []);
    } catch (err) {
      console.error("Error fetching submitted projects", err);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleGoToProject = (url?: string) => {
    if (!url) {
      alert("Google Sheet not found");
      return;
    }
    window.open(url, "_blank");
  };

  // ✅ FILTER LOGIC (USED)
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

  const handleApproveAll = async () => {
    if (filteredProjects.length === 0) {
      alert("No projects to approve.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to APPROVE ${filteredProjects.length} projects?`
    );
    if (!confirmed) return;

    const failedProjects: string[] = [];

    for (const project of filteredProjects) {
      try {
        let url = "";
        const body: ApproveRequestBody = { projectId: project.project_id };

        if (project.fixed_option === "Single Entry") {
          url = "/admin/approve-single-entry";
        } else if (multiEntryOptions.includes(project.fixed_option || "")) {
          url = "/admin/approve-multi-entry";
        } else if (project.fixed_option === "Lumpsum") {
          url = "/admin/approve-lumpsum";
          body.salaries = [];
          body.lumpsumPrice = 0;
        }

        await axios.post(url, body);
      } catch (err) {
        console.error(`Failed to approve project ${project.project_id}`, err);
        failedProjects.push(project.project_id); // log failed project
        continue; // skip and move to next
      }
    }

    fetchSubmittedProjects(); // refresh the table

    if (failedProjects.length === 0) {
      alert("All projects approved ✅");
    } else {
      alert(
        `Some projects could not be approved ❌\nFailed project IDs: ${failedProjects.join(
          ", "
        )}`
      );
    }
  };


  const handleApprove = async (project: Project) => {
    const confirmed = window.confirm("Are you sure you want to APPROVE this project?");
    if (!confirmed) return;

    try {
      let url = "";
      const body: ApproveRequestBody = { projectId: project.project_id };

      if (project.fixed_option === "Single Entry") {
        url = "/admin/approve-single-entry";
      } else if (multiEntryOptions.includes(project.fixed_option || "")) {
        url = "/admin/approve-multi-entry";
      } else if (project.fixed_option === "Lumpsum") {
        url = "/admin/approve-lumpsum";
        body.salaries = [];
        body.lumpsumPrice = 0;
      }

      await axios.post(url, body);
      alert("Project approved ✅");
      fetchSubmittedProjects();
    } catch (err) {
      console.error("Error approving project", err);
      alert("Failed to approve project ❌");
    }
  };

  const handleReject = async (id: string) => {
    const confirmed = window.confirm("Are you sure you want to REJECT this project?");
    if (!confirmed) return;

    try {
      await axios.post(`/admin/projects/${id}/reject`);
      alert("Project rejected ❌");
      fetchSubmittedProjects();
    } catch (err) {
      console.error("Error rejecting project", err);
      alert("Failed to reject project ❌");
    }
  };

  return (
    <div className="bg-white shadow-xl rounded-2xl p-6">
      {/* 🔹 HEADER + FILTER + APPROVE ALL */}
      <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
        <h2 className="text-2xl font-bold text-purple-800">
          📤 Submitted Projects
        </h2>

        <div className="flex gap-3">
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

          <button
            onClick={handleApproveAll}
            className="px-4 py-1 bg-green-700 text-white rounded text-sm hover:bg-green-800"
          >
            ✅ Approve All
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-gray-500">Loading projects...</div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-center text-gray-500">
          No submitted projects found.
        </div>
      ) : (
        <div className="w-full overflow-x-auto">
          <table className="min-w-[1200px] text-sm text-left border-collapse">
            <thead className="bg-purple-100 text-gray-800">
              <tr>
                {[
                  "Project ID",
                  "Project Name",
                  "Profile Name",
                  "Sheet Name",
                  "Fixed Option",
                  "Shift",
                  "Assigned To",
                  "Go to Project",
                  "Actions",
                ].map((h) => (
                  <th key={h} className="p-3 border-r font-semibold whitespace-nowrap">
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
                  <td className="p-3 border-r">{p.fixed_option ?? "—"}</td>
                  <td className="p-3 border-r">{p.shift ?? "—"}</td>
                  <td className="p-3 border-r">{p.assigned_to ?? "—"}</td>

                  <td className="p-3 text-center border-r">
                    <button
                      onClick={() => handleGoToProject(p.google_sheet_url)}
                      className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                    >
                      🚀 Go
                    </button>
                  </td>

                  <td className="p-3 text-center flex gap-2 justify-center">
                    <button
                      onClick={() => handleApprove(p)}
                      className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                    >
                      ✅ Approve
                    </button>

                    <button
                      onClick={() => handleReject(p._id)}
                      className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                    >
                      ❌ Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}