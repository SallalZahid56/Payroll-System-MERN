import { useEffect, useState } from "react";
import axios from "../utils/axios";

interface Manager {
    _id: string;
    name: string;
}

interface Profile {
    _id: string;
    name: string;
}

interface Column {
    _id: string;
    name: string;
}

export default function AddProject() {
    const [projectData, setProjectData] = useState({
        projectId: "",
        projectName: "",
        profileName: "",
        sheetName: "",
        totalEntries: "",
        profilePricePerEntry: "",
        company: "",
        deadline: "",
        fixedOption: "",
        workType: "",
        lumpsumPrice: "",
        priceWorkerOne: "",
        priceWorkerTwo: "",
        priceWorkerThree: "",
        priceWorkerFour: "",
        priceWorkerFive: "",
        shift: [] as string[],
        instructions: "",
        projectColumns: [] as string[],
        googleSheetUrl: "",
    });

    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [managers, setManagers] = useState<Manager[]>([]);
    const [columns, setColumns] = useState<Column[]>([]);
    const [loading, setLoading] = useState(false);
    const [showLumpsum, setShowLumpsum] = useState(false);
    const [entryCount, setEntryCount] = useState(0);

    useEffect(() => {
        fetchInitialData();
        fetchNextProjectValues();
    }, []);

    const fetchInitialData = async () => {
        try {
            const [profilesRes, managersRes, columnsRes] = await Promise.all([
                axios.get("/admin/get-profiles-for-form"),
                axios.get("/admin/get-managers"),
                axios.get("/admin/get-columns"),
            ]);

            setProfiles(profilesRes.data.profiles || []);
            setManagers(managersRes.data.managers || []);
            setColumns(columnsRes.data.columns || []);
        } catch (err) {
            console.error("Error fetching initial data:", err);
        }
    };

    const fetchNextProjectValues = async () => {
        try {
            const res = await axios.get("/admin/next-project-values");
            if (res.data.success) {
                setProjectData((prev) => ({
                    ...prev,
                    projectId: res.data.nextProjectId,
                    projectName: res.data.nextProjectName,
                }));
            }
        } catch (err) {
            console.error("Error fetching next project values:", err);
        }
    };

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setProjectData((prev) => ({ ...prev, [name]: value }));
    };

    const handleFixedOptionChange = (value: string) => {
        setProjectData((prev) => ({ ...prev, fixedOption: value }));
        setShowLumpsum(value === "Lumpsum");

        const entryMap: Record<string, number> = {
            "Single Entry": 1,
            "Double Entry": 2,
            "Triple Entry": 3,
            "Four Entry": 4,
            "Fifth Entry": 5,
        };
        setEntryCount(entryMap[value] || 0);
    };

    const handleMultiSelect = (name: string, value: string) => {
        setProjectData((prev) => {
            const arr = prev[name as keyof typeof prev] as string[];
            return {
                ...prev,
                [name]: arr.includes(value)
                    ? arr.filter((v) => v !== value)
                    : [...arr, value],
            };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await axios.post("/admin/add-project", projectData);
            if (res.data.success) {
                alert("✅ Project added successfully!");

                // Reset all fields except projectId/projectName first
                setProjectData(prev => ({
                    ...prev,
                    profileName: "",
                    sheetName: "",
                    totalEntries: "",
                    profilePricePerEntry: "",
                    company: "",
                    deadline: "",
                    fixedOption: "",
                    workType: "",
                    lumpsumPrice: "",
                    priceWorkerOne: "",
                    priceWorkerTwo: "",
                    priceWorkerThree: "",
                    priceWorkerFour: "",
                    priceWorkerFive: "",
                    shift: [],
                    instructions: "",
                    projectColumns: [],
                    googleSheetUrl: "",
                }));

                // Fetch next project ID and Name from server
                const nextRes = await axios.get("/admin/next-project-values");
                if (nextRes.data.success) {
                    setProjectData(prev => ({
                        ...prev,
                        projectId: nextRes.data.nextProjectId,
                        projectName: nextRes.data.nextProjectName,
                    }));
                }
            } else {
                alert(`❌ ${res.data.message}`);
            }
        } catch (err: unknown) {
            console.error(err);
            alert("Error adding project.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50 py-10 px-4">
            <div className="max-w-5xl mx-auto bg-white shadow-xl rounded-2xl p-8 md:p-10 border border-gray-100">
                <h2 className="text-3xl font-bold text-center text-purple-800 mb-8">
                    🧩 Add New Project
                </h2>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Project ID & Name */}
                    <Input label="Project ID" name="projectId" value={projectData.projectId} readOnly onChange={handleChange} />
                    <Input label="Project Name" name="projectName" value={projectData.projectName} onChange={handleChange} />

                    {/* Profile & Sheet */}
                    <Select label="Select Profile" name="profileName" value={projectData.profileName} onChange={handleChange} options={profiles.map(p => p.name)} />
                    <Input label="Sheet Name" name="sheetName" value={projectData.sheetName} onChange={handleChange} />

                    <Input label="Total Entries" name="totalEntries" type="number" value={projectData.totalEntries} onChange={handleChange} />
                    <Input label="Profile Price Per Entry" name="profilePricePerEntry" type="number" value={projectData.profilePricePerEntry} onChange={handleChange} />

                    <Select label="Select Company" name="company" value={projectData.company} onChange={handleChange} options={["3 into 3", "FreelancersZone", "InfoNav"]} />
                    <Input label="Deadline" name="deadline" type="date" value={projectData.deadline} onChange={handleChange} />

                    {/* Fixed Options */}
                    <div className="col-span-1 md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Fixed Option</label>
                        <div className="flex flex-wrap gap-3">
                            {["Lumpsum", "Single Entry", "Double Entry", "Triple Entry", "Four Entry", "Fifth Entry"].map(opt => (
                                <button
                                    key={opt}
                                    type="button"
                                    onClick={() => handleFixedOptionChange(opt)}
                                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${projectData.fixedOption === opt
                                        ? "bg-purple-600 text-white border-purple-600"
                                        : "bg-white text-gray-700 border-gray-300 hover:bg-purple-50"
                                        }`}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                    </div>

                    {showLumpsum && (
                        <Input label="Lumpsum Price" name="lumpsumPrice" type="number" value={projectData.lumpsumPrice} onChange={handleChange} className="col-span-1 md:col-span-2" />
                    )}

                    {/* Dynamic Prices */}
                    {entryCount > 0 && (
                        <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[...Array(entryCount)].map((_, idx) => (
                                <Input
                                    key={idx}
                                    label={`Price for Worker ${idx + 1}`}
                                    name={`priceWorker${["One", "Two", "Three", "Four", "Five"][idx]}`}
                                    type="number"
                                    value={
                                        projectData[
                                        `priceWorker${["One", "Two", "Three", "Four", "Five"][idx]}` as keyof typeof projectData
                                        ] as string
                                    }
                                    onChange={handleChange}
                                />
                            ))}
                        </div>
                    )}

                    {/* Work Type */}
                    <div className="col-span-1 md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Work Type</label>
                        <div className="flex gap-4 flex-wrap">
                            {["Lead Generation", "Influencer Research"].map(type => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setProjectData(prev => ({ ...prev, workType: type }))}
                                    className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${projectData.workType === type
                                        ? "bg-indigo-600 text-white border-indigo-600"
                                        : "bg-white text-gray-700 border-gray-300 hover:bg-indigo-50"
                                        }`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Managers */}
                    <MultiSelect label="Select Managers" items={managers.map(m => m.name)} selected={projectData.shift} onToggle={(name) => handleMultiSelect("shift", name)} />

                    {/* Columns */}
                    <MultiSelect label="Project Columns" items={columns.map(c => c.name)} selected={projectData.projectColumns} onToggle={(name) => handleMultiSelect("projectColumns", name)} />

                    {/* Instructions */}
                    <div className="col-span-1 md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Instructions</label>
                        <textarea
                            name="instructions"
                            value={projectData.instructions}
                            onChange={handleChange}
                            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-400 focus:outline-none"
                            rows={4}
                            placeholder="Add any notes or special instructions here..."
                        />
                    </div>

                    {/* Google Sheet */}
                    <Input label="Google Sheet URL" name="googleSheetUrl" type="url" value={projectData.googleSheetUrl} onChange={handleChange} className="col-span-1 md:col-span-2" />

                    <div className="col-span-1 md:col-span-2 flex justify-end">
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-purple-700 hover:bg-purple-800 transition-all text-white font-semibold px-6 py-2 rounded-lg shadow-md"
                        >
                            {loading ? "Submitting..." : "Submit Project"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* 🔹 Reusable Input Component */
const Input = ({
    label,
    name,
    value,
    onChange,
    type = "text",
    readOnly = false,
    className = "",
}: {
    label: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    type?: string;
    readOnly?: boolean;
    className?: string;
}) => (
    <div className={`flex flex-col ${className}`}>
        <label className="text-sm font-medium text-gray-700 mb-1">{label}</label>
        <input
            type={type}
            name={name}
            value={value}
            readOnly={readOnly}
            onChange={onChange}
            className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-400 focus:outline-none transition ${readOnly ? "bg-gray-100" : ""}`}
        />
    </div>
);

/* 🔹 Reusable Select Component */
const Select = ({
    label,
    name,
    value,
    onChange,
    options,
}: {
    label: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    options: string[];
}) => (
    <div className="flex flex-col">
        <label className="text-sm font-medium text-gray-700 mb-1">{label}</label>
        <select
            name={name}
            value={value}
            onChange={onChange}
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-400 focus:outline-none"
        >
            <option value="">Select</option>
            {options.map((opt) => (
                <option key={opt} value={opt}>
                    {opt}
                </option>
            ))}
        </select>
    </div>
);

/* 🔹 Reusable MultiSelect Component */
const MultiSelect = ({
    label,
    items,
    selected,
    onToggle,
}: {
    label: string;
    items: string[];
    selected: string[];
    onToggle: (name: string) => void;
}) => (
    <div className="col-span-1 md:col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
        <div className="flex flex-wrap gap-2">
            {items.map((name) => (
                <button
                    key={name}
                    type="button"
                    onClick={() => onToggle(name)}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${selected.includes(name)
                        ? "bg-purple-600 text-white border-purple-600"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-purple-50"
                        }`}
                >
                    {name}
                </button>
            ))}
        </div>
    </div>
);
