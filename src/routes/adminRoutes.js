const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
    getAllAdmins,
    searchUser,
    createAdmin,
    promoteUser,
    updateAdmin,
    deleteAdmin,
    blockAdmin,
    unblockAdmin,
} = require('../controllers/adminController');

// All routes require authentication and super_admin role
router.use(protect);
router.use(authorize('super_admin'));

router.get('/all', getAllAdmins);
router.get('/search-user', searchUser); // Added for finding existing users
router.post('/create', createAdmin);    // Used for creating NEW admins
router.post('/promote', promoteUser);   // Added for making existing users admin
router.put('/:id', updateAdmin);
router.delete('/:id', deleteAdmin);
router.post('/:id/block', blockAdmin);
router.post('/:id/unblock', unblockAdmin);

module.exports = router;