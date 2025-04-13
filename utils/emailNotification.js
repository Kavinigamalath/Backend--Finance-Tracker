// utils/emailNotification.js
const nodemailer = require("nodemailer");

const sendEmailNotification = async (email, subject, text, attachmentPath) => {
  const transporter = nodemailer.createTransport({
    service: "gmail", // You can change this to any service you use
    auth: {
      user: process.env.EMAIL_USER, // Your email (e.g., your Gmail address)
      pass: process.env.EMAIL_PASS, // Your email password or App password
    },
  });


  const mailOptions = {
    from: process.env.EMAIL_USER, // Your email (this will be the sender)
    to: email, // The recipient's email address
    subject: subject,
    text: text, // The body of the email
    attachments: attachmentPath ? [{ path: attachmentPath }] : [],
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully!");
  } catch (error) {
    console.error("Error sending email:", error);
  }
};


module.exports = { sendEmailNotification };