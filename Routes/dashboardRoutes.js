const express = require("express");
const { authenticateUser, authorizeRole } = require("../middleware/authMiddleware");
const { getAdminDashboard, getUserDashboard } = require("../Controllers/dashboardController");

const router = express.Router();

// Admin Dashboard - Overview of all users, total system activity, and financial summaries
router.get("/admin", authenticateUser, authorizeRole(["admin"]), getAdminDashboard);

// User Dashboard - Personalized summary of transactions, budgets, and goals
router.get("/user", authenticateUser, authorizeRole(["user"]), getUserDashboard);

module.exports = router;
