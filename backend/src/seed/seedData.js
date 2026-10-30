const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Product = require('../models/Product');

dotenv.config();

const { getStaffCredentials } = require('../config/staffConfig');
const staff = getStaffCredentials();

const users = [
  {
    name: staff.admin.name,
    username: staff.admin.username,
    phone: staff.admin.phone,
    password: staff.admin.password,
    role: 'admin',
    address: 'Main Road Pathardewa (Murarchhapar Chauraha) Deoria'
  },
  {
    name: staff.kitchen.name,
    username: staff.kitchen.username,
    phone: staff.kitchen.phone,
    password: staff.kitchen.password,
    role: 'kitchen',
    address: 'Kitchen Counter, Apurva Pizza Hub'
  },
  ...(staff.driver?.username && staff.driver?.password ? [{
    name: staff.driver.name,
    username: staff.driver.username,
    phone: staff.driver.phone,
    password: staff.driver.password,
    role: 'driver',
    address: 'Delivery Partner Fleet, Pathardewa, Deoria'
  }] : []),
  ...((process.env.CUSTOMER_TEST_PASSWORD || process.env.NODE_ENV !== 'production') ? [{
    name: 'Customer Test',
    username: (process.env.CUSTOMER_TEST_USERNAME || 'customer_test').trim().toLowerCase(),
    phone: (process.env.CUSTOMER_TEST_PHONE || '9876543213').trim(),
    password: process.env.CUSTOMER_TEST_PASSWORD || 'Customer@Apurva2026!',
    role: 'customer',
    address: 'Main Road, Near Post Office, Pathardewa, Deoria'
  }] : [])
].filter(u => u.username && u.password);

