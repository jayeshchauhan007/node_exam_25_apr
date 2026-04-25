require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { connectDB, sequelize } = require('./src/config/db');
const { AppError, errorHandler } = require('./src/utils/errors');
require('./src/models');

const app = express();

app.use(cors());
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/books', require('./src/routes/books'));
app.use('/api/orders', require('./src/routes/orders'));
app.use('/api/reviews', require('./src/routes/reviews'));

app.use((req, res, next) => {
    next(new AppError(404, 'NOT_FOUND', 'Route not found'));
});

app.use(errorHandler);

const PORT = process.env.PORT || 3001;

if (process.env.NODE_ENV !== 'test') {
    (async () => {
        await connectDB();
        await sequelize.sync({ alter: true });
        console.log('Database synced');
        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    })();
}

module.exports = app;
