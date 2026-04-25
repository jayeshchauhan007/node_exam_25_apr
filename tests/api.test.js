process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_EXPIRES_IN = '1h';
process.env.ADMIN_SECRET_KEY = 'admin-secret-123';
process.env.BCRYPT_SALT_ROUNDS = '4';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '3306';
process.env.DB_NAME = 'bookstore_api_test';
process.env.DB_USER = 'root';
process.env.DB_PASS = 'deep70';

const request = require('supertest');
const path = require('path');
const fs = require('fs');

const app = require('../server');
const { sequelize } = require('../src/config/db');

let adminToken, customerToken;
let bookId, bookId2, imageId, orderId, reviewId;

beforeAll(async () => {
    const mysql = require('mysql2/promise');
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST, port: process.env.DB_PORT,
        user: process.env.DB_USER, password: process.env.DB_PASS
    });
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``);
    await conn.end();
    await sequelize.authenticate();
    await sequelize.sync({ force: true });
});

afterAll(async () => {
    await sequelize.close();
});

// AUTHENTICATION

describe('Auth', () => {
    test('register - missing fields returns 400', async () => {
        const res = await request(app).post('/api/auth/register').send({ email: 'x@x.com' });
        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });

    test('register - invalid email returns 400', async () => {
        const res = await request(app).post('/api/auth/register')
            .send({ name: 'T', email: 'bad', password: 'Password1!x' });
        expect(res.status).toBe(400);
    });

    test('register - weak password returns 400', async () => {
        const res = await request(app).post('/api/auth/register')
            .send({ name: 'T', email: 't@t.com', password: 'short' });
        expect(res.status).toBe(400);
    });

    test('register - customer', async () => {
        const res = await request(app).post('/api/auth/register')
            .send({ name: 'Customer', email: 'cust@test.com', password: 'Password1!x' });
        expect(res.status).toBe(201);
        expect(res.body.data.role).toBe('customer');
        expect(res.body.data.password).toBeUndefined();
    });

    test('register - admin with secret', async () => {
        const res = await request(app).post('/api/auth/register')
            .send({ name: 'Admin', email: 'admin@test.com', password: 'Password1!x', adminSecretKey: 'admin-secret-123' });
        expect(res.status).toBe(201);
        expect(res.body.data.role).toBe('admin');
    });

    test('register - wrong admin key silently becomes customer', async () => {
        const res = await request(app).post('/api/auth/register')
            .send({ name: 'Sneaky', email: 'sneak@test.com', password: 'Password1!x', adminSecretKey: 'wrong' });
        expect(res.status).toBe(201);
        expect(res.body.data.role).toBe('customer');
    });

    test('register - duplicate email 409', async () => {
        const res = await request(app).post('/api/auth/register')
            .send({ name: 'Dup', email: 'cust@test.com', password: 'Password1!x' });
        expect(res.status).toBe(409);
    });

    test('login - customer', async () => {
        const res = await request(app).post('/api/auth/login')
            .send({ email: 'cust@test.com', password: 'Password1!x' });
        expect(res.status).toBe(200);
        expect(res.body.data.token).toBeDefined();
        customerToken = res.body.data.token;
    });

    test('login - admin', async () => {
        const res = await request(app).post('/api/auth/login')
            .send({ email: 'admin@test.com', password: 'Password1!x' });
        expect(res.status).toBe(200);
        adminToken = res.body.data.token;
    });

    test('login - wrong password generic error', async () => {
        const res = await request(app).post('/api/auth/login')
            .send({ email: 'cust@test.com', password: 'Wrong1!xxxx' });
        expect(res.status).toBe(401);
        expect(res.body.error.message).toBe('Invalid email or password');
    });

    test('login - nonexistent email same generic error', async () => {
        const res = await request(app).post('/api/auth/login')
            .send({ email: 'no@test.com', password: 'Password1!x' });
        expect(res.status).toBe(401);
        expect(res.body.error.message).toBe('Invalid email or password');
    });
});

// BOOKS

