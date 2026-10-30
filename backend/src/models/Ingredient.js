const mongoose = require('mongoose');

const ingredientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Ingredient name is required'],
      trim: true,
      unique: true
    },
    category: {
      type: String,
      enum: ['dough', 'cheese', 'sauce', 'veggie', 'meat', 'packaging', 'beverage', 'other'],
      default: 'veggie'
    },
    currentStock: {
      type: Number,
      required: [true, 'Current stock is required'],
      min: [0, 'Stock cannot be negative'],
      default: 0
    },
    unit: {
      type: String,
      enum: ['pcs', 'kg', 'g', 'l', 'ml', 'box'],
      required: true,
      default: 'kg'
    },
    minStockAlert: {
      type: Number,
      required: true,
      default: 5
    },
    costPerUnit: {
      type: Number,
      default: 0
    },
    lastRestockedAt: {
      type: Date,
      default: Date.now
    },
    restockHistory: [
      {
        addedQuantity: { type: Number, required: true },
        previousStock: { type: Number, required: true },
        newStock: { type: Number, required: true },
        cost: { type: Number, default: 0 },
        note: { type: String, default: '' },
        date: { type: Date, default: Date.now }
      }
    ]
  },
  {
    timestamps: true
  }
);

ingredientSchema.index({ name: 1 });
ingredientSchema.index({ currentStock: 1, minStockAlert: 1 });

const Ingredient = mongoose.model('Ingredient', ingredientSchema);

module.exports = Ingredient;
