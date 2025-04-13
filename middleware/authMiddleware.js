const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authenticateUser = async (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    // Decode the JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded JWT:", decoded);  // Check decoded JWT payload

    // Try to fetch the user based on the decoded ID
    req.user = await User.findById(decoded.id).select("-password");

    if (!req.user) {
      console.log("User not found in the database");  // Log if user is not found
      return res.status(401).json({ error: "User not found" });
    }

    console.log("Authenticated user:", req.user);  // Check if user is found
    next();  // Proceed to the next middleware
  } catch (err) {
    console.error("Error decoding token:", err);
    return res.status(401).json({ error: "Invalid token" });
  }
};

const authorizeRole = (roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: "Unauthorized access" });
  }
  next();
};

module.exports = { authenticateUser, authorizeRole };