const User = require("../models/User");
const Transaction = require("../models/Transaction");
const Budget = require("../models/Budget");
const Goal = require("../models/Goal");

exports.getAdminDashboard = async (req, res) => {
  try {
    // Fetch all users
    const users = await User.find().select("-password");

    // Group users by role
    const admins = users.filter(user => user.role === "admin");
    const regularUsers = users.filter(user => user.role === "user");

    // Total system activity
    const totalUsers = users.length;
    const totaladmins = admins.length;
    const totalregularUsers = regularUsers.length;
    const totalTransactions = await Transaction.countDocuments();
    const totalIncome = await Transaction.aggregate([
      { $match: { type: "income" } },
      { $group: { _id: null, totalIncome: { $sum: "$amount" } } },
    ]);
    const totalExpenses = await Transaction.aggregate([
      { $match: { type: "expense" } },
      { $group: { _id: null, totalExpense: { $sum: "$amount" } } },
    ]);
    const totalBudgetAmount = await Budget.aggregate([
      { $group: { _id: null, totalBudget: { $sum: "$amount" } } },
    ]);
    const totalGoals = await Goal.countDocuments();
    const totalBudgets = await Budget.countDocuments();

    // Prepare dashboard data
    const dashboardData = {
      totalUsers,
      totaladmins,
      totalregularUsers,
      totalTransactions,
      totalIncome: totalIncome[0]?.totalIncome || 0,
      totalExpenses: totalExpenses[0]?.totalExpense || 0,
      totalBudgetAmount: totalBudgetAmount[0]?.totalBudget || 0,
      totalGoals,
      totalBudgets,
    };

    res.status(200).json(dashboardData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getUserDashboard = async (req, res) => {
    try {
      const userId = req.user.id;
  
      // Transactions summary
      const incomeTransactions = await Transaction.aggregate([
        { $match: { userId, type: "income" } },
        { $group: { _id: null, totalIncome: { $sum: "$amount" } } },
      ]);
      const expenseTransactions = await Transaction.aggregate([
        { $match: { userId, type: "expense" } },
        { $group: { _id: null, totalExpense: { $sum: "$amount" } } },
      ]);

      // Calculate net amount
      const totalIncome = incomeTransactions[0]?.totalIncome || 0;
      const totalExpense = expenseTransactions[0]?.totalExpense || 0;

      // Net amount calculation
      const netAmount = totalIncome - totalExpense;
  
      // Budget summary
      const budgets = await Budget.find({ userId });
      const totalBudgetAmount = budgets.reduce((sum, budget) => sum + budget.amount, 0);
  
      // Goal summary
      const goals = await Goal.find({ userId });
      const totalGoalTargetAmount = goals.reduce((sum, goal) => sum + goal.targetAmount, 0);
      const totalGoalCurrentAmount = goals.reduce((sum, goal) => sum + goal.currentAmount, 0);
  
      // Prepare dashboard data
      const dashboardData = {
        totalIncome: incomeTransactions[0]?.totalIncome || 0,
        totalExpense: expenseTransactions[0]?.totalExpense || 0,
        netAmount,
        totalBudgets: budgets.length,
        totalBudgetAmount,
        totalGoals: goals.length,
        totalGoalTargetAmount,
        totalGoalCurrentAmount,
      };
  
      res.status(200).json(dashboardData);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };