// backend/controllers/orderController.js
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Address = require('../models/Address'); // To fetch address details


exports.createOrder = async (req, res) => {
  try {
    const userId = req.user.id; // From authMiddleware
    const { addressId, paymentMethod } = req.body; // Assume addressId and paymentMethod are sent from frontend

    // 1. Fetch the user's cart
    const userCart = await Cart.findOne({ userId }).populate('items.productId');

    if (!userCart || userCart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty. Cannot create order." });
    }

    // 2. Fetch the selected address details
    const deliveryAddress = await Address.findOne({ _id: addressId, userId });
    if (!deliveryAddress) {
      return res.status(404).json({ message: "Delivery address not found or does not belong to user." });
    }

    // Prepare order items and perform FINAL STOCK CHECK & DECREMENT
    let orderItems = [];
    let totalAmount = 0;
    let productsToUpdate = []; // To store products that need their stock decremented

    for (const cartItem of userCart.items) {
      const product = cartItem.productId; // This is the populated product document
      const requestedQuantity = cartItem.quantity;

      // Ensure product details are valid and populated
      if (!product || !product._id) {
        return res.status(404).json({ message: `Product not found for item in cart: ${cartItem.productId}` });
      }

      // --- FINAL STOCK CHECK (Crucial for atomicity) ---
      // Re-fetch product from DB with locking or optimistic concurrency for safety
      const actualProduct = await Product.findById(product._id);
      if (!actualProduct) {
        return res.status(404).json({ message: `Product ${product.name} no longer exists.` });
      }
      if (actualProduct.stock < requestedQuantity) {
        return res.status(400).json({
          message: `Not enough stock for ${actualProduct.name}. Requested: ${requestedQuantity}, Available: ${actualProduct.stock}.`,
          product: actualProduct.name, // Send product name for frontend feedback
        });
      }

      // Add to order items (copying current price and details)
      orderItems.push({
        productId: actualProduct._id,
        name: actualProduct.name, // Copy name
        price: actualProduct.price, // Copy price at time of order
        quantity: requestedQuantity,
        imageUrl: actualProduct.imageUrl, // Copy image
      });
      totalAmount += actualProduct.price * requestedQuantity;

      // Prepare for stock decrement (to be done after successful order creation)
      productsToUpdate.push({
        _id: actualProduct._id,
        decrementBy: requestedQuantity,
      });
    }

    // 3. Create the Order
    const newOrder = new Order({
      userId,
      items: orderItems,
      totalAmount,
      deliveryAddress: { // Snapshot of the address at time of order
        addressLine1: deliveryAddress.addressLine1,
        addressLine2: deliveryAddress.addressLine2,
        city: deliveryAddress.city,
        state: deliveryAddress.state,
        postalCode: deliveryAddress.postalCode,
        country: deliveryAddress.country,
        addressType: deliveryAddress.addressType,
      },
      paymentMethod,
      status: paymentMethod === 'COD' ? 'pending' : 'pending_payment', // Initial status
      // You might add a payment gateway specific ID here for online payments
    });

    await newOrder.save();

    // 4. Decrement Stock (only after order is successfully saved)
    // Use Promise.all for concurrent updates
    await Promise.all(productsToUpdate.map(async (p) => {
      // Use $inc to atomically decrement stock. Also check current stock to prevent negative stock.
      await Product.updateOne(
        { _id: p._id, stock: { $gte: p.decrementBy } },
        { $inc: { stock: -p.decrementBy } }
      );
  
    }));

    // 5. Clear the user's cart
    await Cart.deleteOne({ userId });

    res.status(201).json({
      message: "Order placed successfully!",
      order: newOrder,
    });

  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ message: "Failed to place order." });
  }
};

exports.getOrders = async (req, res) => {
  try {
    // If the user is an admin, fetch all orders
    if (req.user.role === 'admin') {
      const orders = await Order.find().sort({ createdAt: -1 }); // No userId filter
      return res.status(200).json({ orders });
    } else {
      // Otherwise, fetch only the user's orders
      const userId = req.user.id;
      const orders = await Order.find({ userId }).sort({ createdAt: -1 });
      return res.status(200).json({ orders });
    }
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Server error fetching orders." });
  }
};


exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, userId: req.user.id });
    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }
    res.status(200).json({ order });
  } catch (error) {
    console.error("Error fetching order by ID:", error);
    res.status(500).json({ message: "Server error fetching order." });
  }
};


exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params; // Order ID
    const { status } = req.body; // New status
    const adminRole = req.user.role; // From authMiddleware

    if (adminRole !== 'admin') {
      return res.status(403).json({ message: "Access denied. Admin privileges required." });
    }

    if (!status || !['pending', 'pending_payment', 'confirmed', 'shipped', 'delivered', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: "Invalid status provided." });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    order.status = status;
    await order.save();

    res.status(200).json({ message: "Order status updated successfully", order });

  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ message: "Server error updating order status." });
  }
};