const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Book = sequelize.define('Book', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING, allowNull: false },
    author: { type: DataTypes.STRING, allowNull: false },
    genre: { type: DataTypes.STRING, allowNull: false },
    price: { type: DataTypes.FLOAT, allowNull: false },
    stock: { type: DataTypes.INTEGER, allowNull: false },
    isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { timestamps: true });

module.exports = Book;
