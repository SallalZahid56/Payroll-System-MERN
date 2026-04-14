import { useEffect, useState } from "react";
import axios from "../../utils/axios";
import RevisionPreviewModal from "../../components/RevisionPreviewModal";

interface PendingProject {
  _id: string;
  project_id: string;
  project_name: string;
  profile_name: string;
  sheet_name: string;
  assigned_to?: string;
  total_entries?: number;
  is_revised?: boolean;
  original_completed_at?: string;
  updated_at?: string;
}

export default function PendingRevisions() {
  const [projects, setProjects] = useState<PendingProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalProjectId, setModalProjectId] = useState<string | null>(null);

  const fetchPending = async () => {
    try {
      setLoading(true);
      const res = await axios.get<{ success: boolean; projects: PendingProject[] }>("/admin/get-pending-revisions");
      setProjects(res.data.projects || []);
    } catch (err) {
      console.error("Error fetching pending revisions", err);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const openModal = (projectId: string) => {
    setModalProjectId(projectId);
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setModalProjectId(null);
    fetchPending();
  };

  return (
    <div className="bg-white shadow-lg rounded-xl p-6 w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">Pending Revisions</h3>
        <button className="px-3 py-1 bg-gray-100 rounded" onClick={fetchPending}>{loading ? 'Refreshing...' : 'Refresh'}</button>
      </div>

      <div className="relative w-full overflow-x-auto border rounded-lg">
        {projects.length === 0 ? (
          <div className="text-center py-6 text-gray-500">No pending revisions</div>
        ) : (
          <div className="inline-block min-w-full">
            <table className="w-max divide-y divide-gray-200">
              <thead className="bg-purple-100 sticky top-0 z-10">
                <tr>
                  {["Project ID","Project Name","Profile Name","Sheet Name","Assigned To","Revised","Original Completed","Updated","Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-purple-900 font-semibold uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {projects.map((p) => (
                  <tr key={p._id} className="hover:bg-purple-50">
                    <td className="px-4 py-2">{p.project_id}</td>
                    <td className="px-4 py-2">{p.project_name}</td>
                    <td className="px-4 py-2">{p.profile_name}</td>
                    <td className="px-4 py-2">{p.sheet_name}</td>
                    <td className="px-4 py-2">{p.assigned_to ?? '—'}</td>
                    <td className="px-4 py-2">{p.is_revised ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-2">{p.original_completed_at ? new Date(p.original_completed_at).toLocaleString() : '—'}</td>
                    <td className="px-4 py-2">{p.updated_at ? new Date(p.updated_at).toLocaleString() : '—'}</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        <button onClick={() => openModal(p.project_id)} className="px-2 py-1 bg-amber-600 text-white rounded text-xs hover:bg-amber-700">Preview</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <RevisionPreviewModal projectId={modalProjectId} isOpen={modalOpen} onClose={closeModal} onApplied={() => fetchPending()} />
    </div>
  );
}
