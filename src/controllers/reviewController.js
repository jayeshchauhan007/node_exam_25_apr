const { Review, User, Book } = require('../models');
const { AppError, asyncHandler } = require('../utils/errors');
const sanitize = require('../utils/sanitize');

exports.getAllReviews = asyncHandler(async (req, res) => {
    const where = {};
    if (req.query.bookId) where.bookId = req.query.bookId;
    const reviews = await Review.findAll({
        where,
        include: [
            { model: User, as: 'reviewer', attributes: ['name'] },
            { model: Book, as: 'book', attributes: ['title', 'author'] }
        ]
    });
    res.json({ success: true, data: reviews });
});

exports.createReview = asyncHandler(async (req, res) => {
    const body = sanitize(req.body);
    const { rating, comment } = body;
    const { bookId } = req.params;

    if (rating === undefined || rating < 1 || rating > 5)
        throw new AppError(400, 'VALIDATION_ERROR', 'Rating must be between 1 and 5');

    const book = await Book.findOne({ where: { id: bookId, isDeleted: false } });
    if (!book) throw new AppError(404, 'NOT_FOUND', 'Book not found');

    const existing = await Review.findOne({ where: { userId: req.user.id, bookId } });
    if (existing) throw new AppError(409, 'DUPLICATE_ERROR', 'You have already reviewed this book');

    const review = await Review.create({ userId: req.user.id, bookId, rating, comment });
    const result = await Review.findByPk(review.id, {
        include: [{ model: User, as: 'reviewer', attributes: ['name'] }]
    });
    res.status(201).json({ success: true, data: result });
});

exports.getBookReviews = asyncHandler(async (req, res) => {
    const book = await Book.findOne({ where: { id: req.params.bookId, isDeleted: false } });
    if (!book) throw new AppError(404, 'NOT_FOUND', 'Book not found');
    const reviews = await Review.findAll({
        where: { bookId: req.params.bookId },
        include: [{ model: User, as: 'reviewer', attributes: ['name'] }]
    });
    res.json({ success: true, data: reviews });
});

exports.deleteReview = asyncHandler(async (req, res) => {
    const review = await Review.findByPk(req.params.id);
    if (!review) throw new AppError(404, 'NOT_FOUND', 'Review not found');
    if (req.user.role !== 'admin' && review.userId !== req.user.id)
        throw new AppError(403, 'FORBIDDEN', 'You can only delete your own reviews');
    await review.destroy();
    res.json({ success: true, message: 'Review deleted successfully' });
});
