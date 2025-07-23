const express = require("express");
const router = express.Router();
const {getCart, addToCart, updateCartItem, removeCartItem} = require("../controllers/cartController");
const optionalAuth = require("../middleware/optionalAuthMiddleware");

// Guest or Authenticated user — both allowed
router.get("/", optionalAuth, getCart);
router.post("/add", optionalAuth, addToCart);
router.patch("/update", optionalAuth, updateCartItem);
router.delete("/remove", optionalAuth, removeCartItem);

module.exports = router;
