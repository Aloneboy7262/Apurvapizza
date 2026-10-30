const mongoose = require('mongoose');

const sizeSchema = new mongoose.Schema(
  {
    size: {
      type: String,
      required: true,
      trim: true // e.g., "S: 6\"", "M: 9\"", "L: 11\""
    },
    price: {
      type: Number,
      required: true,
      min: [0, 'Price cannot be negative']
    },
    discountedPrice: {
      type: Number,
      default: null,
      min: [0, 'Discounted price cannot be negative']
    }
  },
  { _id: false }
);

const highlightSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, required: true },
    description: { type: String, trim: true, default: '' },
    icon: { type: String, default: '✨' }
  },
  { _id: false }
);

const reviewSchema = new mongoose.Schema(
  {
    userName: {
      type: String,
      required: [true, 'Please provide your name'],
      trim: true
    },
    userEmail: {
      type: String,
      trim: true,
      default: ''
    },
    rating: {
      type: Number,
      required: [true, 'Please select a rating between 1 and 5'],
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      required: [true, 'Please provide review comment'],
      trim: true
    },
    imageURL: {
      type: String,
      trim: true,
      default: ''
    },
    adminReply: {
      comment: { type: String, trim: true, default: '' },
      repliedAt: { type: Date, default: null },
      repliedBy: { type: String, trim: true, default: 'Apurva Management' }
    }
  },
  { timestamps: true }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide product name'],
      trim: true
    },
    category: {
      type: String,
      required: [true, 'Please provide category'],
      trim: true,
      enum: [
        'Pizzas',
        'Burgers',
        'Sandwiches',
        'Momos',
        'French Fries',
        'Pasta',
        'Cake',
        'Sides',
        'Combos',
        'Beverages',
        'Desserts'
      ]
    },
    basePrice: {
      type: Number,
      required: [true, 'Please provide base price'],
      min: [0, 'Base price cannot be negative']
    },
    discountedPrice: {
      type: Number,
      default: null,
      min: [0, 'Discounted price cannot be negative']
    },
    sizes: {
      type: [sizeSchema],
      default: []
    },
    allowToppings: {
      type: Boolean,
      default: false
    },
    imageURL: {
      type: String,
      required: [true, 'Please provide product image URL'],
      trim: true
    },
    images: {
      type: [String],
      default: []
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    prepTime: {
      type: String,
      trim: true,
      default: '20 Mins'
    },
    ingredients: {
      type: String,
      trim: true,
      default: ''
    },
    dietary: {
      type: String,
      trim: true,
      default: '100% Pure Veg'
    },
    highlights: {
      type: [highlightSchema],
      default: []
    },
    reviews: {
      type: [reviewSchema],
      default: []
    },
    averageRating: {
      type: Number,
      default: 4.9,
      min: 1,
      max: 5
    },
    totalReviews: {
      type: Number,
      default: 0,
      min: 0
    },
    isAvailable: {
      type: Boolean,
      default: true
    },
    stockQuantity: {
      type: Number,
      default: null, // null means unlimited/untracked inventory
      min: [0, 'Stock quantity cannot be negative']
    }
  },
  {
    timestamps: true
  }
);

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
