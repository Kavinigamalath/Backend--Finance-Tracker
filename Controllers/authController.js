// Import necessary modules
const User = require("../models/User");  // Import the User model to interact with the database
const jwt = require("jsonwebtoken");     // Import jsonwebtoken for token generation

// Controller for user registration
exports.registerUser = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;  // Destructure user details from request body

    // Default role to "user" if no role is provided in the request
    let userRole = "user";

    // Create a new user instance with the provided details
    const user = new User({ username, email, password, role: userRole });
    await user.save();  // Save the new user to the database

    // Respond with success message
    res.status(201).json({ message: `User registered successfully as ${userRole}` });
  } catch (err) {
    // Handle any errors during user registration
    res.status(400).json({ error: err.message });
  }
};

// Controller for admin registration
exports.adminRegister = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;  // Destructure admin details from request body

    // Default role to "user" if no role is provided
    let userRole = role || "user";

    // Check if the request is from an authenticated user and their role
    if (req.user) {
      if (req.user.role === "admin") {
        // If the authenticated user is an admin, they can create both users and admins
        userRole = role === "admin" ? "admin" : role || "user";  
      } else {
        // Regular users cannot register as admins
        userRole = "user";
      }
    } else {
      // If the request is from an unauthenticated user, they can only register as "user"
      userRole = "user";
    }

    // Create a new user with the chosen role
    const user = new User({ username, email, password, role: userRole });
    await user.save();  // Save the new user to the database

    // Respond with success message
    res.status(201).json({ message: `User registered successfully as ${userRole}` });
  } catch (err) {
    // Handle any errors during admin registration
    res.status(400).json({ error: err.message });
  }
};

// Controller for user login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;  // Destructure login details from request body
    const user = await User.findOne({ email });  // Find the user by email

    // If user is not found or password doesn't match, return an error
    if (!user || !(await user.comparePassword(password))) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    // Generate JWT token with user ID and role in the payload
    const token = jwt.sign(
      { id: user._id, role: user.role },  // Payload includes user ID and role
      process.env.JWT_SECRET,            // Secret key from environment variables
      { expiresIn: "365d" }              // Token expiration time
    );

    // Respond with token and user details
    res.json({
      token,
      user: { username: user.username, email: user.email, role: user.role },
    });
  } catch (err) {
    // Handle any errors during login process
    res.status(400).json({ error: err.message });
  }
};