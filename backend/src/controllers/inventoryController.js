const Ingredient = require('../models/Ingredient');

const DEFAULT_INGREDIENTS = [
  { name: 'Fresh Dough Balls (Medium 10")', category: 'dough', currentStock: 120, unit: 'pcs', minStockAlert: 20, costPerUnit: 18 },
  { name: 'Fresh Dough Balls (Large 12")', category: 'dough', currentStock: 80, unit: 'pcs', minStockAlert: 15, costPerUnit: 24 },
  { name: 'Mozzarella Cheese (Diced)', category: 'cheese', currentStock: 35.5, unit: 'kg', minStockAlert: 5, costPerUnit: 420 },
  { name: 'Cheese Burst Liquid Cheddar Blend', category: 'cheese', currentStock: 14.0, unit: 'kg', minStockAlert: 3, costPerUnit: 380 },
  { name: 'Signature Herb Tomato Sauce', category: 'sauce', currentStock: 25.0, unit: 'kg', minStockAlert: 4, costPerUnit: 160 },
  { name: 'Spicy Peri-Peri Sauce', category: 'sauce', currentStock: 10.0, unit: 'kg', minStockAlert: 2, costPerUnit: 210 },
  { name: 'Fresh Paneer Cubes (Malai)', category: 'veggie', currentStock: 18.5, unit: 'kg', minStockAlert: 3, costPerUnit: 340 },
  { name: 'Green Bell Peppers (Capsicum)', category: 'veggie', currentStock: 15.0, unit: 'kg', minStockAlert: 3, costPerUnit: 60 },
  { name: 'Red Onions (Diced)', category: 'veggie', currentStock: 20.0, unit: 'kg', minStockAlert: 4, costPerUnit: 45 },
  { name: 'Sweet Golden Corn', category: 'veggie', currentStock: 12.0, unit: 'kg', minStockAlert: 2.5, costPerUnit: 110 },
  { name: 'Button Mushrooms (Sliced)', category: 'veggie', currentStock: 8.0, unit: 'kg', minStockAlert: 2, costPerUnit: 180 },
  { name: 'Black & Green Olives', category: 'veggie', currentStock: 6.5, unit: 'kg', minStockAlert: 1.5, costPerUnit: 290 },
  { name: 'Corrugated Pizza Boxes (10" Medium)', category: 'packaging', currentStock: 250, unit: 'pcs', minStockAlert: 40, costPerUnit: 9 },
  { name: 'Corrugated Pizza Boxes (12" Large)', category: 'packaging', currentStock: 180, unit: 'pcs', minStockAlert: 30, costPerUnit: 12 }
];

/**
 * Get all ingredients with auto-seeding if empty
 */
