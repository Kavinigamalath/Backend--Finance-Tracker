// routes/budgetRoutes.js
const express = require("express");
const {
  createBudget,
  getBudgets,
  updateBudget,
  deleteBudget,
  analyzeSpendingTrends,
  getBudgetById,
} = require("../Controllers/budgetController");
const { authenticateUser, authorizeRole } = require("../middleware/authMiddleware");

const router = express.Router();

// Create a new budget
router.post("/", authenticateUser, authorizeRole(["user"]), createBudget);

// Get a specific budget by ID
router.get("/:id", authenticateUser, authorizeRole(["user"]), getBudgetById);  // Route for fetching budget by ID

// Get all budgets for the user
router.get("/", authenticateUser, authorizeRole(["user"]), getBudgets);

// Update an existing budget
router.patch("/:id", authenticateUser, authorizeRole(["user"]), updateBudget);

// Delete a budget
router.delete("/:id", authenticateUser, authorizeRole(["user"]), deleteBudget);

// Trigger spending trend analysis and budget adjustment recommendations
router.get("/spending-trends", authenticateUser, authorizeRole(["user"]), async (req, res) => {
    try {
      const recommendations = await analyzeSpendingTrends(req.user.id);
      res.status(200).json({
        message: "Spending trend analysis completed.",
        recommendations,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
module.exports = router;
