const request = require("supertest");
const app = require("../index");
const { connect, close } = require("./setupTestDB");
const User = require("../models/User");

let userToken;

beforeAll(async () => {
  await connect();

  // Create a regular user and log in to get the token
  const user = new User({
    username: "testuser",
    email: "test@example.com",
    password: "Password!123",
    role: "user",
  });
  await user.save();

  const loginRes = await request(app)
    .post("/api/auth/login")
    .send({ email: "test@example.com", password: "Password!123" });

  userToken = loginRes.body.token;
});

afterAll(async () => {
  await close();
});

describe("User Dashboard", () => {
  test("User should be able to access the dashboard", async () => {
    const res = await request(app)
      .get("/api/dashboard/user")
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("totalIncome");
    expect(res.body).toHaveProperty("totalExpense");
    expect(res.body).toHaveProperty("totalBudgetAmount");
    expect(res.body).toHaveProperty("totalGoals");
  });
});
