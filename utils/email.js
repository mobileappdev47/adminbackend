const nodemailer = require("nodemailer");

const sendEmail = async (data) => {
  // Create a Nodemailer transporter
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_ID,
      pass: process.env.MAIL_PASS,
    },
  });

  // Email options
  const mailOptions = {
    from: "rajendra.brainbinary@gmail.com",
    to: data.to,
    subject: data.subject,
    text: data.text,
    html: data.html,
  };

  // Send the email
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent: ", info.response);
  } catch (error) {
    throw new Error("Error sending email: " + error.message);
  }
};

module.exports = sendEmail;