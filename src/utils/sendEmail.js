const nodemailer = require('nodemailer');

// ─── Transporter ────────────────────────────────────────────────────────────
const createTransporter = () => {
    const pass = (process.env.EMAIL_PASS || '').replace(/\s+/g, '');
    const user = (process.env.EMAIL_USER || '').trim();

    if (!user || !pass) {
        throw new Error('EMAIL_USER and EMAIL_PASS must be set in .env');
    }

    console.log('📧 Creating transporter for:', user, '| Pass length:', pass.length);

    return nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.sendgrid.net',
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: { user, pass },
        connectionTimeout: 60000,
        greetingTimeout: 30000,
        socketTimeout: 60000,
        tls: {
            rejectUnauthorized: false,
        },
    });
};

// ─── Base send function ──────────────────────────────────────────────────────
const sendEmail = async (options) => {
    const transporter = createTransporter();

    const mailOptions = {
        from: `"Solapur Gurukulam" <${(process.env.EMAIL_FROM || process.env.EMAIL_USER || '').trim()}>`,
        to: options.email,
        subject: options.subject,
        html: options.html,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent successfully:', info.messageId, '→', options.email);
        return info;
    } catch (err) {
        console.error('❌ Email send error:', err.message);
        console.error('❌ Error code:', err.code);
        console.error('❌ Response:', err.response);

        if (err.message.includes('Invalid login') || err.message.includes('Username and Password') || err.code === 'EAUTH') {
            throw new Error(
                'Authentication failed. Check EMAIL_USER and EMAIL_PASS in env variables.'
            );
        }
        if (err.code === 'ECONNECTION' || err.code === 'ETIMEDOUT') {
            throw new Error(`Cannot connect to SMTP host: ${process.env.EMAIL_HOST} on port ${process.env.EMAIL_PORT}. Check hosting SMTP restrictions.`);
        }
        throw err;
    }
};

// ─── Test email config ───────────────────────────────────────────────────────
const testEmailConfig = async () => {
    try {
        const transporter = createTransporter();
        await transporter.verify();
        console.log('✅ Email config verified successfully');
        return true;
    } catch (err) {
        console.error('❌ Email config test failed:', err.message);
        return false;
    }
};

// ─── 1. Welcome email (sent on signup) ──────────────────────────────────────
const sendWelcomeEmail = async (email, name) => {
    const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fffdf7;border-radius:12px;overflow:hidden;border:1px solid #f5e6c8;">
      <div style="background:linear-gradient(135deg,#d97706,#ea580c);padding:32px;text-align:center;">
        <h1 style="color:white;margin:0;font-size:28px;">Solapur Gurukulam</h1>
        <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;">Spiritual Learning Platform</p>
      </div>
      <div style="padding:32px;">
        <h2 style="color:#92400e;">Welcome, ${name}!</h2>
        <p style="color:#4b5563;line-height:1.7;">
          Namaste! We are delighted to welcome you to <strong>Solapur Gurukulam</strong>.
          Your journey into spiritual wisdom begins here.
        </p>
        <p style="color:#4b5563;line-height:1.7;">
          Explore our collection of <strong>Mantras</strong>, <strong>Shlokas</strong>, and <strong>Shotrams</strong>.
        </p>
        <div style="background:#fef3c7;border-left:4px solid #d97706;padding:16px;border-radius:8px;margin:24px 0;">
          <p style="color:#92400e;margin:0;font-style:italic;">
            "OM Sarve Bhavantu Sukhinah" — May all beings be happy.
          </p>
        </div>
        <p style="color:#6b7280;font-size:14px;">Start exploring the spiritual wisdom today.</p>
        <p style="color:#4b5563;margin-top:24px;">With blessings,<br/><strong>Solapur Gurukulam Team</strong></p>
      </div>
      <div style="background:#f3f4f6;padding:16px;text-align:center;">
        <p style="color:#9ca3af;font-size:12px;margin:0;">© 2024 Solapur Gurukulam. All rights reserved.</p>
      </div>
    </div>`;
    return sendEmail({ email, subject: 'Welcome to Solapur Gurukulam!', html });
};

// ─── 2. Email verification ────────────────────────────────────────────────────
const sendVerificationEmail = async (email, token, name) => {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${token}`;
    const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fffdf7;border-radius:12px;overflow:hidden;border:1px solid #f5e6c8;">
      <div style="background:linear-gradient(135deg,#d97706,#ea580c);padding:32px;text-align:center;">
        <h1 style="color:white;margin:0;font-size:28px;">Solapur Gurukulam</h1>
        <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;">Email Verification</p>
      </div>
      <div style="padding:32px;">
        <h2 style="color:#92400e;">Verify Your Email, ${name}!</h2>
        <p style="color:#4b5563;line-height:1.7;">Thank you for registering. Please verify your email by clicking below:</p>
        <div style="text-align:center;margin:32px 0;">
          <a href="${verificationUrl}"
             style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#d97706,#ea580c);color:white;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;">
            Verify Email
          </a>
        </div>
        <p style="color:#6b7280;font-size:13px;">Or copy this link:<br/>
          <a href="${verificationUrl}" style="color:#d97706;word-break:break-all;">${verificationUrl}</a>
        </p>
        <p style="color:#9ca3af;font-size:12px;">This link expires in 24 hours.</p>
        <p style="color:#4b5563;margin-top:24px;">With blessings,<br/><strong>Solapur Gurukulam Team</strong></p>
      </div>
      <div style="background:#f3f4f6;padding:16px;text-align:center;">
        <p style="color:#9ca3af;font-size:12px;margin:0;">© 2024 Solapur Gurukulam. All rights reserved.</p>
      </div>
    </div>`;
    return sendEmail({ email, subject: 'Verify Your Email - Solapur Gurukulam', html });
};

// ─── 3. Forgot password / Reset password ────────────────────────────────────
const sendPasswordResetEmail = async (email, token, name) => {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;
    const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fffdf7;border-radius:12px;overflow:hidden;border:1px solid #f5e6c8;">
      <div style="background:linear-gradient(135deg,#d97706,#ea580c);padding:32px;text-align:center;">
        <h1 style="color:white;margin:0;font-size:28px;">Solapur Gurukulam</h1>
        <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;">Password Reset</p>
      </div>
      <div style="padding:32px;">
        <h2 style="color:#92400e;">Reset Your Password, ${name}</h2>
        <p style="color:#4b5563;line-height:1.7;">
          You requested a password reset for your <strong>Solapur Gurukulam</strong> account.
          Click the button below to set a new password:
        </p>
        <div style="text-align:center;margin:32px 0;">
          <a href="${resetUrl}"
             style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#f59e0b,#f97316);color:white;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;">
            Reset Password
          </a>
        </div>
        <p style="color:#6b7280;font-size:13px;">Or copy this link:<br/>
          <a href="${resetUrl}" style="color:#d97706;word-break:break-all;">${resetUrl}</a>
        </p>
        <p style="color:#9ca3af;font-size:12px;">This link expires in <strong>1 hour</strong>. If you did not request this, please ignore this email.</p>
        <p style="color:#4b5563;margin-top:24px;">With blessings,<br/><strong>Solapur Gurukulam Team</strong></p>
      </div>
      <div style="background:#f3f4f6;padding:16px;text-align:center;">
        <p style="color:#9ca3af;font-size:12px;margin:0;">© 2024 Solapur Gurukulam. All rights reserved.</p>
      </div>
    </div>`;
    return sendEmail({ email, subject: 'Reset Your Password - Solapur Gurukulam', html });
};

