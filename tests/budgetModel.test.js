const request = require("supertest");
const app = require("../index");
const { connect, close } = require("./setupTestDB");
const User = require("../models/User");
const Budget = require("../models/Budget");

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

describe("Budget Controller - Unit Tests", () => {
  test("should fail if type is missing", async () => {
    const res = await request(app)
      .post("/api/budgets")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        category: "Food",
        amount: 500,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Budget validation failed: type: Budget type is required");
  });

  test("should fail if amount is missing", async () => {
    const res = await request(app)
      .post("/api/budgets")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        type: "category",
        category: "Food",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Budget validation failed: amount: Budget amount is required");
  });

  test("should fail if amount is less than 1", async () => {
    const res = await request(app)
      .post("/api/budgets")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        type: "category",
        category: "Food",
        amount: 0,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Budget validation failed: amount: Budget amount must be at least 1");
  });

  test("should fail if type is invalid", async () => {
    const res = await request(app)
      .post("/api/budgets")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        type: "invalid_type",  // Invalid type
        category: "Food",
        amount: 500,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Budget validation failed: type: `invalid_type` is not a valid enum value for path `type`.");
  });
});
