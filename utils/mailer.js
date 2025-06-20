// utils/mailer.js
const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendReminder = async (to, subject, html) => {
  try {
    await transporter.sendMail({
      from: `"Task Manager by Jay Patel" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html // ✅ Render HTML instead of plain text
    });
  } catch (err) {
    console.error('Error sending reminder email:', err);
  }
};

module.exports = sendReminder;
