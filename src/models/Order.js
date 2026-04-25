const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Order = sequelize.define('Order', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    status: { type: DataTypes.ENUM('pending', 'confirmed', 'shipped', 'delivered'), defaultValue: 'pending' },
    totalPrice: { type: DataTypes.FLOAT, allowNull: false }
}, { timestamps: true });

module.exports = Order;
