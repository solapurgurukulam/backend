const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Get all admins (super_admin only)
const getAllAdmins = async (req, res) => {
    try {
        if (req.user.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Super admin only.'
            });
        }

        const admins = await User.find({
            role: { $in: ['admin', 'super_admin'] }
        }).select('-password');

        res.status(200).json({
            success: true,
            data: admins
        });
    } catch (error) {
        console.error('Get all admins error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Create new admin (super_admin only)
const createAdmin = async (req, res) => {
    try {
        console.log('Create admin request body:', req.body);

        if (req.user.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Super admin only.'
            });
        }

        const { email, phone, role } = req.body;

        // Check if user exists with either email or phone
        let user = await User.findOne({
            $or: [
                { email: email.toLowerCase().trim() },
                { phone: phone.trim() }
            ]
        });

        // If user doesn't exist, return error
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found with this email or phone number. Please register first.'
            });
        }

        // Check if user is already an admin
        if (user.role === 'admin' || user.role === 'super_admin') {
            return res.status(400).json({
                success: false,
                message: 'User is already an admin'
            });
        }

        // Update user to admin role
        user.role = role === 'super_admin' ? 'super_admin' : 'admin';
        user.isVerified = true; // Set as verified
        user.isBlocked = false; // Ensure not blocked
        await user.save();

        const userResponse = {
            _id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            isVerified: user.isVerified,
            isBlocked: user.isBlocked,
            createdAt: user.createdAt
        };

        res.status(200).json({
            success: true,
            message: 'User promoted to admin successfully',
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

        if (admin.role === 'super_admin' && role !== 'super_admin') {
            const superAdminCount = await User.countDocuments({ role: 'super_admin' });
            if (superAdminCount === 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot change the only Super Admin\'s role'
                });
            }
        }

        if (name) admin.name = name;
        if (phone) admin.phone = phone;
        if (role && role !== admin.role) admin.role = role;

        await admin.save();

        const adminResponse = {
            _id: admin._id,
            name: admin.name,
            email: admin.email,
            phone: admin.phone,
            role: admin.role,
            isVerified: admin.isVerified,
            isBlocked: admin.isBlocked
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

// Delete admin (demote to user)
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
                message: 'Admin not found'
            });
        }

        if (admin.role === 'super_admin') {
            const superAdminCount = await User.countDocuments({ role: 'super_admin' });
            if (superAdminCount === 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot demote the only Super Admin'
                });
            }
        }

        // Demote to regular user instead of deleting
        admin.role = 'user';
        admin.isVerified = true;
        await admin.save();

        res.status(200).json({
            success: true,
            message: 'Admin demoted to regular user successfully'
        });

    } catch (error) {
        console.error('Delete admin error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Unblock admin
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

        const admin = await User.findById(adminId);
        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }

        admin.isBlocked = false;

        // restoreAsAdmin === false  -> explicitly demote to a regular user
        // restoreAsAdmin === true   -> keep/restore admin role
        // restoreAsAdmin undefined -> backward-compatible, leave role untouched
        if (restoreAsAdmin === false) {
            admin.role = 'user';
        } else if (restoreAsAdmin === true && admin.role !== 'super_admin') {
            admin.role = 'admin';
        }

        await admin.save();

        const adminResponse = {
            _id: admin._id,
            name: admin.name,
            email: admin.email,
            role: admin.role,
            isBlocked: admin.isBlocked
        };

        res.status(200).json({
            success: true,
            message: 'Admin unblocked successfully',
            data: adminResponse
        });

    } catch (error) {
        console.error('Unblock admin error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    getAllAdmins,
    createAdmin,
    updateAdmin,
    deleteAdmin,
    unblockAdmin
};