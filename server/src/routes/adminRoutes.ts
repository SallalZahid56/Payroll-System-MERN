import express from "express";
import {
  getUsers,
  deleteUser,
  updateUserRole,
  addUser,
  addProject,
  addHourlyProject,
  getProfilesForForm,
  getManagers,
  getColumns,
  getNextProjectValues,
  getUnassignedProjects,
  assignProject,
  getUsersAndCoordinators,
  getAssignedProjects,
  updateProject,
  getHourlyAssignedProjects,
  getHourlyUnassignedProjects,
  updateHourlyProject,
  getProjectDetails,
  updateProjectStatus,
  writeProjectColumns,
  syncProjectDataController,
  getUnpricedUnassignedProjects,
  getUnpricedAssignedProjects,
  getUsersProfiles, getUserPayroll,
  getProfilesForDropDown, getProfilePayroll,
  getAllUsersPayroll,
  getAllProfilesPayroll,
  getFilteredProfilesPayroll,
  getFilteredBWPProfilesPayroll,
  getCompanies,
  getCompanyPayroll,
  getInfonavBwpPayroll,
  getSubmittedProjects,
  getCompletedProjects, getCompletedProjectNames,
  getDeletableProjectNames,
  getDeletableProjects,
  deleteProject,
  getProjectsList,
  getProjectPayroll,
  approveSingleEntryProject,
  approveMultiEntryProject,
  approveLumpsumProject
} from "../controllers/adminController";

const router = express.Router();

// Project management routes
router.get("/users", getUsers);
router.delete("/users/:id", deleteUser);
router.post("/users", addUser);
router.put("/users/:id", updateUserRole);
router.post("/add-project", addProject);
router.post("/add-hourly-project", addHourlyProject);
router.post("/assign-project", assignProject);
router.get("/get-users-and-coordinators", getUsersAndCoordinators);
router.get("/get-profiles-for-form", getProfilesForForm);
router.get("/get-managers", getManagers);
router.get("/get-columns", getColumns);
router.get("/next-project-values", getNextProjectValues);
router.get("/get-assigned-projects", getAssignedProjects);
router.get("/get-all-projects", getUnassignedProjects);
router.get("/get-hourly-assigned-projects", getHourlyAssignedProjects);
router.get("/get-hourly-unassigned-projects", getHourlyUnassignedProjects);
router.get("/get-unpriced-unassigned-projects", getUnpricedUnassignedProjects);
router.put("/update-project/:id", updateProject);
router.put("/update-hourly-project/:id", updateHourlyProject);
router.get("/get-project-details/:projectId", getProjectDetails);
router.put("/update-project-status/:projectId", updateProjectStatus);
router.post("/write-project-columns/:projectId", writeProjectColumns);
router.post("/sync-project-data", syncProjectDataController);
router.get("/get-unpriced-assigned-projects", getUnpricedAssignedProjects);
router.get("/get-users-profiles", getUsersProfiles);
router.get("/payroll/all-users", getAllUsersPayroll);
router.get("/payroll/:username", getUserPayroll);
router.get("/get-profiles", getProfilesForDropDown);
router.get("/payroll-profile/:profileName", getProfilePayroll);
router.get("/payroll-profiles", getAllProfilesPayroll);
router.get("/payroll-filtered-profiles", getFilteredProfilesPayroll);
router.get("/payroll-filtered-profiles-nonbwp", getFilteredBWPProfilesPayroll);
router.get("/companies", getCompanies);
router.get("/payroll-company/:company", getCompanyPayroll);
router.get("/payroll-infonav-bwp", getInfonavBwpPayroll);
router.get("/submitted-projects", getSubmittedProjects);
router.get("/get-completed-projects", getCompletedProjects);
router.get("/get-completed-project-names", getCompletedProjectNames);

// Deletable projects routes
router.get("/get-deletable-project-names", getDeletableProjectNames);
router.get("/get-deletable-projects", getDeletableProjects);
router.delete("/delete-project/:projectId", deleteProject);

// Project Expense routes
router.get("/projects/list", getProjectsList);
router.get("/payroll/project/:projectId", getProjectPayroll);

router.post("/approve-single-entry", approveSingleEntryProject);
router.post("/approve-multi-entry", approveMultiEntryProject);
router.post("/approve-lumpsum", approveLumpsumProject);



export default router;