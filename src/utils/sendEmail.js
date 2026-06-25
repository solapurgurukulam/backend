const nodemailer = require('nodemailer');

// Create transporter with proper configuration
const createTransporter = () => {
    // For Ethereal email testing (development)
    if (process.env.EMAIL_SERVICE === 'ethereal') {
        return nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: process.env.ETHEREAL_USER || 'your_ethereal_user',
                pass: process.env.ETHEREAL_PASS || 'your_ethereal_pass'
            }
        });
    }
    
    // For Gmail with App Password
    if (process.env.EMAIL_SERVICE === 'gmail') {
        // ✅ FIX: Clean the password - remove spaces
        const cleanPassword = process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/\s/g, '') : '';
        
        return nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: cleanPassword  // ✅ Use cleaned password
            }
        });
    }
    
    // For other SMTP services
    return nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: process.env.EMAIL_PORT || 587,
        secure: process.env.EMAIL_SECURE === 'true' || false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/\s/g, '') : '',  // ✅ Clean password
        },
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 5000,
    });
};

// Main email sending function
const sendEmail = async (options) => {
    try {
        console.log('📧 Preparing to send email to:', options.email);
        console.log('📧 Email service:', process.env.EMAIL_SERVICE || 'default');
        console.log('📧 Email user:', process.env.EMAIL_USER ? '✅ Set' : '❌ Not set');
        
        const transporter = createTransporter();
        
        // Verify connection configuration
        try {
            await transporter.verify();
            console.log('✅ Email transporter verified successfully');
        } catch (verifyError) {
            console.error('❌ Email transporter verification failed:', verifyError.message);
            throw new Error(`Email service not configured properly: ${verifyError.message}`);
        }

        const mailOptions = {
            from: process.env.EMAIL_FROM || '"Solapur Gurukulam" <solapurgurukulam@gmail.com>',
            to: options.email,
            subject: options.subject,
            html: options.html,
            text: options.text || options.html.replace(/<[^>]*>/g, ''),
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent successfully to ${options.email}: ${info.messageId}`);
        
        // For Ethereal email testing
        if (process.env.NODE_ENV === 'development' && process.env.EMAIL_SERVICE === 'ethereal') {
            console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info));
        }
        
        return info;
    } catch (error) {
        console.error('❌ Error sending email:', error);
        console.error('❌ Error details:', {
            message: error.message,
            code: error.code,
            response: error.response,
            command: error.command
        });
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

// Send Welcome Email
const sendWelcomeEmail = async (email, name) => {
    // ... (keep your existing code - no changes needed)
};

// Send Admin Promotion Email
const sendAdminPromotionEmail = async (email, name) => {
    // ... (keep your existing code - no changes needed)
};

// Send password reset email
const sendPasswordResetEmail = async (email, token, name) => {
    // ... (keep your existing code - no changes needed)
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