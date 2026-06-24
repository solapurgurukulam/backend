const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    // FIXED: Limits the connection time to 5 seconds so your frontend never freezes or hangs!
    connectionTimeout: 5000, 
    socketTimeout: 5000,
    greetingTimeout: 5000
});

const sendEmail = async (to, subject, html) => {
    try {
        const info = await transporter.sendMail({
            from: `"Pandit Ji" <${process.env.EMAIL_FROM}>`,
            to,
            subject,
            html,
        });
        console.log('✅ Email sent successfully:', info.messageId);
        return info;
    } catch (error) {
        console.error('❌ Email sending error:', error.message);
        throw new Error('Failed to send email');
    }
};

const sendVerificationEmail = async (email, token, name) => {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${token}`;
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Welcome to Pandit Ji, ${name}!</h2>
      <p>Please verify your email address by clicking the link below:</p>
      <a href="${verificationUrl}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Verify Email</a>
    </div>
  `;
    return sendEmail(email, 'Verify Your Your Email - Pandit Ji', html);
};

const sendPasswordResetEmail = async (email, token, name) => {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Reset Your Password, ${name}</h2>
      <p>You requested to reset your password. Click the link below to reset it:</p>
      <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #ff9800; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
    </div>
  `;
    return sendEmail(email, 'Reset Your Password - Pandit Ji', html);
};

module.exports = { sendEmail, sendVerificationEmail, sendPasswordResetEmail };