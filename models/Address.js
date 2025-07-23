const mongoose = require("mongoose");
const addressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    addressLine1: {
      type: String,
      required: true,
      trim: true,
    },
    addressLine2: {
      type: String,
      trim: true,
      default: "", 
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
    },
    postalCode: {
      type: String,
      required: true,
      trim: true,
    },
    country: {
      type: String,
      required: true,
      trim: true,
      default: "India", // Assuming a primary country
    },
    addressType: {
      type: String,
      enum: ["shipping", "billing", "other"], // E.g., for different types of addresses
      default: "shipping",
    },
    isDefault: {
      type: Boolean,
      default: false, // Only one address per user should be default at a time
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// Optional: Add an index for faster lookups by user and default status
addressSchema.index({ userId: 1, isDefault: 1 });

module.exports = mongoose.model("Address", addressSchema);