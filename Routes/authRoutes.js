const express = require("express");
const { registerUser, login, adminRegister } = require("../Controllers/authController");
const { authenticateUser, authorizeRole } = require("../middleware/authMiddleware");

const router = express.Router();

// Route for **Admin Registration** (only accessible to authenticated admins)
router.post("/adminRegister", authenticateUser, authorizeRole(["admin"]), adminRegister);

// Route for **Unauthenticated User Registration** (no authentication required)
router.post("/registerUser", registerUser);

// Login Route
router.post("/login", login);

module.exports = router;
