const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
    getAllAdmins,
    createAdmin,
    addAdmin,        // ✅ NEW
    updateAdmin,
    deleteAdmin,
    removeAdmin,     // ✅ NEW
    blockAdmin,
    unblockAdmin,
} = require('../controllers/adminController');

// All routes require authentication and super_admin role
router.use(protect);
router.use(authorize('super_admin'));

router.get('/all', getAllAdmins);
router.post('/create', createAdmin);
router.post('/add', addAdmin);           // ✅ NEW: Add existing user as admin
router.put('/:id', updateAdmin);
router.delete('/:id', deleteAdmin);
router.post('/:id/remove', removeAdmin); // ✅ NEW: Remove admin (demote to user)
router.post('/:id/block', blockAdmin);
router.post('/:id/unblock', unblockAdmin);

module.exports = router;