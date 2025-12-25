import { useEffect, useState } from "react";
import axios from "../utils/axios";

/* ----------------------- INTERFACES ----------------------- */

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

interface ProjectFormData {
  projectId: string;
  projectName: string;
  profileName: string;
  sheetName: string;
  company: string;
  projectType: string;
  workType: string;
  shift: string[];
  instructions: string;
  projectColumns: string[];
  googleSheetUrl: string;
}

/* ----------------------- MAIN COMPONENT ----------------------- */

export default function ManagerAddHourlyProject() {
  const [projectData, setProjectData] = useState<ProjectFormData>({
    projectId: "",
    projectName: "",
    profileName: "",
    sheetName: "",
    company: "",
    projectType: "hourly",
    workType: "",
    shift: [],
    instructions: "",
    projectColumns: [],
    googleSheetUrl: ""
  });

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDropdowns();
    fetchNextProjectValues();
  }, []);

  const fetchDropdowns = async () => {
    try {
      const [profilesRes, managersRes, columnsRes] = await Promise.all([
        axios.get("/admin/get-profiles-for-form"),
        axios.get("/admin/get-managers"),
        axios.get("/admin/get-columns")
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
          projectName: res.data.nextProjectName
        }));
      }
    } catch (err) {
      console.error("Error fetching next project values:", err);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setProjectData((prev) => ({ ...prev, [name]: value }));
  };

  const handleMultiSelect = (name: keyof ProjectFormData, value: string) => {
    setProjectData((prev) => {
      const arr = prev[name] as string[];
      return {
        ...prev,
        [name]: arr.includes(value)
          ? arr.filter((v) => v !== value)
          : [...arr, value]
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await axios.post("/manager/add-hourly-project", projectData);
      if (res.data.success) {
        alert("✅ Hourly Project Added Successfully!");

        setProjectData({
          projectId: "",
          projectName: "",
          profileName: "",
          sheetName: "",
          company: "",
          projectType: "hourly",
          workType: "",
          shift: [],
          instructions: "",
          projectColumns: [],
          googleSheetUrl: ""
        });

        fetchNextProjectValues();
      } else {
        alert(`❌ ${res.data.message}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error adding hourly project.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-10 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-8 md:p-10 border border-gray-100">
        <h2 className="text-3xl font-bold text-center text-blue-700 mb-8">
          ⏱ Add Hourly Project (Manager)
        </h2>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
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

          <RadioGroup
            label="Work Type"
            name="workType"
            value={projectData.workType}
            onChange={handleChange}
            options={["Lead Generation", "Influencer Research"]}
          />

          <MultiSelect
            label="Select Managers"
            items={managers.map((m) => m.name)}
            selected={projectData.shift}
            onToggle={(val: string) => handleMultiSelect("shift", val)}
          />

          <MultiSelect
            label="Project Columns"
            items={columns.map((c) => c.name)}
            selected={projectData.projectColumns}
            onToggle={(val: string) => handleMultiSelect("projectColumns", val)}
          />

          <div className="col-span-1 md:col-span-2">
            <label className="text-sm font-medium text-gray-700 mb-2">
              Instructions
            </label>
            <textarea
              name="instructions"
              value={projectData.instructions}
              onChange={handleChange}
              rows={4}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
              placeholder="Add instructions..."
            />
          </div>

          <Input
            label="Google Sheet URL"
            name="googleSheetUrl"
            value={projectData.googleSheetUrl}
            onChange={handleChange}
            className="col-span-1 md:col-span-2"
          />

          <div className="col-span-1 md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg shadow-md"
            >
              {loading ? "Submitting..." : "Submit Hourly Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ----------------------- FIXED COMPONENTS ----------------------- */

interface InputProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  readOnly?: boolean;
  className?: string;
}

const Input = ({
  label,
  name,
  value,
  onChange,
  type = "text",
  readOnly = false,
  className = ""
}: InputProps) => (
  <div className={`flex flex-col ${className}`}>
    <label className="text-sm font-medium text-gray-700 mb-1">{label}</label>
    <input
      type={type}
      name={name}
      value={value}
      readOnly={readOnly}
      onChange={onChange}
      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400 ${
        readOnly ? "bg-gray-100" : ""
      }`}
    />
  </div>
);

interface SelectProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: string[];
}

const Select = ({ label, name, value, onChange, options }: SelectProps) => (
  <div className="flex flex-col">
    <label className="text-sm font-medium text-gray-700 mb-1">{label}</label>
    <select
      name={name}
      value={value}
      onChange={onChange}
      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400"
    >
      <option value="">Select</option>
      {options.map((opt) => (
        <option key={opt}>{opt}</option>
      ))}
    </select>
  </div>
);

interface RadioGroupProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  options: string[];
}

const RadioGroup = ({ label, name, value, onChange, options }: RadioGroupProps) => (
  <div className="col-span-1 md:col-span-2">
    <label className="text-sm font-medium text-gray-700 mb-2">{label}</label>
    <div className="flex flex-wrap gap-3">
      {options.map((opt) => (
        <label key={opt} className="flex items-center gap-2">
          <input
            type="radio"
            name={name}
            value={opt}
            checked={value === opt}
            onChange={onChange}
          />
          {opt}
        </label>
      ))}
    </div>
  </div>
);

interface MultiSelectProps {
  label: string;
  items: string[];
  selected: string[];
  onToggle: (value: string) => void;
}

const MultiSelect = ({ label, items, selected, onToggle }: MultiSelectProps) => (
  <div className="col-span-1 md:col-span-2">
    <label className="text-sm font-medium text-gray-700 mb-2">{label}</label>
    <div className="flex flex-wrap gap-2">
      {items.map((name) => (
        <button
          key={name}
          type="button"
          onClick={() => onToggle(name)}
          className={`px-4 py-2 rounded-full border text-sm ${
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
