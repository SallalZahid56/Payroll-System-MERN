import { useState, useEffect } from "react";
import axios from "../../utils/axios";
import RevisionPreviewModal from "../../components/RevisionPreviewModal";

interface CompletedProject {
    _id: string;
    project_id: string;
    project_name: string;
    profile_name: string;
    sheet_name: string;
    total_entries: number;
    project_type?: string;
    fixed_option?: string;
    lumpsum_price?: number;
    price_worker_one?: number;
    price_worker_two?: number;
    shift?: string;
    revised?: boolean;
}

interface EditData {
    project_name: string;
    profile_name: string;
    sheet_name: string;
    total_entries: number | string;
    project_type: string;
    fixed_option: string;
    lumpsum_price: number | string;
    price_worker_one: number | string;
    price_worker_two: number | string;
    shift: string;
}

const emptyEditData: EditData = {
    project_name: "",
    profile_name: "",
    sheet_name: "",
    total_entries: "",
    project_type: "",
    fixed_option: "",
    lumpsum_price: "",
    price_worker_one: "",
    price_worker_two: "",
    shift: "",
};

export default function CompletedProjectsTable() {
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [projects, setProjects] = useState<CompletedProject[]>([]);
    const [allProjectNames, setAllProjectNames] = useState<string[]>([]);
    const [selectedProject, setSelectedProject] = useState("");
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalProjectId, setModalProjectId] = useState<string | null>(null);

    // Inline edit state
    const [editRowId, setEditRowId] = useState<string | null>(null);
    const [editData, setEditData] = useState<EditData>(emptyEditData);
    const [saving, setSaving] = useState(false);
    const [editError, setEditError] = useState<string | null>(null);

    useEffect(() => {
        const fetchNames = async () => {
            try {
                const res = await axios.get<string[]>("/admin/get-completed-project-names");
                setAllProjectNames(res.data);
            } catch (err) {
                console.error("Error fetching project names", err);
            }
        };
        fetchNames();
    }, []);

    const fetchCompletedProjects = async (projectName?: string) => {
        try {
            setLoading(true);
            const query = new URLSearchParams();
            if (startDate) query.append("start_date", startDate);
            if (endDate) query.append("end_date", endDate);
            if (projectName) query.append("project_name", projectName);

            const res = await axios.get<CompletedProject[]>("/admin/get-completed-projects?" + query.toString());
            setProjects(res.data);
        } catch (err) {
            console.error("Error fetching completed projects", err);
            alert("Failed to fetch completed projects");
            setProjects([]);
        } finally {
            setLoading(false);
        }
    };

    const openModal = (projectId: string) => {
        setModalProjectId(projectId);
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setModalProjectId(null);
    };

    const handleEditClick = (p: CompletedProject) => {
        setEditRowId(p._id);
        setEditData({
            project_name: p.project_name,
            profile_name: p.profile_name,
            sheet_name: p.sheet_name,
            total_entries: p.total_entries,
            project_type: p.project_type ?? "",
            fixed_option: p.fixed_option ?? "",
            lumpsum_price: p.lumpsum_price ?? 0,
            price_worker_one: p.price_worker_one ?? 0,
            price_worker_two: p.price_worker_two ?? 0,
            shift: p.shift ?? "",
        });
        setEditError(null);
    };

    const handleCancelEdit = () => {
        setEditRowId(null);
        setEditError(null);
    };

    const handleSaveEdit = async (id: string) => {
        if (
            !editData.project_name.trim() ||
            !editData.profile_name.trim() ||
            !editData.sheet_name.trim() ||
            editData.total_entries === ""
        ) {
            setEditError("Project name, profile name, sheet name and total entries are required");
            return;
        }
        try {
            setSaving(true);
            setEditError(null);
            await axios.put(`/admin/update-completed-project/${id}`, {
                project_name: editData.project_name,
                profile_name: editData.profile_name,
                sheet_name: editData.sheet_name,
                total_entries: Number(editData.total_entries),
                project_type: editData.project_type,
                fixed_option: editData.fixed_option,
                lumpsum_price: editData.lumpsum_price === "" ? 0 : Number(editData.lumpsum_price),
                price_worker_one: editData.price_worker_one === "" ? 0 : Number(editData.price_worker_one),
                price_worker_two: editData.price_worker_two === "" ? 0 : Number(editData.price_worker_two),
                shift: editData.shift,
            });
            setEditRowId(null);
            await fetchCompletedProjects(selectedProject);
        } catch (err) {
            console.error("Failed to update project", err);
            const message =
                err instanceof Error && "response" in err
                    ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                    : undefined;
            setEditError(message || "Failed to save changes");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-white shadow-lg rounded-xl p-6 w-full">
            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-end mb-4">
                <div className="flex flex-col">
                    <label className="text-sm text-gray-700">Start Date</label>
                    <input type="date" className="border rounded px-3 py-2" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div className="flex flex-col">
                    <label className="text-sm text-gray-700">End Date</label>
                    <input type="date" className="border rounded px-3 py-2" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
                <button
                    className="px-4 py-2 bg-purple-700 text-white rounded"
                    onClick={() => fetchCompletedProjects()}
                    disabled={loading}
                >
                    {loading ? "Fetching..." : "Fetch Completed Projects"}
                </button>
            </div>

            {/* Project selector (searchable single selection) */}
            <div className="flex flex-wrap gap-4 items-end mb-4">
                <div className="flex flex-col">
                    <label className="text-sm text-gray-700">Select Project</label>
                    <input
                        list="project-list"
                        className="border rounded px-3 py-2"
                        value={selectedProject}
                        onChange={e => setSelectedProject(e.target.value)}
                        placeholder="Type to search projects..."
                    />
                    <datalist id="project-list">
                        {allProjectNames.map(name => (
                            <option key={name} value={name} />
                        ))}
                    </datalist>
                </div>
                <button
                    className="px-4 py-2 bg-purple-700 text-white rounded"
                    onClick={() => fetchCompletedProjects(selectedProject)}
                >
                    Fetch Selected Project
                </button>
            </div>

            {editError && (
                <div className="mb-4 px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
                    {editError}
                </div>
            )}

            {/* Table */}
            <div className="relative w-full overflow-x-auto border rounded-lg">
                {projects.length === 0 ? (
                    <div className="text-center py-6 text-gray-500">No completed projects</div>
                ) : (
                    <div className="inline-block min-w-full">
                        <table className="w-max divide-y divide-gray-200">
                            <thead className="bg-purple-100 sticky top-0 z-10">
                                <tr>
                                    {[
                                        "Project ID",
                                        "Project Name",
                                        "Profile Name",
                                        "Sheet Name",
                                        "Total Entries",
                                        "Project Type",
                                        "Fixed Option",
                                        "Lumpsum Price",
                                        "Price Worker One",
                                        "Price Worker Two",
                                        "Shift",
                                        "Revised",
                                        "Edit",
                                    ].map((h) => (
                                        <th
                                            key={h}
                                            className="px-4 py-3 text-left text-purple-900 font-semibold uppercase whitespace-nowrap"
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {projects.map((p) => {
                                    const isEditing = p._id === editRowId;
                                    return (
                                        <tr key={p._id} className="hover:bg-purple-50">
                                            <td className="px-4 py-2">{p.project_id}</td>
                                            <td className="px-4 py-2">
                                                {isEditing ? (
                                                    <input
                                                        className="border rounded px-2 py-1 w-40"
                                                        value={editData.project_name}
                                                        onChange={e => setEditData({ ...editData, project_name: e.target.value })}
                                                    />
                                                ) : (
                                                    p.project_name
                                                )}
                                            </td>
                                            <td className="px-4 py-2">
                                                {isEditing ? (
                                                    <input
                                                        className="border rounded px-2 py-1 w-32"
                                                        value={editData.profile_name}
                                                        onChange={e => setEditData({ ...editData, profile_name: e.target.value })}
                                                    />
                                                ) : (
                                                    p.profile_name
                                                )}
                                            </td>
                                            <td className="px-4 py-2">
                                                {isEditing ? (
                                                    <input
                                                        className="border rounded px-2 py-1 w-40"
                                                        value={editData.sheet_name}
                                                        onChange={e => setEditData({ ...editData, sheet_name: e.target.value })}
                                                    />
                                                ) : (
                                                    p.sheet_name
                                                )}
                                            </td>
                                            <td className="px-4 py-2">
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        className="border rounded px-2 py-1 w-24"
                                                        value={editData.total_entries}
                                                        onChange={e => setEditData({ ...editData, total_entries: e.target.value })}
                                                    />
                                                ) : (
                                                    p.total_entries
                                                )}
                                            </td>
                                            <td className="px-4 py-2">
                                                {isEditing ? (
                                                    <input
                                                        className="border rounded px-2 py-1 w-28"
                                                        value={editData.project_type}
                                                        onChange={e => setEditData({ ...editData, project_type: e.target.value })}
                                                    />
                                                ) : (
                                                    p.project_type ?? "—"
                                                )}
                                            </td>
                                            <td className="px-4 py-2">
                                                {isEditing ? (
                                                    <input
                                                        className="border rounded px-2 py-1 w-28"
                                                        value={editData.fixed_option}
                                                        onChange={e => setEditData({ ...editData, fixed_option: e.target.value })}
                                                    />
                                                ) : (
                                                    p.fixed_option ?? "—"
                                                )}
                                            </td>
                                            <td className="px-4 py-2">
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        className="border rounded px-2 py-1 w-24"
                                                        value={editData.lumpsum_price}
                                                        onChange={e => setEditData({ ...editData, lumpsum_price: e.target.value })}
                                                    />
                                                ) : (
                                                    p.lumpsum_price ?? "—"
                                                )}
                                            </td>
                                            <td className="px-4 py-2">
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        className="border rounded px-2 py-1 w-24"
                                                        value={editData.price_worker_one}
                                                        onChange={e => setEditData({ ...editData, price_worker_one: e.target.value })}
                                                    />
                                                ) : (
                                                    p.price_worker_one ?? "—"
                                                )}
                                            </td>
                                            <td className="px-4 py-2">
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        className="border rounded px-2 py-1 w-24"
                                                        value={editData.price_worker_two}
                                                        onChange={e => setEditData({ ...editData, price_worker_two: e.target.value })}
                                                    />
                                                ) : (
                                                    p.price_worker_two ?? "—"
                                                )}
                                            </td>
                                            <td className="px-4 py-2">
                                                {isEditing ? (
                                                    <input
                                                        className="border rounded px-2 py-1 w-24"
                                                        value={editData.shift}
                                                        onChange={e => setEditData({ ...editData, shift: e.target.value })}
                                                    />
                                                ) : (
                                                    p.shift ?? "—"
                                                )}
                                            </td>
                                            <td className="px-4 py-2">{p.revised ? "Yes" : "No"}</td>
                                            <td className="px-4 py-2">
                                                <div className="flex gap-2">
                                                    {isEditing ? (
                                                        <>
                                                            <button
                                                                onClick={() => handleSaveEdit(p._id)}
                                                                disabled={saving}
                                                                className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50"
                                                            >
                                                                {saving ? "Saving..." : "Save"}
                                                            </button>
                                                            <button
                                                                onClick={handleCancelEdit}
                                                                disabled={saving}
                                                                className="px-2 py-1 bg-gray-400 text-white rounded text-xs hover:bg-gray-500 disabled:opacity-50"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button
                                                                onClick={() => handleEditClick(p)}
                                                                className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                                                            >
                                                                Edit
                                                            </button>
                                                            <button onClick={() => openModal(p.project_id)} className="px-2 py-1 bg-amber-600 text-white rounded text-xs hover:bg-amber-700">
                                                                Revision
                                                            </button>
                                                            <button
                                                                onClick={async () => {
                                                                    if (!confirm('Set this completed project back to pending for revision?')) return;
                                                                    try {
                                                                        await axios.post('/admin/mark-project-pending-for-revision', { projectId: p.project_id, reason: 'Marked from Completed UI' });
                                                                        fetchCompletedProjects(selectedProject);
                                                                    } catch (err) {
                                                                        console.error('Failed to set pending for revision', err);
                                                                        alert('Failed to set project to pending for revision');
                                                                    }
                                                                }}
                                                                className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                                                            >
                                                                Set Pending
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            <RevisionPreviewModal projectId={modalProjectId} isOpen={modalOpen} onClose={closeModal} onApplied={() => fetchCompletedProjects(selectedProject)} />
        </div>
    );
} 