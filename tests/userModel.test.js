const request = require("supertest");
const app = require("../index");
const User = require("../models/User"); // Import the User model
const mongoose = require("mongoose");

jest.mock("../models/User"); // Mock the User model

// Ensuring the server is ready before tests run
beforeAll(async () => {
  // You might want to mock database connection here if needed or ensure the DB is ready
  // For now, we're assuming the app will be ready when the test starts
});

// Disconnect after all tests
afterAll(async () => {
  // Make sure to close the DB connection if necessary
  await mongoose.disconnect();  // Assuming mongoose is used for DB connection
  
});

describe(" User Registration", () => {
  
  test(" Should register a new user", async () => {
    // Mock the save method for the User model
    User.prototype.save = jest.fn().mockResolvedValue({
      username: "testuser",
      email: "test012@example.com",
      role: "user"
    });

    // Send the POST request to register the user
    const res = await request(app)
      .post("/api/auth/registerUser")
      .send({
        username: "testuser",
        email: "test012@example.com",
        password: "Password123@",
        role: "user"
      });

    // Assert the response
    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe("User registered successfully as user");
  });

  test(" Should fail if email is already in use", async () => {
    // Simulating the scenario where the email already exists
    User.prototype.save = jest.fn().mockRejectedValue(new Error("Email already exists"));

    // Send the POST request to register the user with the same email
    const res = await request(app)
      .post("/api/auth/registerUser")
      .send({
        username: "testuser",
        email: "test012@example.com",
        password: "Password123@",
        role: "user"
      });

    // Assert the response
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Email already exists");
  });

});
