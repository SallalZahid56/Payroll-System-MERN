import { useState } from "react";
import AddProject from "./AddProject";
import AnotherForm from "./AddHourlyProject"; // you'll create this later

export default function AdminFormsMenu() {
  const [activeForm, setActiveForm] = useState<"addProject" | "anotherForm">("addProject");

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50 py-10 px-4">
      <div className="max-w-6xl mx-auto bg-white shadow-xl rounded-2xl p-8 md:p-10 border border-gray-100">
        <h2 className="text-3xl font-bold text-center text-purple-800 mb-8">
          🛠 Admin Forms
        </h2>

        {/* Menu Buttons */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            className={`px-4 py-2 rounded-lg font-medium ${activeForm === "addProject" ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-700"}`}
            onClick={() => setActiveForm("addProject")}
          >
            Add Fixed Project
          </button>
          <button
            className={`px-4 py-2 rounded-lg font-medium ${activeForm === "anotherForm" ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-700"}`}
            onClick={() => setActiveForm("anotherForm")}
          >
          Add hourly Project
          </button>
        </div>

        {/* Show form based on selection */}
        {activeForm === "addProject" && <AddProject />}
        {activeForm === "anotherForm" && <AnotherForm />}
      </div>
    </div>
  );
}
