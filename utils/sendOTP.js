const nodemailer = require("nodemailer");

const sendOTP = async (email, otp) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS // use App Password
    }
  });

  await transporter.sendMail({
    from: `"Task Manager by Jay Patel" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Email Verification - OTP",
    html: `<h2>Your OTP is: <b>${otp}</b></h2><p>Expires in 5 minutes.</p>`
  });
};

module.exports = sendOTP;
