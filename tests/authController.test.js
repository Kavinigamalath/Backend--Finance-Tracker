const request = require("supertest");
const app = require("../index");  // Import the app
const { connect, close } = require("./setupTestDB");  // Set up the in-memory database and clean up after tests
const User = require("../models/User");  // Import the User model

let authToken;
let adminToken;
let userId;

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

  // Log in to get the authentication token for the test user
  const loginRes = await request(app)
    .post("/api/auth/login")
    .send({ email: "test@example.com", password: "password#123" });
  authToken = loginRes.body.token;

  // Create an admin user
  const admin = new User({
    username: "adminuser",
    email: "admin@example.com",
    password: "password#123",
    role: "admin",
  });
  await admin.save();

  // Log in to get the authentication token for the admin
  const adminLoginRes = await request(app)
    .post("/api/auth/login")
    .send({ email: "admin@example.com", password: "password#123" });
  adminToken = adminLoginRes.body.token;
});

afterAll(async () => {
  await close();
});

describe("User Authentication Tests", () => {
  test("User should register successfully", async () => {
    const res = await request(app).post("/api/auth/registerUser").send({
      username: "newuser",
      email: "newuser@example.com",
      password: "password#123",
    });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe("User registered successfully as user");
  });

  test("Admin should register successfully", async () => {
    const res = await request(app).post("/api/auth/adminRegister")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        username: "adminuser2",
        email: "admin2@example.com",
        password: "password#123",
        role: "admin",
      });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe("User registered successfully as admin");
  });

  test("Non-admin should not register as admin", async () => {
    const res = await request(app).post("/api/auth/adminRegister")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        username: "nonadminuser",
        email: "nonadmin@example.com",
        password: "password#123",
        role: "admin",
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Unauthorized access");
  });

  test("User should login successfully and get a token", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "test@example.com", password: "password#123" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.username).toBe("testuser");
    expect(res.body.user.email).toBe("test@example.com");
  });

  test("Admin should login successfully and get a token", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@example.com", password: "password#123" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe("admin");
  });

  test("Login should fail for invalid credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nonexistent@example.com", password: "wrongpassword" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid credentials");
  });
});
