const Mantra = require('../models/Mantra');
const Category = require('../models/Category');
const generateSlug = require('../utils/generateSlug');
const { uploadToCloudinary } = require('../config/cloudinary');

exports.getAllMantras = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const query = { isActive: true };
        if (req.query.category) query.category = req.query.category;

        const mantras = await Mantra.find(query)
            .populate('category', 'name slug')
            .sort({ order: 1, createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Mantra.countDocuments(query);

        res.status(200).json({
            success: true,
            data: mantras,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

exports.getFeaturedMantras = async (req, res) => {
    try {
        const mantras = await Mantra.find({ isFeatured: true, isActive: true })
            .populate('category', 'name slug')
            .limit(10);

        res.status(200).json({ success: true, data: mantras });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

exports.getDailyMantra = async (req, res) => {
    try {
        const count = await Mantra.countDocuments({ isActive: true });
        const random = Math.floor(Math.random() * count);
        const mantra = await Mantra.findOne({ isActive: true })
            .skip(random)
            .populate('category', 'name slug');

        res.status(200).json({ success: true, data: mantra });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

exports.getPopularMantras = async (req, res) => {
    try {
        const mantras = await Mantra.find({ isActive: true })
            .sort({ views: -1 })
            .limit(10)
            .populate('category', 'name slug');

        res.status(200).json({ success: true, data: mantras });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

exports.getMantrasByCategory = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const mantras = await Mantra.find({ category: req.params.categoryId, isActive: true })
            .populate('category', 'name slug')
            .sort({ order: 1 })
            .skip(skip)
            .limit(limit);

        const total = await Mantra.countDocuments({ category: req.params.categoryId, isActive: true });

        res.status(200).json({
            success: true,
            data: mantras,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

exports.getMantraById = async (req, res) => {
    try {
        const mantra = await Mantra.findById(req.params.id)
            .populate('category', 'name slug description');

        if (!mantra) {
            return res.status(404).json({ success: false, message: 'Mantra not found' });
        }

        res.status(200).json({ success: true, data: mantra });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

exports.getMantraBySlug = async (req, res) => {
    try {
        const mantra = await Mantra.findOne({ slug: req.params.slug })
            .populate('category', 'name slug description');

        if (!mantra) {
            return res.status(404).json({ success: false, message: 'Mantra not found' });
        }

        res.status(200).json({ success: true, data: mantra });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

exports.incrementMantraViews = async (req, res) => {
    try {
        const mantra = await Mantra.findByIdAndUpdate(
            req.params.id,
            { $inc: { views: 1 } },
            { new: true }
        );

        if (!mantra) {
            return res.status(404).json({ success: false, message: 'Mantra not found' });
        }

        res.status(200).json({ success: true, message: 'View counted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

exports.createMantra = async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
            return res.status(403).json({ success: false, message: 'Access denied. Admin only.' });
        }

        const {
            name, sanskrit, kannada, marathi, tamil, hindi, english,
            benefits, howToChant, bestTime, recommendedCount,
            category, isFeatured, meaning, audioUrl, order
        } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: 'Mantra name is required' });
        }

        const slug = generateSlug(name);

        const existingMantra = await Mantra.findOne({ $or: [{ name }, { slug }] });
        if (existingMantra) {
            return res.status(400).json({ success: false, message: 'Mantra name already exists' });
        }

        // ✅ FIXED: Image upload is optional — if Cloudinary not configured, skip silently
        let imageUrl = null;
        if (req.file) {
            const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
            const isCloudinaryConfigured = cloudName && cloudName !== 'your_name' && cloudName !== '';
            if (isCloudinaryConfigured) {
                try {
                    const result = await uploadToCloudinary(req.file.buffer, 'mantras');
                    imageUrl = result.secure_url;
                } catch (uploadError) {
                    console.error('Cloudinary upload failed (image skipped):', uploadError.message);
                    // Don't crash — just skip image
                }
            } else {
                console.warn('Cloudinary not configured — image upload skipped');
            }
        }

        const mantra = await Mantra.create({
            name,
            slug,
            sanskrit,
            kannada,
            marathi,
            tamil,
            hindi: hindi || '',
            english: english || '',
            benefits,
            howToChant,
            bestTime,
            recommendedCount: recommendedCount || 108,
            category,
            image: imageUrl,
            isFeatured: isFeatured === 'true' || isFeatured === true,
            meaning: meaning || '',
            audioUrl: audioUrl || null,
            order: order || 0,
            createdBy: req.user.id,
        });

        await Category.findByIdAndUpdate(category, { $inc: { mantraCount: 1 } });

        res.status(201).json({ success: true, message: 'Mantra created', data: mantra });
    } catch (error) {
        console.error('createMantra error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

exports.updateMantra = async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
            return res.status(403).json({ success: false, message: 'Access denied. Admin only.' });
        }

        const {
            name, sanskrit, kannada, marathi, tamil, hindi, english,
            benefits, howToChant, bestTime, recommendedCount,
            category, isFeatured, isActive, meaning, audioUrl, order
        } = req.body;

        const updateData = {
            sanskrit, kannada, marathi, tamil,
            hindi, english, benefits, howToChant, bestTime,
            recommendedCount, category, isFeatured, isActive,
            meaning, audioUrl, order
        };

        if (name) {
            updateData.name = name;
            updateData.slug = generateSlug(name);

            const existingMantra = await Mantra.findOne({
                _id: { $ne: req.params.id },
                $or: [{ name }, { slug: updateData.slug }],
            });
            if (existingMantra) {
                return res.status(400).json({ success: false, message: 'Mantra name already exists' });
            }
        }

        if (req.file) {
            const result = await uploadToCloudinary(req.file.buffer, 'mantras');
            updateData.image = result.secure_url;
        }

        const oldMantra = await Mantra.findById(req.params.id);
        if (!oldMantra) {
            return res.status(404).json({ success: false, message: 'Mantra not found' });
        }

        if (category && oldMantra.category.toString() !== category) {
            await Category.findByIdAndUpdate(oldMantra.category, { $inc: { mantraCount: -1 } });
            await Category.findByIdAndUpdate(category, { $inc: { mantraCount: 1 } });
        }

        const mantra = await Mantra.findByIdAndUpdate(req.params.id, updateData, {
            new: true,
            runValidators: true,
        });

        res.status(200).json({ success: true, message: 'Mantra updated', data: mantra });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

exports.deleteMantra = async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
            return res.status(403).json({ success: false, message: 'Access denied. Admin only.' });
        }

        const mantra = await Mantra.findByIdAndDelete(req.params.id);
        if (!mantra) {
            return res.status(404).json({ success: false, message: 'Mantra not found' });
        }

        await Category.findByIdAndUpdate(mantra.category, { $inc: { mantraCount: -1 } });

        res.status(200).json({ success: true, message: 'Mantra deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
