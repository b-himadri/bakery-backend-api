// backend/controllers/cartController.js
const Cart = require("../models/Cart");
const Product = require("../models/Product"); 


const findCart = async ({ userId, sessionId }) => {
  if (userId) return await Cart.findOne({ userId }).populate("items.productId");
  return await Cart.findOne({ sessionId }).populate("items.productId");
};

// GET cart
exports.getCart = async (req, res) => {
  try {
    const { user } = req;
    const sessionId = req.sessionID;

    const cart = await findCart({
      userId: user ? user.id : null,
      sessionId: user ? null : sessionId,
    });

    res.status(200).json(cart || { items: [] });
  } catch (err) {
    console.error("Error fetching cart:", err);
    res.status(500).json({ message: "Failed to fetch cart" });
  }
};

// POST /cart/add
exports.addToCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const { user } = req;
    const sessionId = req.sessionID;

     // --- ADD THIS LOG ---
    console.log("\n--- DEBUG: ADD TO CART SESSION ID ---");
    console.log("Session ID during addToCart:", sessionId);
    console.log("--- END ADD TO CART SESSION ID DEBUG ---");

    if (quantity < 1) {
      return res.status(400).json({ message: "Quantity must be at least 1." });
    }

    let cart = await findCart({
      userId: user ? user.id : null,
      sessionId: user ? null : sessionId,
    });

    if (!cart) {
      cart = new Cart({
        userId: user ? user.id : null,
        sessionId: user ? null : sessionId,
        items: [],
      });
    }

    const existingItem = cart.items.find(
      (item) => item.productId && item.productId._id && item.productId._id.toString() === productId
    );

    let productDetails; 
    let newTotalQuantity; 

    if (existingItem) {
      productDetails = existingItem.productId; 
      newTotalQuantity = existingItem.quantity + quantity;
    } else {
      productDetails = await Product.findById(productId);
      if (!productDetails) {
        return res.status(404).json({ message: "Product not found." });
      }
      newTotalQuantity = quantity;
    }

    // --- STOCK CHECKING LOGIC ---
    if (newTotalQuantity > productDetails.stock) {
      return res.status(400).json({
        message: `Not enough stock for ${productDetails.name}. Available: ${productDetails.stock}`,
      });
    }

    if (existingItem) {
      existingItem.quantity = newTotalQuantity; 
    } else {
      cart.items.push({ productId: productDetails._id, quantity });
    }

    await cart.save();
    const updatedAndPopulatedCart = await findCart({
      userId: user ? user.id : null,
      sessionId: user ? null : sessionId,
    });
    res.status(200).json(updatedAndPopulatedCart);
  } catch (err) {
    console.error("Error in addToCart:", err);
    res.status(500).json({ message: "Failed to add to cart" });
  }
};

// PATCH /cart/update
exports.updateCartItem = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const { user } = req;
    const sessionId = req.sessionID;

    if (quantity < 0) { 
      return res.status(400).json({ message: "Quantity cannot be negative." });
    }

    let cart = await findCart({
      userId: user ? user.id : null,
      sessionId: user ? null : sessionId,
    });

    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const itemToUpdate = cart.items.find(
      (i) => i.productId && i.productId._id && i.productId._id.toString() === productId
    );

    if (!itemToUpdate) return res.status(404).json({ message: "Item not in cart" });

    const productDetails = itemToUpdate.productId;

    
    if (quantity > 0 && quantity > productDetails.stock) {
      return res.status(400).json({
        message: `Not enough stock for ${productDetails.name}. Available: ${productDetails.stock}`,
      });
    }

    itemToUpdate.quantity = quantity;

    if (itemToUpdate.quantity === 0) {
      cart.items = cart.items.filter(
        (item) => !(item.productId && item.productId._id && item.productId._id.toString() === productId)
      );
    }

    await cart.save();

    const updatedAndPopulatedCart = await findCart({
      userId: user ? user.id : null,
      sessionId: user ? null : sessionId,
    });
    res.status(200).json(updatedAndPopulatedCart);
  } catch (err) {
    console.error("Error in updateCartItem:", err);
    res.status(500).json({ message: "Failed to update item" });
  }
};

// DELETE /cart/remove
exports.removeCartItem = async (req, res) => {
  try {
    const { productId } = req.body;
    const { user } = req;
    const sessionId = req.sessionID;

    let cart = await findCart({
      userId: user ? user.id : null,
      sessionId: user ? null : sessionId,
    });

    if (!cart) return res.status(404).json({ message: "Cart not found" });

    cart.items = cart.items.filter(
      (item) => !(item.productId && item.productId._id && item.productId._id.toString() === productId)
    );
    await cart.save();

    // After saving, re-fetch and populate to ensure the response always sends populated products
    const updatedAndPopulatedCart = await findCart({
      userId: user ? user.id : null,
      sessionId: user ? null : sessionId,
    });
    res.status(200).json(updatedAndPopulatedCart);
  } catch (err) {
    console.error("Error in removeCartItem:", err);
    res.status(500).json({ message: "Failed to remove item" });
  }
};