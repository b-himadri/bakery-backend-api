//backend/controllers/authController.js
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Cart = require("../models/Cart");
exports.signup = async (req, res) => {
  const { name, email, password, role, adminPin } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "Email already in use" });

    if (role === "admin") {
      if (adminPin !== process.env.ADMIN_PIN) {
        return res.status(403).json({ message: "Invalid Admin Access Key" });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role: role || "user",
    });

    await newUser.save();

    const token = jwt.sign(
      { id: newUser._id, role: newUser.role },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    res.status(201).json({
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
      token,
    });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

exports.login = async (req, res) => {

    const { email, password } = req.body;

   

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign({ id: user._id ,  role: user.role}, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

  
    // --- START DEBUG LOGS FOR CART MERGE ---
    const currentSessionId = req.sessionID;
    console.log("\n--- Login Request Cart Merge Debug ---");
    console.log(
      "1. Current Session ID (from req.sessionID):",
      currentSessionId
    );
    console.log("2. Logged-in User ID (from token/user object):", user._id);

    let guestCart = null;
    if (currentSessionId) {
      guestCart = await Cart.findOne({ sessionId: currentSessionId }).populate(
        "items.productId"
      );
      console.log(
        "3. Guest Cart Found for Session ID:",
        guestCart
          ? `ID: ${guestCart._id}, Items: ${guestCart.items.length}`
          : "None"
      );
    } else {
      console.log(
        "3. No Session ID available in req.sessionID. Guest cart cannot be found."
      );
    }

    const userCart = await Cart.findOne({ userId: user._id }).populate(
      "items.productId"
    );
    console.log(
      "4. User's Existing Cart Found for User ID:",
      userCart ? `ID: ${userCart._id}, Items: ${userCart.items.length}` : "None"
    );

    if (guestCart) {
      console.log(
        "5. Guest cart EXISTS. Proceeding with merge/transfer logic."
      );
      if (userCart) {
        console.log("6. User cart EXISTS. Merging guest cart into user cart.");
        // Merge guest cart into existing user cart
        for (const guestItem of guestCart.items) {
          const existingUserItem = userCart.items.find(
            (item) =>
              item.productId &&
              item.productId._id &&
              item.productId._id.toString() ===
                guestItem.productId._id.toString()
          );

          if (existingUserItem) {
            existingUserItem.quantity += guestItem.quantity;
            console.log(
              `   - Merging: Updated quantity for product ${guestItem.productId.name} to ${existingUserItem.quantity}`
            );
          } else {
            userCart.items.push({
              productId: guestItem.productId._id,
              quantity: guestItem.quantity,
            });
            console.log(
              `   - Merging: Added new product ${guestItem.productId.name}`
            );
          }
        }
        await userCart.save();
        await Cart.deleteOne({ sessionId: currentSessionId });
        console.log("7. Merge complete. Guest cart deleted. User cart saved.");
      } else {
        console.log(
          "6. User cart DOES NOT EXIST. Transferring guest cart to user."
        );
        guestCart.userId = user._id;
        guestCart.sessionId = null;
        await guestCart.save();
        console.log("7. Transfer complete. Guest cart updated to user cart.");
      }
    } else {
      console.log(
        "5. No guest cart found for this session ID. No merge/transfer needed."
      );
    }
    console.log("--- Login Request Cart Merge Debug End ---");

    res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    // Corrected: Access user ID from req.user
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ user });
  } catch (err) {
    console.error("Error fetching user:", err); 
    res.status(500).json({ message: "Error fetching user" });
  }
};

exports.addAdmin = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already in use" });
    }


    const hashedPassword = await bcrypt.hash(password, 12);

  
    const newAdmin = new User({
      name,
      email,
      password: hashedPassword,
      role: "admin",
    });

    await newAdmin.save();

    res
      .status(201)
      .json({ message: "Admin added successfully", admin: newAdmin });
  } catch (error) {
    console.error("Error adding admin:", error);
    res.status(500).json({ message: "Server error" });
  }
};


exports.logout = async (req, res) => {
  try {
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          console.error("Error destroying session:", err);
          return res.status(500).json({ message: "Logout failed" });
        }
      
        res.clearCookie("connect.sid");
        res.status(200).json({ message: "Logged out successfully" });
      });
    } else {
      res.clearCookie("connect.sid");
      res
        .status(200)
        .json({ message: "No active session to destroy, logged out." });
    }
  } catch (err) {
    console.error("Error in logout:", err);
    res.status(500).json({ message: "Server Error during logout" });
  }
};


exports.updateProfile = async (req, res) => {
  try {
    const { name, email, oldPassword, newPassword } = req.body;
    const userId = req.user.id; 

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (name && name !== user.name) {
      user.name = name;
    }

    // --- Update Email ---
    if (email && email !== user.email) {
      // Check if new email is already in use by another user
      const existingUserWithEmail = await User.findOne({ email });
      if (existingUserWithEmail && existingUserWithEmail._id.toString() !== userId) {
        return res.status(400).json({ message: "Email is already in use by another account." });
      }
      user.email = email;
    }

    // --- Update Password ---
    if (newPassword) { // Only proceed if a new password is provided
      if (!oldPassword) {
        return res.status(400).json({ message: "Old password is required to change password." });
      }

      // Verify old password
      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Incorrect old password." });
      }

      // Hash and update new password
      user.password = await bcrypt.hash(newPassword, 12);
    }

    await user.save();

    // Respond with updated user data (excluding password)
    res.status(200).json({
      message: "Profile updated successfully!",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).json({ message: "Server error during profile update." });
  }
};