// controllers/productController.js
const Product = require("../models/Product");

exports.addProduct = async (req, res) => {
  try {
    // Optional: check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    const { name, description, price, imageUrl , stock, category} = req.body; // Added category

    if (!name || !description || !price || !imageUrl || stock === undefined || category === undefined) { // Added category to validation
      return res.status(400).json({ message: "All fields are required." });
    }

    const newProduct = new Product({
      name,
      description,
      price,
      imageUrl,
      stock,
      category // Added category
    });

    await newProduct.save();

    res
      .status(201)
      .json({ message: "Product added successfully", product: newProduct });
  } catch (error) {
    console.error("Error adding product:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getAllProducts = async (req, res) => {
  try {
    // This is for regular users (only shows in-stock items)
    const products = await Product.find({ stock: { $gt: 0 } });

    if (!products || products.length === 0) {
      return res.status(404).json({ message: "No products found or all available products are currently out of stock." });
    }

    res.status(200).json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// NEW: Function to get all products for admin (including out of stock)
exports.getAllProductsForAdmin = async (req, res) => {
  try {
    // Optional: check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    const products = await Product.find({}); // Fetch all products, no stock filter

    if (!products || products.length === 0) {
      return res.status(404).json({ message: "No products found in the database." });
    }

    res.status(200).json({ products }); // Wrap in an object for consistency with frontend
  } catch (error) {
    console.error("Error fetching all products for admin:", error);
    res.status(500).json({ message: "Server error" });
  }
};


exports.updateProduct = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    const { id } = req.params; // Product ID from URL
    const updates = req.body; // Object with fields to update

    // Ensure at least one field is being updated
    if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "No update fields provided." });
    }


    const product = await Product.findByIdAndUpdate(
      id,
      { $set: updates }, // Use $set to update only the fields provided
      { new: true, runValidators: true } // Return the updated document and run schema validators
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    res.status(200).json({ message: "Product updated successfully", product });

  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ message: "Server error updating product." });
  }
};

exports.deleteProduct = async (req, res) => { // Added deleteProduct
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    const { id } = req.params;

    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ message: "Server error deleting product." });
  }
};