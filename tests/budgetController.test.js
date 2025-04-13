const request = require("supertest");
const app = require("../index");
const { connect, close } = require("./setupTestDB");
const Budget = require("../models/Budget");
const User = require("../models/User");

let authToken;
let userId;

beforeAll(async () => {
  await connect();
  const user = new User({
    username: "testuser",
    email: "test@example.com",
    password: "password#123"
  });
  await user.save();
  userId = user._id;

  const login = await request(app)
    .post("/api/auth/login")
    .send({ email: "test@example.com", password: "password#123" });
  authToken = login.body.token;
});

afterAll(async () => {
  await close();
});

describe("Budget Controller - Integration Tests", () => {
  test("should create a new budget", async () => {
    const res = await request(app)
      .post("/api/budgets")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        type: "category",
        category: "Food",
        amount: 500
      });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe("Budget created successfully");
    expect(res.body.budget).toHaveProperty("_id");
  });

  test("should get all budgets", async () => {
    const res = await request(app)
      .get("/api/budgets")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });
});
