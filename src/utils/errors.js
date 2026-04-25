class AppError extends Error {
    constructor(statusCode, code, message) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
    }
}

const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

const errorHandler = (err, req, res, _next) => {
    if (err.name === 'SequelizeValidationError') {
        const message = err.errors.map(e => e.message).join(', ');
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message } });
    }
    if (err.name === 'SequelizeUniqueConstraintError') {
        const field = err.errors?.[0]?.path || 'field';
        return res.status(409).json({ success: false, error: { code: 'DUPLICATE_ERROR', message: `Duplicate value for ${field}` } });
    }
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, error: { code: 'FILE_TOO_LARGE', message: 'File size exceeds 2MB limit' } });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ success: false, error: { code: 'INVALID_FILE_TYPE', message: err.message || 'Only JPEG, PNG, and WebP files are allowed' } });
    }

    const statusCode = err.statusCode || 500;
    const code = err.code || 'INTERNAL_ERROR';
    const message = statusCode === 500 ? 'An unexpected error occurred' : err.message;
    res.status(statusCode).json({ success: false, error: { code, message } });
};

module.exports = { AppError, asyncHandler, errorHandler };
