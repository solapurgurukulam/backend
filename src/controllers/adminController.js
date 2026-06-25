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

// Search user by email or phone (ADDED FOR FRONTEND SYNC)
const searchUser = async (req, res) => {
    try {
        const { email, phone } = req.query;

        if (!email && !phone) {
            return res.status(400).json({
                success: false,
                message: 'Please provide either email or phone number'
            });
        }

        const searchConditions = [];
        if (email) searchConditions.push({ email: email.toLowerCase().trim() });
        if (phone) searchConditions.push({ phone: phone.trim() });

        const user = await User.findOne({ $or: searchConditions }).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
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

// Create new admin from scratch (super_admin only)
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
            $or: [{ email: email.toLowerCase().trim() }, { phone }]
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email or phone'
            });
        }

        // Using plain password here because your User model pre-save hook handles bcrypt hashing
        const user = await User.create({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            phone: phone || '',
            password: password, 
            role: role === 'super_admin' ? 'super_admin' : 'admin',
            isVerified: true,
            isBlocked: false
        });

        res.status(201).json({
            success: true,
            message: 'Admin created successfully',
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Create admin error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Promote existing user to admin (ADDED FOR FRONTEND SYNC)
const promoteUser = async (req, res) => {
    try {
        const { email, phone, role } = req.body;

        const searchConditions = [];
        if (email) searchConditions.push({ email: email.toLowerCase().trim() });
        if (phone) searchConditions.push({ phone: phone.trim() });

        const user = await User.findOne({ $or: searchConditions });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found. They must register first.'
            });
        }

        if (user.role === 'admin' || user.role === 'super_admin') {
            return res.status(400).json({
                success: false,
                message: `User is already an ${user.role}`
            });
        }

        if (user.isBlocked) {
            return res.status(400).json({
                success: false,
                message: 'Blocked users cannot be assigned as admin'
            });
        }

        user.role = role || 'admin';
        await user.save();

        res.status(200).json({
            success: true,
            message: 'User promoted to admin successfully'
        });

    } catch (error) {
        console.error('Promote user error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
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

        if (admin.role === 'super_admin' && role !== 'super_admin') {
            const superAdminCount = await User.countDocuments({ role: 'super_admin' });
            if (superAdminCount === 1) {
                return res.status(400).json({ success: false, message: 'Cannot change the only Super Admin\'s role' });
            }
        }

        if (name) admin.name = name;
        if (phone) admin.phone = phone;
        if (role && role !== admin.role) admin.role = role;

        await admin.save();

        res.status(200).json({
            success: true,
            message: 'Admin updated successfully',
            data: { _id: admin._id, name: admin.name, role: admin.role }
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete/Demote admin
const deleteAdmin = async (req, res) => {
    try {
        const adminId = req.params.id;

        const admin = await User.findById(adminId);
        if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });

        if (admin.role === 'super_admin') {
            const superAdminCount = await User.countDocuments({ role: 'super_admin' });
            if (superAdminCount === 1) {
                return res.status(400).json({ success: false, message: 'Cannot demote the only Super Admin' });
            }
        }

        // Instead of deleting from DB entirely, we demote to user (safer)
        admin.role = 'user';
        await admin.save();

        res.status(200).json({
            success: true,
            message: 'Admin demoted to regular user successfully'
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Block admin
const blockAdmin = async (req, res) => {
    try {
        const adminId = req.params.id;
        const admin = await User.findById(adminId);
        if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });
        
        if (admin.role === 'super_admin') return res.status(400).json({ success: false, message: 'Cannot block a Super Admin' });
        
        admin.isBlocked = true;
        await admin.save();
        res.status(200).json({ success: true, message: 'Admin blocked successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Unblock admin
const unblockAdmin = async (req, res) => {
    try {
        const adminId = req.params.id;
        const admin = await User.findById(adminId);
        if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });
        
        admin.isBlocked = false;
        await admin.save();
        res.status(200).json({ success: true, message: 'Admin unblocked successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getAllAdmins,
    searchUser,
    createAdmin,
    promoteUser,
    updateAdmin,
    deleteAdmin,
    blockAdmin,
    unblockAdmin
};