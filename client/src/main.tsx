import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AdminDashboard from "./pages/AdminDashboard";
import AddProject from "./pages/AddProject";
import UserDashboard from "./pages/UserDashboard";
import PrivateRoute from "./components/PrivateRoute";
import "./index.css";
import ManagerDashboard from "./pages/ManagerDashboard";
import ProfileDashboard from "./pages/ProfileDashboard";


ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* ====================== */}
        {/* Admin Protected Routes */}
        {/* ====================== */}
        <Route
          path="/admin-dashboard/*"
          element={
            <PrivateRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </PrivateRoute>
          }
        >
          {/* These will render inside <AdminDashboard /> */}
          <Route index element={<div className="p-4 text-xl">Welcome, Admin!</div>} />
          <Route path="add-project" element={<AddProject />} />
        </Route>

        {/* ====================== */}
        {/* User Protected Routes */}
        {/* ====================== */}
        <Route
          path="/user-dashboard"
          element={
            <PrivateRoute allowedRoles={["user"]}>
              <UserDashboard />
            </PrivateRoute>
          }
        />

        <Route
          path="/manager-dashboard"
          element={
            <PrivateRoute allowedRoles={["manager"]}>
              <ManagerDashboard />
            </PrivateRoute>
          }
        />

        <Route
          path="/profile-dashboard"
          element={
            <PrivateRoute allowedRoles={["profile"]}>
              <ProfileDashboard />
            </PrivateRoute>
          }
        />

        {/* ====================== */}
        {/* 404 Fallback */}
        {/* ====================== */}
        <Route
          path="*"
          element={
            <div className="text-center mt-20 text-gray-500 text-xl">
              404 — Page Not Found
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
