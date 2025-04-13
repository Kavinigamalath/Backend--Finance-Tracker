const request = require("supertest");
const app = require("../index");
const { connect, close } = require("./setupTestDB");
const User = require("../models/User");

let adminToken;

beforeAll(async () => {
  await connect();

  // Create an admin user and log in to get the token
  const admin = new User({
    username: "adminuser",
    email: "admin@example.com",
    password: "Password!123",
    role: "admin",
  });
  await admin.save();

  const loginRes = await request(app)
    .post("/api/auth/login")
    .send({ email: "admin@example.com", password: "Password!123" });

  adminToken = loginRes.body.token;
});

afterAll(async () => {
  await close();
});

describe("Admin Dashboard", () => {
  test("Admin should be able to access the dashboard", async () => {
    const res = await request(app)
      .get("/api/dashboard/admin")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("totalUsers");
    expect(res.body).toHaveProperty("totalTransactions");
    expect(res.body).toHaveProperty("totalIncome");
    expect(res.body).toHaveProperty("totalExpenses");
  });
});
