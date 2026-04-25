const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const BookImage = sequelize.define('BookImage', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    bookId: { type: DataTypes.INTEGER, allowNull: false },
    originalName: { type: DataTypes.STRING, allowNull: false },
    storedName: { type: DataTypes.STRING, allowNull: false },
    displayOrder: { type: DataTypes.INTEGER, allowNull: false }
}, { timestamps: true, updatedAt: false, createdAt: 'uploadedAt' });

module.exports = BookImage;
