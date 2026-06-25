const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
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
} = require('../controllers/adminController');

// All routes require authentication and super_admin role
router.use(protect);
router.use(authorize('super_admin'));

// Admin management routes
router.get('/all', getAllAdmins);
router.post('/create', createAdmin);
router.post('/add', addAdmin);
router.post('/search-user', searchUser);      // Search user by email/phone
router.post('/verify-user/:id', verifyUser);  // Send verification email
router.put('/:id', updateAdmin);
router.delete('/:id', deleteAdmin);
router.post('/:id/remove', removeAdmin);
router.post('/:id/block', blockAdmin);
router.post('/:id/unblock', unblockAdmin);

module.exports = router;