// ─── 4. Admin welcome email ──────────────────────────────────────────────────
const sendAdminPromotionEmail = async (email, name) => {
    const loginUrl = `${process.env.FRONTEND_URL}/login`;
    const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fffdf7;border-radius:12px;overflow:hidden;border:1px solid #d1fae5;">
      <div style="background:linear-gradient(135deg,#059669,#10b981);padding:32px;text-align:center;">
        <h1 style="color:white;margin:0;font-size:28px;">Solapur Gurukulam</h1>
        <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;">Team — Admin Access Granted</p>
      </div>
      <div style="padding:32px;">
        <h2 style="color:#065f46;">Welcome to the Team, ${name}!</h2>
        <p style="color:#4b5563;line-height:1.7;">
          Namaste! You have been added as an <strong>Admin</strong> on
          <strong>Solapur Gurukulam</strong> by the Super Admin.
        </p>
        <div style="background:#ecfdf5;border-left:4px solid #10b981;padding:16px;border-radius:8px;margin:24px 0;">
          <p style="color:#065f46;margin:0;font-weight:bold;">As an Admin, you can now:</p>
          <ul style="color:#4b5563;margin:8px 0 0;padding-left:20px;line-height:1.8;">
            <li>Manage Mantras, Shlokas and Shotrams</li>
            <li>Access the Admin Dashboard</li>
            <li>Manage Categories and Content</li>
          </ul>
        </div>
        <div style="text-align:center;margin:24px 0;">
          <a href="${loginUrl}"
             style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#059669,#10b981);color:white;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;">
            Go to Dashboard
          </a>
        </div>
        <p style="color:#6b7280;font-size:13px;">Login URL: <a href="${loginUrl}" style="color:#059669;">${loginUrl}</a></p>
        <p style="color:#4b5563;margin-top:24px;">With blessings,<br/><strong>Solapur Gurukulam Team</strong></p>
      </div>
      <div style="background:#f3f4f6;padding:16px;text-align:center;">
        <p style="color:#9ca3af;font-size:12px;margin:0;">© 2024 Solapur Gurukulam. All rights reserved.</p>
      </div>
    </div>`;
    return sendEmail({ email, subject: 'Welcome to Solapur Gurukulam Team — Admin Access', html });
};

module.exports = {
    sendEmail,
    testEmailConfig,
    sendWelcomeEmail,
    sendVerificationEmail,
    sendPasswordResetEmail,
    sendAdminPromotionEmail,
};
