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

        const { name, email, phone, password, role } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Name, email and password are required'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({
            $or: [{ email: email.toLowerCase().trim() }, { phone: phone || '' }]
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email or phone'
            });
        }

        // Create new admin user
        const user = await User.create({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            phone: phone || '',
            password: password,
            role: role === 'super_admin' ? 'super_admin' : 'admin',
            isVerified: true,
            isBlocked: false
        });

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

// Add existing user as admin (super_admin only)
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

        if (!email && !phone) {
            return res.status(400).json({
                success: false,
                message: 'Email or phone is required to find the user'
            });
        }

        // Check if user exists with provided email or phone
        const searchCriteria = {};
        if (email) searchCriteria.email = email.toLowerCase().trim();
        if (phone) searchCriteria.phone = phone.trim();

        const existingUser = await User.findOne(searchCriteria);

        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found with provided email or phone. User must register first.'
            });
        }

        // Check if user is already an admin
        if (existingUser.role === 'admin' || existingUser.role === 'super_admin') {
            return res.status(400).json({
                success: false,
                message: `User is already an ${existingUser.role}`
            });
        }

        // Check if user is verified (email and mobile)
        if (!existingUser.isVerified) {
            return res.status(400).json({
                success: false,
                message: 'User must verify their email and phone number before becoming an admin'
            });
        }

        // Check if user is blocked
        if (existingUser.isBlocked) {
            return res.status(400).json({
                success: false,
                message: 'Blocked users cannot be assigned as admin'
            });
        }

        // Assign admin role
        existingUser.role = 'admin';
        await existingUser.save();

        const userResponse = {
            _id: existingUser._id,
            name: existingUser.name,
            email: existingUser.email,
            phone: existingUser.phone,
            role: existingUser.role,
            isVerified: existingUser.isVerified,
            isBlocked: existingUser.isBlocked,
            createdAt: existingUser.createdAt
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

// Update admin details (super_admin only)
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

        if (admin.role !== 'admin' && admin.role !== 'super_admin') {
            return res.status(400).json({
                success: false,
                message: 'User is not an admin'
            });
        }

        // Check if trying to change Super Admin role
        if (admin.role === 'super_admin' && role && role !== 'super_admin') {
            const superAdminCount = await User.countDocuments({ role: 'super_admin' });
            if (superAdminCount === 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot change the only Super Admin\'s role'
                });
            }
        }

        // Update fields
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

// Remove admin (make them regular user) - super_admin only
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

        // Check if user is actually an admin
        if (admin.role !== 'admin' && admin.role !== 'super_admin') {
            return res.status(400).json({
                success: false,
                message: 'User is not an admin'
            });
        }

        // Prevent removing the only super admin
        if (admin.role === 'super_admin') {
            const superAdminCount = await User.countDocuments({ role: 'super_admin' });
            if (superAdminCount === 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot remove the only Super Admin. Ensure at least one Super Admin exists.'
                });
            }
        }

        // Make them a regular user
        admin.role = 'user';
        admin.isBlocked = false; // Unblock if blocked
        await admin.save();

        const userResponse = {
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

// Block admin (make them regular user) - super_admin only
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

        // Check if user is actually an admin
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

        // Instead of just blocking, make them a regular user
        admin.role = 'user';
        admin.isBlocked = true;
        await admin.save();

        const userResponse = {
            _id: admin._id,
            name: admin.name,
            email: admin.email,
            role: admin.role,
            isBlocked: admin.isBlocked
        };

        res.status(200).json({
            success: true,
            message: 'Admin has been blocked and demoted to regular user',
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

// Unblock user (and optionally restore admin status) - super_admin only
const unblockAdmin = async (req, res) => {
    try {
        if (req.user.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Super admin only.'
            });
        }

        const adminId = req.params.id;
        const { restoreAsAdmin } = req.body; // Optional: restore admin status

        const user = await User.findById(adminId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Unblock the user
        user.isBlocked = false;

        // Optionally restore admin status if requested and user was previously admin
        if (restoreAsAdmin && user.role === 'user') {
            // Check if user is verified
            if (!user.isVerified) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot restore as admin. User must be verified.'
                });
            }
            user.role = 'admin';
        }

        await user.save();

        const userResponse = {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            isBlocked: user.isBlocked,
            isVerified: user.isVerified
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

// Delete user (super_admin only)
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

        await User.findByIdAndDelete(adminId);

        res.status(200).json({
            success: true,
            message: 'User deleted successfully'
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
    updateAdmin,
    deleteAdmin,
    removeAdmin,
    blockAdmin,
    unblockAdmin
};