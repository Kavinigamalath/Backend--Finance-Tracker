const User = require("../models/User");

// Get logged-in user's details
exports.selfGetDetails = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password"); // Exclude password
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update logged-in user's details
exports.selfUpdate = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const updatedFields = {};
    if (username) updatedFields.username = username;
    if (email) updatedFields.email = email;
    if (password) {
      const bcrypt = require("bcryptjs");
      updatedFields.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await User.findByIdAndUpdate(req.user.id, updatedFields, { new: true }).select("-password");
    res.json({ message: "Profile updated successfully", updatedUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete logged-in user (self-delete)
exports.selfDelete = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user.id);
    res.json({ message: "Your account has been deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all users (Admin only)
exports.getAllUsers = async (req, res) => {
  try {
    
    const users = await User.find().select("-password");
    res.json(users);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete user (Admin only)
exports.deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
