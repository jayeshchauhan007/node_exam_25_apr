const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const OrderProduct = sequelize.define('OrderProduct', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    orderId: { type: DataTypes.INTEGER, allowNull: false },
    bookId: { type: DataTypes.INTEGER, allowNull: false },
    bookTitle: { type: DataTypes.STRING, allowNull: false },
    bookAuthor: { type: DataTypes.STRING, allowNull: false },
    unitPrice: { type: DataTypes.FLOAT, allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: false },
    lineTotal: { type: DataTypes.FLOAT, allowNull: false }
}, { timestamps: false });

module.exports = OrderProduct;
