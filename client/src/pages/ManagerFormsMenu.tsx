import { useState } from "react";
import ManagerAddProject from "./ManagerAddProject";
import ManagerAddHourlyProject from "./ManagerAddHourlyProject";

export default function ManagerFormsMenu() {
  const [activeForm, setActiveForm] = useState<"addProject" | "addHourlyProject">("addProject");

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-10 px-4">
      <div className="max-w-6xl mx-auto bg-white shadow-xl rounded-2xl p-8 md:p-10 border border-gray-100">
        <h2 className="text-3xl font-bold text-center text-blue-700 mb-8">
          🛠 Manager Forms
        </h2>

        {/* Menu Buttons */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            className={`px-4 py-2 rounded-lg font-medium ${
              activeForm === "addProject" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"
            }`}
            onClick={() => setActiveForm("addProject")}
          >
            Add Fixed Project
          </button>

          <button
            className={`px-4 py-2 rounded-lg font-medium ${
              activeForm === "addHourlyProject" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"
            }`}
            onClick={() => setActiveForm("addHourlyProject")}
          >
            Add Hourly Project
          </button>
        </div>

        {/* Render selected form */}
        {activeForm === "addProject" && <ManagerAddProject />}
        {activeForm === "addHourlyProject" && <ManagerAddHourlyProject />}
      </div>
    </div>
  );
}
