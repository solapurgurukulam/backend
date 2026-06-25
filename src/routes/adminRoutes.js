const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
    getAllAdmins,
    searchUser,
    createAdmin,
    registerNewAdmin, // <-- ADDED: Import the new function
    updateAdmin,
    deleteAdmin,
} = require('../controllers/adminController');

// All routes require authentication and super_admin role
router.use(protect);
router.use(authorize('super_admin'));

// Admin listing and creation
router.get('/all', getAllAdmins);
router.post('/create', createAdmin); // Assuming this promotes an existing user

// <-- ADDED THIS ROUTE: Catches the request from your React frontend
router.post('/register-new', registerNewAdmin); 

// Existing user management - Search user by email or phone
router.get('/search-user', searchUser); 

// Admin CRUD operations
router.put('/:id', updateAdmin);
router.delete('/:id', deleteAdmin);

module.exports = router;