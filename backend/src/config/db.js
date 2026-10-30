const mongoose = require('mongoose');

const autoSeedIfEmpty = async () => {
  try {
    const Product = require('../models/Product');
    const User = require('../models/User');
    const { users, products } = require('../seed/seedData');

    const count = await Product.countDocuments();
    if (count < 30) {
      console.log(`[MongoDB] Seeding authentic restaurant menu (${products.length} items)...`);
      await Product.deleteMany({});
      await Product.insertMany(products);
      console.log(`[MongoDB] All ${products.length} menu items seeded successfully!`);
    }

    for (const u of users) {
      const query = [];
      if (u.username) query.push({ username: u.username });
      if (u.phone) query.push({ phone: u.phone });
      let existing = query.length > 0 ? await User.findOne({ $or: query }) : null;
      if (!existing) {
        await User.create(u);
        console.log(`[MongoDB] Seeded user '${u.username || u.phone}' (${u.role})`);
      } else {
        // Security: Preserve user's existing password unless explicit reset flag is provided in environment
        if (process.env.RESET_STAFF_PASSWORDS === 'true') {
          existing.password = u.password;
        }
        existing.role = u.role;
        if (u.name && !existing.name) existing.name = u.name;
        if (u.phone && !existing.phone) existing.phone = u.phone;
        if (u.username && !existing.username) existing.username = u.username;
        await existing.save();
      }
    }

    const DeliverySetting = require('../models/DeliverySetting');
    const settings = await DeliverySetting.getOrCreateSettings();
    settings.max_delivery_radius_km = 5.0;
    settings.notDeliverableMessage = "We will be available in your area soon";
    settings.not_deliverable_message = "We will be available in your area soon";
    if (!settings.cancellationSettings) {
      settings.cancellationSettings = {
        isCancellationAllowed: true,
        cancellationAllowedUntil: 'Pending',
        disallowedMessage: 'Order cannot be cancelled because it is already being prepared or is out for delivery.'
      };
    }
    await settings.save();
    console.log('[MongoDB] Staff users and DeliverySettings verified successfully!');
  } catch (err) {
    console.warn('[MongoDB] Auto-seed warning:', err.message);
  }
};

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/apurva_pizza_hub';
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2000,
    });
    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}/${conn.connection.name}`);
    await autoSeedIfEmpty();
  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      console.error(`[MongoDB Critical Error] Failed to connect to MongoDB in production: ${error.message}`);
      console.error(`[MongoDB] In-memory database fallback is disabled in production to protect data persistence.`);
      return;
    }
    console.warn(`[MongoDB] Local MongoDB connection failed (${error.message}). Attempting development in-memory MongoDB fallback...`);
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      if (!global.__mongoMemoryServerInstance) {
        global.__mongoMemoryServerInstance = await MongoMemoryServer.create({
          instance: {
            dbName: 'apurva_pizza_hub'
          }
        });
      }
      const memUri = global.__mongoMemoryServerInstance.getUri();
      const conn = await mongoose.connect(memUri);
      console.log(`[MongoDB] Connected to Development In-Memory MongoDB: ${memUri}`);
      await autoSeedIfEmpty();
    } catch (memError) {
      console.error(`[MongoDB] In-memory MongoDB failed: ${memError.message}`);
      console.warn('[MongoDB] Server will continue running, but database operations will fail until MongoDB is available.');
    }
  }
};

module.exports = connectDB;
