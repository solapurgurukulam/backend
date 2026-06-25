const User = require('../models/User');
const {
    sendVerificationEmail,
    sendAdminWelcomeEmail,
    sendAdminPromotionEmail,
} = require('../utils/sendEmail');

// Get all admins (super_admin only) — includes blocked admins
const getAllAdmins = async (req, res) => {
    try {
        const admins = await User.find({
            role: { $in: ['admin', 'super_admin'] }
        }).select('-password').sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: admins });
    } catch (error) {
        console.error('Get all admins error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Create new admin (super_admin only) — sends welcome email with credentials
const createAdmin = async (req, res) => {
    try {
        const { name, email, phone, password, role } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Name, email and password are required'
            });
        }

        const existingUser = await User.findOne({
            $or: [{ email }, ...(phone ? [{ phone }] : [])]
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
            phone: phone || undefined,
            password,
            role: role === 'super_admin' ? 'super_admin' : 'admin',
            isVerified: true,
            isBlocked: false,
        });

        // Send admin welcome email with credentials (non-blocking)
        sendAdminWelcomeEmail(email, name.trim(), password)
            .then(() => console.log('✅ Admin welcome email sent to:', email))
            .catch((err) => console.warn('⚠️ Admin welcome email failed:', err.message));

        const userResponse = {
            _id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            isVerified: user.isVerified,
            isBlocked: user.isBlocked,
            createdAt: user.createdAt,
        };

        res.status(201).json({
            success: true,
            message: 'Admin created successfully. Welcome email sent.',
            data: userResponse,
        });
    } catch (error) {
        console.error('Create admin error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Search user by email or phone (for Add Existing User feature)
const searchUser = async (req, res) => {
    try {
        const { email, phone } = req.query;

        if (!email && !phone) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email or phone to search'
            });
        }

        const query = {};
        if (email) query.email = email.toLowerCase().trim();
        if (phone) query.phone = phone.trim();

        const user = await User.findOne(query).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'No user found with this email or phone'
            });
        }

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
            },
        });
    } catch (error) {
        console.error('Search user error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Add existing user as admin (promote user → admin)
const addExistingUserAsAdmin = async (req, res) => {
    try {
        const { email, phone } = req.body;

        if (!email && !phone) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email or phone'
            });
        }

        const query = {};
        if (email) query.email = email.toLowerCase().trim();
        if (phone) query.phone = phone.trim();

        const user = await User.findOne(query);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (user.role === 'admin' || user.role === 'super_admin') {
            return res.status(400).json({
                success: false,
                message: `User is already an ${user.role}`
            });
        }

        if (!user.isVerified) {
            return res.status(400).json({
                success: false,
                message: 'User must be verified before becoming an admin'
            });
        }

        if (user.isBlocked) {
            return res.status(400).json({
                success: false,
                message: 'Blocked users cannot be promoted to admin'
            });
        }

        // Promote to admin
        user.role = 'admin';
        await user.save();

        // Send promotion email (non-blocking)
        sendAdminPromotionEmail(user.email, user.name)
            .then(() => console.log('✅ Admin promotion email sent to:', user.email))
            .catch((err) => console.warn('⚠️ Admin promotion email failed:', err.message));

        res.status(200).json({
            success: true,
            message: `${user.name} has been promoted to Admin. Welcome email sent.`,
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isVerified: user.isVerified,
                isBlocked: user.isBlocked,
            },
        });
    } catch (error) {
        console.error('Add existing admin error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Send verification email to unverified user
const verifyUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { email, name } = req.body;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.isVerified) {
            return res.status(400).json({ success: false, message: 'User is already verified' });
        }

        const crypto = require('crypto');
        const token = crypto.randomBytes(32).toString('hex');
        user.emailVerificationToken = token;
        user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await user.save({ validateBeforeSave: false });

        try {
            await sendVerificationEmail(user.email, token, user.name);
            res.status(200).json({
                success: true,
                message: `Verification email sent to ${user.email}`,
            });
        } catch (emailErr) {
            console.error('❌ Verify email send error:', emailErr.message);
            res.status(500).json({
                success: false,
                message: 'Failed to send verification email: ' + emailErr.message,
            });
        }
    } catch (error) {
        console.error('Verify user error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update admin
const updateAdmin = async (req, res) => {
    try {
        const { name, phone, role } = req.body;
        const adminId = req.params.id;

        const admin = await User.findById(adminId);
        if (!admin) {
            return res.status(404).json({ success: false, message: 'Admin not found' });
        }

        if (admin.role === 'super_admin' && role && role !== 'super_admin') {
            const superAdminCount = await User.countDocuments({ role: 'super_admin' });
            if (superAdminCount === 1) {
                return res.status(400).json({
                    success: false,
                    message: "Cannot change the only Super Admin's role",
                });
            }
        }

        if (name) admin.name = name;
        if (phone !== undefined) admin.phone = phone;
        if (role && role !== admin.role) admin.role = role;

        await admin.save();

        res.status(200).json({
            success: true,
            message: 'Admin updated successfully',
            data: {
                _id: admin._id,
                name: admin.name,
                email: admin.email,
                phone: admin.phone,
                role: admin.role,
                isVerified: admin.isVerified,
                isBlocked: admin.isBlocked,
            },
        });
    } catch (error) {
        console.error('Update admin error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete admin
const deleteAdmin = async (req, res) => {
    try {
        const admin = await User.findById(req.params.id);
        if (!admin) {
            return res.status(404).json({ success: false, message: 'Admin not found' });
        }

        if (admin.role === 'super_admin') {
            const superAdminCount = await User.countDocuments({ role: 'super_admin' });
            if (superAdminCount === 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot delete the only Super Admin',
                });
            }
        }

        await User.findByIdAndDelete(req.params.id);

        res.status(200).json({ success: true, message: 'Admin deleted successfully' });
    } catch (error) {
        console.error('Delete admin error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Block admin (sets isBlocked = true)
const blockAdmin = async (req, res) => {
    try {
        const admin = await User.findById(req.params.id);
        if (!admin) {
            return res.status(404).json({ success: false, message: 'Admin not found' });
        }

        if (admin.role === 'super_admin') {
            return res.status(400).json({ success: false, message: 'Cannot block a Super Admin' });
        }

        admin.isBlocked = true;
        await admin.save();

        res.status(200).json({
            success: true,
            message: 'Admin blocked successfully',
            data: { _id: admin._id, name: admin.name, email: admin.email, role: admin.role, isBlocked: admin.isBlocked },
        });
    } catch (error) {
        console.error('Block admin error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Unblock admin
const unblockAdmin = async (req, res) => {
    try {
        const { restoreAsAdmin } = req.body;
        const admin = await User.findById(req.params.id);
        if (!admin) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        admin.isBlocked = false;
        // If restoreAsAdmin is true, keep or restore admin role; otherwise demote to user
        if (!restoreAsAdmin) {
            admin.role = 'user';
        }
        await admin.save();

        res.status(200).json({
            success: true,
            message: restoreAsAdmin
                ? 'Admin unblocked and admin role restored successfully'
                : 'User unblocked successfully (role set to user)',
            data: { _id: admin._id, name: admin.name, email: admin.email, role: admin.role, isBlocked: admin.isBlocked },
        });
    } catch (error) {
        console.error('Unblock admin error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Remove admin (demote admin → user role)
const removeAdmin = async (req, res) => {
    try {
        const admin = await User.findById(req.params.id);
        if (!admin) {
            return res.status(404).json({ success: false, message: 'Admin not found' });
        }

        if (admin.role === 'super_admin') {
            const superAdminCount = await User.countDocuments({ role: 'super_admin' });
            if (superAdminCount === 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot remove the only Super Admin',
                });
            }
        }

        admin.role = 'user';
        await admin.save();

        res.status(200).json({
            success: true,
            message: `${admin.name} has been demoted to regular user`,
            data: { _id: admin._id, name: admin.name, email: admin.email, role: admin.role },
        });
    } catch (error) {
        console.error('Remove admin error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getAllAdmins,
    createAdmin,
    searchUser,
    addExistingUserAsAdmin,
    verifyUser,
    updateAdmin,
    deleteAdmin,
    blockAdmin,
    unblockAdmin,
    removeAdmin,
};
