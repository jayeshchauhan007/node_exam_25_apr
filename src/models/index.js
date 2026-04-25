const User = require('./User');
const Book = require('./Book');
const BookImage = require('./BookImage');
const Order = require('./Order');
const OrderProduct = require('./OrderProduct');
const OrderAddress = require('./OrderAddress');
const Review = require('./Review');

Book.hasMany(BookImage, { as: 'images', foreignKey: 'bookId', onDelete: 'CASCADE' });
BookImage.belongsTo(Book, { foreignKey: 'bookId' });

User.hasMany(Order, { foreignKey: 'userId' });
Order.belongsTo(User, { as: 'user', foreignKey: 'userId' });

Order.hasMany(OrderProduct, { as: 'products', foreignKey: 'orderId', onDelete: 'CASCADE' });
OrderProduct.belongsTo(Order, { foreignKey: 'orderId' });
OrderProduct.belongsTo(Book, { foreignKey: 'bookId' });

Order.hasMany(OrderAddress, { as: 'addresses', foreignKey: 'orderId', onDelete: 'CASCADE' });
OrderAddress.belongsTo(Order, { foreignKey: 'orderId' });

User.hasMany(Review, { foreignKey: 'userId' });
Review.belongsTo(User, { as: 'reviewer', foreignKey: 'userId' });
Book.hasMany(Review, { foreignKey: 'bookId' });
Review.belongsTo(Book, { as: 'book', foreignKey: 'bookId' });

module.exports = { User, Book, BookImage, Order, OrderProduct, OrderAddress, Review };
