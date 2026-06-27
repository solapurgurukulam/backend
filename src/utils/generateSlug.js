const slugify = require('slugify');

const generateSlug = (text) => {
    if (!text || typeof text !== 'string') {
        return 'mantra-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    }

    // Try normal slugify (works for English/Roman text)
    let slug = slugify(text, {
        lower: true,
        strict: true,
        remove: /[*+~.()'\"!:@]/g,
    });

    // Clean up stray dashes
    slug = slug.replace(/-+/g, '-').replace(/^-|-$/g, '');

    // If slug is empty (pure Sanskrit/Devanagari text), generate unique fallback
    if (!slug) {
        slug = 'mantra-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    }

    return slug;
};

module.exports = generateSlug;
