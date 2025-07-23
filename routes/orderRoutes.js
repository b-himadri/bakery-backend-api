// backend/routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const authMiddleware = require('../middleware/authMiddleware'); // For protected routes

// All order routes require authentication
router.post('/', authMiddleware, orderController.createOrder); // Create a new order
router.get('/', authMiddleware, orderController.getOrders); // Get all orders for a user
router.get('/:id', authMiddleware, orderController.getOrderById); // Get a single order by ID
router.patch('/:id/status', authMiddleware, orderController.updateOrderStatus); // Update order status (admin only)


module.exports = router;