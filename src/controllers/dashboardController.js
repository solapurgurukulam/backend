const User = require('../models/User');
const Mantra = require('../models/Mantra');
const Shloka = require('../models/Shloka');
const Shotram = require('../models/Shotram');
const Category = require('../models/Category');

exports.getStats = async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const [totalUsers, totalMantras, totalShlokas, totalCategories, totalViews] = await Promise.all([
            User.countDocuments(),
            Mantra.countDocuments(),
            Shloka.countDocuments(),
            Category.countDocuments(),
            Mantra.aggregate([{ $group: { _id: null, total: { $sum: '$views' } } }])
        ]);

        res.status(200).json({
            success: true,
            data: {
                totalUsers,
                totalMantras,
                totalShlokas,
                totalCategories,
                totalViews: totalViews[0]?.total || 0,
            },
        });
    } catch (error) {
        console.error('getStats error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

exports.getTopMantras = async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const limit = parseInt(req.query.limit) || 10;
        const mantras = await Mantra.find()
            .sort({ views: -1 })
            .limit(limit)
            .populate('category', 'name');

        res.status(200).json({ success: true, data: mantras });
    } catch (error) {
        console.error('getTopMantras error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

exports.getTopShlokas = async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const limit = parseInt(req.query.limit) || 10;
        const shlokas = await Shloka.find()
            .sort({ views: -1 })
            .limit(limit)
            .populate('category', 'name');

        res.status(200).json({ success: true, data: shlokas });
    } catch (error) {
        console.error('getTopShlokas error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

exports.getUserAnalytics = async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const [totalUsers, verifiedUsers, blockedUsers, adminUsers, last7Days] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ isVerified: true }),
            User.countDocuments({ isBlocked: true }),
            User.countDocuments({ role: { $in: ['admin', 'super_admin'] } }),
            User.aggregate([
                {
                    $match: {
                        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
                    },
                },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                        count: { $sum: 1 },
                    },
                },
                { $sort: { _id: 1 } },
            ])
        ]);

        res.status(200).json({
            success: true,
            data: {
                totalUsers,
                verifiedUsers,
                blockedUsers,
                adminUsers,
                last7DaysRegistrations: last7Days,
            },
        });
    } catch (error) {
        console.error('getUserAnalytics error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

exports.getReadAnalytics = async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const [topMantras, topShlokas, topShotrams] = await Promise.all([
            Mantra.find({ isActive: true }).sort({ views: -1 }).limit(5).select('name views'),
            Shloka.find({ isActive: true }).sort({ views: -1 }).limit(5).select('name views'),
            Shotram.find({ isActive: true }).sort({ views: -1 }).limit(5).select('name views'),
        ]);

        // Views chart data — content type wise
        const views = [
            {
                name: 'Mantras',
                mantras: topMantras.reduce((sum, m) => sum + (m.views || 0), 0),
                shlokas: 0,
            },
            {
                name: 'Shlokas',
                mantras: 0,
                shlokas: topShlokas.reduce((sum, s) => sum + (s.views || 0), 0),
            },
            {
                name: 'Shotrams',
                mantras: 0,
                shlokas: topShotrams.reduce((sum, s) => sum + (s.views || 0), 0),
            },
        ];

        // Recent activity — combined top 5
        const recent = [
            ...topMantras.map(m => ({ content: `Mantra: ${m.name}`, type: 'view', views: m.views || 0 })),
            ...topShlokas.map(s => ({ content: `Shloka: ${s.name}`, type: 'read', views: s.views || 0 })),
            ...topShotrams.map(s => ({ content: `Shotram: ${s.name}`, type: 'listen', views: s.views || 0 })),
        ]
            .sort((a, b) => b.views - a.views)
            .slice(0, 5);

        res.status(200).json({ success: true, data: { views, recent } });
    } catch (error) {
        console.error('getReadAnalytics error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
