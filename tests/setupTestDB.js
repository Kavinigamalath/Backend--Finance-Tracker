const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const app = require("../index");  // Import the app
const server = app.listen(0);  // Start the server on a random available port

let mongoServer;

const connect = async () => {
  mongoServer = await MongoMemoryServer.create();  // Creates an in-memory MongoDB server
  const uri = mongoServer.getUri();  // Get the URI for the in-memory server
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log("Connected to in-memory database");
};

const close = async () => {
  await mongoose.connection.dropDatabase();  // Drop the test database after tests
  await mongoose.connection.close();  // Close the mongoose connection
  await mongoServer.stop();  // Stop the in-memory server
};

afterAll(async () => {
    await server.close();  // Close the server after tests
  });

module.exports = { connect, close };
