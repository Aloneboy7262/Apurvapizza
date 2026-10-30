const express = require('express');
const router = express.Router();
const {
  getIngredients,
  addIngredient,
  restockIngredient,
  updateIngredient,
  deleteIngredient
} = require('../controllers/inventoryController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

router.use(verifyToken);
router.use(authorizeRoles('admin', 'kitchen'));

router.get('/', getIngredients);
router.post('/', authorizeRoles('admin'), addIngredient);
router.post('/:id/restock', restockIngredient);
router.patch('/:id', authorizeRoles('admin'), updateIngredient);
router.delete('/:id', authorizeRoles('admin'), deleteIngredient);

module.exports = router;
