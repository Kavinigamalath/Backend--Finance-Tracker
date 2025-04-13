const mongoose = require("mongoose");
const { connect, close } = require("./setupTestDB");
const Transaction = require("../models/Transaction");
const User = require("../models/User");

let userId;

beforeAll(async () => {
  await connect();

  // Create a test user to associate with transactions
  const user = new User({
    username: "testuser",
    email: "test@example.com",
    password: "password123",
  });
  await user.save();
  userId = user._id;
});

afterAll(async () => {
  await close();
});

describe("Transaction Model Tests", () => {
  test("Should create a valid transaction", async () => {
    const transaction = new Transaction({
      userId,
      amount: 1000,
      type: "income",
      category: "Salary",
    });

    const savedTransaction = await transaction.save();

    expect(savedTransaction).toHaveProperty("_id");
    expect(savedTransaction.amount).toBe(1000);
    expect(savedTransaction.type).toBe("income");
    expect(savedTransaction.category).toBe("Salary");
  });

  test("Should fail if amount is missing", async () => {
    const transaction = new Transaction({
      userId,
      type: "income",
      category: "Salary",
    });

    await expect(transaction.save()).rejects.toThrow(
      "Transaction validation failed: amount: Path `amount` is required."
    );
  });

  test("Should fail if type is missing", async () => {
    const transaction = new Transaction({
      userId,
      amount: 1000,
      category: "Salary",
    });

    await expect(transaction.save()).rejects.toThrow(
      "Transaction validation failed: type: Path `type` is required."
    );
  });

  test("Should fail if category is missing", async () => {
    const transaction = new Transaction({
      userId,
      amount: 1000,
      type: "income",
    });

    await expect(transaction.save()).rejects.toThrow(
      "Transaction validation failed: category: Path `category` is required."
    );
  });

  test("Should create an expense transaction", async () => {
    const transaction = new Transaction({
      userId,
      amount: 500,
      type: "expense",
      category: "Food",
    });

    const savedTransaction = await transaction.save();

    expect(savedTransaction.type).toBe("expense");
    expect(savedTransaction.amount).toBe(500);
    expect(savedTransaction.category).toBe("Food");
  });

  test("Should fail if category is invalid", async () => {
    const transaction = new Transaction({
      userId,
      amount: 500,
      type: "expense",
      category: "InvalidCategory", // Invalid category
    });

    await expect(transaction.save()).rejects.toThrow(
      "Transaction validation failed: category: `InvalidCategory` is not a valid enum value for path `category`."
    );
  });

  test("Should validate default currency is USD", async () => {
    const transaction = new Transaction({
      userId,
      amount: 1000,
      type: "income",
      category: "Salary",
    });

    const savedTransaction = await transaction.save();

    expect(savedTransaction.currency).toBe("USD");
  });

  test("Should fail if recurring pattern is invalid", async () => {
    const transaction = new Transaction({
      userId,
      amount: 1000,
      type: "income",
      category: "Salary",
      recurring: true,
      recurrencePattern: "invalidPattern", // Invalid recurrence pattern
    });

    await expect(transaction.save()).rejects.toThrow(
      "Transaction validation failed: recurrencePattern: `invalidPattern` is not a valid enum value for path `recurrencePattern`."
    );
  });

  test("Should successfully create a recurring transaction", async () => {
    const transaction = new Transaction({
      userId,
      amount: 200,
      type: "expense",
      category: "Food",
      recurring: true,
      recurrencePattern: "monthly",
    });

    const savedTransaction = await transaction.save();

    expect(savedTransaction.recurring).toBe(true);
    expect(savedTransaction.recurrencePattern).toBe("monthly");
  });
});
