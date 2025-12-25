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

export default function ManagerAddProject() {
  const [projectData, setProjectData] = useState({
    projectId: "",
    projectName: "",
    profileName: "",
    sheetName: "",
    company: "",
    deadline: "",
    fixedOption: "",
    workType: "",
    shift: [] as string[],
    instructions: "",
    projectColumns: [] as string[],
    googleSheetUrl: "",
  });

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [loading, setLoading] = useState(false);

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

  const handleMultiSelect = (name: string, value: string) => {
    setProjectData((prev) => {
      const arr = prev[name as keyof typeof prev] as string[];
      return {
        ...prev,
        [name]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value],
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await axios.post("/manager/add-project", projectData);
      if (res.data.success) {
        alert("✅ Project added successfully!");
        setProjectData((prev) => ({
          ...prev,
          profileName: "",
          sheetName: "",
          company: "",
          deadline: "",
          fixedOption: "",
          workType: "",
          shift: [],
          instructions: "",
          projectColumns: [],
          googleSheetUrl: "",
        }));
        fetchNextProjectValues();
      } else {
        alert(`❌ ${res.data.message}`);
      }
    } catch (err) {
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

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {/* Project ID & Name */}
          <Input
            label="Project ID"
            name="projectId"
            value={projectData.projectId}
            readOnly
            onChange={handleChange}
          />
          <Input
            label="Project Name"
            name="projectName"
            value={projectData.projectName}
            onChange={handleChange}
          />

          {/* Profile & Sheet */}
          <Select
            label="Select Profile"
            name="profileName"
            value={projectData.profileName}
            onChange={handleChange}
            options={profiles.map((p) => p.name)}
          />
          <Input
            label="Sheet Name"
            name="sheetName"
            value={projectData.sheetName}
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
            label="Deadline"
            name="deadline"
            type="date"
            value={projectData.deadline}
            onChange={handleChange}
          />

          {/* Fixed Options */}
          <RadioGroup
            label="Fixed Option"
            name="fixedOption"
            value={projectData.fixedOption}
            onChange={handleChange}
            options={[
              "Lumpsum",
              "Single Entry",
              "Double Entry",
              "Triple Entry",
              "Four Entry",
              "Fifth Entry",
            ]}
          />

          {/* Work Type */}
          <RadioGroup
            label="Work Type"
            name="workType"
            value={projectData.workType}
            onChange={handleChange}
            options={["Lead Generation", "Influencer Research"]}
          />

          {/* Managers */}
          <MultiSelect
            label="Select Managers"
            items={managers.map((m) => m.name)}
            selected={projectData.shift}
            onToggle={(name) => handleMultiSelect("shift", name)}
          />

          {/* Columns */}
          <MultiSelect
            label="Project Columns"
            items={columns.map((c) => c.name)}
            selected={projectData.projectColumns}
            onToggle={(name) => handleMultiSelect("projectColumns", name)}
          />

          {/* Instructions */}
          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Instructions
            </label>
            <textarea
              name="instructions"
              value={projectData.instructions}
              onChange={handleChange}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-400 focus:outline-none"
              rows={4}
              placeholder="Add instructions in points"
            />
          </div>

          {/* Google Sheet */}
          <Input
            label="Google Sheet URL"
            name="googleSheetUrl"
            type="url"
            value={projectData.googleSheetUrl}
            onChange={handleChange}
            className="col-span-1 md:col-span-2"
          />

          {/* Submit */}
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

/* 🔹 Input Component */
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
      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-400 focus:outline-none transition ${
        readOnly ? "bg-gray-100" : ""
      }`}
    />
  </div>
);

/* 🔹 Select Component */
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

/* 🔹 RadioGroup Component */
const RadioGroup = ({
  label,
  name,
  value,
  onChange,
  options,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  options: string[];
}) => (
  <div className="col-span-1 md:col-span-2">
    <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
    <div className="flex flex-wrap gap-3">
      {options.map((opt) => (
        <label key={opt} className="flex items-center gap-2">
          <input
            type="radio"
            name={name}
            value={opt}
            checked={value === opt}
            onChange={onChange}
            className="form-radio"
          />
          {opt}
        </label>
      ))}
    </div>
  </div>
);

/* 🔹 MultiSelect Component */
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
