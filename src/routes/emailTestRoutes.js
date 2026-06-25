const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { testEmailConfig, sendVerificationEmail } = require('../utils/sendEmail');

// Test email configuration (admin only)
router.get('/test-email-config', protect, authorize('super_admin'), async (req, res) => {
    try {
        console.log('🔍 Testing email configuration...');
        const result = await testEmailConfig();
        
        res.status(200).json({
            success: result,
            message: result ? '✅ Email configuration is working' : '❌ Email configuration failed',
            details: {
                service: process.env.EMAIL_SERVICE || 'Not set',
                user: process.env.EMAIL_USER ? '✅ Set' : '❌ Not set',
                from: process.env.EMAIL_FROM || 'Not set',
                host: process.env.EMAIL_HOST || 'Not set',
                port: process.env.EMAIL_PORT || 'Not set',
            }
        });
    } catch (error) {
        console.error('❌ Email test error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Test send email (admin only)
router.post('/test-send-email', protect, authorize('super_admin'), async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email address is required'
            });
        }

        console.log(`📧 Sending test email to: ${email}`);
        await sendVerificationEmail(email, 'test-token-123456', 'Test User');
        
        res.status(200).json({
            success: true,
            message: `✅ Test email sent successfully to ${email}`
        });
    } catch (error) {
        console.error('❌ Test email send error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Check email status (admin only)
router.get('/email-status', protect, authorize('super_admin'), async (req, res) => {
    try {
        const status = {
            configured: !!process.env.EMAIL_USER && !!process.env.EMAIL_PASS,
            service: process.env.EMAIL_SERVICE || 'Not set',
            user: process.env.EMAIL_USER || 'Not set',
            from: process.env.EMAIL_FROM || 'Not set',
            host: process.env.EMAIL_HOST || 'Not set',
            port: process.env.EMAIL_PORT || 'Not set',
            secure: process.env.EMAIL_SECURE || 'false',
            env: process.env.NODE_ENV || 'development',
        };
        
        res.status(200).json({
            success: true,
            data: status
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;