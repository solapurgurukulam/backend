const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { uploadSingle } = require('../middleware/uploadMiddleware'); // 1. IMPORT THIS
const {
    getAllShlokas,
    getShlokasByCategory,
    getShlokasByMantra,
    getShlokaById,
    getShlokaBySlug,
    incrementShlokaViews,
    createShloka,
    updateShloka,
    deleteShloka,
} = require('../controllers/shlokaController');

router.get('/', getAllShlokas);
router.get('/category/:categoryId', getShlokasByCategory);
router.get('/mantra/:mantraId', getShlokasByMantra);
router.get('/slug/:slug', getShlokaBySlug);
router.get('/:id', getShlokaById);
router.post('/:id/views', incrementShlokaViews);

router.use(protect);
// 2. ADD uploadSingle('image') HERE
router.post('/', authorize('admin', 'super_admin'), uploadSingle('image'), createShloka);
router.put('/:id', authorize('admin', 'super_admin'), uploadSingle('image'), updateShloka);
router.delete('/:id', authorize('admin', 'super_admin'), deleteShloka);

module.exports = router;