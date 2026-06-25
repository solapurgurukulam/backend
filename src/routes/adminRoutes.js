const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
    getAllAdmins,
    searchUser,
    createAdmin,
    updateAdmin,
    deleteAdmin,
} = require('../controllers/adminController');

// All routes require authentication and super_admin role
router.use(protect);
router.use(authorize('super_admin'));

// Admin listing and creation
router.get('/all', getAllAdmins);
router.post('/create', createAdmin);

// Existing user management - Search user by email or phone
router.get('/search-user', searchUser); // GET /api/admin/search-user?email=xxx&phone=xxx

// Admin CRUD operations
router.put('/:id', updateAdmin);
router.delete('/:id', deleteAdmin);

module.exports = router;