exports.getIngredients = async (req, res) => {
  try {
    let items = await Ingredient.find().sort({ category: 1, name: 1 });
    if (!items || items.length === 0) {
      await Ingredient.insertMany(DEFAULT_INGREDIENTS);
      items = await Ingredient.find().sort({ category: 1, name: 1 });
    }

    const lowStockCount = items.filter((i) => i.currentStock <= i.minStockAlert).length;

    res.json({
      success: true,
      count: items.length,
      lowStockCount,
      data: items
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Add a new raw ingredient
 */
exports.addIngredient = async (req, res) => {
  try {
    const { name, category, currentStock, unit, minStockAlert, costPerUnit } = req.body;
    if (!name || currentStock === undefined) {
      return res.status(400).json({ success: false, message: 'Name and current stock are required.' });
    }

    const existing = await Ingredient.findOne({ name: name.trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Ingredient with this name already exists.' });
    }

    const item = await Ingredient.create({
      name: name.trim(),
      category: category || 'veggie',
      currentStock: Number(currentStock),
      unit: unit || 'kg',
      minStockAlert: Number(minStockAlert || 5),
      costPerUnit: Number(costPerUnit || 0)
    });

    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Restock an ingredient (increase quantity + record audit note)
 */
exports.restockIngredient = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, cost, note } = req.body;

    const addedQty = Number(quantity);
    if (isNaN(addedQty) || addedQty <= 0) {
      return res.status(400).json({ success: false, message: 'A positive quantity is required to restock.' });
    }

    const item = await Ingredient.findById(id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Ingredient not found.' });
    }

    const prev = item.currentStock;
    const next = Math.round((prev + addedQty) * 100) / 100;

    item.currentStock = next;
    item.lastRestockedAt = new Date();
    if (cost) item.costPerUnit = Number(cost);

    item.restockHistory.unshift({
      addedQuantity: addedQty,
      previousStock: prev,
      newStock: next,
      cost: Number(cost || item.costPerUnit || 0),
      note: note || `Restocked +${addedQty} ${item.unit}`,
      date: new Date()
    });

    // Keep history capped at 20 entries
    if (item.restockHistory.length > 20) {
      item.restockHistory = item.restockHistory.slice(0, 20);
    }

    await item.save();

    res.json({ success: true, data: item, message: `Successfully restocked +${addedQty} ${item.unit}. New balance: ${next} ${item.unit}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update ingredient details
 */
exports.updateIngredient = async (req, res) => {
  try {
    const { id } = req.params;
    const { currentStock, minStockAlert, costPerUnit, category, unit } = req.body;

    const item = await Ingredient.findById(id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Ingredient not found.' });
    }

    if (currentStock !== undefined) item.currentStock = Math.max(0, Number(currentStock));
    if (minStockAlert !== undefined) item.minStockAlert = Math.max(0, Number(minStockAlert));
    if (costPerUnit !== undefined) item.costPerUnit = Math.max(0, Number(costPerUnit));
    if (category) item.category = category;
    if (unit) item.unit = unit;

    await item.save();
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Delete ingredient
 */
exports.deleteIngredient = async (req, res) => {
  try {
    const { id } = req.params;
    await Ingredient.findByIdAndDelete(id);
    res.json({ success: true, message: 'Ingredient removed from inventory tracking.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Helper: Auto-deduct BOM ingredients when order enters kitchen preparation
 */
exports.deductBOMStockForOrder = async (items, io = null) => {
  try {
    if (!items || !Array.isArray(items)) return;

    for (const item of items) {
      const qty = Number(item.quantity) || 1;
      const sizeStr = item.size || (item.customPizza && item.customPizza.size) || '';
      const isPizza = Boolean(item.customPizza || item.size || (item.name && item.name.toLowerCase().includes('pizza')));
      const isLarge = sizeStr.toLowerCase().includes('12') || sizeStr.toLowerCase().includes('large');

      if (isPizza) {
        // Deduct 1 dough ball per pizza (Medium 10" or Large 12")
        const doughName = isLarge ? 'Fresh Dough Balls (Large 12")' : 'Fresh Dough Balls (Medium 10")';
        await Ingredient.findOneAndUpdate(
          { name: doughName },
          { $inc: { currentStock: -qty } }
        );

        // Deduct ~0.08kg cheese per pizza (0.12kg for large)
        const cheeseKg = isLarge ? 0.12 * qty : 0.08 * qty;
        await Ingredient.findOneAndUpdate(
          { name: 'Mozzarella Cheese (Diced)' },
          { $inc: { currentStock: -cheeseKg } }
        );

        // Deduct ~0.05kg sauce per pizza
        const sauceKg = 0.05 * qty;
        await Ingredient.findOneAndUpdate(
          { name: 'Signature Herb Tomato Sauce' },
          { $inc: { currentStock: -sauceKg } }
        );

        // Deduct 1 box per pizza
        const boxName = isLarge ? 'Corrugated Pizza Boxes (12" Large)' : 'Corrugated Pizza Boxes (10" Medium)';
        await Ingredient.findOneAndUpdate(
          { name: boxName },
          { $inc: { currentStock: -qty } }
        );
      }
    }

    if (io) {
      const updatedIngredients = await Ingredient.find().sort({ category: 1, name: 1 });
      io.to('admin').emit('inventory_updated', updatedIngredients);
      io.to('kitchen').emit('inventory_updated', updatedIngredients);
    }
  } catch (err) {
    console.warn('[BOM Inventory] Auto-deduction warning:', err.message);
  }
};
