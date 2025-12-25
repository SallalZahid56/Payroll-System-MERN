import { useEffect, useState } from "react";
import axios from "../utils/axios";

interface Manager {
  _id?: string;
  name: string;
}

interface Profile {
  _id?: string;
  name: string;
}

interface Column {
  _id?: string;
  name: string;
}

export default function AddHourlyProject() {
  const [projectData, setProjectData] = useState({
    projectId: "",
    projectName: "",
    profileName: "",
    sheetName: "",
    totalEntries: "",
    company: "",
    projectType: "hourly",
    pricePerHour: "",
    workType: "",
    shift: [] as string[], // selected managers
    instructions: "",
    projectColumns: [] as string[],
    googleSheetUrl: "",
  });

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch dropdown data
  useEffect(() => {
    fetchDropdowns();
    fetchNextProjectValues();
  }, []);

  const fetchDropdowns = async () => {
    try {
      const [profilesRes, managersRes, columnsRes] = await Promise.all([
        axios.get("/admin/get-profiles-for-form"),
        axios.get("/admin/get-managers"),
        axios.get("/admin/get-columns"),
      ]);
      setProfiles(profilesRes.data.profiles || []);
      setManagers(managersRes.data.managers || []);
      setColumns(columnsRes.data.columns || []);
    } catch (error) {
      console.error("Error fetching dropdown data:", error);
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
      const res = await axios.post("/admin/add-hourly-project", projectData);
      if (res.data.success) {
        alert("✅ Hourly project added successfully!");

        // Reset the form
        setProjectData({
          projectId: "",
          projectName: "",
          profileName: "",
          sheetName: "",
          totalEntries: "",
          company: "",
          projectType: "hourly",
          pricePerHour: "",
          workType: "",
          shift: [],
          instructions: "",
          projectColumns: [],
          googleSheetUrl: "",
        });

        // Fetch new project ID & name
        fetchNextProjectValues();
      } else {
        alert(`❌ ${res.data.message}`);
      }
    } catch (error) {
      console.error(error);
      alert("Error adding hourly project.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-10 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-8 md:p-10 border border-gray-100">
        <h2 className="text-3xl font-bold text-center text-blue-700 mb-8">
          ⏱ Add Hourly Project
        </h2>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input label="Project ID" name="projectId" value={projectData.projectId} readOnly onChange={handleChange} />
          <Input label="Project Name" name="projectName" value={projectData.projectName} onChange={handleChange} />

          <Select
            label="Select Profile"
            name="profileName"
            value={projectData.profileName}
            onChange={handleChange}
            options={profiles.map((p) => p.name)}
          />
          <Input label="Sheet Name" name="sheetName" value={projectData.sheetName} onChange={handleChange} />

          <Input
            label="Total Entries"
            name="totalEntries"
            type="number"
            value={projectData.totalEntries}
            onChange={handleChange}
          />

          <Select
            label="Select Company"
            name="company"
            value={projectData.company}
            onChange={handleChange}
            options={["3 into 3", "FreelancersZone", "InfoNav"]}
          />

          <Input
            label="Price Per Hour"
            name="pricePerHour"
            type="number"
            value={projectData.pricePerHour}
            onChange={handleChange}
          />

          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Work Type</label>
            <div className="flex gap-4 flex-wrap">
              {["Lead Generation", "Influencer Research"].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setProjectData((prev) => ({ ...prev, workType: type }))}
                  className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                    projectData.workType === type
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-blue-50"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <MultiSelect
            label="Select Managers"
            items={managers.map((m) => m.name)}
            selected={projectData.shift}
            onToggle={(name) => handleMultiSelect("shift", name)}
          />

          <MultiSelect
            label="Project Columns"
            items={columns.map((c) => c.name)}
            selected={projectData.projectColumns}
            onToggle={(name) => handleMultiSelect("projectColumns", name)}
          />

          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Instructions</label>
            <textarea
              name="instructions"
              value={projectData.instructions}
              onChange={handleChange}
              rows={4}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
              placeholder="Add instructions here..."
            />
          </div>

          <Input
            label="Google Sheet URL"
            name="googleSheetUrl"
            type="url"
            value={projectData.googleSheetUrl}
            onChange={handleChange}
            className="col-span-1 md:col-span-2"
          />

          <div className="col-span-1 md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-700 hover:bg-blue-800 text-white font-semibold px-6 py-2 rounded-lg shadow-md"
            >
              {loading ? "Submitting..." : "Submit Hourly Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* 🔹 Reusable Input */
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
      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none ${
        readOnly ? "bg-gray-100" : ""
      }`}
    />
  </div>
);

/* 🔹 Reusable Select */
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
      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
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

/* 🔹 Reusable MultiSelect */
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
          className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
            selected.includes(name)
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-gray-700 border-gray-300 hover:bg-blue-50"
          }`}
        >
          {name}
        </button>
      ))}
    </div>
  </div>
);
