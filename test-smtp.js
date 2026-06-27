const nodemailer = require('nodemailer');
require('dotenv').config();

const testSMTP = async () => {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        await transporter.verify();
        console.log('✅ SMTP connection successful!');

        const info = await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: 'shrikantbirajdar452@gmail.com',
            subject: 'Test Email',
            html: '<h1>Test</h1><p>This is a test email</p>'
        });

        console.log('✅ Email sent:', info.messageId);
    } catch (error) {
        console.error('❌ SMTP failed:', error.message);
    }
};

testSMTP();
