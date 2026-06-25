const nodemailer = require('nodemailer');

// Create transporter using Gmail SMTP from .env
// Uses port 465 + secure:true (SSL) which works on most cloud hosts.
// Port 587 (STARTTLS) is often firewalled on Render / Railway / Heroku.
const createTransporter = () => {
    return nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,           // SSL — required for port 465
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        connectionTimeout: 10000,   // fail fast if SMTP unreachable (10s)
        greetingTimeout: 10000,
        socketTimeout: 15000,
    });
};

const sendEmail = async (options) => {
    const transporter = createTransporter();

    // Verify connection before sending (helps with debugging)
    await transporter.verify();

    const mailOptions = {
        from: `"Solapur Gurukulum" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
        to: options.email,
        subject: options.subject,
        html: options.html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.messageId);
    return info;
};

// Welcome email for newly registered users
const sendWelcomeEmail = async (email, name) => {
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fffdf7; border-radius: 12px; overflow: hidden; border: 1px solid #f5e6c8;">
      <div style="background: linear-gradient(135deg, #d97706, #ea580c); padding: 32px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">🕉️ Solapur Gurukulum</h1>
        <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0;">Spiritual Learning Platform</p>
      </div>
      <div style="padding: 32px;">
        <h2 style="color: #92400e;">Welcome, ${name}! 🙏</h2>
        <p style="color: #4b5563; line-height: 1.7;">
          Namaste! We're delighted to welcome you to <strong>Solapur Gurukulum</strong>.
          Your journey into spiritual wisdom begins here.
        </p>
        <p style="color: #4b5563; line-height: 1.7;">
          Explore our collection of <strong>Mantras</strong>, <strong>Shlokas</strong>, and <strong>Shotrams</strong>
          to enrich your spiritual life.
        </p>
        <div style="background: #fef3c7; border-left: 4px solid #d97706; padding: 16px; border-radius: 8px; margin: 24px 0;">
          <p style="color: #92400e; margin: 0; font-style: italic;">
            "OM Sarve Bhavantu Sukhinah" — May all beings be happy.
          </p>
        </div>
        <p style="color: #6b7280; font-size: 14px;">
          Please verify your email to unlock all features of the platform.
        </p>
        <p style="color: #4b5563; margin-top: 24px;">
          With blessings,<br/>
          <strong>Solapur Gurukulum Team</strong>
        </p>
      </div>
      <div style="background: #f3f4f6; padding: 16px; text-align: center;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">© 2024 Solapur Gurukulum. All rights reserved.</p>
      </div>
    </div>
    `;
    return sendEmail({ email, subject: 'Welcome to Solapur Gurukulum!', html });
};

// Email verification
const sendVerificationEmail = async (email, token, name) => {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${token}`;
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fffdf7; border-radius: 12px; overflow: hidden; border: 1px solid #f5e6c8;">
      <div style="background: linear-gradient(135deg, #d97706, #ea580c); padding: 32px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">🕉️ Solapur Gurukulum</h1>
      </div>
      <div style="padding: 32px;">
        <h2 style="color: #92400e;">Verify Your Email, ${name}!</h2>
        <p style="color: #4b5563; line-height: 1.7;">
          Thank you for registering. Please verify your email address by clicking the button below:
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${verificationUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #d97706, #ea580c); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
            Verify Email
          </a>
        </div>
        <p style="color: #6b7280; font-size: 13px;">Or copy this link:<br/><a href="${verificationUrl}" style="color: #d97706; word-break: break-all;">${verificationUrl}</a></p>
        <p style="color: #9ca3af; font-size: 12px;">This link will expire in 24 hours.</p>
      </div>
    </div>
    `;
    return sendEmail({ email, subject: 'Verify Your Email - Solapur Gurukulum', html });
};

// Password reset
const sendPasswordResetEmail = async (email, token, name) => {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fffdf7; border-radius: 12px; overflow: hidden; border: 1px solid #f5e6c8;">
      <div style="background: linear-gradient(135deg, #d97706, #ea580c); padding: 32px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">🕉️ Solapur Gurukulum</h1>
      </div>
      <div style="padding: 32px;">
        <h2 style="color: #92400e;">Reset Your Password, ${name}</h2>
        <p style="color: #4b5563; line-height: 1.7;">
          You requested to reset your password. Click the button below to proceed:
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #f59e0b, #f97316); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
            Reset Password
          </a>
        </div>
        <p style="color: #6b7280; font-size: 13px;">Or copy this link:<br/><a href="${resetUrl}" style="color: #d97706; word-break: break-all;">${resetUrl}</a></p>
        <p style="color: #9ca3af; font-size: 12px;">This link will expire in 1 hour. If you did not request this, please ignore this email.</p>
      </div>
    </div>
    `;
    return sendEmail({ email, subject: 'Reset Your Password - Solapur Gurukulum', html });
};

// Welcome email for newly added admin (new account created by super admin)
const sendAdminWelcomeEmail = async (email, name, password) => {
    const loginUrl = `${process.env.FRONTEND_URL}/login`;
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fffdf7; border-radius: 12px; overflow: hidden; border: 1px solid #f5e6c8;">
      <div style="background: linear-gradient(135deg, #7c3aed, #a855f7); padding: 32px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Solapur Gurukulum</h1>
        <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0;">Admin Panel</p>
      </div>
      <div style="padding: 32px;">
        <h2 style="color: #5b21b6;">Welcome, Admin ${name}!</h2>
        <p style="color: #4b5563; line-height: 1.7;">
          You have been added as an <strong>Administrator</strong> on Solapur Gurukulum platform by the Super Admin.
        </p>
        <div style="background: #f3f0ff; border: 1px solid #c4b5fd; border-radius: 8px; padding: 20px; margin: 24px 0;">
          <p style="color: #5b21b6; font-weight: bold; margin: 0 0 8px;">Your Login Credentials:</p>
          <p style="color: #4b5563; margin: 4px 0;"><strong>Email:</strong> ${email}</p>
          <p style="color: #4b5563; margin: 4px 0;"><strong>Password:</strong> ${password}</p>
          <p style="color: #9ca3af; font-size: 12px; margin: 12px 0 0;">Please change your password after first login for security.</p>
        </div>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${loginUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #7c3aed, #a855f7); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
            Login to Dashboard
          </a>
        </div>
        <p style="color: #4b5563; margin-top: 24px;">
          With blessings,<br/>
          <strong>Solapur Gurukulum Team</strong>
        </p>
      </div>
    </div>
    `;
    return sendEmail({ email, subject: 'You are now an Admin - Solapur Gurukulum', html });
};

// Welcome email for existing user promoted to admin
const sendAdminPromotionEmail = async (email, name) => {
    const loginUrl = `${process.env.FRONTEND_URL}/login`;
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fffdf7; border-radius: 12px; overflow: hidden; border: 1px solid #f5e6c8;">
      <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 32px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Solapur Gurukulum</h1>
        <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0;">Congratulations!</p>
      </div>
      <div style="padding: 32px;">
        <h2 style="color: #065f46;">Congratulations, ${name}!</h2>
        <p style="color: #4b5563; line-height: 1.7;">
          You have been <strong>promoted to Admin</strong> on Solapur Gurukulum platform.
        </p>
        <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; border-radius: 8px; margin: 24px 0;">
          <p style="color: #065f46; margin: 0; font-weight: bold;">As an Admin, you can now:</p>
          <ul style="color: #4b5563; margin: 8px 0 0; padding-left: 20px; line-height: 1.8;">
            <li>Manage Mantras, Shlokas and Shotrams</li>
            <li>Access the Admin Dashboard</li>
            <li>Manage Categories and Content</li>
          </ul>
        </div>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${loginUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #059669, #10b981); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
            Go to Dashboard
          </a>
        </div>
        <p style="color: #4b5563;">
          With blessings,<br/>
          <strong>Solapur Gurukulum Team</strong>
        </p>
      </div>
    </div>
    `;
    return sendEmail({ email, subject: 'You are now an Admin - Solapur Gurukulum', html });
};

module.exports = {
    sendEmail,
    sendWelcomeEmail,
    sendVerificationEmail,
    sendPasswordResetEmail,
    sendAdminWelcomeEmail,
    sendAdminPromotionEmail,
};
