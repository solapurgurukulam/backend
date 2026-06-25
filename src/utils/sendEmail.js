const nodemailer = require('nodemailer');

// Create transporter with proper configuration
const createTransporter = () => {
    // For Gmail with App Password
    if (process.env.EMAIL_SERVICE === 'gmail') {
        return nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS // Use App Password, not regular password
            }
        });
    }
    
    // For other SMTP services (like SendGrid, Mailgun, etc.)
    return nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: process.env.EMAIL_PORT || 587,
        secure: process.env.EMAIL_SECURE === 'true' || false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 5000,
    });
};

// Main email sending function with better error handling
const sendEmail = async (options) => {
    try {
        const transporter = createTransporter();
        
        // Verify connection configuration
        await transporter.verify();
        console.log('✅ Email transporter configured successfully');

        const mailOptions = {
            from: process.env.EMAIL_FROM || '"Solapur Gurukulam" <solapurgurukulam@gmail.com>',
            to: options.email,
            subject: options.subject,
            html: options.html,
            text: options.text || options.html.replace(/<[^>]*>/g, ''),
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent successfully: ${info.messageId}`);
        
        if (process.env.NODE_ENV === 'development' && process.env.EMAIL_SERVICE === 'ethereal') {
            console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info));
        }
        
        return info;
    } catch (error) {
        console.error('❌ Error sending email:', error.message);
        throw new Error(`Failed to send email: ${error.message}`);
    }
};

// Send verification email
const sendVerificationEmail = async (email, token, name) => {
    try {
        const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email/${token}`;
        
        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verify Your Email</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f4f4f4; padding: 20px 0;">
                <tr>
                    <td align="center">
                        <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); padding: 40px;">
                            <tr>
                                <td align="center" style="padding-bottom: 20px;">
                                    <h1 style="color: #8B0000; margin: 0; font-size: 28px;">🕉️ Solapur Gurukulam</h1>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 20px 0;">
                                    <h2 style="color: #333333; font-size: 24px; margin: 0 0 20px 0;">Welcome to Solapur Gurukulam!</h2>
                                    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                        Hello <strong>${name || 'User'}</strong>,
                                    </p>
                                    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                        Thank you for registering with Solapur Gurukulam. Please verify your email address to complete your registration and start your spiritual journey with us.
                                    </p>
                                    <div style="text-align: center; margin: 30px 0;">
                                        <a href="${verificationUrl}" style="display: inline-block; padding: 14px 40px; background-color: #8B0000; color: #ffffff; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold;">
                                            ✅ Verify Email Address
                                        </a>
                                    </div>
                                    <p style="color: #777777; font-size: 14px; line-height: 1.6; margin: 0 0 10px 0;">
                                        Or copy and paste this link into your browser:
                                    </p>
                                    <p style="background-color: #f5f5f5; padding: 10px; border-radius: 4px; word-break: break-all; font-size: 14px; color: #333; margin: 0 0 20px 0;">
                                        ${verificationUrl}
                                    </p>
                                    <p style="color: #999999; font-size: 14px; line-height: 1.6; margin: 0 0 10px 0;">
                                        ⏰ This verification link will expire in <strong>24 hours</strong>.
                                    </p>
                                    <p style="color: #999999; font-size: 14px; line-height: 1.6; margin: 0 0 10px 0;">
                                        If you didn't create an account with Solapur Gurukulam, please ignore this email.
                                    </p>
                                </td>
                            </tr>
                            <tr>
                                <td style="border-top: 1px solid #e0e0e0; padding-top: 20px; text-align: center;">
                                    <p style="color: #999999; font-size: 12px; margin: 0;">
                                        &copy; ${new Date().getFullYear()} Solapur Gurukulam. All rights reserved.
                                    </p>
                                    <p style="color: #999999; font-size: 12px; margin: 5px 0 0 0;">
                                        📧 solapurgurukulam@gmail.com
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        `;

        const text = `
        Welcome to Solapur Gurukulam!

        Hello ${name || 'User'},

        Thank you for registering with Solapur Gurukulam. Please verify your email address by visiting this link:
        ${verificationUrl}

        This verification link will expire in 24 hours.

        If you didn't create an account with Solapur Gurukulam, please ignore this email.

        © ${new Date().getFullYear()} Solapur Gurukulam. All rights reserved.
        `;

        return await sendEmail({ 
            email, 
            subject: 'Verify Your Email - Solapur Gurukulam', 
            html,
            text
        });
    } catch (error) {
        console.error('❌ Verification email error:', error);
        throw error;
    }
};

// ✅ NEW: Send Welcome Email
const sendWelcomeEmail = async (email, name) => {
    try {
        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to Solapur Gurukulam</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f4f4f4; padding: 20px 0;">
                <tr>
                    <td align="center">
                        <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); padding: 40px;">
                            <tr>
                                <td align="center" style="padding-bottom: 20px;">
                                    <h1 style="color: #8B0000; margin: 0; font-size: 28px;">🕉️ Solapur Gurukulam</h1>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 20px 0;">
                                    <h2 style="color: #333333; font-size: 24px; margin: 0 0 20px 0;">Welcome Aboard, ${name || 'Devotee'}! 🙏</h2>
                                    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                        We are honored to have you as a member of the <strong style="color: #8B0000;">Solapur Gurukulam</strong> family.
                                    </p>
                                    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                        Your journey into the depths of Sanatana Dharma begins here. Explore the timeless wisdom of mantras, shlokas, and spiritual teachings.
                                    </p>
                                    <div style="text-align: center; margin: 20px 0;">
                                        <span style="display: inline-block; padding: 8px 16px; background: #fef3c7; color: #92400e; border-radius: 20px; margin: 5px; font-size: 14px;">📿 Mantras</span>
                                        <span style="display: inline-block; padding: 8px 16px; background: #fef3c7; color: #92400e; border-radius: 20px; margin: 5px; font-size: 14px;">📖 Shlokas</span>
                                        <span style="display: inline-block; padding: 8px 16px; background: #fef3c7; color: #92400e; border-radius: 20px; margin: 5px; font-size: 14px;">🕉️ Shotrams</span>
                                        <span style="display: inline-block; padding: 8px 16px; background: #fef3c7; color: #92400e; border-radius: 20px; margin: 5px; font-size: 14px;">⭐ Favorites</span>
                                    </div>
                                    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 10px 0;">
                                        <strong>Get Started:</strong>
                                    </p>
                                    <ul style="color: #555555; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0; padding-left: 20px;">
                                        <li>📿 Browse through our collection of powerful mantras</li>
                                        <li>⭐ Save your favorites for quick access</li>
                                        <li>📖 Read daily shlokas for spiritual growth</li>
                                        <li>🙏 Connect with our community of devotees</li>
                                    </ul>
                                    <p style="text-align: center; font-style: italic; color: #92400e; margin: 20px 0; font-size: 18px;">
                                        "The goal of life is to realize the divine within." 🙏
                                    </p>
                                    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 10px 0;">
                                        With warm regards,<br>
                                        <strong style="color: #8B0000;">Solapur Gurukulam Team</strong>
                                    </p>
                                    <p style="color: #999999; font-size: 14px; line-height: 1.6; margin: 0 0 10px 0;">
                                        🌺 May you find peace and wisdom on your spiritual journey.
                                    </p>
                                </td>
                            </tr>
                            <tr>
                                <td style="border-top: 1px solid #e0e0e0; padding-top: 20px; text-align: center;">
                                    <p style="color: #999999; font-size: 12px; margin: 0;">
                                        &copy; ${new Date().getFullYear()} Solapur Gurukulam. All rights reserved.
                                    </p>
                                    <p style="color: #999999; font-size: 12px; margin: 5px 0 0 0;">
                                        Solapur, Maharashtra, India
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        `;

        const text = `
        Welcome to Solapur Gurukulam!

        Welcome Aboard, ${name || 'Devotee'}! 🙏

        We are honored to have you as a member of the Solapur Gurukulam family.

        Your journey into the depths of Sanatana Dharma begins here. Explore the timeless wisdom of mantras, shlokas, and spiritual teachings.

        Get Started:
        - Browse through our collection of powerful mantras
        - Save your favorites for quick access
        - Read daily shlokas for spiritual growth
        - Connect with our community of devotees

        "The goal of life is to realize the divine within." 🙏

        With warm regards,
        Solapur Gurukulam Team

        © ${new Date().getFullYear()} Solapur Gurukulam. All rights reserved.
        `;

        return await sendEmail({ 
            email, 
            subject: 'Welcome to Solapur Gurukulam! 🙏', 
            html,
            text
        });
    } catch (error) {
        console.error('❌ Welcome email error:', error);
        throw error;
    }
};

