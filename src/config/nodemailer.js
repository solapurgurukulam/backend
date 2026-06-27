// src/config/nodemailer.js
// NOTE: Email sending is handled via src/utils/sendEmail.js which uses nodemailer directly.
// This file is kept for reference / future use. No action needed here.

const nodemailer = require('nodemailer');

/**
 * Creates and returns a Gmail SMTP transporter.
 * Requires EMAIL_USER and EMAIL_PASS (Gmail App Password) in .env
 */
const createTransporter = () => {
    const pass = (process.env.EMAIL_PASS || '').replace(/\s+/g, '');
    const user = (process.env.EMAIL_USER || '').trim();

    if (!user || !pass) {
        throw new Error('EMAIL_USER and EMAIL_PASS must be set in .env');
    }

    return nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: { user, pass },
        connectionTimeout: 30000,
        greetingTimeout: 30000,
        socketTimeout: 30000,
        tls: { rejectUnauthorized: false }
    });
};

module.exports = { createTransporter };