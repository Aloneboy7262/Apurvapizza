const express = require('express');
const router = express.Router();
const {
  getPublicPolicies,
  getPolicyBySlug,
  updatePolicies,
  resetPoliciesToDefault,
  submitContactMessage,
  getContactMessages,
  replyContactMessage,
  deleteContactMessage
} = require('../controllers/policyController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

// Public endpoints
router.get('/', getPublicPolicies);
router.post('/contact', submitContactMessage);

// Admin-only inquiries management (must precede /:slug)
router.get('/contact/messages', verifyToken, authorizeRoles('admin'), getContactMessages);
router.put('/contact/messages/:id/reply', verifyToken, authorizeRoles('admin'), replyContactMessage);
router.delete('/contact/messages/:id', verifyToken, authorizeRoles('admin'), deleteContactMessage);

// Public policy page by slug
router.get('/:slug', getPolicyBySlug);

// Admin-only policy content management
router.put('/', verifyToken, authorizeRoles('admin'), updatePolicies);
router.post('/reset', verifyToken, authorizeRoles('admin'), resetPoliciesToDefault);

module.exports = router;

