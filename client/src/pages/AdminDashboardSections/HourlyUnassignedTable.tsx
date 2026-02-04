import { useEffect, useState, type ChangeEvent } from "react";
import axios from "../../utils/axios";

// ⬇️ Import the modal (adjust path if needed)
import AssignProjectModal from "../../components/AssignProjectModal";

interface HourlyProject {
  _id: string;
  project_id: string;
  project_name: string;
  profile_name: string;
  sheet_name: string;
  project_type: string;
  price_per_hour: number;
  shift: string;
}

interface EditingField {
  id: string;
  field: keyof HourlyProject;
  value: string | number;
}

export default function HourlyUnassignedTable() {
  const [projects, setProjects] = useState<HourlyProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingField, setEditingField] = useState<EditingField | null>(null);

  // Modal States ⬇️
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/admin/get-hourly-unassigned-projects");
      setProjects(res.data.projects || []);
    } catch (err) {
      console.error(err);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  // --------------------- INLINE EDIT ---------------------
  const startEdit = (id: string, field: keyof HourlyProject, value: string | number) => {
    setEditingField({ id, field, value });
  };

  const handleFieldChange = (e: ChangeEvent<HTMLInputElement>, field: keyof HourlyProject) => {
    if (!editingField) return;

    const numericFields: (keyof HourlyProject)[] = ["price_per_hour"];
    const value = numericFields.includes(field) ? Number(e.target.value) : e.target.value;

    setEditingField({ ...editingField, value });
  };

  const saveEdit = async () => {
    if (!editingField) return;
    try {
      await axios.put(`/admin/update-hourly-project/${editingField.id}`, {
        [editingField.field]: editingField.value,
      });

      setProjects((prev) =>
        prev.map((p) =>
          p._id === editingField.id ? { ...p, [editingField.field]: editingField.value } : p
        )
      );
    } catch (err) {
      console.error(err);
      alert("Failed to update field.");
    }
    setEditingField(null);
  };

  const cancelEdit = () => setEditingField(null);

  const renderCell = (project: HourlyProject, field: keyof HourlyProject) => {
    const editableFields: (keyof HourlyProject)[] = [
      "project_name",
      "profile_name",
      "sheet_name",
      "project_type",
      "price_per_hour",
    ];

    const isEditing =
      editingField?.id === project._id && editingField?.field === field;

    if (!editableFields.includes(field)) {
      return <>{project[field] ?? "—"}</>;
    }

    if (isEditing) {
      return (
        <input
          type={field === "price_per_hour" ? "number" : "text"}
          value={editingField.value}
          onChange={(e) => handleFieldChange(e, field)}
          className="border px-2 py-1 w-full rounded"
          autoFocus
        />
      );
    }

    return (
      <span
        onClick={() => startEdit(project._id, field, project[field] ?? "")}
        className="cursor-pointer"
      >
        {project[field] ?? "—"}
      </span>
    );
  };

  const handleGoToProject = async (projectId: string) => {
      try {
        // 1️⃣ Update project sheet status
        await axios.put(`/admin/update-project-status/${projectId}`, {
          status: "In Work",
        });
  
        // 2️⃣ Fetch project details
        const res = await axios.get(`/admin/get-project-details/${projectId}`);
  
        if (!res.data.success || !res.data.googleSheetUrl) {
          alert("Google Sheet URL not found.");
          return;
        }
  
        // 3️⃣ Open Google Sheet
        window.open(res.data.googleSheetUrl, "_blank");
  
        // 4️⃣ Refresh table
        fetchProjects();
      } catch (err) {
        console.error("Error opening project:", err);
        alert("Failed to open the project.");
      }
    };
  


  // 🔥 Open modal instead of alert
  const handleAssign = (projectId: string) => {
    setSelectedProjectId(projectId);
    setAssignModalOpen(true);
  };

  // Placeholder for hourly calculation — to implement later
  const handleHourlyCalculation = (projectId: string) => {
    alert(`Hourly calculation clicked for ${projectId} (not implemented yet)`);
  };

  // Placeholder for marking a project as complete — to implement later
  const handleMarkAsComplete = (projectId: string) => {
    const ok = window.confirm("Mark this project as complete?");
    if (!ok) return;
    alert(`Mark as complete clicked for ${projectId} (not implemented yet)`);
  };

  if (loading) return <p>Loading hourly unassigned projects...</p>;
  if (projects.length === 0) return <p>No hourly unassigned projects found.</p>;

  return (
    <div className="overflow-x-auto bg-white shadow-xl rounded-2xl p-4 mt-6">
      <h3 className="text-xl font-bold mb-4 text-purple-700">
        Hourly Unassigned Projects
      </h3>

      <table className="min-w-full border text-left text-sm">
        <thead className="bg-purple-100 text-gray-800">
          <tr>
            <th className="p-2 border">Project Id</th>
            <th className="p-2 border">Project Name</th>
            <th className="p-2 border">Profile Name</th>
            <th className="p-2 border">Sheet Name</th>
            <th className="p-2 border">Project Type</th>
            <th className="p-2 border">Price Per Hour</th>
            <th className="p-2 border">Shift</th>
            <th className="p-2 border">Hourly Calc</th>
            <th className="p-2 border">Mark Complete</th>
            <th className="p-2 border">Go to Project</th>
            <th className="p-2 border">Actions</th>
          </tr>
        </thead>

        <tbody>
          {projects.map((p) => (
            <tr key={p._id} className="hover:bg-purple-50 border-b">
              <td className="p-2 border">{p.project_id}</td>
              <td className="p-2 border">{renderCell(p, "project_name")}</td>
              <td className="p-2 border">{renderCell(p, "profile_name")}</td>
              <td className="p-2 border">{renderCell(p, "sheet_name")}</td>
              <td className="p-2 border">{renderCell(p, "project_type")}</td>
              <td className="p-2 border">{renderCell(p, "price_per_hour")}</td>
              <td className="p-2 border">{p.shift}</td>

              {/* Hourly Calculation column */}
              <td className="p-2 border text-center">
                <button
                  onClick={() => handleHourlyCalculation(p.project_id)}
                  className="px-2 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-xs"
                >
                  ⚙️ Calc
                </button>
              </td>

              {/* Mark as Complete column */}
              <td className="p-2 border text-center">
                <button
                  onClick={() => handleMarkAsComplete(p.project_id)}
                  className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
                >
                  ✅ Complete
                </button>
              </td>

           {/* Go to Project column */}
              <td className="p-2 border text-center">
                <button
                  onClick={() => handleGoToProject(p.project_id)}
                  className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
                >
                  🚀 Open
                </button>
              </td>

              <td className="p-2 border space-x-1">
                {editingField ? (
                  <>
                    <button
                      onClick={saveEdit}
                      className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-xs"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => startEdit(p._id, "project_name", p.project_name)}
                    className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                  >
                    Edit
                  </button>
                )}

                <button
                  onClick={() => handleAssign(p._id)}
                  className="px-2 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-xs"
                >
                  Assign
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 🔥 Assign Project Modal */}
      <AssignProjectModal
        projectId={selectedProjectId}
        open={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        onAssigned={() => fetchProjects()} // refresh after assigning
      />
    </div>
  );
}