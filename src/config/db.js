const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
        dialect: 'mysql',
        logging: false
    }
);

const connectDB = async () => {
    const mysql = require('mysql2/promise');
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASS || ''
    });
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``);
    await conn.end();
    await sequelize.authenticate();
    console.log('MySQL connected');
};

module.exports = { sequelize, connectDB };
