// controllers/goalController.js
const Goal = require("../models/Goal");
const User = require("../models/User");
const { sendEmailNotification } = require("../utils/emailNotification");
const moment = require("moment");

// Create a new goal for the user
exports.createGoal = async (req, res) => {
  try {
    const { name, targetAmount, deadline, allocationPercentage } = req.body;
    const userId = req.user.id;

    // Ensure the total allocation percentage does not exceed 100%
    const existingGoals = await Goal.find({ userId });
    const totalAllocation = existingGoals.reduce((sum, goal) => sum + goal.allocationPercentage, 0);

    if (totalAllocation + allocationPercentage > 100) {
      return res.status(400).json({ error: "Total allocation percentage cannot exceeds 100%" });
    }

    // Create and save the new goal
    const goal = new Goal({
      userId,
      name,
      targetAmount,
      currentAmount: 0,
      deadline,
      allocationPercentage,
    });

    await goal.save();
    res.status(201).json({ message: "Goal created successfully", goal });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get all goals for the user
exports.getGoals = async (req, res) => {
  try {
    const userId = req.user.id;
    const goals = await Goal.find({ userId });
    res.status(200).json(goals);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get a specific goal by ID
exports.getGoalById = async (req, res) => {
  try {
    const { id } = req.params; // Get the ID from the URL parameters
    const goal = await Goal.findById(id); // Find the goal by its ID

    if (!goal) {
      return res.status(404).json({ error: "Goal not found" }); // If no goal is found
    }

    res.status(200).json(goal); // Return the found goal
  } catch (error) {
    console.error("Error fetching goal by ID:", error);
    res.status(500).json({ error: "Server error" }); // Handle errors
  }
};

// Update an existing goal
exports.updateGoal = async (req, res) => {
  try {
    const { id } = req.params;
    const { targetAmount, currentAmount, deadline, allocationPercentage } = req.body;
    const userId = req.user.id;

    // Ensure that the total allocation percentage does not exceed 100%
    const existingGoals = await Goal.find({ userId });
    const totalAllocation = existingGoals.reduce((sum, goal) => sum + goal.allocationPercentage, 0);

    if (totalAllocation + allocationPercentage > 100) {
      return res.status(400).json({ error: "Total allocation percentage exceeds 100%" });
    }

    // Update and return the goal
    const goal = await Goal.findByIdAndUpdate(id, { targetAmount, currentAmount, deadline, allocationPercentage }, { new: true });

    res.status(200).json({ message: "Goal updated successfully", goal });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete a goal
exports.deleteGoal = async (req, res) => {
  try {
    const { id } = req.params;
    await Goal.findByIdAndDelete(id);
    res.status(200).json({ message: "Goal deleted successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Check for goal reminders (7 days before the deadline) and send email notifications
exports.checkGoalReminders = async () => {
    try {
      // Fetch all goals and populate userId to get the email
      const goals = await Goal.find({}); // Get all goals
  
      for (const goal of goals) {
        const today = moment(); // Today's date
        const deadline = moment(goal.deadline); // Goal's deadline date
        const user = await User.findById(goal.userId); // Fetch user who set the goal
  
        // Ensure the user and email exist
        if (!user || !user.email) {
          console.log(`No email found for user with ID: ${goal.userId}`);
          continue; // Skip if no email found for user
        }
  
        console.log(`Checking goal: ${goal.name}, Deadline: ${deadline.format("YYYY-MM-DD")}, Today: ${today.format("YYYY-MM-DD")}`);
        
         // Check if the goal is achieved (currentAmount >= targetAmount)
        if (goal.currentAmount >= goal.targetAmount) {
          console.log(`Goal "${goal.name}" has already been achieved. No reminder needed.`);
          continue; // Skip sending reminder if the goal is achieved
        }

        // Check if the deadline is within 7 days from today
        const sevenDaysLater = moment().add(7, "days");
  
        if (deadline.isBetween(today, sevenDaysLater, null, "[]")) {
          console.log(`Goal "${goal.name}" is within the next 7 days. Sending reminder email.`);
  
          // Send the email reminder
          await sendEmailNotification(
            user.email, // Now using the populated email
            `Reminder: Deadline Approaching for Goal - ${goal.name}`,
            `Reminder: Your goal of saving for "${goal.name}" is due soon. Your deadline is ${deadline.format("YYYY-MM-DD")}. Keep saving!`
          );
        }
      }
    } catch (error) {
      console.error("Error sending goal reminders:", error); // Log error if reminder fails
    }
  };
