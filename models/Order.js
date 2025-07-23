// backend/models/Order.js
const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  name: { type: String, required: true }, 
  price: { type: Number, required: true }, 
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  imageUrl: { type: String, required: true }, 
});

// NEW: Address snapshot schema for the order
const deliveryAddressSchema = new mongoose.Schema({
  addressLine1: { type: String, required: true },
  addressLine2: { type: String },
  city: { type: String, required: true },
  state: { type: String, required: true },
  postalCode: { type: String, required: true },
  country: { type: String, required: true },
  addressType: { type: String }, // e.g., 'shipping' or 'billing'
}, { _id: false }); // Do not generate _id for this sub-document

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: [orderItemSchema],
    totalAmount: {
      type: Number,
      required: true,
    },
    deliveryAddress: { 
      type: deliveryAddressSchema,
      required: true,
    },
    paymentMethod: { 
      type: String,
      enum: ['COD', 'Online', 'QR'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'pending_payment', 'confirmed', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);