# BookStore API

A fully functional REST API for an online bookstore built with Node.js, Express 5, Sequelize (MySQL/MariaDB).

## Quick Start

```bash
npm install
cp .env.example .env   # then edit .env with your values
npm start
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Description |
|---|---|
| `PORT` | Server port (default 3001) |
| `DB_HOST` | MySQL/MariaDB host |
| `DB_PORT` | Database port (default 3306) |
| `DB_NAME` | Database name (auto-created on start) |
| `DB_USER` | Database user |
| `DB_PASS` | Database password |
| `JWT_SECRET` | Secret key for signing JWT tokens |
| `JWT_EXPIRES_IN` | Token expiry (e.g. `24h`) |
| `ADMIN_SECRET_KEY` | Secret key for admin registration |
| `BCRYPT_SALT_ROUNDS` | bcrypt cost factor (default 12) |

## Running Tests

```bash
npm test
```

Tests use a separate `bookstore_api_test` database (auto-created) and run against the same MySQL instance.

## API Endpoints

### Auth (2)
- `POST /api/auth/register` — Register (customer by default, admin if correct secret provided)
- `POST /api/auth/login` — Login, returns JWT token

### Books (7)
- `GET /api/books` — List books (public, paginated, filterable)
- `GET /api/books/:id` — Get single book (public)
- `POST /api/books` — Create book (admin)
- `PATCH /api/books/:id` — Update book (admin)
- `DELETE /api/books/:id` — Soft-delete book (admin)
- `POST /api/books/:id/images` — Upload images (admin, multipart)
- `DELETE /api/books/:id/images/:imageId` — Delete image (admin)

### Orders (5)
- `POST /api/orders` — Place order (customer)
- `GET /api/orders` — All orders (admin)
- `GET /api/orders/my` — My orders (customer)
- `GET /api/orders/:id` — Get order (owner or admin)
- `PATCH /api/orders/:id/status` — Update status (admin)

### Reviews (4)
- `GET /api/reviews` — All reviews (admin, filterable by bookId)
- `POST /api/reviews/:bookId` — Create review (authenticated)
- `GET /api/reviews/:bookId` — Book reviews (public)
- `DELETE /api/reviews/:id` — Delete review (owner or admin)

## Caching

Book listing (`GET /api/books`) uses **node-cache** (in-memory) with a 60-second TTL. Cache is invalidated on any book create, update, or delete operation.

**Why node-cache:** Zero external dependencies, no Redis server needed, simple key-value store that fits the single-process use case.

## Security

- Passwords hashed with bcryptjs (configurable salt rounds)
- JWT authentication with expiring tokens
- Input sanitized against XSS via the `xss` library
- File uploads validated by magic bytes (not just extension)
- Uploaded files renamed to UUID to prevent path traversal
- All secrets loaded from environment variables
- `.env` excluded via `.gitignore`

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express 5
- **ORM:** Sequelize 6
- **Database:** MySQL / MariaDB
- **Auth:** JWT + bcryptjs
- **Cache:** node-cache
- **Upload:** multer
- **Sanitization:** xss
- **Testing:** Jest + Supertest