// ✅ NEW: Send Admin Promotion Email
const sendAdminPromotionEmail = async (email, name) => {
    try {
        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Admin Promotion - Solapur Gurukulam</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f4f4f4; padding: 20px 0;">
                <tr>
                    <td align="center">
                        <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); padding: 40px;">
                            <tr>
                                <td align="center" style="padding-bottom: 20px;">
                                    <h1 style="color: #8B0000; margin: 0; font-size: 28px;">🕉️ Solapur Gurukulam</h1>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 20px 0;">
                                    <div style="text-align: center; margin-bottom: 20px;">
                                        <span style="display: inline-block; background: linear-gradient(135deg, #8B0000, #5c0000); color: white; padding: 8px 20px; border-radius: 20px; font-weight: bold; font-size: 16px;">🎉 Admin Promotion</span>
                                    </div>
                                    <h2 style="color: #333333; font-size: 24px; margin: 0 0 20px 0;">Congratulations, ${name || 'Admin'}! 🎊</h2>
                                    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                        We are thrilled to announce that you have been promoted to <strong style="color: #8B0000;">Administrator</strong> at Solapur Gurukulam!
                                    </p>
                                    <div style="background: #f9f0f0; padding: 15px; border-radius: 8px; border-left: 4px solid #8B0000; margin: 20px 0;">
                                        <p style="margin: 0 0 10px 0; color: #333; font-weight: bold;">✨ Your New Role:</p>
                                        <ul style="margin: 0; padding-left: 20px; color: #555;">
                                            <li style="margin: 5px 0;">👑 You now have administrative privileges</li>
                                            <li style="margin: 5px 0;">📝 You can manage content (mantras, shlokas, shotrams)</li>
                                            <li style="margin: 5px 0;">👥 You can help manage users and categories</li>
                                            <li style="margin: 5px 0;">🌟 You play a vital role in our spiritual community</li>
                                        </ul>
                                    </div>
                                    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 10px 0;">
                                        <strong>Your Responsibilities:</strong>
                                    </p>
                                    <ul style="color: #555555; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0; padding-left: 20px;">
                                        <li>📿 Maintain and update spiritual content</li>
                                        <li>🙏 Guide and support community members</li>
                                        <li>📖 Ensure the quality of teachings</li>
                                        <li>🌺 Help spread the wisdom of Sanatana Dharma</li>
                                    </ul>
                                    <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                                        <p style="margin: 0; color: #92400e; font-size: 15px; line-height: 1.6;">
                                            <strong>🙏 A Message from the Team:</strong><br>
                                            "We are grateful to have you as part of our administrative team. Your dedication to preserving and sharing spiritual wisdom is invaluable. May you continue to serve with devotion and integrity."
                                        </p>
                                    </div>
                                    <p style="text-align: center; font-style: italic; color: #6b7280; margin: 20px 0; font-size: 17px;">
                                        "Service to humanity is service to the divine." 🙏
                                    </p>
                                    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 10px 0;">
                                        With gratitude and blessings,<br>
                                        <strong style="color: #8B0000;">Solapur Gurukulam Team</strong>
                                    </p>
                                    <p style="color: #999999; font-size: 14px; line-height: 1.6; margin: 0 0 10px 0;">
                                        🌺 Welcome to the Admin family!
                                    </p>
                                </td>
                            </tr>
                            <tr>
                                <td style="border-top: 1px solid #e0e0e0; padding-top: 20px; text-align: center;">
                                    <p style="color: #999999; font-size: 12px; margin: 0;">
                                        &copy; ${new Date().getFullYear()} Solapur Gurukulam. All rights reserved.
                                    </p>
                                    <p style="color: #999999; font-size: 12px; margin: 5px 0 0 0;">
                                        Solapur, Maharashtra, India
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        `;

        const text = `
        Congratulations! You are now an Admin at Solapur Gurukulam 🎉

        Hello ${name || 'Admin'},

        We are thrilled to announce that you have been promoted to Administrator at Solapur Gurukulam!

        Your New Role:
        - You now have administrative privileges
        - You can manage content (mantras, shlokas, shotrams)
        - You can help manage users and categories
        - You play a vital role in our spiritual community

        Your Responsibilities:
        - Maintain and update spiritual content
        - Guide and support community members
        - Ensure the quality of teachings
        - Help spread the wisdom of Sanatana Dharma

        "Service to humanity is service to the divine." 🙏

        With gratitude and blessings,
        Solapur Gurukulam Team

        © ${new Date().getFullYear()} Solapur Gurukulam. All rights reserved.
        `;

        return await sendEmail({ 
            email, 
            subject: '🎉 Congratulations! You are now an Admin at Solapur Gurukulam', 
            html,
            text
        });
    } catch (error) {
        console.error('❌ Admin promotion email error:', error);
        throw error;
    }
};

// Send password reset email
const sendPasswordResetEmail = async (email, token, name) => {
    try {
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${token}`;
        
        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Your Password</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f4f4f4; padding: 20px 0;">
                <tr>
                    <td align="center">
                        <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); padding: 40px;">
                            <tr>
                                <td align="center" style="padding-bottom: 20px;">
                                    <h1 style="color: #8B0000; margin: 0; font-size: 28px;">🕉️ Solapur Gurukulam</h1>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 20px 0;">
                                    <h2 style="color: #333333; font-size: 24px; margin: 0 0 20px 0;">Password Reset Request</h2>
                                    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                        Hello <strong>${name || 'User'}</strong>,
                                    </p>
                                    <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                        We received a request to reset your password for your Solapur Gurukulam account. Click the button below to create a new password:
                                    </p>
                                    <div style="text-align: center; margin: 30px 0;">
                                        <a href="${resetUrl}" style="display: inline-block; padding: 14px 40px; background-color: #FF5722; color: #ffffff; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold;">
                                            🔑 Reset Password
                                        </a>
                                    </div>
                                    <p style="color: #777777; font-size: 14px; line-height: 1.6; margin: 0 0 10px 0;">
                                        Or copy and paste this link into your browser:
                                    </p>
                                    <p style="background-color: #f5f5f5; padding: 10px; border-radius: 4px; word-break: break-all; font-size: 14px; color: #333; margin: 0 0 20px 0;">
                                        ${resetUrl}
                                    </p>
                                    <p style="color: #999999; font-size: 14px; line-height: 1.6; margin: 0 0 10px 0;">
                                        ⏰ This password reset link will expire in <strong>1 hour</strong>.
                                    </p>
                                    <p style="color: #999999; font-size: 14px; line-height: 1.6; margin: 0 0 10px 0;">
                                        If you didn't request a password reset, please ignore this email or contact support at solapurgurukulam@gmail.com
                                    </p>
                                </td>
                            </tr>
                            <tr>
                                <td style="border-top: 1px solid #e0e0e0; padding-top: 20px; text-align: center;">
                                    <p style="color: #999999; font-size: 12px; margin: 0;">
                                        &copy; ${new Date().getFullYear()} Solapur Gurukulam. All rights reserved.
                                    </p>
                                    <p style="color: #999999; font-size: 12px; margin: 5px 0 0 0;">
                                        📧 solapurgurukulam@gmail.com
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        `;

        const text = `
        Password Reset Request - Solapur Gurukulam

        Hello ${name || 'User'},

        We received a request to reset your password. Visit this link to create a new password:
        ${resetUrl}

        This password reset link will expire in 1 hour.

        If you didn't request a password reset, please ignore this email or contact support at solapurgurukulam@gmail.com

        © ${new Date().getFullYear()} Solapur Gurukulam. All rights reserved.
        `;

        return await sendEmail({ 
            email, 
            subject: 'Reset Your Password - Solapur Gurukulam', 
            html,
            text
        });
    } catch (error) {
        console.error('❌ Password reset email error:', error);
        throw error;
    }
};

// For testing email configuration
const testEmailConfig = async () => {
    try {
        const transporter = createTransporter();
        await transporter.verify();
        console.log('✅ Email configuration is valid and working!');
        return true;
    } catch (error) {
        console.error('❌ Email configuration failed:', error.message);
        return false;
    }
};

module.exports = { 
    sendEmail, 
    sendVerificationEmail, 
    sendWelcomeEmail,
    sendAdminPromotionEmail,
    sendPasswordResetEmail,
    testEmailConfig 
};