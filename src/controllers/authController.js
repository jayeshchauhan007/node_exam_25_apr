const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { AppError, asyncHandler } = require('../utils/errors');
const sanitize = require('../utils/sanitize');

const PW_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{10,}$/;
const EM_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

exports.register = asyncHandler(async (req, res) => {
    const body = sanitize(req.body);
    const { name, email, password, adminSecretKey } = body;

    if (!name || !email || !password)
        throw new AppError(400, 'VALIDATION_ERROR', 'Name, email, and password are required');
    if (!EM_RE.test(email))
        throw new AppError(400, 'VALIDATION_ERROR', 'Invalid email format');
    if (!PW_RE.test(password))
        throw new AppError(400, 'VALIDATION_ERROR', 'Password must be at least 10 characters with uppercase, lowercase, number, and special character');

    const exists = await User.findOne({ where: { email: email.toLowerCase() } });
    if (exists) throw new AppError(409, 'DUPLICATE_ERROR', 'Email already registered');

    const role = (adminSecretKey && adminSecretKey === process.env.ADMIN_SECRET_KEY) ? 'admin' : 'customer';
    const user = await User.create({ name, email: email.toLowerCase(), password, role });

    res.status(201).json({
        success: true,
        data: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
});

exports.login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        throw new AppError(400, 'VALIDATION_ERROR', 'Email and password are required');

    const user = await User.scope('withPassword').findOne({ where: { email: email.toLowerCase() } });
    if (!user || !(await user.comparePassword(password)))
        throw new AppError(401, 'AUTH_ERROR', 'Invalid email or password');

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });

    res.json({
        success: true,
        data: { id: user.id, name: user.name, email: user.email, role: user.role, token }
    });
});
