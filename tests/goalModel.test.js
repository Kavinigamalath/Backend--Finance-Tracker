const request = require("supertest");
const app = require("../index");
const { connect, close } = require("./setupTestDB");
const User = require("../models/User");
const Goal = require("../models/Goal");

let authToken;
let userId;

beforeAll(async () => {
  await connect();
  const user = new User({
    username: "testuser",
    email: "test@example.com",
    password: "password#123",
  });
  await user.save();
  userId = user._id;

  const loginRes = await request(app)
    .post("/api/auth/login")
    .send({ email: "test@example.com", password: "password#123" });
  authToken = loginRes.body.token;
});

afterAll(async () => {
  await close();
});

describe("Goal Controller - Unit Tests", () => {
  test("should fail if name is missing", async () => {
    const res = await request(app)
      .post("/api/goals")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        targetAmount: 10000,
        deadline: "2025-12-31",
        allocationPercentage: 50,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Goal validation failed: name: Goal name is required");
  });

  test("should fail if targetAmount is missing", async () => {
    const res = await request(app)
      .post("/api/goals")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        name: "Save for Car",
        deadline: "2025-12-31",
        allocationPercentage: 50,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Goal validation failed: targetAmount: Target amount is required, currentAmount: Current amount cannot exceed target amount");
  });

  test("should fail if targetAmount is less than 0", async () => {
    const res = await request(app)
      .post("/api/goals")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        name: "Save for Car",
        targetAmount: -10000,  // Invalid amount
        deadline: "2025-12-31",
        allocationPercentage: 50,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Goal validation failed: targetAmount: Target amount cannot be negative, currentAmount: Current amount cannot exceed target amount");
  });

  test("should fail if allocationPercentage is missing", async () => {
    const res = await request(app)
      .post("/api/goals")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        name: "Save for Car",
        targetAmount: 10000,
        deadline: "2025-12-31",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Goal validation failed: allocationPercentage: Allocation percentage is required");
  });

  test("should fail if allocationPercentage exceeds 100", async () => {
    const res = await request(app)
      .post("/api/goals")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        name: "Save for Car",
        targetAmount: 10000,
        deadline: "2025-12-31",
        allocationPercentage: 120,  // Invalid percentage
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Total allocation percentage cannot exceeds 100%");
  });
});
