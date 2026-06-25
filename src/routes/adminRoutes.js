const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
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
} = require('../controllers/adminController');

// All routes require authentication and super_admin role
router.use(protect);
router.use(authorize('super_admin'));

// Admin listing and creation
router.get('/all', getAllAdmins);
router.post('/create', createAdmin);

// Existing user management
router.get('/search-user', searchUser);           // GET /api/admin/search-user?email=...
router.post('/add', addExistingUserAsAdmin);       // POST /api/admin/add — promote user to admin
router.post('/verify-user/:id', verifyUser);      // POST /api/admin/verify-user/:id — send verify email

// Admin CRUD
router.put('/:id', updateAdmin);
router.delete('/:id', deleteAdmin);

// Block / Unblock / Remove
router.post('/:id/block', blockAdmin);
router.post('/:id/unblock', unblockAdmin);
router.post('/:id/remove', removeAdmin);           // POST /api/admin/:id/remove — demote to user

module.exports = router;
