const express = require("express");
const { getAllUsers, deleteUser, selfDelete, selfUpdate, selfGetDetails  } = require("../Controllers/userController");
const { authenticateUser, authorizeRole } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/me", authenticateUser, selfGetDetails);   // Get logged-in user details
router.patch("/me", authenticateUser, selfUpdate);       // Update own profile
router.delete("/me", authenticateUser, selfDelete);    // Delete own account
router.get("/", authenticateUser, authorizeRole(["admin"]), getAllUsers);//Admin get all users
router.delete("/:id", authenticateUser, authorizeRole(["admin"]), deleteUser);//Admin delete one user

module.exports = router;