describe('Books', () => {
    test('create - requires admin', async () => {
        const res = await request(app).post('/api/books')
            .set('Authorization', `Bearer ${customerToken}`)
            .send({ title: 'X', author: 'X', genre: 'X', price: 1, stock: 1 });
        expect(res.status).toBe(403);
    });

    test('create - missing fields 400', async () => {
        const res = await request(app).post('/api/books')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ title: 'Only' });
        expect(res.status).toBe(400);
    });

    test('create - success', async () => {
        const res = await request(app).post('/api/books')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ title: 'Test Book', author: 'Author', genre: 'Fiction', price: 19.99, stock: 10 });
        expect(res.status).toBe(201);
        expect(res.body.data.title).toBe('Test Book');
        expect(res.body.data.images).toEqual([]);
        bookId = res.body.data.id;
    });

    test('create - XSS sanitized', async () => {
        const res = await request(app).post('/api/books')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ title: '<script>alert(1)</script>Safe', author: 'A', genre: 'G', price: 5, stock: 5 });
        expect(res.status).toBe(201);
        expect(res.body.data.title).not.toContain('<script>');
        bookId2 = res.body.data.id;
    });

    test('list - public with pagination', async () => {
        const res = await request(app).get('/api/books');
        expect(res.status).toBe(200);
        expect(res.body.meta.page).toBe(1);
        expect(res.body.meta.limit).toBe(20);
        expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
    });

    test('list - pagination params', async () => {
        const res = await request(app).get('/api/books?page=1&limit=1');
        expect(res.body.meta.limit).toBe(1);
        expect(res.body.data.length).toBeLessThanOrEqual(1);
    });

    test('list - filter by genre', async () => {
        const res = await request(app).get('/api/books?genre=Fiction');
        res.body.data.forEach(b => expect(b.genre).toBe('Fiction'));
    });

    test('get by id', async () => {
        const res = await request(app).get(`/api/books/${bookId}`);
        expect(res.status).toBe(200);
        expect(res.body.data.title).toBe('Test Book');
        expect(res.body.data.images).toBeInstanceOf(Array);
    });

    test('get nonexistent 404', async () => {
        const res = await request(app).get('/api/books/99999');
        expect(res.status).toBe(404);
    });

    test('update partial', async () => {
        const res = await request(app).patch(`/api/books/${bookId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ price: 24.99 });
        expect(res.status).toBe(200);
        expect(res.body.data.price).toBe(24.99);
        expect(res.body.data.title).toBe('Test Book');
    });

    test('soft delete', async () => {
        const c = await request(app).post('/api/books')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ title: 'Del', author: 'A', genre: 'G', price: 1, stock: 1 });
        const did = c.body.data.id;

        const res = await request(app).delete(`/api/books/${did}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);

        const list = await request(app).get('/api/books');
        expect(list.body.data.find(b => b.id === did)).toBeUndefined();

        const det = await request(app).get(`/api/books/${did}`);
        expect(det.status).toBe(404);

        const res2 = await request(app).delete(`/api/books/${did}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res2.status).toBe(404);
    });

    test('out-of-stock hidden public, visible admin', async () => {
        const c = await request(app).post('/api/books')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ title: 'OOS', author: 'A', genre: 'G', price: 1, stock: 0 });
        const oid = c.body.data.id;

        const pub = await request(app).get('/api/books');
        expect(pub.body.data.find(b => b.id === oid)).toBeUndefined();

        const adm = await request(app).get('/api/books')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(adm.body.data.find(b => b.id === oid)).toBeDefined();
    });
});

// BOOK IMAGES

describe('Book Images', () => {
    test('upload valid JPEG', async () => {
        const jp = path.join(__dirname, 'test.jpg');
        fs.writeFileSync(jp, Buffer.from([
            0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
            0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xD9
        ]));
        const res = await request(app)
            .post(`/api/books/${bookId}/images`)
            .set('Authorization', `Bearer ${adminToken}`)
            .attach('images', jp);
        fs.unlinkSync(jp);
        expect(res.status).toBe(201);
        expect(res.body.data.length).toBe(1);
        imageId = res.body.data[0].id;
    });

    test('delete image', async () => {
        const res = await request(app)
            .delete(`/api/books/${bookId}/images/${imageId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
    });

    test('delete nonexistent image 404', async () => {
        const res = await request(app)
            .delete(`/api/books/${bookId}/images/99999`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(404);
    });
});

// ─── ORDERS ──────────────────────────────────────────────────────────────────

describe('Orders', () => {
    const addr = {
        fullName: 'John', phone: '123', addressLine1: '123 St',
        city: 'NYC', state: 'NY', postalCode: '10001', country: 'US'
    };

    test('create order', async () => {
        const res = await request(app).post('/api/orders')
            .set('Authorization', `Bearer ${customerToken}`)
            .send({ items: [{ bookId, quantity: 2 }], shippingAddress: addr });
        expect(res.status).toBe(201);
        expect(res.body.data.status).toBe('pending');
        expect(res.body.data.products.length).toBe(1);
        expect(res.body.data.products[0].bookTitle).toBe('Test Book');
        expect(res.body.data.addresses.length).toBe(2);
        orderId = res.body.data.id;
    });

    test('insufficient stock', async () => {
        const res = await request(app).post('/api/orders')
            .set('Authorization', `Bearer ${customerToken}`)
            .send({ items: [{ bookId, quantity: 99999 }], shippingAddress: addr });
        expect(res.status).toBe(400);
    });

    test('missing address', async () => {
        const res = await request(app).post('/api/orders')
            .set('Authorization', `Bearer ${customerToken}`)
            .send({ items: [{ bookId, quantity: 1 }] });
        expect(res.status).toBe(400);
    });

    test('admin cannot create order', async () => {
        const res = await request(app).post('/api/orders')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ items: [{ bookId, quantity: 1 }], shippingAddress: addr });
        expect(res.status).toBe(403);
    });

    test('my orders', async () => {
        const res = await request(app).get('/api/orders/my')
            .set('Authorization', `Bearer ${customerToken}`);
        expect(res.status).toBe(200);
        expect(res.body.data.length).toBeGreaterThan(0);
        expect(res.body.data[0].products).toBeDefined();
        expect(res.body.data[0].addresses).toBeDefined();
    });

    test('admin all orders', async () => {
        const res = await request(app).get('/api/orders')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body.data.length).toBeGreaterThan(0);
    });

    test('get order by id - customer own', async () => {
        const res = await request(app).get(`/api/orders/${orderId}`)
            .set('Authorization', `Bearer ${customerToken}`);
        expect(res.status).toBe(200);
    });

    test('get order by id - admin any', async () => {
        const res = await request(app).get(`/api/orders/${orderId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
    });

    test('update status', async () => {
        const res = await request(app).patch(`/api/orders/${orderId}/status`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: 'confirmed' });
        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('confirmed');
        expect(res.body.data.products).toBeDefined();
    });

    test('invalid status', async () => {
        const res = await request(app).patch(`/api/orders/${orderId}/status`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ status: 'bad' });
        expect(res.status).toBe(400);
    });
});

// REVIEWS

describe('Reviews', () => {
    test('create review', async () => {
        const res = await request(app).post(`/api/reviews/${bookId}`)
            .set('Authorization', `Bearer ${customerToken}`)
            .send({ rating: 5, comment: 'Great!' });
        expect(res.status).toBe(201);
        expect(res.body.data.rating).toBe(5);
        expect(res.body.data.reviewer.name).toBe('Customer');
        reviewId = res.body.data.id;
    });

    test('duplicate review 409', async () => {
        const res = await request(app).post(`/api/reviews/${bookId}`)
            .set('Authorization', `Bearer ${customerToken}`)
            .send({ rating: 3 });
        expect(res.status).toBe(409);
    });

    test('invalid rating', async () => {
        const res = await request(app).post(`/api/reviews/${bookId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ rating: 6 });
        expect(res.status).toBe(400);
    });

    test('review nonexistent book', async () => {
        const res = await request(app).post('/api/reviews/99999')
            .set('Authorization', `Bearer ${customerToken}`)
            .send({ rating: 4 });
        expect(res.status).toBe(404);
    });

    test('get book reviews - public', async () => {
        const res = await request(app).get(`/api/reviews/${bookId}`);
        expect(res.status).toBe(200);
        expect(res.body.data.length).toBeGreaterThan(0);
        expect(res.body.data[0].reviewer.name).toBeDefined();
    });

    test('admin all reviews', async () => {
        const res = await request(app).get('/api/reviews')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body.data[0].reviewer).toBeDefined();
        expect(res.body.data[0].book).toBeDefined();
    });

    test('filter reviews by bookId', async () => {
        const res = await request(app).get(`/api/reviews?bookId=${bookId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body.data.length).toBeGreaterThan(0);
    });

    test('customer delete own review', async () => {
        const res = await request(app).delete(`/api/reviews/${reviewId}`)
            .set('Authorization', `Bearer ${customerToken}`);
        expect(res.status).toBe(200);
    });

    test('delete already deleted 404', async () => {
        const res = await request(app).delete(`/api/reviews/${reviewId}`)
            .set('Authorization', `Bearer ${customerToken}`);
        expect(res.status).toBe(404);
    });

    test('customer cannot delete others review', async () => {
        const c = await request(app).post(`/api/reviews/${bookId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ rating: 4 });
        const rid = c.body.data.id;

        const res = await request(app).delete(`/api/reviews/${rid}`)
            .set('Authorization', `Bearer ${customerToken}`);
        expect(res.status).toBe(403);

        const res2 = await request(app).delete(`/api/reviews/${rid}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res2.status).toBe(200);
    });
});

// ERROR FORMAT

describe('Error Handling', () => {
    test('404 unknown route', async () => {
        const res = await request(app).get('/api/unknown');
        expect(res.status).toBe(404);
        expect(res.body).toEqual({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
    });

    test('401 no token', async () => {
        const res = await request(app).post('/api/books').send({});
        expect(res.status).toBe(401);
    });

    test('401 bad token', async () => {
        const res = await request(app).post('/api/books')
            .set('Authorization', 'Bearer bad').send({});
        expect(res.status).toBe(401);
    });

    test('error format consistent', async () => {
        const res = await request(app).post('/api/auth/register').send({});
        expect(res.body.success).toBe(false);
        expect(res.body.error).toHaveProperty('code');
        expect(res.body.error).toHaveProperty('message');
    });
});
