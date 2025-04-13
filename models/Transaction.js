// models/Transaction.js
const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
    currency: { 
        type: String, 
        default: "USD" 
 },
    amount: {
        type: Number,
        required: true,
  },
    convertedAmount: {
        type: Number, 
        default: null 
 },
  type: {
    type: String,
    enum: ["income", "expense"],
    required: true,
  },
  category: {
    type: String,
    enum: ["Food", "Transportation", "Entertainment", "Salary","Fixed income interest","Other"],
    required: true,
  },
  tags: {
    type: [String], // For custom labels like #vacation, #work
    default: [],
  },
  date: {
    type: Date,
    default: Date.now,
  },
  recurring: {
    type: Boolean,
    default: false,
  },
  recurrencePattern: {
    type: String, // daily, weekly, monthly
    enum: ["daily", "weekly", "monthly","yearly"],
    default: null,
  },
  endDate: {
    type: Date,
    default: null,
  },

  transactionStatus: {
    type: String,
    enum: ["pending", "completed", "missed"], // Track transaction status
    default: "pending",
  },
});

module.exports = mongoose.model("Transaction", transactionSchema);
