// routes/goalRoutes.js
const express = require("express");
const {
  createGoal,
  getGoals,
  updateGoal,
  deleteGoal,
  getGoalById
} = require("../Controllers/goalController");
const { authenticateUser, authorizeRole } = require("../middleware/authMiddleware");

const router = express.Router();

// Create a new goal
router.post("/", authenticateUser, authorizeRole(["user"]), createGoal);

// Get a specific goal by ID
router.get("/:id", authenticateUser, authorizeRole(["user"]), getGoalById);  // Route for fetching goal by ID

// Get all goals for the user
router.get("/", authenticateUser, authorizeRole(["user"]), getGoals);

// Update an existing goal
router.patch("/:id", authenticateUser, authorizeRole(["user"]),updateGoal);

// Delete a goal
router.delete("/:id", authenticateUser, authorizeRole(["user"]),deleteGoal);

module.exports = router;
