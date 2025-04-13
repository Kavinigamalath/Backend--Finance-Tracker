const request = require("supertest");
const app = require("../index");  // Import the app
const { connect, close } = require("./setupTestDB");  // Set up the in-memory database and clean up after tests
const User = require("../models/User");  // Import the User model
const Transaction = require("../models/Transaction");  // Import the Transaction model

let authToken;
let userId;
let transactionId;

beforeAll(async () => {
  await connect();

  // Create a test user
  const user = new User({
    username: "testuser",
    email: "test@example.com",
    password: "password#123",
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

describe("Transaction Controller Tests", () => {
  test("Should create a new income transaction", async () => {
    const res = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        amount: 1000,
        type: "income",
        category: "Salary",
        tags: ["monthly", "salary"],
      });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe("Transaction added successfully");
    expect(res.body.transaction).toHaveProperty("_id");
    transactionId = res.body.transaction._id;  // Save transaction ID for future tests
  });

  test("Should create a new expense transaction", async () => {
    const res = await request(app)
      .post("/api/transactions")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        amount: 150,
        type: "expense",
        category: "Food",
        tags: ["grocery", "monthly"],
      });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe("Transaction added successfully");
    expect(res.body.transaction).toHaveProperty("_id");
  });

  test("Should get all transactions for the user", async () => {
    const res = await request(app)
      .get("/api/transactions/me")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toBeInstanceOf(Array);
    expect(res.body.length).toBeGreaterThan(0);
  });

  test("Should update a transaction's status", async () => {
    const res = await request(app)
      .patch(`/api/transactions/${transactionId}/complete`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        transactionStatus: "completed",  // Update the transaction status
      });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Transaction marked as completed");
    expect(res.body.transaction.transactionStatus).toBe("completed");
  });

  test("Should fail to update a transaction with invalid status", async () => {
    const res = await request(app)
      .patch(`/api/transactions/${transactionId}`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        transactionStatus: "invalidStatus",  // Invalid status
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid transaction update");
  });

  test("Should delete a transaction", async () => {
    const res = await request(app)
      .delete(`/api/transactions/${transactionId}`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Transaction deleted successfully");
  });

  test("Should not find a deleted transaction", async () => {
    const res = await request(app)
      .get(`/api/transactions/${transactionId}`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe(undefined);
  });
});
