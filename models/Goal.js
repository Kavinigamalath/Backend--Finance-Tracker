// models/Goal.js
const mongoose = require("mongoose");
const User = require("./User");
const { sendEmailNotification } = require("../utils/emailNotification");

const goalSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "User ID is required"],
  },
  name: {
    type: String,
    required: [true, "Goal name is required"],
    trim: true,
    minlength: [3, "Goal name must be at least 3 characters long"],
    maxlength: [50, "Goal name cannot exceed 50 characters"],
  },
  targetAmount: {
    type: Number,
    required: [true, "Target amount is required"],
    min: [0, "Target amount cannot be negative"],
  },
  currentAmount: {
    type: Number,
    default: 0,
    min: [0, "Current amount cannot be negative"],
    validate: {
      validator: function (value) {
        return value <= this.targetAmount;
      },
      message: "Current amount cannot exceed target amount",
    },
  },
  deadline: {
    type: Date,
    required: [true, "Deadline is required"],
    validate: {
      validator: function (value) {
        return value >= new Date();
      },
      message: "Deadline cannot be in the past",
    },
  },
  allocationPercentage: {
    type: Number,
    required: [true, "Allocation percentage is required"],
    min: [0, "Allocation percentage cannot be negative"],
    max: [100, "Allocation percentage cannot exceed 100%"],
  },
});

// Static method to check goal progress and send reminders or notifications
goalSchema.statics.checkGoalProgress = async function (userId, incomeAmount) {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    const goals = await this.find({ userId });

    for (const goal of goals) {
      // Skip the goal if it's already completed
      if (goal.currentAmount >= goal.targetAmount) {
        console.log(`Goal "${goal.name}" is already completed. Skipping allocation.`);
        continue; // Skip further processing for this goal
      }

      // Calculate how much of the income should be allocated to this goal
      const amountToAllocate = (goal.allocationPercentage / 100) * incomeAmount;

      // Update the current amount but ensure it does not exceed the target amount
      goal.currentAmount = Math.min(goal.currentAmount + amountToAllocate, goal.targetAmount);

      // Check if the goal is now completed
      if (goal.currentAmount >= goal.targetAmount) {
        console.log(`Goal "${goal.name}" has been completed.`);
        await sendEmailNotification(
          user.email,
          `Goal Completed: ${goal.name}`,
          `Congratulations! You have completed your goal of saving for ${goal.name}.`
        );
      }

      await goal.save(); // Save the updated goal with the new currentAmount
    }
  } catch (error) {
    console.error("Error updating goal progress:", error);
  }
};

module.exports = mongoose.model("Goal", goalSchema);
