const { sequelize } = require('../config/db');
const { Order, OrderProduct, OrderAddress, Book } = require('../models');
const { AppError, asyncHandler } = require('../utils/errors');
const sanitize = require('../utils/sanitize');

const ORDER_INC = [
    { model: OrderProduct, as: 'products' },
    { model: OrderAddress, as: 'addresses' }
];

const ADDR_FIELDS = ['fullName', 'phone', 'addressLine1', 'city', 'state', 'postalCode', 'country'];

exports.createOrder = asyncHandler(async (req, res) => {
    const body = sanitize(req.body);
    const { items, shippingAddress, billingAddress } = body;

    if (!items || !Array.isArray(items) || items.length === 0)
        throw new AppError(400, 'VALIDATION_ERROR', 'At least one item is required');
    if (!shippingAddress)
        throw new AppError(400, 'VALIDATION_ERROR', 'Shipping address is required');
    for (const f of ADDR_FIELDS) {
        if (!shippingAddress[f]) throw new AppError(400, 'VALIDATION_ERROR', `Shipping address ${f} is required`);
    }
    if (billingAddress) {
        for (const f of ADDR_FIELDS) {
            if (!billingAddress[f]) throw new AppError(400, 'VALIDATION_ERROR', `Billing address ${f} is required`);
        }
    }

    const bookIds = items.map(i => i.bookId);
    const books = await Book.findAll({ where: { id: bookIds } });
    const bMap = {};
    books.forEach(b => { bMap[b.id] = b; });

    for (const item of items) {
        const b = bMap[item.bookId];
        if (!b || b.isDeleted) throw new AppError(400, 'ORDER_ERROR', `Book ${item.bookId} not found or has been deleted`);
        if (!item.quantity || typeof item.quantity !== 'number') throw new AppError(400, 'ORDER_ERROR', `Quantity is missing or invalid`);
        if (b.stock < item.quantity) throw new AppError(400, 'ORDER_ERROR', `Insufficient stock for "${b.title}". Available: ${b.stock}, Requested: ${item.quantity}`);
    }

    let totalPrice = 0;
    const prodData = items.map(item => {
        const b = bMap[item.bookId];
        const lineTotal = b.price * item.quantity;
        totalPrice += lineTotal;
        return { bookId: b.id, bookTitle: b.title, bookAuthor: b.author, unitPrice: b.price, quantity: item.quantity, lineTotal };
    });

    const t = await sequelize.transaction();
    try {
        const order = await Order.create({ userId: req.user.id, totalPrice, status: 'pending' }, { transaction: t });
        await OrderProduct.bulkCreate(prodData.map(p => ({ ...p, orderId: order.id })), { transaction: t });

        const addrDocs = [{ ...shippingAddress, orderId: order.id, addressType: 'shipping' }];
        addrDocs.push({ ...(billingAddress || shippingAddress), orderId: order.id, addressType: 'billing' });
        await OrderAddress.bulkCreate(addrDocs, { transaction: t });

        for (const item of items) {
            await Book.decrement('stock', { by: item.quantity, where: { id: item.bookId }, transaction: t });
        }
        await t.commit();

        const result = await Order.findByPk(order.id, { include: ORDER_INC });
        res.status(201).json({ success: true, data: result });
    } catch (err) {
        await t.rollback();
        throw err;
    }
});

exports.getAllOrders = asyncHandler(async (req, res) => {
    const orders = await Order.findAll({ include: ORDER_INC, order: [['createdAt', 'DESC']] });
    res.json({ success: true, data: orders });
});

exports.getMyOrders = asyncHandler(async (req, res) => {
    const orders = await Order.findAll({ where: { userId: req.user.id }, include: ORDER_INC, order: [['createdAt', 'DESC']] });
    res.json({ success: true, data: orders });
});

exports.getOrder = asyncHandler(async (req, res) => {
    const order = await Order.findByPk(req.params.id, { include: ORDER_INC });
    if (!order) throw new AppError(404, 'NOT_FOUND', 'Order not found');
    if (req.user.role === 'customer' && order.userId !== req.user.id)
        throw new AppError(403, 'FORBIDDEN', 'You can only view your own orders');
    res.json({ success: true, data: order });
});

exports.updateStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const valid = ['pending', 'confirmed', 'shipped', 'delivered'];
    if (!status || !valid.includes(status))
        throw new AppError(400, 'VALIDATION_ERROR', `Status must be one of: ${valid.join(', ')}`);

    const order = await Order.findByPk(req.params.id);
    if (!order) throw new AppError(404, 'NOT_FOUND', 'Order not found');
    await order.update({ status });
    const result = await Order.findByPk(order.id, { include: ORDER_INC });
    res.json({ success: true, data: result });
});
