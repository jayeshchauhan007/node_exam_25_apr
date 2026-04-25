const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/db');

const User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.ENUM('customer', 'admin'), defaultValue: 'customer' }
}, {
    timestamps: true,
    updatedAt: false,
    defaultScope: { attributes: { exclude: ['password'] } },
    scopes: { withPassword: { attributes: {} } }
});

User.beforeCreate(async (user) => {
    user.password = await bcrypt.hash(user.password, parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12);
});

User.prototype.comparePassword = function (candidate) {
    return bcrypt.compare(candidate, this.password);
};

module.exports = User;
