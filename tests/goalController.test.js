const request = require("supertest");
const app = require("../index");
const { connect, close } = require("./setupTestDB");  // Set up the in-memory database and clean up after tests
const User = require("../models/User");
const Goal = require("../models/Goal");

let authToken;
let userId;
let goalId;

beforeAll(async () => {
  await connect();

  // Create a test user
  const user = new User({
    username: "testuser",
    email: "test@example.com",
    password: "password#123"
  });
  await user.save();
  userId = user._id;

  // Log in to get the authentication token
  const loginRes = await request(app)
    .post("/api/auth/login")
    .send({ email: "test@example.com", password: "password#123" });

  authToken = loginRes.body.token;
});

afterAll(async () => {
  await close();
});

describe("Goal Controller Tests", () => {
  test("Should create a new goal", async () => {
    const res = await request(app)
      .post("/api/goals")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        name: "Save for Car",
        targetAmount: 10000,
        deadline: "2025-12-31",
        allocationPercentage: 50,
      });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe("Goal created successfully");
    expect(res.body.goal).toHaveProperty("_id");
    goalId = res.body.goal._id;  // Save goal ID for future tests
  });

  test("Should get all goals for the user", async () => {
    const res = await request(app)
      .get("/api/goals")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toBeInstanceOf(Array);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test("Should get a specific goal by ID", async () => {
    const res = await request(app)
      .get(`/api/goals/${goalId}`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body._id).toBe(goalId);
    expect(res.body.name).toBe("Save for Car");
  });

  test("Should update an existing goal", async () => {
    const res = await request(app)
      .patch(`/api/goals/${goalId}`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        targetAmount: 15000, // Updating the targetAmount
        allocationPercentage: 10, // Updating the allocationPercentage
      });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Goal updated successfully");
    expect(res.body.goal.targetAmount).toBe(15000);
    expect(res.body.goal.allocationPercentage).toBe(10);
  });

  test("Should fail to update goal with invalid allocation percentage", async () => {
    const res = await request(app)
      .patch(`/api/goals/${goalId}`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        allocationPercentage: 120, // Invalid allocation percentage
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Total allocation percentage exceeds 100%");
  });

  test("Should delete a goal", async () => {
    const res = await request(app)
      .delete(`/api/goals/${goalId}`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Goal deleted successfully");
  });

  test("Should not find a deleted goal", async () => {
    const res = await request(app)
      .get(`/api/goals/${goalId}`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Goal not found");
  });
});
