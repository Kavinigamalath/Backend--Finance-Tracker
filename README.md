# Backend: Personal Finance Tracker API

## Project Overview

This backend project involves the development of a **RESTful API** for managing a **Personal Finance Tracker** system. The API allows users to:

- Manage financial records
- Track expenses
- Set budgets
- Analyze spending trends

The API is designed to ensure **secure access**, **data integrity**, and **user-friendly interfaces** while providing core functionalities such as:

- **Income/Expense tracking**
- **Budget management**
- **Goal-setting**
- **Reporting**

---

## Table of Contents

- [Installation Instructions](#installation-instructions)
- [API Endpoints](#api-endpoints)
- [Testing](#testing)
  - [Unit Testing](#unit-testing)
  - [Integration Testing](#integration-testing)
  - [Performance Testing](#performance-testing)
  - [Security Testing](#security-testing)
- [Tech Stack](#tech-stack)
- [Security](#security)
- [Environment Setup](#environment-setup)

---

## Installation Instructions

### 1. Clone the Repository

Clone the repository to your local machine using the following command:

```bash
git clone https://github.com/yourusername/your-repository-name.git
cd your-repository-name
```

### 2. Install Dependencies

Install the required dependencies by running:

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env` file in the root directory and add the following configurations:

```bash
JWT_SECRET=your_jwt_secret
DB_LINK=your_mongodb_connection_string
EMAIL_USER=your_email_address
EMAIL_PASS=your_email_password
```

### 4. Start the Server

To start the server, use the following command:

```bash
npm run dev
```

The server will be running at `http://localhost:5000`.

---

## API Endpoints

### **Authentication Routes**

- `POST /api/auth/registerUser`: Register a new user.
- `POST /api/auth/adminRegister`: Register a new admin (requires admin authentication).
- `POST /api/auth/login`: User login and token generation.

### **User Routes**

- `GET /api/users/me`: Get details of the logged-in user.
- `PATCH /api/users/me`: Update the logged-in user's details.
- `DELETE /api/users/me`: Delete the logged-in user's account.
- `GET /api/users`: Get all users (Admin only).
- `DELETE /api/users/:id`: Delete a user by ID (Admin only).

### **Budget Routes**

- `POST /api/budgets`: Create a new budget.
- `GET /api/budgets`: Get all budgets for the user.
- `GET /api/budgets/:id`: Get a specific budget by ID.
- `PATCH /api/budgets/:id`: Update a budget.
- `DELETE /api/budgets/:id`: Delete a budget.
- `GET /api/budgets/spending-trends`: Get spending trends and recommendations.

### **Transaction Routes**

- `POST /api/transactions`: Add a new transaction.
- `GET /api/transactions`: Get all transactions for the user.
- `GET /api/transactions/me`: Get transactions of the logged-in user.
- `GET /api/transactions/:id`: Get a specific transaction by ID.
- `PATCH /api/transactions/:id`: Update a transaction.
- `DELETE /api/transactions/:id`: Delete a transaction.

### **Goal Routes**

- `POST /api/goals`: Create a new goal.
- `GET /api/goals`: Get all goals for the user.
- `GET /api/goals/:id`: Get a specific goal by ID.
- `PATCH /api/goals/:id`: Update a goal.
- `DELETE /api/goals/:id`: Delete a goal.

### **Financial Report Routes**

- `GET /api/reports`: Get all financial reports (Admin only).
- `GET /api/reports/me`: Get the latest financial report for the logged-in user.
- `POST /api/reports/generate`: Generate a new financial report for the logged-in user.

---

## Testing

### **Unit Testing**

 **Jest** is used for unit testing API endpoints. To run the unit tests, use the following command:

```bash
npm run test
```

### **Integration Testing**

Integration tests are used to verify the interaction between different modules of the application. Run integration tests with:

```bash
npm run test:integration
```

### **Performance Testing**

For performance testing,  used [Artillery](https://artillery.io/). Execute performance tests by running:

```bash
artillery run performance-test.yml
```

### **Security Testing**

Security testing tools like **OWASP ZAP** or **Burp Suite** can be used to identify vulnerabilities such as SQL injection, XSS, and insecure authentication. Perform security testing to ensure the API is protected.

---

## Tech Stack

- **Node.js** with **Express.js** for building the API.
- **MongoDB** for database management.
- **JWT** for authentication and authorization.
- **Nodemailer** for sending email notifications.
- **Jest** and **Supertest** for testing.
- **Artillery** for performance testing.

---

## Security

- The API uses **JWT**-based authentication to secure endpoints.
- **Bcrypt** is used to hash sensitive data like passwords before storing them in the database.
- API access is **role-based**, with **Admin** and **User** roles.
- Only **Admins** can access certain routes.
- **HTTPS** should be used to ensure secure communication between the client and server.

---

## Environment Setup

### 1. Install Node.js

Make sure you have **Node.js** installed (preferably the latest LTS version).

### 2. Install MongoDB

You can either run **MongoDB locally** or set up a **MongoDB Atlas** cluster for cloud-based database management.

### 3. Install Dependencies

Run the following command to install all dependencies:

```bash
npm install
```

### 4. Set Up Environment Variables

Create a `.env` file and configure it with the necessary environment variables for JWT secret, MongoDB connection, and email credentials.

### 5. Start the Server

Use the following command to start the server:

```bash
npm run dev
```
