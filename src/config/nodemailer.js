const axios = require('axios');

const sendEmail = async (to, subject, html) => {
    try {
        // We use a standard HTTP POST request over secure port 443 to bypass Render's firewall block
        const response = await axios.post(
            'https://api.brevo.com/v3/smtp/email',
            {
                sender: { 
                    name: "Pandit Ji", 
                    email: process.env.EMAIL_FROM || "solapurgurukulal@gmail.com" 
                },
                to: [{ email: to }],
                subject: subject,
                htmlContent: html
            },
            {
                headers: {
                    'accept': 'application/json',
                    'api-key': process.env.BREVO_API_KEY,
                    'content-type': 'application/json'
                }
            }
        );

        console.log('✅ Email sent successfully via Brevo API:', response.data.messageId || 'Success');
        return response.data;
    } catch (error) {
        console.error('❌ Email sending error via API:', error.response?.data || error.message);
        throw new Error('Failed to send email via API');
    }
};

const sendVerificationEmail = async (email, token, name) => {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${token}`;
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Welcome to Pandit Ji, ${name}!</h2>
      <p>Please verify your email address by clicking the link below:</p>
      <a href="${verificationUrl}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Verify Email</a>
      <p>Or copy this link: ${verificationUrl}</p>
      <p>This link will expire in 24 hours.</p>
      <p>If you didn't create an account, please ignore this email.</p>
    </div>
  `;
    return sendEmail(email, 'Verify Your Email - Pandit Ji', html);
};

const sendPasswordResetEmail = async (email, token, name) => {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Reset Your Password, ${name}</h2>
      <p>You requested to reset your password. Click the link below to reset it:</p>
      <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #ff9800; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
      <p>Or copy this link: ${resetUrl}</p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    </div>
  `;
    return sendEmail(email, 'Reset Your Password - Pandit Ji', html);
};

module.exports = { sendEmail, sendVerificationEmail, sendPasswordResetEmail };