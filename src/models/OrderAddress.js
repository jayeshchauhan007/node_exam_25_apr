const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const OrderAddress = sequelize.define('OrderAddress', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    orderId: { type: DataTypes.INTEGER, allowNull: false },
    fullName: { type: DataTypes.STRING, allowNull: false },
    phone: { type: DataTypes.STRING, allowNull: false },
    addressLine1: { type: DataTypes.STRING, allowNull: false },
    addressLine2: { type: DataTypes.STRING, allowNull: true },
    city: { type: DataTypes.STRING, allowNull: false },
    state: { type: DataTypes.STRING, allowNull: false },
    postalCode: { type: DataTypes.STRING, allowNull: false },
    country: { type: DataTypes.STRING, allowNull: false },
    addressType: { type: DataTypes.ENUM('shipping', 'billing'), allowNull: false }
}, { timestamps: false });

module.exports = OrderAddress;
