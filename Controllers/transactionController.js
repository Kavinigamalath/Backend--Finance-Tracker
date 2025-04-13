// controllers/transactionController.js
const Transaction = require("../models/Transaction");
const User = require("../models/User");
const Budget = require("../models/Budget");
const { sendEmailNotification } = require("../utils/emailNotification");
const Goal = require("../models/Goal");
const moment = require("moment");
const { thmxCurrencyConvert } = require("../Services/currencyService");


exports.sendUpcomingTransactionNotification = async () => {
  try {
    const transactions = await Transaction.find({
      recurring: true,
      endDate: { $gte: new Date() }, // Ensure upcoming transactions
    });

    for (const transaction of transactions) {
      let nextExecutionDate = moment(transaction.date);

      switch (transaction.recurrencePattern) {
        case "daily":
          nextExecutionDate.add(1, "days");
          break;
        case "weekly":
          nextExecutionDate.add(1, "weeks");
          break;
        case "monthly":
          nextExecutionDate.add(1, "months");
          break;
        case "yearly":
          nextExecutionDate.add(1, "years");
          break;
        default:
          continue;
      }

      const today = moment();
      const threeDaysLater = moment().add(3, "days");

      if (nextExecutionDate.isBetween(today, threeDaysLater, "day", "[]")) {
        const user = await User.findById(transaction.userId);
        if (!user) continue;

        await sendEmailNotification(
          user.email,
          "Upcoming Recurring Transaction Reminder",
          `Reminder: Your ${transaction.type} transaction of $${transaction.amount} is due on ${nextExecutionDate.format("YYYY-MM-DD")}.`
        );

        console.log(`Upcoming notification sent to ${user.email}`);
      }

      // Check if transaction is missed
      if (nextExecutionDate.isBefore(today, "day") && transaction.status === "pending") {
        transaction.status = "missed";
        await transaction.save();

        const user = await User.findById(transaction.userId);
        if (!user) continue;

        await sendEmailNotification(
          user.email,
          "Missed Recurring Transaction Alert",
          `ALERT: You missed a scheduled ${transaction.type} transaction of $${transaction.amount} on ${nextExecutionDate.format("YYYY-MM-DD")}. Please take action.`
        );

        console.log(`Missed transaction alert sent to ${user.email}`);
      }
    }
  } catch (error) {
    console.error("Error sending notifications:", error);
  }
};

// Get all transactions for admin (filter and sort by tags)
exports.getAllTransactions = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Admins only." });
    }

    // Get query parameters (for filtering and sorting)
    const { tags, sortBy } = req.query;

    // Build query object
    let filter = {};
    if (tags) {
      filter.tags = { $in: tags.split(",") }; // Split tags by comma for filtering
      console.log("Filtering by tags:", filter); // Debug log
    }

    // Build sort object (sorting by date or amount)
    let sort = {};
    if (sortBy) {
      const [field, order] = sortBy.split(":");
      sort[field] = order === "desc" ? -1 : 1; // Ascending or descending sort
      console.log("Sorting by:", sort); // Debug log
    }

    const transactions = await Transaction.find(filter)
      .populate("userId", "username email")
      .sort(sort); // Apply sorting

    console.log("Transactions found:", transactions); // Debug log

    res.status(200).json(transactions);
  } catch (error) {
    console.error("Error while fetching transactions:", error); // Debug log
    res.status(400).json({ error: error.message });
  }
};

// Get transactions for a specific user (filter and sort by tags)
exports.getUserTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { tags, sortBy } = req.query;

    // Build query object for user transactions
    let filter = { userId };
    if (tags) {
      filter.tags = { $in: tags.split(",") }; // Filter by tags
      console.log("Filtering by tags:", filter); // Debug log
    }

    // Build sort object
    let sort = {};
    if (sortBy) {
      const [field, order] = sortBy.split(":");
      sort[field] = order === "desc" ? -1 : 1; // Ascending or descending sort
      console.log("Sorting by:", sort); // Debug log
    }

    const transactions = await Transaction.find(filter)
      .populate("userId", "username email")
      .sort(sort); // Apply sorting

    console.log("Transactions found:", transactions); // Debug log

    res.status(200).json(transactions);
  } catch (error) {
    console.error("Error while fetching user transactions:", error); // Debug log
    res.status(400).json({ error: error.message });
  }
};

