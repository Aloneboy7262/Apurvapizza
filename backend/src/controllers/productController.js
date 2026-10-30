const mongoose = require('mongoose');
const Product = require('../models/Product');

// @desc    Get all products (with optional filter by category or search)
// @route   GET /api/products
// @access  Public
const getAllProducts = async (req, res, next) => {
  try {
    const { category, search, availableOnly } = req.query;
    const filter = {};

    if (category && typeof category === 'string' && category !== 'All') {
      filter.category = category.trim();
    }

    if (search && typeof search === 'string') {
      // Escape special characters to prevent ReDoS (Regular Expression Denial of Service)
      const sanitizedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (sanitizedSearch) {
        filter.name = { $regex: sanitizedSearch, $options: 'i' };
      }
    }

    if (availableOnly === 'true') {
      filter.isAvailable = true;
    }

    const products = await Product.find(filter).sort({ category: 1, name: 1 });

    res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single product by ID
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format.'
      });
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: `Product not found with id of ${req.params.id}`
      });
    }

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new product
// @route   POST /api/products
// @access  Private/Admin
const createProduct = async (req, res, next) => {
  try {
    const {
      name,
      category,
      basePrice,
      discountedPrice,
      sizes,
      allowToppings,
      imageURL,
      description,
      prepTime,
      ingredients,
      dietary,
      highlights,
      isAvailable
    } = req.body;

    const imageList = Array.isArray(req.body.images) && req.body.images.length > 0
      ? req.body.images.filter((img) => typeof img === 'string' && img.trim())
      : (imageURL ? [imageURL.trim()] : []);
    const coverImage = imageURL ? imageURL.trim() : (imageList[0] || '');

    // Validation
    if (!name || !category || basePrice === undefined || !coverImage) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, category, basePrice, and at least one image.'
      });
    }

    let cleanStockQuantity = null;
    if (req.body.stockQuantity !== undefined && req.body.stockQuantity !== null && req.body.stockQuantity !== '') {
      cleanStockQuantity = Math.max(0, parseInt(req.body.stockQuantity, 10));
    }

    let initialAvailable = isAvailable !== undefined ? Boolean(isAvailable) : true;
    if (cleanStockQuantity !== null && cleanStockQuantity <= 0) {
      initialAvailable = false;
    }

    const product = await Product.create({
      name,
      category,
      basePrice,
      discountedPrice: discountedPrice || null,
      sizes: sizes || [],
      allowToppings: Boolean(allowToppings),
      imageURL: coverImage,
      images: imageList.length > 0 ? imageList : [coverImage],
      description: description || '',
      prepTime: prepTime || '20 Mins',
      ingredients: ingredients || '',
      dietary: dietary || '100% Pure Veg',
      highlights: Array.isArray(highlights) ? highlights : [],
      stockQuantity: cleanStockQuantity,
      isAvailable: initialAvailable
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('product_updated', product);
      io.emit('products_updated');
    }

    res.status(201).json({
      success: true,
      message: 'Product created successfully.',
      data: product
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private/Admin
const updateProduct = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format.'
      });
    }

    let product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: `Product not found with id of ${req.params.id}`
      });
    }

    const updates = { ...req.body };

    // Process stockQuantity updates
    if (updates.stockQuantity !== undefined) {
      if (updates.stockQuantity === null || updates.stockQuantity === '' || updates.stockQuantity === 'unlimited') {
        updates.stockQuantity = null;
      } else {
        updates.stockQuantity = Math.max(0, parseInt(updates.stockQuantity, 10));
        // If stock is set to 0, automatically mark as out of stock
        if (updates.stockQuantity === 0) {
          updates.isAvailable = false;
        } else if (updates.stockQuantity > 0 && updates.isAvailable === undefined && !product.isAvailable) {
          // If restocked and no explicit isAvailable provided, auto-enable
          updates.isAvailable = true;
        }
      }
    }

    if (updates.isAvailable !== undefined) {
      updates.isAvailable = Boolean(updates.isAvailable);
      // If admin re-enables an item that had 0 stock, clear stock to null (unlimited) if no new stock was given
      if (updates.isAvailable && product.stockQuantity === 0 && updates.stockQuantity === undefined) {
        updates.stockQuantity = null;
      }
    }

    // Synchronize images array & cover image
    if (updates.images !== undefined) {
      if (Array.isArray(updates.images)) {
        updates.images = updates.images.filter((img) => typeof img === 'string' && img.trim());
        if (!updates.imageURL && updates.images.length > 0) {
          updates.imageURL = updates.images[0];
        } else if (updates.imageURL && !updates.images.includes(updates.imageURL)) {
          updates.images.unshift(updates.imageURL);
        }
      }
    } else if (updates.imageURL && (!product.images || product.images.length === 0)) {
      updates.images = [updates.imageURL];
    }

    product = await Product.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('product_updated', product);
      io.emit('products_updated');
    }

    res.status(200).json({
      success: true,
      message: 'Product updated successfully.',
      data: product
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private/Admin
const deleteProduct = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format.'
      });
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: `Product not found with id of ${req.params.id}`
      });
    }

    await Product.findByIdAndDelete(req.params.id);

    const io = req.app.get('io');
    if (io) {
      io.emit('product_deleted', { productId: req.params.id });
      io.emit('products_updated');
    }

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add review to product
// @route   POST /api/products/:id/reviews
// @access  Public
const addProductReview = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format.'
      });
    }

    const { rating, comment, imageURL } = req.body;
    const reviewerName = (req.user?.name || req.body.userName || '').trim();
    const reviewerEmail = (req.user?.email || req.body.userEmail || req.user?.phone || '').trim();

    if (!reviewerName) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your name.'
      });
    }

    const numericRating = Number(rating);
    if (!numericRating || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be a number between 1 and 5.'
      });
    }

    if (!comment || !comment.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your review feedback.'
      });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.'
      });
    }

    const newReview = {
      userName: reviewerName,
      userEmail: reviewerEmail,
      rating: numericRating,
      comment: comment.trim(),
      imageURL: imageURL ? imageURL.trim() : '',
      createdAt: new Date()
    };

    product.reviews.unshift(newReview);
    product.totalReviews = product.reviews.length;
    const avg = product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length;
    product.averageRating = Number(avg.toFixed(1));

    await product.save();

    res.status(201).json({
      success: true,
      message: 'Review posted successfully!',
      data: {
        review: newReview,
        reviews: product.reviews,
        averageRating: product.averageRating,
        totalReviews: product.totalReviews
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin reply to a product review
// @route   PUT /api/products/:productId/reviews/:reviewId/reply
// @access  Private (Admin)
const replyToProductReview = async (req, res, next) => {
  try {
    const { comment } = req.body;
    if (!comment || !comment.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide reply comment.'
      });
    }

    const product = await Product.findById(req.params.productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.'
      });
    }

    const review = product.reviews.id(req.params.reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found.'
      });
    }

    review.adminReply = {
      comment: comment.trim(),
      repliedAt: new Date(),
      repliedBy: req.user?.name || 'Apurva Pizza Hub Management'
    };

    await product.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('product_updated', product);
    }

    res.status(200).json({
      success: true,
      message: 'Admin response published successfully!',
      data: review
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all reviews across all products for Admin Review Management
// @route   GET /api/products/reviews/all
// @access  Private (Admin)
const getAllProductReviews = async (req, res, next) => {
  try {
    const products = await Product.find({ 'reviews.0': { $exists: true } }, 'name category imageURL reviews');
    const allReviews = [];
    products.forEach((p) => {
      p.reviews.forEach((r) => {
        allReviews.push({
          productId: p._id,
          productName: p.name,
          productCategory: p.category,
          productImage: p.imageURL,
          _id: r._id,
          userName: r.userName,
          userEmail: r.userEmail,
          rating: r.rating,
          comment: r.comment,
          imageURL: r.imageURL,
          adminReply: r.adminReply,
          createdAt: r.createdAt
        });
      });
    });

    allReviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({
      success: true,
      count: allReviews.length,
      data: allReviews
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Quick update product stock quantity
// @route   PATCH /api/products/:id/stock
// @access  Private (Admin / Kitchen)
const updateProductStock = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format.'
      });
    }

    const { stockQuantity, isAvailable } = req.body;
    let updates = {};

    if (stockQuantity === null || stockQuantity === '' || stockQuantity === 'unlimited') {
      updates.stockQuantity = null;
      if (isAvailable !== undefined) updates.isAvailable = Boolean(isAvailable);
      else updates.isAvailable = true;
    } else {
      const parsed = Math.max(0, parseInt(stockQuantity, 10));
      updates.stockQuantity = parsed;
      if (parsed === 0) {
        updates.isAvailable = false;
      } else {
        updates.isAvailable = isAvailable !== undefined ? Boolean(isAvailable) : true;
      }
    }

    const product = await Product.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!product) {
      return res.status(404).json({
        success: false,
        message: `Product #${req.params.id} not found.`
      });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('product_updated', product);
      io.emit('products_updated');
    }

    res.status(200).json({
      success: true,
      message: `Stock updated for '${product.name}' (${product.stockQuantity !== null ? product.stockQuantity + ' left' : 'Unlimited'}).`,
      data: product
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  addProductReview,
  replyToProductReview,
  getAllProductReviews,
  updateProductStock
};
