require("dotenv").config();  // ✅ Load .env file
const nodemailer = require("nodemailer");

// Debugging: Print environment variables to check if they are loaded
console.log("EMAIL_USER:", process.env.EMAIL_USER); 
console.log("EMAIL_PASS:", process.env.EMAIL_PASS ? "Exists" : "Missing");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,  // ✅ Use env variables
    pass: process.env.EMAIL_PASS,
  },
});

const mailOptions = {
  from: process.env.EMAIL_USER,
  to: "recipient@example.com",
  subject: "Testing Nodemailer",
  text: "Hello! This is a test email from my Node.js app.",
};

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.error("Error sending email:", error);
  } else {
    console.log("Email sent successfully:", info.response);
  }
});
