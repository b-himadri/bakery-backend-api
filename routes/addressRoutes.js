// backend/routes/addressRoutes.js
const express = require('express');
const router = express.Router();
const addressController = require('../controllers/addressController');
const authMiddleware = require('../middleware/authMiddleware'); // For protected routes

// All address routes require authentication
router.post('/', authMiddleware, addressController.addAddress);
router.get('/', authMiddleware, addressController.getAddresses);
router.patch('/:id', authMiddleware, addressController.updateAddress);
router.delete('/:id', authMiddleware, addressController.deleteAddress);

// Specific route to set an address as default
router.patch('/:id/set-default', authMiddleware, addressController.setAsDefault);

module.exports = router;