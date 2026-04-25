const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const { Book, BookImage } = require('../models');
const { AppError, asyncHandler } = require('../utils/errors');
const sanitize = require('../utils/sanitize');
const cache = require('../config/cache');

const CACHE_PFX = 'books_';
const clearBookCache = () => cache.keys().forEach(k => { if (k.startsWith(CACHE_PFX)) cache.del(k); });

function isValidImage(buf) {
    if (buf.length < 4) return false;
    if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return true;
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return true;
    if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return true;
    return false;
}

exports.getBooks = asyncHandler(async (req, res) => {
    const pg = Math.max(1, parseInt(req.query.page) || 1);
    const lim = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const isAdmin = req.user && req.user.role === 'admin';
    const cacheKey = `${CACHE_PFX}${JSON.stringify({ ...req.query, isAdmin })}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const where = { isDeleted: false };
    if (!isAdmin) where.stock = { [Op.gt]: 0 };
    if (req.query.genre) where.genre = req.query.genre;
    if (req.query.author) where.author = req.query.author;
    if (req.query.minPrice || req.query.maxPrice) {
        where.price = {};
        if (req.query.minPrice) where.price[Op.gte] = parseFloat(req.query.minPrice);
        if (req.query.maxPrice) where.price[Op.lte] = parseFloat(req.query.maxPrice);
    }

    const { count: total, rows: books } = await Book.findAndCountAll({
        where,
        include: [{ model: BookImage, as: 'images', separate: true, order: [['displayOrder', 'ASC']] }],
        offset: (pg - 1) * lim,
        limit: lim,
        order: [['createdAt', 'DESC']]
    });

    const data = books.map(b => b.toJSON());
    const result = { success: true, data, meta: { page: pg, limit: lim, total } };
    cache.set(cacheKey, result);
    res.json(result);
});

exports.getBook = asyncHandler(async (req, res) => {
    const book = await Book.findOne({
        where: { id: req.params.id, isDeleted: false },
        include: [{ model: BookImage, as: 'images', separate: true, order: [['displayOrder', 'ASC']] }]
    });
    if (!book) throw new AppError(404, 'NOT_FOUND', 'Book not found');
    res.json({ success: true, data: book });
});

exports.createBook = asyncHandler(async (req, res) => {
    const body = sanitize(req.body);
    const { title, author, genre, price, stock } = body;
    if (!title || !author || !genre || price === undefined || stock === undefined)
        throw new AppError(400, 'VALIDATION_ERROR', 'Title, author, genre, price, and stock are required');
    if (typeof price !== 'number' || price < 0 || typeof stock !== 'number' || stock < 0)
        throw new AppError(400, 'VALIDATION_ERROR', 'Price and stock must be non-negative numbers');

    const book = await Book.create({ title, author, genre, price, stock });
    clearBookCache();
    res.status(201).json({ success: true, data: { ...book.toJSON(), images: [] } });
});

exports.updateBook = asyncHandler(async (req, res) => {
    const book = await Book.findOne({ where: { id: req.params.id } });

    if (!book || book.isDeleted) {
        throw new AppError(404, 'NOT_FOUND', 'Book not found or has been removed');
    }

    const body = sanitize(req.body);
    const allowed = ['title', 'author', 'genre', 'price', 'stock'];
    const updates = {};
    for (const k of allowed) { if (body[k] !== undefined) updates[k] = body[k]; }
    if (updates.price !== undefined && (typeof updates.price !== 'number' || updates.price < 0))
        throw new AppError(400, 'VALIDATION_ERROR', 'Price must be a non-negative number');
    if (updates.stock !== undefined && (typeof updates.stock !== 'number' || updates.stock < 0))
        throw new AppError(400, 'VALIDATION_ERROR', 'Stock must be a non-negative number');

    await book.update(updates);
    const updated = await Book.findByPk(book.id, {
        include: [{ model: BookImage, as: 'images', separate: true, order: [['displayOrder', 'ASC']] }]
    });
    clearBookCache();
    res.json({ success: true, data: updated });
});

exports.deleteBook = asyncHandler(async (req, res) => {
    const book = await Book.findOne({ where: { id: req.params.id, isDeleted: false } });
    if (!book) throw new AppError(404, 'NOT_FOUND', 'Book not found');
    await book.update({ isDeleted: true });
    clearBookCache();
    res.json({ success: true, message: 'Book deleted successfully' });
});

exports.uploadImages = asyncHandler(async (req, res) => {
    const book = await Book.findOne({ where: { id: req.params.id, isDeleted: false } });
    if (!book) {
        throw new AppError(404, 'NOT_FOUND', 'Book not found');
    }
    if (!req.files || req.files.length === 0) {
        throw new AppError(400, 'VALIDATION_ERROR', 'No files uploaded');
    }

    const existingCount = await BookImage.count({ where: { bookId: book.id } });
    const slots = 5 - existingCount;
    if (req.files.length > slots) {
        req.files.forEach(f => { try { fs.unlinkSync(f.path); } catch { } });
        throw new AppError(400, 'VALIDATION_ERROR', `Cannot upload ${req.files.length} images. Only ${slots} slot(s) remaining`);
    }

    for (const file of req.files) {
        const buf = fs.readFileSync(file.path);
        if (!isValidImage(buf)) {
            req.files.forEach(f => { try { fs.unlinkSync(f.path); } catch { } });
            throw new AppError(400, 'VALIDATION_ERROR', 'Invalid file type detected. Only JPEG, PNG, and WebP are allowed');
        }
    }

    const images = [];
    for (let i = 0; i < req.files.length; i++) {
        const f = req.files[i];
        images.push(await BookImage.create({
            bookId: book.id, originalName: f.originalname,
            storedName: f.filename, displayOrder: existingCount + i + 1
        }));
    }
    clearBookCache();
    res.status(201).json({ success: true, data: images });
});

exports.deleteImage = asyncHandler(async (req, res) => {
    const book = await Book.findByPk(req.params.id);
    if (!book) throw new AppError(404, 'NOT_FOUND', 'Book not found');
    const image = await BookImage.findOne({ where: { id: req.params.imageId, bookId: book.id } });
    if (!image) throw new AppError(404, 'NOT_FOUND', 'Image not found for this book');

    try { fs.unlinkSync(path.join(__dirname, '..', 'uploads', image.storedName)); } catch { }
    await image.destroy();
    clearBookCache();
    res.json({ success: true, message: 'Image deleted successfully' });
});
