// routes/transactionRoutes.js
const express = require("express");
const {
  addTransaction,
  getUserTransactions,
  getAllTransactions,
  updateTransaction,
  deleteTransaction,
  markTransactionAsCompleted,
  sendTransactionNotification,
} = require("../Controllers/transactionController");


const { authenticateUser, authorizeRole } = require("../middleware/authMiddleware");

const router = express.Router();

// Admin can see all transactions
router.get("/", authenticateUser, authorizeRole(["admin"]), getAllTransactions);

// Regular users can see their own transactions
router.get("/me", authenticateUser, authorizeRole(["user"]), getUserTransactions);

// Add new transaction
router.post("/", authenticateUser, authorizeRole(["user"]), addTransaction);

// Update transaction
router.patch("/:id", authenticateUser, authorizeRole(["user"]), updateTransaction);

// Delete transaction
router.delete("/:id", authenticateUser, authorizeRole(["user"]), deleteTransaction);

//notify upcoming transaction
router.get("/notification", authenticateUser,authorizeRole(["admin"]), async (req, res) => {
  try {
    await sendTransactionNotification();
    res.status(200).json({ message: "Upcoming/Missed transaction notifications sent successfully!" });
  } catch (error) {
    res.status(500).json({ error: "Error sending notifications", details: error.message });
  }
});
// mark a transaction as completed
router.patch("/:id/complete", authenticateUser,authorizeRole(["user"]), markTransactionAsCompleted);



module.exports = router;
