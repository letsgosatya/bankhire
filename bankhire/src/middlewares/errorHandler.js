const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  // Send email alert
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.ADMIN_EMAIL,
    subject: '🚨 BankHire App Error Alert',
    text: `An error occurred in BankHire app:\n\n${err.stack}\n\nRequest: ${req.method} ${req.url}`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
    } else {
      console.log('Error alert email sent:', info.response);
    }
  });

  res.status(500).json({ error: 'Something went wrong!' });
};

module.exports = { errorHandler };