// backend/routes/productRoutes.js
const express = require('express');
const router = express.Router();
const { addProduct, getAllProducts, updateProduct, getAllProductsForAdmin, deleteProduct } = require('../controllers/productController'); // Import new functions
const authMiddleware = require('../middleware/authMiddleware');

router.post('/add', authMiddleware, addProduct);

router.get('/', getAllProducts);

router.get('/all', authMiddleware, getAllProductsForAdmin); 

router.patch('/:id', authMiddleware, updateProduct);

router.delete('/:id', authMiddleware, deleteProduct); 

module.exports = router;