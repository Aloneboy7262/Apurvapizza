# Apurva Pizza Hub - Backend API & Real-Time Server

Production-ready backend for Apurva Pizza Hub built with Node.js, Express.js, MongoDB (Mongoose), Socket.io, and JWT.

## Features
- **Authentication**: JWT-based authentication with bcrypt password hashing. Roles supported: `customer`, `admin`, `kitchen`.
- **Product Management**: Full CRUD REST APIs for menu items with size variations (`S: 6"`, `M: 9"`, `L: 11"`), discounted pricing, toppings allowance, and categories.
- **Order Management**: Order placement, auto-total calculation, order history, status lifecycle (`Pending` -> `Preparing` -> `Ready` -> `Delivered`).
- **Real-Time Kitchen Display System (KDS)**: Socket.io broadcasting `new_order` and `order_status_updated` events instantly to kitchen staff and admin dashboards.
- **Data Seeding**: Instant menu and user population with `npm run seed`.

---

## Directory Structure
```
backend/
├── src/
│   ├── config/
│   │   └── db.js                 # MongoDB connection & reconnection handler
│   ├── controllers/
│   │   ├── authController.js     # Register, login, me, profile update
│   │   ├── productController.js  # CRUD operations for menu products
│   │   └── orderController.js    # Order creation, history, status updates & socket events
│   ├── middleware/
│   │   ├── auth.js               # JWT verification & role-based authorization
│   │   └── errorHandler.js       # Centralized error handler with Mongoose error mapping
│   ├── models/
│   │   ├── User.js               # User schema (name, phone, password, role, address)
│   │   ├── Product.js            # Product schema (sizes, basePrice, discountedPrice, allowToppings)
│   │   └── Order.js              # Order schema (user, items, totalAmount, status, customerNote)
│   ├── routes/
│   │   ├── authRoutes.js         # /api/auth
│   │   ├── productRoutes.js      # /api/products
│   │   └── orderRoutes.js        # /api/orders
│   ├── seed/
│   │   └── seedData.js           # Sample users & authentic menu seeder
│   ├── socket/
│   │   └── socketHandler.js      # Socket.io room handlers & connection lifecycle
│   └── server.js                 # Main entry point with Express & Socket.io
├── .env.example
├── .env
└── package.json
```

---

## Environment Variables (`.env`)
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/apurva_pizza_hub
JWT_SECRET=apurva_pizza_hub_super_secret_jwt_key_2026_secure
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

---

## API Endpoints

### 1. Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register new customer (`name`, `phone`, `password`, `address`) |
| `POST` | `/api/auth/login` | Public | Login with `phone` & `password` |
| `GET` | `/api/auth/me` | Protected | Get authenticated user profile |
| `PUT` | `/api/auth/profile` | Protected | Update `name` or `address` |

### 2. Products (`/api/products`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/products` | Public | Get all products (query: `category`, `search`) |
| `GET` | `/api/products/:id` | Public | Get single product by ID |
| `POST` | `/api/products` | Admin | Create new product |
| `PUT` | `/api/products/:id` | Admin | Update existing product |
| `DELETE` | `/api/products/:id` | Admin | Delete product |

### 3. Orders (`/api/orders`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/orders` | Customer / Admin | Place new order (Emits `new_order` event via Socket.io) |
| `GET` | `/api/orders/my-orders` | Customer | Get customer's order history |
| `GET` | `/api/orders` | Admin / Kitchen | Get all orders (query: `status`, `date=today`) |
| `GET` | `/api/orders/:id` | Authenticated | Get order details |
| `PATCH`| `/api/orders/:id/status`| Admin / Kitchen | Update status (`Pending` -> `Preparing` -> `Ready` -> `Delivered`) (Emits `order_status_updated`) |
| `DELETE`| `/api/orders/:id` | Admin | Delete order record |

---

## Real-Time Socket.io Events

- **`new_order`** (Server -> Client):
  Triggered when an order is created. Receives the full populated order object. Handled by Kitchen Display System and Admin.
- **`order_status_updated`** (Server -> Client):
  Triggered when kitchen or admin changes status. Contains `{ orderId, status, order }`.
- **Rooms**:
  - `join_kitchen`: Kitchen display screen joins this room for incoming orders.
  - `join_admin`: Admin dashboard joins this room for live order feed.
  - `join_order`: Customer tracks their specific `orderId`.

---

## Seed Accounts
Run `npm run seed` to load initial product catalogue and staff accounts.
You can configure production credentials in `.env`:
- `ADMIN_PHONE` / `ADMIN_PASSWORD`
- `KITCHEN_PHONE` / `KITCHEN_PASSWORD`
- `CUSTOMER_PHONE` / `CUSTOMER_PASSWORD`