const products = [
  // ==========================================
  // 1. BURGERS
  // ==========================================
  {
    name: 'Classic Veg Burger',
    category: 'Burgers',
    basePrice: 49,
    discountedPrice: 49,
    sizes: [],
    allowToppings: false,
    imageURL: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
    description: 'Crispy seasoned vegetable patty, fresh crunchy lettuce, and signature tangy mayo in a toasted sesame bun.',
    prepTime: '10 Mins',
    ingredients: 'Veg Patty, Sesame Bun, Lettuce, Creamy Mayo, Onion',
    dietary: '100% Pure Veg',
    highlights: [{ title: 'Best Value', icon: '⭐' }, { title: 'Crispy Patty', icon: '🍔' }],
    isAvailable: true
  },
  {
    name: 'Cheese Veg Burger',
    category: 'Burgers',
    basePrice: 59,
    discountedPrice: 59,
    sizes: [],
    allowToppings: false,
    imageURL: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80',
    description: 'Delicious golden vegetable patty layered with a slice of melted cheese, lettuce, and rich burger sauce.',
    prepTime: '10 Mins',
    ingredients: 'Veg Patty, Cheese Slice, Bun, Mayo, Lettuce',
    dietary: '100% Pure Veg',
    highlights: [{ title: 'Cheese Melt', icon: '🧀' }, { title: 'Chef Choice', icon: '👑' }],
    isAvailable: true
  },
  {
    name: 'Crispy Paneer Burger',
    category: 'Burgers',
    basePrice: 79,
    discountedPrice: 79,
    sizes: [],
    allowToppings: false,
    imageURL: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=800&q=80',
    description: 'Thick marinated cottage cheese block coated in crispy crumbs with spicy tandoori mayo and onions.',
    prepTime: '12 Mins',
    ingredients: 'Paneer Block, Crispy Crumb, Tandoori Mayo, Lettuce, Onion',
    dietary: '100% Pure Veg',
    highlights: [{ title: 'Paneer Loaded', icon: '🧈' }, { title: 'Spicy Kick', icon: '🔥' }],
    isAvailable: true
  },
  {
    name: 'Spicy Mexican Burger',
    category: 'Burgers',
    basePrice: 99,
    discountedPrice: 99,
    sizes: [],
    allowToppings: false,
    imageURL: 'https://images.unsplash.com/photo-1520072959219-c595dc870360?auto=format&fit=crop&w=800&q=80',
    description: 'Fiery Mexican salsa, jalapeno slices, cheese, and crisp veggie patty with zesty herb dressing.',
    prepTime: '12 Mins',
    ingredients: 'Veg Patty, Mexican Salsa, Jalapenos, Cheese Slice, Herb Mayo',
    dietary: '100% Pure Veg',
    highlights: [{ title: 'Mexican Salsa', icon: '🌮' }, { title: 'Extra Fiery', icon: '🌶️' }],
    isAvailable: true
  },

  // ==========================================
  // 2. SANDWICHES
  // ==========================================
  {
    name: 'Veg Grilled Sandwich',
    category: 'Sandwiches',
    basePrice: 69,
    discountedPrice: 69,
    sizes: [],
    allowToppings: false,
    imageURL: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=800&q=80',
    description: 'Fresh white bread stuffed with sliced cucumber, juicy tomato, onion, capsicum, and tangy mint chutney, toasted golden.',
    prepTime: '10 Mins',
    ingredients: 'Bread, Cucumber, Tomato, Capsicum, Onion, Mint Chutney, Butter',
    dietary: '100% Pure Veg',
    highlights: [{ title: 'Light & Crisp', icon: '🥪' }],
    isAvailable: true
  },
  {
    name: 'Cheese Grilled Sandwich',
    category: 'Sandwiches',
    basePrice: 89,
    discountedPrice: 89,
    sizes: [],
    allowToppings: false,
    imageURL: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80',
    description: 'Melted mozzarella and cheddar loaded between golden butter-toasted sandwich slices with fragrant Italian herbs.',
    prepTime: '10 Mins',
    ingredients: 'Mozzarella, Cheddar, Buttered Bread, Italian Seasoning',
    dietary: '100% Pure Veg',
    highlights: [{ title: 'Cheesy Delight', icon: '🧀' }],
    isAvailable: true
  },
  {
    name: 'Paneer Tikka Sandwich',
    category: 'Sandwiches',
    basePrice: 110,
    discountedPrice: 110,
    sizes: [],
    allowToppings: false,
    imageURL: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=800&q=80',
    description: 'Smoky spiced paneer tikka chunks with crunchy onions and tangy tandoori sauce grilled crisp.',
    prepTime: '12 Mins',
    ingredients: 'Marinated Paneer Tikka, Onion, Capsicum, Tandoori Sauce, Butter',
    dietary: '100% Pure Veg',
    highlights: [{ title: 'Tandoori Smoky', icon: '🔥' }, { title: 'Paneer Loaded', icon: '🧈' }],
    isAvailable: true
  },
  {
    name: 'Corn & Cheese Sandwich',
    category: 'Sandwiches',
    basePrice: 129,
    discountedPrice: 129,
    sizes: [],
    allowToppings: false,
    imageURL: 'https://images.unsplash.com/photo-1619860860774-1e2e17343432?auto=format&fit=crop&w=800&q=80',
    description: 'Sweet golden American corn kernels combined with molten mozzarella and herb-infused garlic cream.',
    prepTime: '10 Mins',
    ingredients: 'Sweet Corn, Mozzarella, Cream Cheese, Garlic Butter, Herbs',
    dietary: '100% Pure Veg',
    highlights: [{ title: 'Sweet & Cheesy', icon: '🌽' }],
    isAvailable: true
  },

  // ==========================================
  // 3. MOMOS
  // ==========================================
  {
    name: 'Veg Steamed Momos',
    category: 'Momos',
    basePrice: 49,
    discountedPrice: 49,
    sizes: [],
    allowToppings: false,
    imageURL: 'https://images.unsplash.com/photo-1625220194771-7ebdea0b70b9?auto=format&fit=crop&w=800&q=80',
    description: 'Authentic Himalayan dumplings stuffed with freshly shredded cabbage, carrots, onions, and aromatic ginger-garlic. Served with spicy red chili dip.',
    prepTime: '12 Mins',
    ingredients: 'Cabbage, Carrot, Onion, Ginger, Garlic, Red Chili Dip',
    dietary: '100% Pure Veg',
    highlights: [{ title: 'Fresh Steamed', icon: '🥟' }, { title: 'Fiery Dip', icon: '🌶️' }],
    isAvailable: true
  },
  {
    name: 'Veg Fried Momos',
    category: 'Momos',
    basePrice: 59,
    discountedPrice: 59,
    sizes: [],
    allowToppings: false,
    imageURL: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=800&q=80',
    description: 'Crispy deep-fried golden dumplings with seasoned vegetable filling. Served with fiery chili sauce and creamy dip.',
    prepTime: '12 Mins',
    ingredients: 'Fried Dumplings, Veg Filling, Red Chutney, Cream Mayo',
    dietary: '100% Pure Veg',
    highlights: [{ title: 'Super Crunchy', icon: '✨' }],
    isAvailable: true
  },
  {
    name: 'Paneer Momos',
    category: 'Momos',
    basePrice: 79,
    discountedPrice: 79,
    sizes: [],
    allowToppings: false,
    imageURL: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?auto=format&fit=crop&w=800&q=80',
    description: 'Handcrafted dumplings packed with spiced cottage cheese, coriander, and mild herbs. Steamed or fried on request.',
    prepTime: '12 Mins',
    ingredients: 'Fresh Paneer, Coriander, Herbs, Spicy Dip',
    dietary: '100% Pure Veg',
    highlights: [{ title: 'Rich Paneer', icon: '🧈' }],
    isAvailable: true
  },
  {
    name: 'Cheese Momos',
    category: 'Momos',
    basePrice: 89,
    discountedPrice: 89,
    sizes: [],
    allowToppings: false,
    imageURL: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=800&q=80',
    description: 'Gourmet momos filled with hot molten cheese, sweet corn, and Italian herbs.',
    prepTime: '12 Mins',
    ingredients: 'Mozzarella, Sweet Corn, Oregano, Spicy Dip',
    dietary: '100% Pure Veg',
    highlights: [{ title: 'Cheese Burst', icon: '🧀' }],
    isAvailable: true
  },

  // ==========================================
  // 4. FRENCH FRIES
  // ==========================================
  {
    name: 'Classic French Fries',
    category: 'French Fries',
    basePrice: 39,
    discountedPrice: 39,
    sizes: [],
    allowToppings: false,
    imageURL: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=800&q=80',
    description: 'Golden crispy salted potato fries, fluffy on the inside and crunchy outside.',
    prepTime: '8 Mins',
    ingredients: 'Premium Potatoes, Sea Salt, Vegetable Oil',
    dietary: '100% Pure Veg',
    highlights: [{ title: 'Crispy & Salted', icon: '🍟' }],
    isAvailable: true
  },
  {
    name: 'Peri Peri French Fries',
    category: 'French Fries',
    basePrice: 59,
    discountedPrice: 59,
    sizes: [],
    allowToppings: false,
    imageURL: 'https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?auto=format&fit=crop&w=800&q=80',
    description: 'Hot and crispy golden fries tossed vigorously in aromatic African peri-peri chili mix.',
    prepTime: '8 Mins',
    ingredients: 'Potatoes, Peri-Peri Seasoning, Chili Herbs',
    dietary: '100% Pure Veg',
    highlights: [{ title: 'Spicy Peri Peri', icon: '🌶️' }, { title: 'Bestseller', icon: '🔥' }],
    isAvailable: true
  },
  {
    name: 'Cheesy Fries',
    category: 'French Fries',
    basePrice: 79,
    discountedPrice: 79,
    sizes: [],
    allowToppings: false,
    imageURL: 'https://images.unsplash.com/photo-1585109649139-366815a0d713?auto=format&fit=crop&w=800&q=80',
    description: 'Crispy golden fries smothered in warm velvety cheese sauce and shredded mozzarella.',
    prepTime: '8 Mins',
    ingredients: 'Potatoes, Warm Cheese Sauce, Mozzarella, Herbs',
    dietary: '100% Pure Veg',
    highlights: [{ title: 'Loaded Cheese', icon: '🧀' }],
    isAvailable: true
  },
  {
    name: 'Masala Fries',
    category: 'French Fries',
    basePrice: 49,
    discountedPrice: 49,
    sizes: [],
    allowToppings: false,
    imageURL: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=800&q=80',
    description: 'Crispy potato finger chips tossed in tangy Indian chaat masala, cumin, and spicy herbs.',
    prepTime: '8 Mins',
    ingredients: 'Potatoes, Desi Chaat Masala, Roasted Cumin, Lemon Zest',
    dietary: '100% Pure Veg',
    highlights: [{ title: 'Desi Tadka', icon: '✨' }],
    isAvailable: true
  },

  // ==========================================
  // 5. PASTA
  // ==========================================
  {
    name: 'White Sauce Pasta',
    category: 'Pasta',
    basePrice: 110,
    discountedPrice: 110,
    sizes: [],
    allowToppings: false,
    imageURL: 'https://images.unsplash.com/photo-1621996346565-e3d5d6281691?auto=format&fit=crop&w=800&q=80',
    description: 'Penne pasta tossed in rich, velvety garlic Alfredo cream sauce with sweet corn, crisp capsicum, and Italian herbs.',
    prepTime: '15 Mins',
    ingredients: 'Durum Wheat Penne, Fresh Cream, Mozzarella, Butter, Garlic, Corn, Capsicum',
    dietary: '100% Pure Veg',
    highlights: [{ title: 'Creamy Alfredo', icon: '🍝' }, { title: 'Chef Special', icon: '👑' }],
    isAvailable: true
  },
  {
    name: 'Red Sauce Pasta',
    category: 'Pasta',
    basePrice: 100,
    discountedPrice: 100,
    sizes: [],
    allowToppings: false,
    imageURL: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=800&q=80',
    description: 'Penne pasta simmered in tangy, spiced San Marzano tomato marinara sauce with basil, garlic, and fresh vegetables.',
    prepTime: '15 Mins',
    ingredients: 'Durum Wheat Penne, Tomato Basil Sauce, Garlic, Capsicum, Onion, Herbs',
    dietary: '100% Pure Veg',
    highlights: [{ title: 'Zesty Marinara', icon: '🍅' }],
    isAvailable: true
  },

  // ==========================================
  // 6. CAKE
  // ==========================================
  {
    name: 'Chocolate Cake',
    category: 'Cake',
    basePrice: 69,
    discountedPrice: 69,
    sizes: [],
    allowToppings: false,
    imageURL: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80',
    description: 'Decadent moist chocolate sponge layered with rich dark chocolate truffle ganache.',
    prepTime: '5 Mins',
    ingredients: 'Dark Chocolate, Cocoa, Whipped Truffle Ganache, Vanilla',
    dietary: '100% Pure Veg',
    highlights: [{ title: 'Pure Chocolate', icon: '🍫' }],
    isAvailable: true
  },
  {
    name: 'Black Forest Cake',
    category: 'Cake',
    basePrice: 69,
    discountedPrice: 69,
    sizes: [],
    allowToppings: false,
    imageURL: 'https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62?auto=format&fit=crop&w=800&q=80',
    description: 'Classic layers of chocolate sponge soaked with cherry syrup, topped with fluffy whipped cream and chocolate curls.',
    prepTime: '5 Mins',
    ingredients: 'Chocolate Sponge, Whipped Cream, Cherry Glaze, Chocolate Curls',
    dietary: '100% Pure Veg',
    highlights: [{ title: 'Classic Delight', icon: '🍒' }],
    isAvailable: true
  },
  {
    name: 'Red Velvet Cake',
    category: 'Cake',
    basePrice: 79,
    discountedPrice: 79,
    sizes: [],
    allowToppings: false,
    imageURL: 'https://images.unsplash.com/photo-1616541823729-00fe0aacd32c?auto=format&fit=crop&w=800&q=80',
    description: 'Vibrant crimson velvet sponge layered with smooth vanilla cream cheese frosting.',
    prepTime: '5 Mins',
    ingredients: 'Crimson Velvet Sponge, Cream Cheese Frosting, Vanilla',
    dietary: '100% Pure Veg',
    highlights: [{ title: 'Velvet Soft', icon: '🍰' }],
    isAvailable: true
  },
  {
    name: 'Butterscotch Cake',
    category: 'Cake',
    basePrice: 69,
    discountedPrice: 69,
    sizes: [],
    allowToppings: false,
    imageURL: 'https://images.unsplash.com/photo-1535141192574-5d4897c13136?auto=format&fit=crop&w=800&q=80',
    description: 'Light vanilla sponge enriched with butterscotch cream and crunchy caramelized praline nuts.',
    prepTime: '5 Mins',
    ingredients: 'Vanilla Sponge, Butterscotch Cream, Caramel Crunch, Praline',
    dietary: '100% Pure Veg',
    highlights: [{ title: 'Crunchy Praline', icon: '🍬' }],
    isAvailable: true
  },

  // ==========================================
  // 7. SIDE ORDER
  // ==========================================
  {
    name: 'Garlic Bread',
    category: 'Sides',
    basePrice: 89,
    discountedPrice: 89,
    sizes: [],
    allowToppings: false,
    imageURL: 'https://images.unsplash.com/photo-1573140401552-3fab0b24306f?auto=format&fit=crop&w=800&q=80',
    description: 'Freshly baked artisan bread brushed with fragrant roasted garlic herb butter.',
    prepTime: '10 Mins',
    ingredients: 'Fresh Dough, Roasted Garlic, Herb Butter, Oregano',
    dietary: '100% Pure Veg',
    highlights: [{ title: 'Garlic Butter', icon: '🥖' }],
    isAvailable: true
  },
  {
    name: 'Cheese Garlic Bread',
    category: 'Sides',
    basePrice: 109,
    discountedPrice: 109,
    sizes: [],
    allowToppings: false,
    imageURL: 'https://images.unsplash.com/photo-1619860860774-1e2e17343432?auto=format&fit=crop&w=800&q=80',
    description: 'Signature roasted garlic bread smothered with 100% real melted mozzarella cheese.',
    prepTime: '10 Mins',
    ingredients: 'Fresh Dough, Garlic Butter, Mozzarella Cheese',
    dietary: '100% Pure Veg',
    highlights: [{ title: 'Extra Cheesy', icon: '🧀' }, { title: 'Bestseller', icon: '⭐' }],
    isAvailable: true
  },
  {
    name: 'Peri Peri Garlic Bread',
    category: 'Sides',
    basePrice: 119,
    discountedPrice: 119,
    sizes: [],
    allowToppings: false,
    imageURL: 'https://images.unsplash.com/photo-1556008531-57e6eefc7be4?auto=format&fit=crop&w=800&q=80',
    description: 'Garlic bread topped with gooey cheese and dusted with fiery peri-peri seasoning.',
    prepTime: '10 Mins',
    ingredients: 'Garlic Bread, Mozzarella, Peri-Peri Seasoning',
    dietary: '100% Pure Veg',
    highlights: [{ title: 'Spicy Peri Peri', icon: '🌶️' }],
    isAvailable: true
  },
  {
    name: 'Stuffed Garlic Bread',
    category: 'Sides',
    basePrice: 149,
    discountedPrice: 149,
    sizes: [],
    allowToppings: false,
    imageURL: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=800&q=80',
    description: 'Freshly baked calzone pocket stuffed with mozzarella cheese, sweet corn, and spicy jalapenos with garlic butter glaze.',
    prepTime: '12 Mins',
    ingredients: 'Artisan Dough, Mozzarella, Sweet Corn, Jalapenos, Garlic Butter',
    dietary: '100% Pure Veg',
    highlights: [{ title: 'Stuffed Pocket', icon: '🥐' }, { title: 'Chef Special', icon: '👑' }],
    isAvailable: true
  },

  // ==========================================
  // 8. VEG PIZZAS
  // ==========================================
  // Simple Veg
  {
    name: 'Fresh Veggie Pizza',
    category: 'Pizzas',
    basePrice: 99,
    discountedPrice: 99,
    sizes: [
      { size: 'S: 6"', price: 99, discountedPrice: 99 },
      { size: 'M: 9"', price: 149, discountedPrice: 149 },
      { size: 'L: 11"', price: 249, discountedPrice: 249 }
    ],
    allowToppings: true,
    imageURL: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
    description: 'Simple Veg delight topped with cheese, signature pizza sauce, and crisp crunchy onions.',
    prepTime: '15 Mins',
    ingredients: 'Cheese + Pizza Sauce + Onion',
    dietary: '100% Pure Veg',
    highlights: [{ title: 'Simple Veg', icon: '🌱' }, { title: 'Starting ₹99', icon: '🏷️' }],
    isAvailable: true
  },
  {
    name: 'Cheese Corn Pizza',
    category: 'Pizzas',
    basePrice: 99,
    discountedPrice: 99,
    sizes: [
      { size: 'S: 6"', price: 99, discountedPrice: 99 },
      { size: 'M: 9"', price: 159, discountedPrice: 159 },
      { size: 'L: 11"', price: 259, discountedPrice: 259 }
    ],
    allowToppings: true,
    imageURL: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=80',
    description: 'Golden sweet corn kernels on a rich layer of pizza sauce and gooey mozzarella cheese.',
    prepTime: '15 Mins',
    ingredients: 'Pizza Sauce, Cheese, Corn',
    dietary: '100% Pure Veg',
    highlights: [{ title: 'Sweet Corn', icon: '🌽' }, { title: 'Starting ₹99', icon: '🏷️' }],
    isAvailable: true
  },

  // Veg - 1
  {
    name: 'Tandoori Paneer Pizza',
    category: 'Pizzas',
    basePrice: 149,
    discountedPrice: 149,
    sizes: [
      { size: 'S: 6"', price: 149, discountedPrice: 149 },
      { size: 'M: 9"', price: 189, discountedPrice: 189 },
      { size: 'L: 11"', price: 299, discountedPrice: 299 }
    ],
    allowToppings: true,
    imageURL: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80',
    description: 'Tandoori spiced cottage cheese chunks with crunchy capsicum, red paprika, and extra cheese.',
    prepTime: '18 Mins',
    ingredients: 'Capsicum, Red pepper, Paneer, Extra Cheese',
    dietary: '100% Pure Veg',
    highlights: [{ title: 'Tandoori Paneer', icon: '🧈' }, { title: 'Bestseller', icon: '⭐' }],
    isAvailable: true
  },
  {
    name: 'Mexican, Green, Redpaper Pizza',
    category: 'Pizzas',
    basePrice: 149,
    discountedPrice: 149,
    sizes: [
      { size: 'S: 6"', price: 149, discountedPrice: 149 },
      { size: 'M: 9"', price: 279, discountedPrice: 279 },
      { size: 'L: 11"', price: 379, discountedPrice: 379 }
    ],
    allowToppings: true,
    imageURL: 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?auto=format&fit=crop&w=800&q=80',
    description: 'Zesty Mexican herb sauce topped with juicy tomatoes, green capsicum, and spicy jalapenos.',
    prepTime: '18 Mins',
    ingredients: 'Tomato, Capsicum, Jalapeno',
    dietary: '100% Pure Veg',
    highlights: [{ title: 'Mexican Fiesta', icon: '🌶️' }],
    isAvailable: true
  },
  {
    name: 'Double Cheese Margherita Pizza',
    category: 'Pizzas',
    basePrice: 149,
    discountedPrice: 149,
    sizes: [
      { size: 'S: 6"', price: 149, discountedPrice: 149 },
      { size: 'M: 9"', price: 279, discountedPrice: 279 },
      { size: 'L: 11"', price: 379, discountedPrice: 379 }
    ],
    allowToppings: true,
    imageURL: 'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?auto=format&fit=crop&w=800&q=80',
    description: 'Classic golden crust brushed with garlic butter and loaded with double layer mozzarella.',
    prepTime: '15 Mins',
    ingredients: 'Garlic Butter, With Extra Cheese, Basil',
    dietary: '100% Pure Veg',
    highlights: [{ title: 'Extra Cheese', icon: '🧀' }, { title: 'Garlic Butter', icon: '🧄' }],
    isAvailable: true
  },
  {
    name: 'Farm House Pizza',
    category: 'Pizzas',
    basePrice: 149,
    discountedPrice: 149,
    sizes: [
      { size: 'S: 6"', price: 149, discountedPrice: 149 },
      { size: 'M: 9"', price: 279, discountedPrice: 279 },
      { size: 'L: 11"', price: 379, discountedPrice: 379 }
    ],
    allowToppings: true,
    imageURL: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
    description: 'Farm fresh onions, green capsicum, juicy tomatoes, and tender earthy mushrooms on melted cheese.',
    prepTime: '18 Mins',
    ingredients: 'Onion, Capsicum, Tomato, Mushroom',
    dietary: '100% Pure Veg',
    highlights: [{ title: 'Fresh Mushrooms', icon: '🍄' }, { title: 'Customer Favorite', icon: '❤️' }],
    isAvailable: true
  },

  // Veg - 2
  {
    name: 'Veg Paradise Pizza',
    category: 'Pizzas',
    basePrice: 159,
    discountedPrice: 159,
    sizes: [
      { size: 'S: 6"', price: 159, discountedPrice: 159 },
      { size: 'M: 9"', price: 309, discountedPrice: 309 },
      { size: 'L: 11"', price: 419, discountedPrice: 419 }
    ],
    allowToppings: true,
    imageURL: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=80',
    description: 'A colorful garden of crunchy capsicum, red paprika, black Spanish olives, and sweet corn.',
    prepTime: '18 Mins',
    ingredients: 'Capsicum, Red Pepper, Black Olive, Corn',
    dietary: '100% Pure Veg',
    highlights: [{ title: 'Black Olives', icon: '🫒' }, { title: 'Gourmet Veg', icon: '✨' }],
    isAvailable: true
  },
  {
    name: 'Makhani Paneer Pizza',
    category: 'Pizzas',
    basePrice: 169,
    discountedPrice: 169,
    sizes: [
      { size: 'S: 6"', price: 169, discountedPrice: 169 },
      { size: 'M: 9"', price: 309, discountedPrice: 309 },
      { size: 'L: 11"', price: 419, discountedPrice: 419 }
    ],
    allowToppings: true,
    imageURL: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80',
    description: 'Royal Indian Makhani gravy base topped with marinated paneer, sweet corn, and mozzarella cheese.',
    prepTime: '18 Mins',
    ingredients: 'Corn + Mozzarella Cheese + Makhani Sauce + Paneer',
    dietary: '100% Pure Veg',
    highlights: [{ title: 'Royal Makhani', icon: '👑' }, { title: 'Paneer Chunks', icon: '🧈' }],
    isAvailable: true
  },
  {
    name: 'Spicy Veg Pizza',
    category: 'Pizzas',
    basePrice: 169,
    discountedPrice: 169,
    sizes: [
      { size: 'S: 6"', price: 169, discountedPrice: 169 },
      { size: 'M: 9"', price: 309, discountedPrice: 309 },
      { size: 'L: 11"', price: 419, discountedPrice: 419 }
    ],
    allowToppings: true,
    imageURL: 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?auto=format&fit=crop&w=800&q=80',
    description: 'Hot and fiery pizza loaded with jalapeno slices, crisp onions, red paprika, and capsicum.',
    prepTime: '18 Mins',
    ingredients: 'Jalapeno, Onion, Red Pepper, Capsicum',
    dietary: '100% Pure Veg',
    highlights: [{ title: 'Extra Hot', icon: '🌶️' }],
    isAvailable: true
  },

  // Veg - 3
  {
    name: 'Schezwan Veg Pizza',
    category: 'Pizzas',
    basePrice: 189,
    discountedPrice: 189,
    sizes: [
      { size: 'S: 6"', price: 189, discountedPrice: 189 },
      { size: 'M: 9"', price: 369, discountedPrice: 369 },
      { size: 'L: 11"', price: 449, discountedPrice: 449 }
    ],
    allowToppings: true,
    imageURL: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80',
    description: 'Fiery Schezwan sauce base, succulent paneer cubes, black olives, jalapenos, and crisp peppers.',
    prepTime: '20 Mins',
    ingredients: 'Schezwan Sauce, Black Olive, Capsicum, Jalapeno, Red Pepper, Paneer',
    dietary: '100% Pure Veg',
    highlights: [{ title: 'Schezwan Fusion', icon: '🥢' }, { title: 'Paneer & Olives', icon: '🫒' }],
    isAvailable: true
  },
  {
    name: 'Veg Extra Vaganza Pizza',
    category: 'Pizzas',
    basePrice: 199,
    discountedPrice: 199,
    sizes: [
      { size: 'S: 6"', price: 199, discountedPrice: 199 },
      { size: 'M: 9"', price: 389, discountedPrice: 389 },
      { size: 'L: 11"', price: 499, discountedPrice: 499 }
    ],
    allowToppings: true,
    imageURL: 'https://images.unsplash.com/photo-1594007654729-407eedc4be65?auto=format&fit=crop&w=800&q=80',
    description: 'The ultimate overloaded feast with 7 gourmet veggies and extra mozzarella cheese.',
    prepTime: '20 Mins',
    ingredients: 'Onion, Capsicum, Tomato, Mushroom, Jalapeno, Black Olive, Corn, Extra Cheese',
    dietary: '100% Pure Veg',
    highlights: [{ title: '7 Toppings Overload', icon: '👑' }, { title: 'Extra Cheesy', icon: '🧀' }],
    isAvailable: true
  },

  // ==========================================
  // 9. COMBO OFFER'S (T & C Apply)
  // ==========================================
  {
    name: 'Combo Only - 199',
    category: 'Combos',
    basePrice: 199,
    discountedPrice: 199,
    sizes: [],
    allowToppings: false,
    imageURL: 'https://images.unsplash.com/photo-1594007654729-407eedc4be65?auto=format&fit=crop&w=800&q=80',
    description: 'Classic Burger - 1, French Fries - 1, Love & Corn Pizza - 1, Chilled Coke - 1.',
    prepTime: '15 Mins',
    ingredients: 'Classic Burger, French Fries, Love & Corn Pizza, Coke',
    dietary: '100% Pure Veg',
    highlights: [{ title: 'Only ₹199', icon: '🔥' }, { title: '4-in-1 Value', icon: '🎁' }],
    isAvailable: true
  },
  {
    name: 'Combo Only - 249',
    category: 'Combos',
    basePrice: 249,
    discountedPrice: 249,
    sizes: [],
    allowToppings: false,
    imageURL: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
    description: 'Tandoori Paneer Pizza - 1, Peri Peri Burger - 1, Sandwich - 1, Chilled Coke - 1.',
    prepTime: '18 Mins',
    ingredients: 'Tandoori Paneer Pizza, Peri Peri Burger, Sandwich, Coke',
    dietary: '100% Pure Veg',
    highlights: [{ title: 'Only ₹249', icon: '🔥' }, { title: 'Pizza & Burger', icon: '🍕' }],
    isAvailable: true
  },
  {
    name: 'Combo Only - 349',
    category: 'Combos',
    basePrice: 349,
    discountedPrice: 349,
    sizes: [],
    allowToppings: false,
    imageURL: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80',
    description: 'Stuff Garlic Bread - 1, White Sauce Pasta - 1, Paneer Roll - 1, Paneer Burger - 1.',
    prepTime: '20 Mins',
    ingredients: 'Stuff Garlic Bread, White Sauce Pasta, Paneer Roll, Paneer Burger',
    dietary: '100% Pure Veg',
    highlights: [{ title: 'Only ₹349', icon: '🔥' }, { title: 'Mega Feast', icon: '👑' }],
    isAvailable: true
  },

  // ==========================================
  // 10. BEVERAGES
  // ==========================================
  {
    name: 'Chilled Coca-Cola',
    category: 'Beverages',
    basePrice: 40,
    discountedPrice: 40,
    sizes: [],
    allowToppings: false,
    imageURL: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=800&q=80',
    description: 'Refreshing ice-cold carbonated beverage to complement your hot pizzas and burgers.',
    prepTime: '2 Mins',
    ingredients: 'Carbonated Water, Sugar, Caramel, Natural Flavors',
    dietary: '100% Pure Veg',
    highlights: [{ title: 'Ice Cold', icon: '🥤' }],
    isAvailable: true
  }
];

const seedDatabase = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/apurva_pizza_hub';
    console.log(`Connecting to MongoDB at: ${mongoUri}...`);
    await mongoose.connect(mongoUri);

    console.log('Clearing existing users and products...');
    await User.deleteMany({});
    await Product.deleteMany({});

    console.log('Seeding users...');
    for (const u of users) {
      await User.create(u);
    }
    console.log(`Created ${users.length} users successfully!`);

    console.log('Seeding products...');
    await Product.insertMany(products);
    console.log(`Created ${products.length} products successfully!`);

    console.log('\nSeeding completed successfully!');
    if (require.main === module) {
      process.exit(0);
    }
  } catch (error) {
    console.error('Seeding failed:', error);
    if (require.main === module) {
      process.exit(1);
    }
  }
};

if (require.main === module) {
  seedDatabase();
}

module.exports = {
  users,
  products,
  seedDatabase
};
