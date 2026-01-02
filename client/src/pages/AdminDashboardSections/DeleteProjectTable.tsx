import { useEffect, useState } from "react";
import axios from "../../utils/axios";

type ProjectRow = {
  _id?: string;
  project_id: string;
  project_name: string;
  status?: string;
  updated_at?: string | Date;
};

export default function DeleteProjectTable() {
  const [projectNames, setProjectNames] = useState<string[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  // Single input combines project-name selection and free-form search
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  // Autocomplete suggestion state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);

  useEffect(() => {
    fetchProjectNames();
  }, []);

  // Update suggestions whenever the search term or available names change
  useEffect(() => {
    const q = searchTerm.trim().toLowerCase();

    // If input is empty but suggestions were requested (focus), show initial list
    if (q.length === 0 && showSuggestions) {
      setFilteredSuggestions(projectNames.slice(0, 200));
      return;
    }

    // For one or more characters, filter (allow single-letter matches too)
    if (q.length >= 1) {
      setFilteredSuggestions(
        projectNames.filter((n) => n.toLowerCase().includes(q)).slice(0, 200)
      );
      setShowSuggestions(true);
      return;
    }

    // Otherwise clear
    setFilteredSuggestions([]);
    setShowSuggestions(false);
  }, [searchTerm, projectNames, showSuggestions]);

  const selectSuggestion = (name: string) => {
    setSearchTerm(name);
    setShowSuggestions(false);
  };

  const fetchProjectNames = async () => {
    try {
      const res = await axios.get<string[]>('/admin/get-deletable-project-names');
      setProjectNames(res.data ?? []);
    } catch (err) {
      console.error('Error fetching project names:', err);
    }
  }; 



  const fetchProjects = async (opts?: { projectId?: string; projectName?: string }) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate && endDate) {
        params.append('start_date', startDate);
        params.append('end_date', endDate);
      }
      if (opts?.projectId) params.append('project_id', opts.projectId);
      if (opts?.projectName) params.append('project_name', opts.projectName);

      const q = params.toString() ? `?${params.toString()}` : '';
      const res = await axios.get<ProjectRow[]>(`/admin/get-deletable-projects${q}`);
      setProjects(res.data ?? []);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }; 

  const handleFetch = () => {
    // If search term is numeric, use project_id; otherwise use project_name
    if (searchTerm.trim()) {
      const isNumeric = /^\d+$/.test(searchTerm.trim());
      if (isNumeric) fetchProjects({ projectId: searchTerm.trim() });
      else fetchProjects({ projectName: searchTerm.trim() });
    } else {
      fetchProjects();
    }
  };

  const handleDelete = async (projectId: string) => {
    if (!confirm(`Are you sure you want to delete project ${projectId}?`)) return;
    try {
      await axios.delete(`/admin/delete-project/${encodeURIComponent(projectId)}`);
      alert(`Project ${projectId} deleted.`);
      // refresh list
      fetchProjects();
      fetchProjectNames();
    } catch (err) {
      console.error('Error deleting project:', err);
      alert('Failed to delete project');
    }
  };

  return (
    <div className="bg-white shadow-xl rounded-2xl p-6 overflow-x-auto">
      <h2 className="text-2xl font-bold mb-4 text-purple-800">🗑️ Delete a Project</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Row 1: single Project input (left) and date range (right) */}
        <div className="flex items-end gap-4">
          <div className="flex flex-col w-full relative overflow-visible">
            <label className="text-sm text-gray-700">Project (name or ID)</label>
            <input
              type="text"
              placeholder="Type project name or numeric ID"
              className="border rounded px-3 py-2 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => { setShowSuggestions(true); }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleFetch(); }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            />

            {showSuggestions && (
              <ul className="absolute z-50 left-0 right-0 top-full mt-2 bg-white border rounded w-full max-h-72 overflow-y-auto shadow">
                {filteredSuggestions.length > 0 ? (
                  filteredSuggestions.map((n) => (
                    <li key={n} className="px-3 py-2 hover:bg-purple-50 cursor-pointer" onMouseDown={() => selectSuggestion(n)}>{n}</li>
                  ))
                ) : (
                  <li className="px-3 py-2 text-sm text-gray-500">No suggestions</li>
                )}
              </ul>
            )}
          </div>
        </div>

        <div className="flex items-end gap-4">
          <div className="flex flex-col">
            <label className="text-sm text-gray-700">Start Date</label>
            <input type="date" className="border rounded px-3 py-2" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>

          <div className="flex flex-col">
            <label className="text-sm text-gray-700">End Date</label>
            <input type="date" className="border rounded px-3 py-2" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>

        {/* Row 2: helper text (left) and action buttons (right) */}
        <div className="flex items-end">
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-xs text-gray-500">Start typing to get project name suggestions (min 2 letters). Numeric input will be treated as Project ID.</span>
          </div>
        </div>

        <div className="flex items-end justify-end gap-2">
          <button className="px-4 py-2 bg-purple-700 text-white rounded" onClick={handleFetch}>Search</button>
          <button className="px-4 py-2 bg-gray-300 rounded" onClick={() => { setSearchTerm(''); setStartDate(''); setEndDate(''); setProjects([]); setShowSuggestions(false); }}>Clear</button>
          <button className="px-4 py-2 bg-green-600 text-white rounded" onClick={() => fetchProjects()}>Fetch</button>
        </div>
      </div>

      <div className="mb-3 text-sm text-gray-600">Found <strong>{projects.length}</strong> project(s)</div>

      <div className="min-w-full overflow-x-auto">
        {loading ? (
          <div className="text-center py-4">Loading...</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-4">No projects found.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 rounded-xl">
            <thead className="bg-purple-100">
              <tr>
                {["Project ID", "Project Name", "Status", "Updated At", "Delete"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-purple-900 font-semibold uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {projects.map((p) => (
                <tr key={p.project_id} className="hover:bg-purple-50 transition-colors">
                  <td className="px-4 py-2">{p.project_id}</td>
                  <td className="px-4 py-2">{p.project_name}</td>
                  <td className="px-4 py-2">{p.status ?? "-"}</td>
                  <td className="px-4 py-2">{p.updated_at ? new Date(p.updated_at).toLocaleString() : "-"}</td>
                  <td className="px-4 py-2">
                    <button onClick={() => handleDelete(p.project_id)} className="px-3 py-1 bg-red-600 text-white rounded text-sm">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
