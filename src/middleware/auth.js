const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { AppError } = require('../utils/errors');

const authenticate = async (req, res, next) => {
    try {
        const header = req.headers.authorization;
        if (!header || !header.startsWith('Bearer '))
            throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');

        const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
        const user = await User.findByPk(decoded.id);
        if (!user) throw new AppError(401, 'UNAUTHORIZED', 'User not found');
        req.user = user;
        next();
    } catch (err) {
        if (err.statusCode) return next(err);
        next(new AppError(401, 'UNAUTHORIZED', 'Invalid or expired token'));
    }
};

const optionalAuth = async (req, res, next) => {
    try {
        const header = req.headers.authorization;
        if (!header || !header.startsWith('Bearer ')) return next();
        const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
        req.user = await User.findByPk(decoded.id);
    } catch {
        return next(new AppError(403, 'FORBIDDEN', 'Insufficient permissions'));
    }
    next();
};

const authorize = (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role))
        return next(new AppError(403, 'FORBIDDEN', 'Insufficient permissions'));
    next();
};

module.exports = { authenticate, optionalAuth, authorize };
