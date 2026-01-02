import { useEffect, useState } from "react";
import axios from "../../utils/axios";

type ProjectListItem = { project_id: string; project_name: string };

type ExpenseRow = {
  project_id: string;
  project_name: string;
  sheet_name?: string;
  profile_name?: string;
  worker_name?: string;
  salary?: number;
  entries?: number | null;
  profile_debit?: number | null;
  company?: string;
};

export default function ProjectExpenseTable() {
  const [projectList, setProjectList] = useState<ProjectListItem[]>([]);
  const [projects, setProjects] = useState<ExpenseRow[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);

  useEffect(() => {
    fetchProjectList();
  }, []);

  useEffect(() => {
    const q = searchTerm.trim().toLowerCase();
    if (q.length === 0 && showSuggestions) {
      setFilteredSuggestions(projectList.map(p => p.project_name).slice(0, 200));
      return;
    }
    if (q.length >= 1) {
      setFilteredSuggestions(
        projectList.map(p => p.project_name).filter(n => n.toLowerCase().includes(q)).slice(0, 200)
      );
      setShowSuggestions(true);
      return;
    }
    setFilteredSuggestions([]);
    setShowSuggestions(false);
  }, [searchTerm, projectList, showSuggestions]);

  const selectSuggestion = (name: string) => {
    setSearchTerm(name);
    setShowSuggestions(false);
  };

  const fetchProjectList = async () => {
    try {
      const res = await axios.get<ProjectListItem[]>('/admin/projects/list');
      setProjectList(res.data ?? []);
    } catch (err) {
      console.error('Error fetching project list:', err);
    }
  };

  const fetchPayrollByProjectId = async (projectId: string) => {
    setLoading(true);
    try {
      const res = await axios.get<{ success: boolean; data: ExpenseRow[] }>(`/admin/payroll/project/${encodeURIComponent(projectId)}`);
      if (res.data?.success) setProjects(res.data.data || []);
      else setProjects([]);
    } catch (err) {
      console.error('Error fetching project payroll:', err);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFetch = () => {
    if (!searchTerm.trim()) return alert("Please select or enter a project ID/name.");

    const isNumeric = /^\d+$/.test(searchTerm.trim());
    if (isNumeric) {
      fetchPayrollByProjectId(searchTerm.trim());
      return;
    }

    // Try find by name
    const found = projectList.find(p => p.project_name.toLowerCase() === searchTerm.trim().toLowerCase());
    if (found) {
      fetchPayrollByProjectId(found.project_id);
    } else {
      alert('Please select a project from suggestions or enter a valid numeric ID.');
    }
  };

  return (
    <div className="bg-white shadow-xl rounded-2xl p-6 overflow-x-auto">
      <h2 className="text-2xl font-bold mb-4 text-purple-800">💸 Project Expense</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="flex items-end gap-4">
          <div className="flex flex-col w-full relative overflow-visible">
            <label className="text-sm text-gray-700">Project (name or ID)</label>
            <input
              type="text"
              placeholder="Type project name or numeric ID"
              className="border rounded px-3 py-2 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
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

        <div className="flex items-end">
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-xs text-gray-500">Start typing to get project name suggestions. Numeric input will be treated as Project ID.</span>
          </div>
        </div>

        <div className="flex items-end justify-end gap-2">
          <button className="px-4 py-2 bg-purple-700 text-white rounded" onClick={handleFetch}>Search</button>
          <button className="px-4 py-2 bg-gray-300 rounded" onClick={() => { setSearchTerm(''); setProjects([]); setShowSuggestions(false); }}>Clear</button>
        </div>
      </div>

      <div className="mb-3 text-sm text-gray-600">Found <strong>{projects.length}</strong> row(s)</div>

      <div className="min-w-full overflow-x-auto">
        {loading ? (
          <div className="text-center py-4">Loading...</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-4">No data</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 rounded-xl">
            <thead className="bg-purple-100">
              <tr>
                {["Project ID","Project Name","Sheet Name","Profile Name","Worker Name","Salary","Entries","Profile Debit","Company"].map(h=> (
                  <th key={h} className="px-4 py-3 text-left text-purple-900 font-semibold uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {projects.map((p, idx) => (
                <tr key={idx} className="hover:bg-purple-50 transition-colors">
                  <td className="px-4 py-2">{p.project_id}</td>
                  <td className="px-4 py-2">{p.project_name}</td>
                  <td className="px-4 py-2">{p.sheet_name ?? '-'}</td>
                  <td className="px-4 py-2">{p.profile_name ?? '-'}</td>
                  <td className="px-4 py-2">{p.worker_name ?? '-'}</td>
                  <td className="px-4 py-2">{p.salary?.toFixed?.(2) ?? p.salary ?? '-'}</td>
                  <td className="px-4 py-2">{p.entries ?? '-'}</td>
                  <td className="px-4 py-2">{p.profile_debit?.toFixed?.(2) ?? p.profile_debit ?? '-'}</td>
                  <td className="px-4 py-2">{p.company ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
