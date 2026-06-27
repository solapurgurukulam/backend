require('dotenv').config();
const { sendWelcomeEmail } = require('./src/utils/sendEmail');

const testEmail = async () => {
    try {
        console.log('📧 Testing email...');
        console.log('To: shrikantbirajdar452@gmail.com');
        
        await sendWelcomeEmail('shrikantbirajdar452@gmail.com', 'Test User');
        
        console.log('✅ Email sent successfully!');
        console.log('📬 Check your inbox/spam folder');
    } catch (error) {
        console.error('❌ Email failed:', error.message);
        console.error('Full error:', error);
    }
};

testEmail();
