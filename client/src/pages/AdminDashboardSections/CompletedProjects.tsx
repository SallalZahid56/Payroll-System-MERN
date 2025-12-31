import { useState, useEffect } from "react";
import axios from "../../utils/axios";

interface CompletedProject {
    project_id: string;
    project_name: string;
    profile_name: string;
    sheet_name: string;
    total_entries: number;
    project_type?: string;
    fixed_option?: string;
    price_per_entry?: number;
    lumpsum_price?: number;
    price_worker_one?: number;
    price_worker_two?: number;
    shift?: string;
    revised?: boolean;
}

export default function CompletedProjectsTable() {
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [projects, setProjects] = useState<CompletedProject[]>([]);
    const [allProjectNames, setAllProjectNames] = useState<string[]>([]);
    const [selectedProject, setSelectedProject] = useState("");
    const [loading, setLoading] = useState(false);

    // Fetch all project names for dropdown
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

            {/* Project selector */}
            <div className="flex flex-wrap gap-4 items-end mb-4">
                <div className="flex flex-col">
                    <label className="text-sm text-gray-700">Select Project</label>
                    <select
                        className="border rounded px-3 py-2"
                        value={selectedProject}
                        onChange={e => setSelectedProject(e.target.value)}
                    >
                        <option value="">-- Select a Project --</option>
                        {allProjectNames.map(name => (
                            <option key={name} value={name}>{name}</option>
                        ))}
                    </select>
                </div>
                <button
                    className="px-4 py-2 bg-purple-700 text-white rounded"
                    onClick={() => fetchCompletedProjects(selectedProject)}
                >
                    Fetch Selected Project
                </button>
            </div>

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
                                        "Price Per Entry",
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
                                {projects.map((p, idx) => (
                                    <tr key={idx} className="hover:bg-purple-50">
                                        <td className="px-4 py-2">{p.project_id}</td>
                                        <td className="px-4 py-2">{p.project_name}</td>
                                        <td className="px-4 py-2">{p.profile_name}</td>
                                        <td className="px-4 py-2">{p.sheet_name}</td>
                                        <td className="px-4 py-2">{p.total_entries}</td>
                                        <td className="px-4 py-2">{p.project_type ?? "—"}</td>
                                        <td className="px-4 py-2">{p.fixed_option ?? "—"}</td>
                                        <td className="px-4 py-2">{p.price_per_entry ?? "—"}</td>
                                        <td className="px-4 py-2">{p.lumpsum_price ?? "—"}</td>
                                        <td className="px-4 py-2">{p.price_worker_one ?? "—"}</td>
                                        <td className="px-4 py-2">{p.price_worker_two ?? "—"}</td>
                                        <td className="px-4 py-2">{p.shift ?? "—"}</td>
                                        <td className="px-4 py-2">{p.revised ? "Yes" : "No"}</td>
                                        <td className="px-4 py-2">
                                            <button className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700">
                                                Edit
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
