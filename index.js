// Import required libraries and modules
const express = require('express');
const app = express();
require("dotenv").config();
const mongoose = require("mongoose");
const cron = require("node-cron");
const helmet = require('helmet');//Security
const rateLimit = require('express-rate-limit');


// Import route files
const authRoutes = require("./Routes/authRoutes");
const userRoutes = require("./Routes/userRoutes");
const transactionRoutes = require("./Routes/transactionRoutes");
const goalRoutes = require("./Routes/goalRoutes");
const budgetRoutes = require("./Routes/budgetRoutes"); // Import budget routes
const financialReportRoutes = require('./Routes/financialReportRoutes');
const dashboardRoutes = require("./Routes/dashboardRoutes");

// Import controllers
const recurringTransactionService = require("./Controllers/transactionController");
const { analyzeSpendingTrends } = require("./Controllers/budgetController");
const { sendUpcomingTransactionNotification } = require("./Controllers/transactionController"); 
const { checkGoalReminders } = require("./Controllers/goalController");
const { generateFinancialReport } = require('./Controllers/financialReportController');

// Import models
const User = require("./models/User");
const Report = require("./models/Report");
const Goal = require("./models/Goal");

// Set the port number
const port = process.env.PORT || 5000;

// const PORT = process.env.PORT;
// const DB_LINK = process.env.DB_LINK;

// Import express and middleware to parse JSON requests
app.use(express.json());
app.use(helmet());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 }));  // Allow 1000 requests in 15 minutes



// Function to connect to the MongoDB database
async function connectDatabase() {
  try {
    await mongoose.connect(process.env.DB_LINK); // Connect to the database using the connection string in .env
    console.log("Connected to Database");
  } catch (err) {
    console.error("Database connection error:", err); // Log any database connection errors
  }
}

// Function to start the server
async function startServer() {
  if (process.env.NODE_ENV !== "test") { // Only run this block if not in test environment
    await connectDatabase(); // Establish a database connection before starting the server
    app.listen(port, () => { // Start the Express server on the specified port
      console.log(`Server is running on port ${port}`);
    });
  }
}

// Call startServer function to initiate the server
startServer();

// Cron job setup for recurring transactions notifications
cron.schedule("0 8 * * *", async () => {
    console.log("Running scheduled task: Checking for upcoming/missed recurring transactions...");
  
    try {
      // Log the start of the notification process
      console.log("Checking for upcoming recurring transactions...");
      await sendUpcomingTransactionNotification(); // Call the function to send notifications
    } catch (error) {
      console.error("Error running cron job:", error); // Log any errors that occur during the cron job
    }
  });

// Cron job to automatically run spending analysis every day at midnight
cron.schedule("0 0 * * *", async () => {
    console.log("Running spending trend analysis for all users...");

    try {
        // Fetch all users who have budgets and perform spending trend analysis for each user
        const users = await User.find();  // Get all users from the database
        for (const user of users) {
        console.log(`Analyzing spending trends for user: ${user.username}`);
        await analyzeSpendingTrends(user._id); // Perform spending analysis for each user
        }
    } catch (error) {
        console.error("Error running cron job:", error); // Log any errors that occur during the cron job
    }
});

// Cron job to run the goal reminder task every day at 9 AM
cron.schedule("0 9 * * *", async () => {
    console.log("Running scheduled task: Checking for upcoming goal deadlines...");
    try {
      await checkGoalReminders(); // Check goals and send reminders to users
    } catch (error) {
      console.error("Error running cron job:", error); // Log any errors that occur during the cron job
    }
  });

// Cron job to generate and send monthly financial reports to users
cron.schedule("0 0 * * *", async () => { // Runs monthly on the 1st day of every month
    console.log("Generating and sending monthly financial reports to users...");
    const users = await User.find({ role: "user" }); // Fetch all regular users from the database
    for (const user of users) {
        console.log(`Sending report to user: ${user.username}`);
        await generateFinancialReport({ user }); // Generate and send the financial report to each user
    }
    console.log("Financial reports sent successfully!"); // Confirm successful report sending
});

// Use route handlers for each API endpoint
app.use('/api/reports', financialReportRoutes);  // Financial report routes
app.use("/api/auth", authRoutes); // Authentication routes (login, register, etc.)
app.use("/api/users", userRoutes); // User management routes
app.use("/api/transactions", transactionRoutes); // Transaction management routes
app.use("/api/budgets", budgetRoutes); // Budget management routes
app.use("/api/goals", goalRoutes); // Goal management routes
app.use("/api/dashboard", dashboardRoutes);

// Default route for testing the server
app.get("/",(req,res)=>{
    res.send("Hello world"); // Respond with a simple message
})  

// Export the Express app for use in other files (for testing)
module.exports = app;