exports.addTransaction = async (req, res) => {
  try {
    const { amount, type, category, tags, recurring, recurrencePattern, endDate, currency } = req.body;
    const userId = req.user.id;

    let convertedAmount = amount;
    if (currency && currency !== "USD") {
        try {
            convertedAmount = await thmxCurrencyConvert(amount, currency);
            console.log(`Converted Amount for ${amount} ${currency} to USD:, convertedAmount`);
        } catch (currencyError) {
            console.error(" Currency conversion failed:", currencyError.message);
            return res.status(500).json({ error: "Currency conversion failed" });
        }
    }
    // Create the initial transaction
    const transaction = new Transaction({
      userId,
      amount,
      convertedAmount,
      currency: currency || "USD",
      type,
      category,
      tags,
      recurring,
      recurrencePattern,
      endDate,
      transactionStatus: "pending",
    });

    await transaction.save(); // Save the transaction

    // Handle budgets when the transaction is an expense
    if (type === "expense") {
      await Budget.checkBudgetStatus(userId, convertedAmount, category); // Check and notify if budget is exceeded
    } 
    // Handle goal progress when the transaction is an income
    else if (type === "income") {
      await Goal.checkGoalProgress(userId, convertedAmount); // Check and allocate income to goals
    }

    // Handle recurring transactions
    if (recurring && endDate) {
      let nextTransactionDate = moment(transaction.date);

      while (nextTransactionDate.isBefore(moment(endDate))) {
        switch (recurrencePattern) {
          case "daily":
            nextTransactionDate.add(1, "days");
            break;
          case "weekly":
            nextTransactionDate.add(1, "weeks");
            break;
          case "monthly":
            nextTransactionDate.add(1, "months");
            break;
          case "yearly":
            nextTransactionDate.add(1, "years");
            break;
          default:
            break;
        }

        // Create recurring transactions
        const recurringTransaction = new Transaction({
          userId,
          amount,
          convertedAmount,
          currency: currency || "USD",
          type,
          category,
          tags,
          recurring: true,
          recurrencePattern,
          date: nextTransactionDate.toDate(),
          endDate,
          transactionStatus: "pending",
        });

        await recurringTransaction.save();

        // Add recurring expenses to budgets
        if (type === "expense") {
          await Budget.checkBudgetStatus(userId, convertedAmount, category); // Check and notify if budget is exceeded
        } 
        // Add recurring income to goals
        else if (type === "income") {
          await Goal.checkGoalProgress(userId, convertedAmount); // Check and allocate income to goals
        }
      }
    }

    res.status(201).json({ message: "Transaction added successfully", transaction });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update an existing transaction
exports.updateTransaction = async (req, res) => {
  try {
    const transactionId = req.params.id;
    const updates = req.body;

    const updatedTransaction = await Transaction.findByIdAndUpdate(transactionId, updates, {userId,
      amount,
      convertedAmount,
      currency: currency || "USD",
      type,
      category,
      tags,
      recurring,
      recurrencePattern,
      endDate,
      transactionStatus: "pending",
    });
    //   new: true,
    // });
    res.status(200).json({ message: "Transaction updated successfully", updatedTransaction });
  } catch (error) {
    res.status(400).json({ error: "Invalid transaction update" });
  }
};

// Delete a transaction
exports.deleteTransaction = async (req, res) => {
  try {
    const transactionId = req.params.id;
    await Transaction.findByIdAndDelete(transactionId);
    res.status(200).json({ message: "Transaction deleted successfully" });
  } catch (error) {
    res.status(404).json({ error: "Transaction not found" });
  }
};
//mark transaction is completed or not
exports.markTransactionAsCompleted = async (req, res) => {
  try {
    const transactionId = req.params.id;
    const transaction = await Transaction.findById(transactionId);

    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    if (transaction.transactionStatus === "completed") {
      return res.status(400).json({ error: "Transaction is already marked as completed" });
    }

    transaction.transactionStatus = "completed";
    await transaction.save();

    res.status(200).json({ message: "Transaction marked as completed", transaction });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};