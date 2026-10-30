const express = require('express');
const http = require('http');
const cors = require('cors');
const dotenv = require('dotenv');
const { Server } = require('socket.io');

const path = require('path');

// Load environment variables and validate production security
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config();
const validateEnv = require('./config/validateEnv');
validateEnv();

const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const setupSocket = require('./socket/socketHandler');
const { securityHeaders, noSqlSanitizer } = require('./middleware/security');
const { globalApiLimiter } = require('./middleware/rateLimiter');

// Route files
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const deliveryRoutes = require('./routes/deliveryRoutes');
const couponRoutes = require('./routes/couponRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const policyRoutes = require('./routes/policyRoutes');
const featureRoutes = require('./routes/featureRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');

// Connect to MongoDB
connectDB();

const app = express();
const server = http.createServer(app);

// Security: Disable X-Powered-By to prevent fingerprinting
app.disable('x-powered-by');

// Trust reverse proxy (Nginx, Docker, Cloudflare, AWS ALB) for accurate IP rate limiting
app.set('trust proxy', 1);

// Allowed origins for CORS (loaded dynamically from environment)
const customOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const envOrigins = [
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
  process.env.ADMIN_URL,
  ...(process.env.NODE_ENV !== 'production'
    ? [
        'http://localhost:5173',
        'http://localhost:3001',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
        'http://127.0.0.1:5173'
      ]
    : [])
].filter(Boolean);

const allowedOrigins = Array.from(new Set([...envOrigins, ...customOrigins]));

// Helper: Check if origin is allowed
const isAllowedOrigin = (origin) => {
  // Allow requests with no origin (e.g. reverse proxy Nginx forwarding, server-to-server, curl)
  if (!origin) return true;
  if (allowedOrigins.indexOf(origin) !== -1) return true;

  // Development testing helpers (LAN IPs & local dev tunnels)
  if (process.env.NODE_ENV !== 'production') {
    if (
      origin.includes('.trycloudflare.com') ||
      origin.includes('.loca.lt') ||
      origin.includes('.ngrok') ||
      origin.includes('.lhr.life')
    ) {
      return true;
    }
    const lanRegex = /^https?:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$/;
    if (lanRegex.test(origin)) return true;
    return true;
  }

  return false;
};

// Socket.io configuration
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Blocked by CORS policy'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true
  }
});

// Attach socket.io instance to Express app
app.set('io', io);

// Initialize Socket.io connection handlers
setupSocket(io);

// Express Middleware: Security HTTP Headers
app.use(securityHeaders);

// Express Middleware: CORS
app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Blocked by CORS policy'));
  },
  credentials: true
}));

// Serve uploaded product & review images statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Body parsing with payload size limits (10mb for image uploads)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// NoSQL Injection and Prototype Pollution Sanitizer
app.use(noSqlSanitizer);

// Request logger in development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
  });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Apurva Pizza Hub API is running healthy',
    timestamp: new Date().toISOString()
  });
});

// Global Rate Limiter applied to all API endpoints
app.use('/api', globalApiLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/delivery-settings', deliveryRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/payment-settings', paymentRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/features', featureRoutes);
app.use('/api/inventory', inventoryRoutes);

// Fallback for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API route not found: ${req.originalUrl}`
  });
});

// Centralized Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

if (!process.env.VERCEL) {
  const os = require('os');
  const getLocalIp = () => {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) {
          return net.address;
        }
      }
    }
    return '127.0.0.1';
  };
  const localIp = getLocalIp();

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(`🍕 Apurva Pizza Hub Server running on port: ${PORT}`);
    console.log(`📡 Socket.io server ready for real-time KDS events`);
    console.log(`🔗 Local: http://localhost:${PORT}/api`);
    console.log(`📱 LAN IP: http://${localIp}:${PORT}/api`);
    console.log(`====================================================`);
  });
}

// Background 60-second periodic shop status monitor (broadcasts when automatic schedule triggers open/close)
let lastAutoIsOpen = null;
setInterval(async () => {
  try {
    const DeliverySetting = require('./models/DeliverySetting');
    const { computeShopOpenStatus } = require('./controllers/deliveryController');
    const settings = await DeliverySetting.findOne();
    if (settings && settings.shopStatus?.openMode === 'auto') {
      const computed = computeShopOpenStatus(settings);
      if (lastAutoIsOpen !== null && lastAutoIsOpen !== computed.isOpen) {
        const io = app.get('io');
        if (io) {
          io.emit('shop:status_update', computed);
          console.log(`[Shop Status Engine] Automatic schedule transition: store is now ${computed.isOpen ? 'OPEN' : 'CLOSED'}`);
        }
      }
      lastAutoIsOpen = computed.isOpen;
    }
  } catch (err) {
    // Silent catch
  }
}, 60000);

// Graceful Shutdown & Unhandled Process Handlers
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 [Server] Received ${signal}. Starting graceful shutdown...`);
  server.close(async () => {
    console.log('✅ [Server] HTTP and Socket.io server closed.');
    try {
      const mongoose = require('mongoose');
      await mongoose.connection.close(false);
      console.log('✅ [MongoDB] Database connection closed cleanly.');
      process.exit(0);
    } catch (err) {
      console.error('❌ [Server] Error closing database connection:', err.message);
      process.exit(1);
    }
  });

  // Force shutdown after 10 seconds if hanging
  setTimeout(() => {
    console.error('⚠️ [Server] Forced termination after shutdown timeout.');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 [Server Unhandled Rejection]:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('💥 [Server Uncaught Exception]:', err.message);
  console.error(err.stack);
  gracefulShutdown('uncaughtException');
});

module.exports = app;

