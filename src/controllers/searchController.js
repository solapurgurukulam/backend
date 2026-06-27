const Mantra = require('../models/Mantra');
const Shloka = require('../models/Shloka');
const Shotram = require('../models/Shotram');
const Category = require('../models/Category');

exports.globalSearch = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.trim().length < 2) {
            return res.status(400).json({ success: false, message: 'Search query must be at least 2 characters' });
        }

        const searchRegex = new RegExp(q, 'i');

        const [mantras, shlokas, shotrams, categories] = await Promise.all([
            Mantra.find({
                $or: [{ name: searchRegex }, { benefits: searchRegex }],
                isActive: true,
            })
                .limit(5)
                .populate('category', 'name slug'),

            Shloka.find({
                $or: [{ name: searchRegex }, { sanskrit: searchRegex }, { hindi: searchRegex }, { english: searchRegex }],
                isActive: true,
            })
                .limit(5)
                .populate('category', 'name slug'),  // ✅ FIXED: 'mantra' → 'category'

            Shotram.find({
                $or: [{ name: searchRegex }, { sanskrit: searchRegex }, { hindi: searchRegex }, { english: searchRegex }],
                isActive: true,
            })
                .limit(5)
                .populate('category', 'name slug'),

            Category.find({
                $or: [{ name: searchRegex }, { description: searchRegex }],
                isActive: true,
            }).limit(5),
        ]);

        res.status(200).json({
            success: true,
            data: { mantras, shlokas, shotrams, categories },
        });
    } catch (error) {
        console.error('globalSearch error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

exports.searchMantras = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.trim().length < 2) {
            return res.status(400).json({ success: false, message: 'Search query must be at least 2 characters' });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const searchRegex = new RegExp(q, 'i');
        const query = {
            $or: [{ name: searchRegex }, { benefits: searchRegex }, { howToChant: searchRegex }],
            isActive: true,
        };

        const [mantras, total] = await Promise.all([
            Mantra.find(query).populate('category', 'name slug').skip(skip).limit(limit),
            Mantra.countDocuments(query),
        ]);

        res.status(200).json({
            success: true,
            data: mantras,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

exports.searchShlokas = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.trim().length < 2) {
            return res.status(400).json({ success: false, message: 'Search query must be at least 2 characters' });
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const searchRegex = new RegExp(q, 'i');
        const query = {
            $or: [{ name: searchRegex }, { sanskrit: searchRegex }, { hindi: searchRegex }, { english: searchRegex }, { meaning: searchRegex }],
            isActive: true,
        };

        const [shlokas, total] = await Promise.all([
            Shloka.find(query).populate('category', 'name slug').skip(skip).limit(limit),  // ✅ FIXED
            Shloka.countDocuments(query),
        ]);

        res.status(200).json({
            success: true,
            data: shlokas,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

exports.searchCategories = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.trim().length < 2) {
            return res.status(400).json({ success: false, message: 'Search query must be at least 2 characters' });
        }

        const searchRegex = new RegExp(q, 'i');
        const categories = await Category.find({
            $or: [{ name: searchRegex }, { description: searchRegex }],
            isActive: true,
        });

        res.status(200).json({ success: true, data: categories });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
