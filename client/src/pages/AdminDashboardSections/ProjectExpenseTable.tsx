import { useEffect, useState } from "react";
import axios from "../../utils/axios";
import { AxiosError } from "axios";

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

// Project details returned by /admin/get-project-details
type ProjectDetails = {
  success?: boolean;
  googleSheetUrl?: string;
  is_file_based?: boolean;
  project_type?: string;
  work_type?: string;
  fixed_option?: string;
  sheet_name?: string; // optional — some responses include a sheet/tab name
  project_columns?: string[];
};

// Approval request body used for recalculation/approval routes
type ApproveRequestBody = {
  projectId: string;
  salaries?: { worker: string; salary: number }[];
  lumpsumPrice?: number;
};

export default function ProjectExpenseTable() {
  // Helper to safely extract an error message from unknown errors (including Axios errors)
  const extractErrorMessage = (e: unknown, fallback = 'An error occurred') => {
    if (!e) return fallback;
    if (typeof e === 'string') return e;
    if (e instanceof Error) return e.message;
    const ax = e as AxiosError & { response?: unknown };
    // response could be unknown; safely attempt to read nested message when available
    const resp = ax?.response as unknown;
    if (resp && typeof resp === 'object') {
      const maybe = resp as Record<string, unknown>;
      const data = maybe['data'] as unknown;
      if (data && typeof data === 'object') {
        const msg = (data as Record<string, unknown>)['message'];
        if (typeof msg === 'string') return msg;
      }
    }
    return ax?.message || fallback;
  };
  const [projectList, setProjectList] = useState<ProjectListItem[]>([]);
  const [projects, setProjects] = useState<ExpenseRow[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentProjectDetails, setCurrentProjectDetails] = useState<ProjectDetails | null>(null);

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);
  const [suppressSuggestions, setSuppressSuggestions] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editRow, setEditRow] = useState<Partial<ExpenseRow> | null>(null);

  useEffect(() => {
    fetchProjectList();
  }, []);

  useEffect(() => {
    if (suppressSuggestions) {
      setFilteredSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const q = searchTerm.trim().toLowerCase();

    // If user selected an exact suggestion and the input equals that suggestion, keep suggestions hidden
    if (selectedSuggestion && selectedSuggestion.toLowerCase() === q) {
      setFilteredSuggestions([]);
      setShowSuggestions(false);
      return;
    }

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
  }, [searchTerm, projectList, showSuggestions, selectedSuggestion, suppressSuggestions]);

  const selectSuggestion = (name: string) => {
    setSearchTerm(name);
    setShowSuggestions(false);
    setSelectedSuggestion(name);
    setSuppressSuggestions(true);
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
      setCurrentProjectId(projectId);
    } catch (err) {
      console.error('Error fetching project payroll:', err);
      setProjects([]);
      setCurrentProjectId(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectDetails = async (projectId: string) => {
    try {
      const res = await axios.get(`/admin/get-project-details/${encodeURIComponent(projectId)}`);
      setCurrentProjectDetails(res.data || null);
      return res.data;
    } catch (err) {
      console.error('Error fetching project details:', err);
      setCurrentProjectDetails(null);
      return null;
    }
  };

  const handleRecalculate = async () => {
    if (!currentProjectId) return alert('Please fetch a project first.');

    const confirmed = window.confirm('Recalculate salaries for this project? This will run the approval calculation logic and update salaries.');
    if (!confirmed) return;

    setLoading(true);
    try {
      let project = currentProjectDetails;
      if (!project) {
        project = await fetchProjectDetails(currentProjectId);
      }

      if (!project) throw new Error('Project details not found');

      // Ensure project status is set to "In Work" before running approval/recalculation logic
      try {
        await axios.put(`/admin/update-project-status/${encodeURIComponent(currentProjectId)}`, { status: "In Work" });
      } catch (err) {
        console.error('Failed to update project status before recalculation:', err);
        alert('Failed to set project status to In Work. Aborting recalculation.');
        setLoading(false);
        return;
      }

      // Sync project data from Google Sheets into the DB so server approval logic uses fresh data
      try {
        await axios.post('/admin/sync-project-data');
      } catch (err) {
        console.error('Failed to sync project data before recalculation:', err);
        alert('Failed to sync project data. Aborting recalculation.');
        setLoading(false);
        return;
      }

      let url = '';
      let body: ApproveRequestBody = { projectId: currentProjectId };

      // Normalize fixed_option for robust comparisons
      const fixedOpt = ((project.fixed_option || "") as string).toString().trim().toLowerCase();

      // Lumpsum projects — after sync, let server calculate using ProjectData
      if (fixedOpt === 'lumpsum') {
        url = '/admin/approve-lumpsum';
        body = { projectId: currentProjectId };

      // Single Entry projects — use single-entry approve endpoint and provide salaries if available
      } else if (fixedOpt.includes('single')) {
        // After sync, prefer server-side calculation from ProjectData. Do not send client table salaries.
        url = '/admin/approve-single-entry';
        body = { projectId: currentProjectId };

      // Multi-entry projects (Double/Triple/Four/Fifth) → multi-entry approve endpoint
      } else if (
        fixedOpt.includes('double') ||
        fixedOpt.includes('triple') ||
        fixedOpt.includes('four') ||
        fixedOpt.includes('fifth')
      ) {
        url = '/admin/approve-multi-entry';
        body = { projectId: currentProjectId };
      // Fallback: if project has a sheet_name but no fixed_option, treat as single-entry
      } else if (project.sheet_name && !project.fixed_option) {
        // fallback to server calculation
        url = '/admin/approve-single-entry';
        body = { projectId: currentProjectId };

      // Final fallback: try lumpsum flow if nothing else matches
      } else {
        // final fallback: use server-side lumpsum approval based on synced data
        url = '/admin/approve-lumpsum';
        body = { projectId: currentProjectId };
      }

      await axios.post(url, body);
      alert('Recalculation finished (approval route executed)');

      // refresh payroll data to show updated salaries
      await fetchPayrollByProjectId(currentProjectId);
    } catch (err: unknown) {
      console.error('Error recalculating project payroll:', err);
      const msg = extractErrorMessage(err, 'Failed to recalculate ❌');
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleFetch = () => {
    if (!searchTerm.trim()) return alert("Please select or enter a project ID/name.");

    const isNumeric = /^\d+$/.test(searchTerm.trim());
    if (isNumeric) {
      setShowSuggestions(false);
      setSelectedSuggestion(null);
      setSuppressSuggestions(true);
      fetchPayrollByProjectId(searchTerm.trim());
      return;
    }

    // Try find by name
    const found = projectList.find(p => p.project_name.toLowerCase() === searchTerm.trim().toLowerCase());
    if (found) {
      setShowSuggestions(false);
      setSelectedSuggestion(null);
      setSuppressSuggestions(true);
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
              onChange={(e) => { setSearchTerm(e.target.value); setSelectedSuggestion(null); setSuppressSuggestions(false); }}
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
          <button className="px-4 py-2 bg-gray-300 rounded" onClick={() => { setSearchTerm(''); setProjects([]); setShowSuggestions(false); setSelectedSuggestion(null); setSuppressSuggestions(false); setCurrentProjectId(null); setCurrentProjectDetails(null); }}>Clear</button>
          <button
            className={`px-4 py-2 rounded ${currentProjectId ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
            onClick={handleRecalculate}
            disabled={!currentProjectId || loading}
          >
            🔁 Recalculate
          </button>
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
                  <td className="px-4 py-2">{editingIndex === idx ? (
                    <input className="border rounded px-2 py-1 w-40" value={editRow?.sheet_name ?? p.sheet_name ?? ''} onChange={(e)=> setEditRow(r=> ({...(r||{}), sheet_name: e.target.value}))} />
                  ) : (p.sheet_name ?? '-')}</td>
                  <td className="px-4 py-2">{editingIndex === idx ? (
                    <input className="border rounded px-2 py-1 w-40" value={editRow?.profile_name ?? p.profile_name ?? ''} onChange={(e)=> setEditRow(r=> ({...(r||{}), profile_name: e.target.value}))} />
                  ) : (p.profile_name ?? '-')}</td>
                  <td className="px-4 py-2">{editingIndex === idx ? (
                    <input className="border rounded px-2 py-1 w-40" value={editRow?.worker_name ?? p.worker_name ?? ''} onChange={(e)=> setEditRow(r=> ({...(r||{}), worker_name: e.target.value}))} />
                  ) : (p.worker_name ?? '-')}</td>
                  <td className="px-4 py-2">{editingIndex === idx ? (
                    <input type="number" step="0.01" className="border rounded px-2 py-1 w-28" value={editRow?.salary ?? (p.salary ?? 0)} onChange={(e)=> setEditRow(r=> ({...(r||{}), salary: Number(e.target.value)}))} />
                  ) : (p.salary?.toFixed?.(2) ?? p.salary ?? '-')}</td>
                  <td className="px-4 py-2">{editingIndex === idx ? (
                    <input type="number" className="border rounded px-2 py-1 w-20" value={editRow?.entries ?? (p.entries ?? '')} onChange={(e)=> setEditRow(r=> ({...(r||{}), entries: e.target.value === '' ? null : Number(e.target.value)}))} />
                  ) : (p.entries ?? '-')}</td>
                  <td className="px-4 py-2">{editingIndex === idx ? (
                    <input type="number" step="0.01" className="border rounded px-2 py-1 w-28" value={editRow?.profile_debit ?? (p.profile_debit ?? 0)} onChange={(e)=> setEditRow(r=> ({...(r||{}), profile_debit: Number(e.target.value)}))} />
                  ) : (p.profile_debit?.toFixed?.(2) ?? p.profile_debit ?? '-')}</td>
                  <td className="px-4 py-2">{editingIndex === idx ? (
                    <div className="flex gap-2">
                      <input className="border rounded px-2 py-1 w-28" value={editRow?.company ?? p.company ?? ''} onChange={(e)=> setEditRow(r=> ({...(r||{}), company: e.target.value}))} />
                      <button className="px-2 py-1 bg-green-600 text-white rounded" onClick={async ()=>{
                        // Save
                        try {
                          const payload = {
                            project_id: p.project_id,
                            project_name: editRow?.project_name ?? p.project_name,
                            sheet_name: editRow?.sheet_name ?? p.sheet_name,
                            profile_name: editRow?.profile_name ?? p.profile_name,
                            worker_name: editRow?.worker_name ?? p.worker_name,
                            original_worker_name: p.worker_name,
                            salary: editRow?.salary ?? p.salary ?? 0,
                            entries: editRow?.entries ?? p.entries ?? null,
                            profile_debit: editRow?.profile_debit ?? p.profile_debit ?? null,
                            company: editRow?.company ?? p.company ?? null,
                          };

                          await axios.post('/admin/payroll/update-entry', payload);
                          setEditingIndex(null);
                          setEditRow(null);
                          await fetchPayrollByProjectId(p.project_id);
                          alert('Row saved');
                        } catch (err: unknown) {
                          console.error('Failed to save row:', err);
                          alert(extractErrorMessage(err, 'Save failed'));
                        }
                      }}>Save</button>
                      <button className="px-2 py-1 bg-gray-300 rounded" onClick={()=>{ setEditingIndex(null); setEditRow(null); }}>Cancel</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span>{p.company ?? '-'}</span>
                      <button className="px-2 py-1 bg-blue-600 text-white rounded" onClick={()=>{ setEditingIndex(idx); setEditRow({ ...p }); }}>Edit</button>
                    </div>
                  )}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
