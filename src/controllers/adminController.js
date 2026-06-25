const User = require('../models/User');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sendAdminPromotionEmail, sendVerificationEmail } = require('../utils/sendEmail');

// Get all admins - INCLUDES BLOCKED ADMINS (FIXED: Shows all admins including blocked)
const getAllAdmins = async (req, res) => {
    try {
        if (req.user.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Super admin only.'
            });
        }

        // ✅ Get ALL admins + blocked users who were previously admins
        const admins = await User.find({
            $or: [
                { role: { $in: ['admin', 'super_admin'] } },
                { isBlocked: true, wasAdmin: true }
            ]
        }).select('-password').sort({ createdAt: -1 });

        // ✅ Format response to clearly show admin cards including blocked ones
        const formattedAdmins = admins.map(admin => ({
            _id: admin._id,
            name: admin.name,
            email: admin.email,
            phone: admin.phone,
            role: admin.role,
            isVerified: admin.isVerified,
            isBlocked: admin.isBlocked,
            wasAdmin: admin.wasAdmin,
            createdAt: admin.createdAt,
            // ✅ For frontend display
            displayStatus: admin.isBlocked ? 'blocked' : 'active',
            isAdminCard: true // All returned users are admins or were admins
        }));

        res.status(200).json({
            success: true,
            data: formattedAdmins,
            count: formattedAdmins.length
        });
    } catch (error) {
        console.error('Get all admins error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Create new admin
const createAdmin = async (req, res) => {
    try {
        console.log('Create admin request body:', req.body);

        if (req.user.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Super admin only.'
            });
        }

        const { name, email, phone, password, role } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Name, email and password are required'
            });
        }

        const existingUser = await User.findOne({
            $or: [{ email: email.toLowerCase().trim() }, { phone: phone || '' }]
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email or phone'
            });
        }

        const user = await User.create({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            phone: phone || '',
            password: password,
            role: role === 'super_admin' ? 'super_admin' : 'admin',
            isVerified: true,
            isBlocked: false,
            wasAdmin: false
        });

        // ✅ Send promotion email with proper error handling
        try {
            const emailSent = await sendAdminPromotionEmail(user.email, user.name);
            if (emailSent) {
                console.log('✅ Admin promotion email sent to:', user.email);
            } else {
                console.warn('⚠️ Admin promotion email failed to send to:', user.email);
            }
        } catch (emailError) {
            console.warn('⚠️ Admin promotion email error:', emailError.message);
            // Don't block user creation if email fails
        }

        const userResponse = {
            _id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            isVerified: user.isVerified,
            isBlocked: user.isBlocked,
            wasAdmin: user.wasAdmin,
            createdAt: user.createdAt,
            displayStatus: 'active'
        };

        res.status(201).json({
            success: true,
            message: 'Admin created successfully',
            data: userResponse
        });

    } catch (error) {
        console.error('Create admin error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Add existing user as admin - FIXED: Removed [object Object] placeholder
const addAdmin = async (req, res) => {
    try {
        console.log('Add admin request body:', req.body);

        if (req.user.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Super admin only.'
            });
        }

        const { email, phone } = req.body;

        // ✅ Clear validation with proper messages
        if (!email && !phone) {
            return res.status(400).json({
                success: false,
                message: 'Please provide either email or phone to find the user'
            });
        }

        const searchCriteria = {};
        if (email) searchCriteria.email = email.toLowerCase().trim();
        if (phone) searchCriteria.phone = phone.trim();

        const existingUser = await User.findOne(searchCriteria);

        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: `User not found with provided ${email ? 'email' : 'phone'}. User must register first.`
            });
        }

        // ✅ Check if already admin
        if (existingUser.role === 'admin' || existingUser.role === 'super_admin') {
            return res.status(400).json({
                success: false,
                message: `User is already an ${existingUser.role}`
            });
        }

        // ✅ Check if verified
        if (!existingUser.isVerified) {
            return res.status(400).json({
                success: false,
                message: 'User must verify their email before becoming an admin'
            });
        }

        // ✅ Check if blocked
        if (existingUser.isBlocked) {
            return res.status(400).json({
                success: false,
                message: 'Blocked users cannot be assigned as admin'
            });
        }

        // ✅ CHANGE ROLE FROM USER TO ADMIN
        existingUser.role = 'admin';
        existingUser.wasAdmin = false;
        await existingUser.save();

        // ✅ Send promotion email with proper handling
        try {
            const emailSent = await sendAdminPromotionEmail(existingUser.email, existingUser.name);
            if (emailSent) {
                console.log('✅ Admin promotion email sent to:', existingUser.email);
            } else {
                console.warn('⚠️ Admin promotion email failed to send to:', existingUser.email);
            }
        } catch (emailError) {
            console.error('❌ Admin promotion email error:', emailError.message);
            // Still return success but with warning
            return res.status(200).json({
                success: true,
                message: 'User promoted to Admin but email notification failed. Please check email configuration.',
                data: {
                    _id: existingUser._id,
                    name: existingUser.name,
                    email: existingUser.email,
                    phone: existingUser.phone,
                    role: existingUser.role,
                    isVerified: existingUser.isVerified,
                    isBlocked: existingUser.isBlocked,
                    wasAdmin: existingUser.wasAdmin,
                    createdAt: existingUser.createdAt,
                    displayStatus: 'active'
                }
            });
        }

        const userResponse = {
            _id: existingUser._id,
            name: existingUser.name,
            email: existingUser.email,
            phone: existingUser.phone,
            role: existingUser.role,
            isVerified: existingUser.isVerified,
            isBlocked: existingUser.isBlocked,
            wasAdmin: existingUser.wasAdmin,
            createdAt: existingUser.createdAt,
            displayStatus: 'active'
        };

        res.status(200).json({
            success: true,
            message: 'User has been promoted to Admin successfully',
            data: userResponse
        });

    } catch (error) {
        console.error('Add admin error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Search User by Email or Phone - FIXED: No [object Object]
const searchUser = async (req, res) => {
    try {
        if (req.user.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Super admin only.'
            });
        }

        // ✅ Changed from req.body to req.query for GET requests
        const { email, phone } = req.query;

        if (!email && !phone) {
            return res.status(400).json({
                success: false,
                message: 'Email or phone is required'
            });
        }

        const searchCriteria = {};
        if (email) searchCriteria.email = email.toLowerCase().trim();
        if (phone) searchCriteria.phone = phone.trim();

        const user = await User.findOne(searchCriteria).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // ✅ Return proper user object (no [object Object])
        res.status(200).json({
            success: true,
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                isVerified: user.isVerified,
                isBlocked: user.isBlocked,
                wasAdmin: user.wasAdmin,
                createdAt: user.createdAt,
                displayStatus: user.isBlocked ? 'blocked' : 'active'
            }
        });

    } catch (error) {
        console.error('Search user error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Verify User - Send Verification Email - FIXED: Email sending issue
const verifyUser = async (req, res) => {
    try {
        if (req.user.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Super admin only.'
            });
        }

        const userId = req.params.id;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (user.isVerified) {
            return res.status(400).json({
                success: false,
                message: 'User is already verified'
            });
        }

        if (!user.email) {
            return res.status(400).json({
                success: false,
                message: 'User does not have an email address'
            });
        }

        const emailVerificationToken = crypto.randomBytes(32).toString("hex");
        const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

        user.emailVerificationToken = emailVerificationToken;
        user.emailVerificationExpires = emailVerificationExpires;
        await user.save();

        // ✅ Send verification email with proper error handling
        try {
            const emailSent = await sendVerificationEmail(user.email, emailVerificationToken, user.name);
            
            if (emailSent) {
                res.status(200).json({
                    success: true,
                    message: `Verification email sent successfully to ${user.email}`
                });
            } else {
                // Clear tokens if email fails
                user.emailVerificationToken = undefined;
                user.emailVerificationExpires = undefined;
                await user.save();
                
                return res.status(500).json({
                    success: false,
                    message: 'Failed to send verification email. Please check email configuration.'
                });
            }
        } catch (emailError) {
            console.error('❌ Failed to send verification email:', emailError.message);
            
            // Clear the token if email fails
            user.emailVerificationToken = undefined;
            user.emailVerificationExpires = undefined;
            await user.save();
            
            return res.status(500).json({
                success: false,
                message: 'Failed to send verification email. Please check email configuration.',
                error: process.env.NODE_ENV === 'development' ? emailError.message : undefined
            });
        }

    } catch (error) {
        console.error('Verify user error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Update admin
const updateAdmin = async (req, res) => {
    try {
        if (req.user.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Super admin only.'
            });
        }

        const { name, phone, role } = req.body;
        const adminId = req.params.id;

        const admin = await User.findById(adminId);
        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }

        if (admin.role === 'super_admin' && role && role !== 'super_admin') {
            const superAdminCount = await User.countDocuments({ role: 'super_admin' });
            if (superAdminCount === 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot change the only Super Admin\'s role'
                });
            }
        }

        if (name) admin.name = name.trim();
        if (phone) admin.phone = phone.trim();
        if (role && role !== admin.role) admin.role = role;

        await admin.save();

        const adminResponse = {
            _id: admin._id,
            name: admin.name,
            email: admin.email,
            phone: admin.phone,
            role: admin.role,
            isVerified: admin.isVerified,
            isBlocked: admin.isBlocked,
            wasAdmin: admin.wasAdmin,
            displayStatus: admin.isBlocked ? 'blocked' : 'active'
        };

        res.status(200).json({
            success: true,
            message: 'Admin updated successfully',
            data: adminResponse
        });

    } catch (error) {
        console.error('Update admin error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Remove admin (demote to regular user) - FIXED: Changes admin to user
const removeAdmin = async (req, res) => {
    try {
        if (req.user.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Super admin only.'
            });
        }

        const adminId = req.params.id;

        const admin = await User.findById(adminId);
        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (admin.role !== 'admin' && admin.role !== 'super_admin') {
            return res.status(400).json({
                success: false,
                message: 'User is not an admin'
            });
        }

        if (admin.role === 'super_admin') {
            const superAdminCount = await User.countDocuments({ role: 'super_admin' });
            if (superAdminCount === 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot remove the only Super Admin'
                });
            }
        }

        // ✅ CHANGE ROLE FROM ADMIN TO USER
        admin.role = 'user';
        admin.isBlocked = false;
        admin.wasAdmin = false;
        await admin.save();

        const userResponse = {
            _id: admin._id,
            name: admin.name,
            email: admin.email,
            phone: admin.phone,
            role: admin.role,
            isVerified: admin.isVerified,
            isBlocked: admin.isBlocked,
            wasAdmin: admin.wasAdmin,
            displayStatus: 'active'
        };

        res.status(200).json({
            success: true,
            message: 'Admin privileges removed. User is now a regular user.',
            data: userResponse
        });

    } catch (error) {
        console.error('Remove admin error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Block admin (demote + block)
const blockAdmin = async (req, res) => {
    try {
        if (req.user.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Super admin only.'
            });
        }

        const adminId = req.params.id;

        const admin = await User.findById(adminId);
        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }

        if (admin.role !== 'admin' && admin.role !== 'super_admin') {
            return res.status(400).json({
                success: false,
                message: 'User is not an admin'
            });
        }

        if (admin.role === 'super_admin') {
            return res.status(400).json({
                success: false,
                message: 'Cannot block a Super Admin'
            });
        }

        // ✅ Mark that this user was an admin and block them
        admin.wasAdmin = true;
        admin.role = 'user';
        admin.isBlocked = true;
        await admin.save();

        const userResponse = {
            _id: admin._id,
            name: admin.name,
            email: admin.email,
            phone: admin.phone,
            role: admin.role,
            isBlocked: admin.isBlocked,
            wasAdmin: admin.wasAdmin,
            isVerified: admin.isVerified,
            displayStatus: 'blocked'
        };

        res.status(200).json({
            success: true,
            message: 'Admin blocked and demoted to regular user',
            data: userResponse
        });

    } catch (error) {
        console.error('Block admin error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Unblock user (optionally restore as admin)
const unblockAdmin = async (req, res) => {
    try {
        if (req.user.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Super admin only.'
            });
        }

        const adminId = req.params.id;
        const { restoreAsAdmin } = req.body;

        const user = await User.findById(adminId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        user.isBlocked = false;

        // ✅ If user was previously an admin and we want to restore
        if (restoreAsAdmin && user.wasAdmin === true) {
            if (!user.isVerified) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot restore as admin. User must be verified.'
                });
            }
            // ✅ CHANGE ROLE FROM USER TO ADMIN
            user.role = 'admin';
            user.wasAdmin = false;
        } else {
            user.wasAdmin = false;
        }

        await user.save();

        const userResponse = {
            _id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            isBlocked: user.isBlocked,
            isVerified: user.isVerified,
            wasAdmin: user.wasAdmin,
            displayStatus: user.isBlocked ? 'blocked' : 'active'
        };

        res.status(200).json({
            success: true,
            message: user.role === 'admin' ? 'User unblocked and restored as admin' : 'User unblocked successfully',
            data: userResponse
        });

    } catch (error) {
        console.error('Unblock admin error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Delete user - FIXED: Deletes user completely
const deleteAdmin = async (req, res) => {
    try {
        if (req.user.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Super admin only.'
            });
        }

        const adminId = req.params.id;

        const admin = await User.findById(adminId);
        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (admin.role === 'super_admin') {
            const superAdminCount = await User.countDocuments({ role: 'super_admin' });
            if (superAdminCount === 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot delete the only Super Admin'
                });
            }
        }

        // ✅ DELETE USER COMPLETELY
        await User.findByIdAndDelete(adminId);

        res.status(200).json({
            success: true,
            message: 'User deleted successfully',
            data: {
                deletedUserId: adminId,
                deletedUserEmail: admin.email
            }
        });

    } catch (error) {
        console.error('Delete admin error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    getAllAdmins,
    createAdmin,
    addAdmin,
    searchUser,
    verifyUser,
    updateAdmin,
    removeAdmin,
    blockAdmin,
    unblockAdmin,
    deleteAdmin
};