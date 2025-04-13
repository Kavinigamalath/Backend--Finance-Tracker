// controllers/budgetController.js

// Import required models and utilities
const Budget = require("../models/Budget");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const { sendEmailNotification } = require("../utils/emailNotification");

// Create a new budget (monthly or category-specific)
exports.createBudget = async (req, res) => {
  try {
    const { type, category, amount } = req.body; // Destructure the incoming request body to get the budget details
    const userId = req.user.id; // Get the user ID from the authenticated user

    // If the budget type is "monthly"
    if (type === "monthly") {
      // Ensure that only one monthly budget exists for the current month
      const existingMonthlyBudget = await Budget.findOne({
        userId,
        type: "monthly",
        month: new Date().toLocaleString("default", { month: "long" }),
        year: new Date().getFullYear(),
      });

      if (existingMonthlyBudget) {
        return res.status(400).json({ error: "You can only have one monthly budget for the current month." });
      }

      // Ensure that category is not provided for monthly budgets
      if (category) {
        return res.status(400).json({ error: "Monthly budgets cannot have a category." });
      }
    }

    // If the budget type is "category"
    if (type === "category") {
      // Ensure that no other budget exists for the same category for the current user
      const existingCategoryBudget = await Budget.findOne({
        userId,
        type: "category",
        category: category, // Check if a budget already exists for this category
      });

      if (existingCategoryBudget) {
        return res.status(400).json({ error: `A budget for the category '${category}' already exists.` });
      }
    }

    // Create the new budget object with the provided details
    const budget = new Budget({
      userId,
      type,
      category,
      amount,
      currentAmount: 0, // Initialize current amount as 0
    });

    // Save the new budget to the database
    await budget.save();

    res.status(201).json({ message: "Budget created successfully", budget });
  } catch (error) {
    res.status(400).json({ error: error.message }); // If there is any error, send it as a response
  }
};

// Get all budgets for the authenticated user
exports.getBudgets = async (req, res) => {
  try {
    const userId = req.user.id; // Get the user ID from the authenticated user
    const budgets = await Budget.find({ userId }); // Fetch all budgets for the user from the database
    res.status(200).json(budgets); // Return the list of budgets as a response
  } catch (error) {
    res.status(400).json({ error: error.message }); // If there is any error, send it as a response
  }
};

// Update the amount for a specific budget
exports.updateBudget = async (req, res) => {
  try {
    const { id } = req.params; // Get the budget ID from the URL parameters
    const { amount } = req.body; // Get the new amount from the request body

    // Find the budget by ID and update the amount
    const budget = await Budget.findByIdAndUpdate(id, { amount }, { new: true });
    res.status(200).json({ message: "Budget updated successfully", budget });
  } catch (error) {
    res.status(400).json({ error: error.message }); // If there is any error, send it as a response
  }
};

// Delete a specific budget by ID
exports.deleteBudget = async (req, res) => {
  try {
    const { id } = req.params; // Get the budget ID from the URL parameters
    await Budget.findByIdAndDelete(id); // Find the budget by ID and delete it from the database
    res.status(200).json({ message: "Budget deleted successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message }); // If there is any error, send it as a response
  }
};

// Analyze spending trends over the last 3 months and send recommendations
exports.analyzeSpendingTrends = async (userId) => {
  try {
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1); // Get the first day of the current month
    const threeMonthsAgo = new Date(now.setMonth(now.getMonth() - 3)); // Get date 3 months ago

    // Get transactions for the last 3 months, including the current month
    const transactions = await Transaction.find({
      userId,
      type: "expense", // Only consider expense transactions
      date: { $gte: threeMonthsAgo }, // Filter for transactions from the last 3 months
    }).populate("category");

    // Aggregate spending by category and by month
    const spendingByCategory = {};
    const spendingByMonth = {};

    transactions.forEach((transaction) => {
      const transactionMonth = transaction.date.toLocaleString("default", { month: "long" });
      const transactionYear = transaction.date.getFullYear();
      const monthKey = `${transactionMonth}-${transactionYear}`; // Combine month and year as key

      // Aggregate spending for the current month
      if (!spendingByMonth[monthKey]) {
        spendingByMonth[monthKey] = 0;
      }
      spendingByMonth[monthKey] += transaction.amount;

      // Aggregate spending for each category
      if (!spendingByCategory[transaction.category]) {
        spendingByCategory[transaction.category] = 0;
      }
      spendingByCategory[transaction.category] += transaction.amount;
    });

    // Analyze spending trends and provide recommendations
    const user = await User.findById(userId);
    const recommendations = [];

    // Analyze monthly spending trends
    const currentMonthKey = `${new Date().toLocaleString("default", { month: "long" })}-${new Date().getFullYear()}`;
    const currentMonthSpending = spendingByMonth[currentMonthKey] || 0;

    // Get the user's monthly budget
    const monthlyBudget = await Budget.findOne({
      userId,
      type: "monthly",
      month: new Date().toLocaleString("default", { month: "long" }),
      year: new Date().getFullYear(),
    });

    if (monthlyBudget) {
      // If the user exceeds the monthly budget, recommend increasing the budget
      if (currentMonthSpending > monthlyBudget.amount) {
        recommendations.push({
          category: "Monthly Budget",
          message: `You have exceeded your monthly budget of $${monthlyBudget.amount}. You've spent $${currentMonthSpending} this month. We recommend increasing your monthly budget.`
        });
      }

      // If spending is significantly lower than the budget, recommend reallocating the budget
      if (currentMonthSpending < monthlyBudget.amount * 0.5) {
        recommendations.push({
          category: "Monthly Budget",
          message: `You have underspent your monthly budget of $${monthlyBudget.amount}. You've spent $${currentMonthSpending} this month. Consider reallocating some of this budget to other categories.`
        });
      }
    }

    // Analyze category spending trends
    for (let category in spendingByCategory) {
      const categoryBudget = await Budget.findOne({ userId, type: "category", category });

      if (!categoryBudget) continue; // Skip if the user doesn't have a budget for this category

      const spendingInCategory = spendingByCategory[category];

      // If spending is greater than the category budget, recommend increasing the budget
      if (spendingInCategory > categoryBudget.amount) {
        recommendations.push({
          category,
          message: `You have exceeded your ${category} budget of $${categoryBudget.amount}. You've spent $${spendingInCategory} in this category. We recommend increasing your ${category} budget.`
        });
      }

      // If spending is significantly lower than the budget, recommend reallocating the budget
      if (spendingInCategory < categoryBudget.amount * 0.5) {
        recommendations.push({
          category,
          message: `You have underspent your ${category} budget of $${categoryBudget.amount}. You've spent $${spendingInCategory} in this category. Consider reallocating some of this budget to other categories.`
        });
      }
    }

    // Send email notifications for recommendations
    for (let recommendation of recommendations) {
      await sendEmailNotification(
        user.email,
        `Budget Adjustment Recommendation for ${recommendation.category}`,
        recommendation.message
      );
    }

    return recommendations;

  } catch (error) {
    console.error("Error analyzing spending trends:", error);
  }
};

// Get a specific budget by its ID
exports.getBudgetById = async (req, res) => {
  try {
    const { id } = req.params; // Get the ID from the URL parameters
    const budget = await Budget.findById(id); // Find the budget by its ID

    if (!budget) {
      return res.status(404).json({ error: "Budget not found" }); // If no budget is found
    }

    res.status(200).json(budget); // Return the found budget
  } catch (error) {
    console.error("Error fetching budget by ID:", error);
    res.status(500).json({ error: "Server error" }); // Handle errors
  }
};
