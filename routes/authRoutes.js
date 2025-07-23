// backend/routes/authRoutes.js
const express = require('express')
const router = express.Router();
const {login,signup, getMe, logout, updateProfile} = require('../controllers/authController')
const authMiddleware = require('../middleware/authMiddleware')
router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', logout);
router.patch('/update-profile', authMiddleware, updateProfile);
router.get('/me', authMiddleware, getMe);

module.exports = router; 

