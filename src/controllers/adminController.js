const User = require('../models/User');

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

// Search user by email or phone
const searchUser = async (req, res) => {
    try {
        if (req.user.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Super admin only.'
            });
        }

        const { email, phone } = req.query;

        if (!email && !phone) {
            return res.status(400).json({
                success: false,
                message: 'Please provide either email or phone number'
            });
        }

        const searchConditions = [];
        if (email) {
            searchConditions.push({ email: email.toLowerCase().trim() });
        }
        if (phone) {
            searchConditions.push({ phone: phone.trim() });
        }

        const user = await User.findOne({
            $or: searchConditions
        }).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found with this email or phone number'
            });
        }

        res.status(200).json({
            success: true,
            data: user
        });

    } catch (error) {
        console.error('Search user error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Create/Promote admin - Changes role from existing user to admin
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

        // Validate input - at least email or phone is required
        if (!email && !phone) {
            return res.status(400).json({
                success: false,
                message: 'Please provide either email or phone number'
            });
        }

        const searchConditions = [];
        if (email) {
            searchConditions.push({ email: email.toLowerCase().trim() });
        }
        if (phone) {
            searchConditions.push({ phone: phone.trim() });
        }

        // Check if user exists
        let user = await User.findOne({
            $or: searchConditions
        });

        // If user doesn't exist, return error
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found with this email or phone number. User must be registered first.'
            });
        }

        // Check if user is already an admin
        if (user.role === 'admin' || user.role === 'super_admin') {
            return res.status(400).json({
                success: false,
                message: `User is already an ${user.role}`
            });
        }

        // Check if user is blocked
        if (user.isBlocked) {
            return res.status(400).json({
                success: false,
                message: 'Blocked users cannot be assigned as admin'
            });
        }

        // PROMOTE USER TO ADMIN - Change role from 'user' to 'admin' or 'super_admin'
        user.role = role === 'super_admin' ? 'super_admin' : 'admin';
        user.isBlocked = false; // Ensure not blocked
        await user.save();

        const userResponse = {
            _id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
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

// Register a brand-new admin from scratch (FIXED: No double-hashing)
const registerNewAdmin = async (req, res) => {
    try {
        if (req.user.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Super admin only.'
            });
        }

        const { name, email, phone, password, role } = req.body;

        // 1. Check if user already exists
        const userExists = await User.findOne({ email: email.toLowerCase().trim() });
        if (userExists) {
            return res.status(400).json({ 
                success: false, 
                message: 'A user with this email already exists' 
            });
        }

        // 2. Create the new user with plain text password (Mongoose pre-save will hash it)
        const newAdmin = await User.create({
            name,
            email: email.toLowerCase().trim(),
            phone: phone || '',
            password: password, // <-- FIXED: Passing plain password here
            role: role || 'admin'
        });

        res.status(201).json({ 
            success: true, 
            message: 'Admin created successfully', 
            data: {
                _id: newAdmin._id,
                name: newAdmin.name,
                email: newAdmin.email,
                role: newAdmin.role
            } 
        });

    } catch (error) {
        console.error("Register new admin error:", error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Server error while creating admin' 
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

        // Prevent changing the only Super Admin's role
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

// Delete/Demote admin - Changes role from admin to user
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

        // Prevent demoting the only Super Admin
        if (admin.role === 'super_admin') {
            const superAdminCount = await User.countDocuments({ role: 'super_admin' });
            if (superAdminCount === 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot demote the only Super Admin'
                });
            }
        }

        // DEMOTE ADMIN TO USER - Change role from 'admin' or 'super_admin' to 'user'
        admin.role = 'user';
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

module.exports = {
    getAllAdmins,
    searchUser,
    createAdmin,
    registerNewAdmin,
    updateAdmin,
    deleteAdmin
};