const request = require("supertest");
const app = require("../index"); // Ensure the path is correct
const { connect, close } = require("./setupTestDB");

let authToken;

beforeAll(async () => {
  await connect();  // Connect to the in-memory database

  // Register and log in a test user
  await request(app).post("/api/auth/registerUser").send({
    username: "testuser",
    email: "test@example.com",
    password: "password123"
  });

  const login = await request(app).post("/api/auth/login").send({
    email: "test@example.com",
    password: "password123"
  });

  authToken = login.body.token;  // Save the auth token for future requests
});

afterAll(async () => {
  await close();  // Clean up the in-memory database
});

describe("User Registration & Login Tests", () => {
  test("User should register successfully", async () => {
    const res = await request(app).post("/api/auth/registerUser").send({
      username: "newuser",
      email: "new@example.com",
      password: "password123"
    });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe("User registered successfully as user");
  });

  test("User should login successfully and get a token", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "test@example.com", password: "password123" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();  // Ensure the token is returned
  });

  test("User should be able to get their own details", async () => {
    const res = await request(app)
      .get("/api/users/me")
      .set("Authorization", `Bearer ${authToken}`);  // Include the token in the request header

    expect(res.status).toBe(200);
    expect(res.body.username).toBe("testuser");
    expect(res.body.email).toBe("test@example.com");
  });
});
