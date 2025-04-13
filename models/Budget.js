// models/Budget.js
const mongoose = require("mongoose");
const User = require("./User");
const { sendEmailNotification } = require("../utils/emailNotification"); 

const budgetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "User ID is required"],
  },
  type: {
    type: String,
    enum: ["monthly", "category"],
    required: [true, "Budget type is required"],
  },
  category: {
    type: String,
    enum: ["Food", "Transportation", "Entertainment", "Other"],
    default: "Other",
    validate: {
      validator: function (value) {
        return this.type !== "category" || ["Food", "Transportation", "Entertainment", "Other"].includes(value);
      },
      message: "Category is required and must be valid when type is 'category'",
    },
  },
  amount: {
    type: Number,
    required: [true, "Budget amount is required"],
    min: [1, "Budget amount must be at least 1"],
  },
  currentAmount: {
    type: Number,
    default: 0,
    min: [0, "Current amount cannot be negative"],
  },
  month: {
    type: String,
    default: () => new Date().toLocaleString("default", { month: "long" }), // Default to current month
    validate: {
      validator: function (value) {
        return /^[A-Za-z]+$/.test(value); // Ensures it's a valid month string
      },
      message: "Invalid month format",
    },
  },
  year: {
    type: Number,
    default: () => new Date().getFullYear(), // Default to current year
    min: [2024, "Year cannot be before 2024"],
  },
});

budgetSchema.statics.checkBudgetStatus = async function (userId, amount, category) {
  try {
    // Find the user by userId
    const user = await User.findById(userId);
    if (!user) return;

    // Check the user's monthly budget
    const monthlyBudget = await this.findOne({ userId, type: "monthly" });

    if (monthlyBudget) {
      monthlyBudget.currentAmount += amount;

      // If the budget is exceeded, send an email
      if (monthlyBudget.currentAmount > monthlyBudget.amount) {
        await sendEmailNotification(
          user.email,
          "Monthly Budget Exceeded",
          `You have exceeded your monthly budget of $${monthlyBudget.amount}. You've spent $${monthlyBudget.currentAmount} this month.`
        );
      }

      // Automatically update currentAmount without needing to call save manually
      await monthlyBudget.save();  // Save the updated monthly budget
    }

    // Check the category-specific budget
    const categoryBudget = await this.findOne({ userId, type: "category", category });
    if (categoryBudget) {
      categoryBudget.currentAmount += amount;

      // If the category budget is exceeded, send an email
      if (categoryBudget.currentAmount > categoryBudget.amount) {
        await sendEmailNotification(
          user.email,
          `Category Budget Exceeded - ${category}`,
          `You have exceeded your ${category} budget of $${categoryBudget.amount}. You've spent $${categoryBudget.currentAmount} this month.`
        );
      }

      // Automatically update currentAmount without needing to call save manually
      await categoryBudget.save();  // Save the updated category budget
    }

  } catch (error) {
    console.error("Error checking budget status:", error);
  }
};
module.exports = mongoose.model("Budget", budgetSchema);
