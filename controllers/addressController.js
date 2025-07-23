// backend/controllers/addressController.js
const Address = require("../models/Address");
const User = require("../models/User"); 

const ensureSingleDefaultAddress = async (userId, newDefaultAddressId) => {
  await Address.updateMany(
    { userId: userId, _id: { $ne: newDefaultAddressId }, isDefault: true },
    { $set: { isDefault: false } }
  );
};

exports.addAddress = async (req, res) => {
  try {
    const userId = req.user.id; 

    const {
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      addressType,
      isDefault,
    } = req.body;

    if (!addressLine1 || !city || !state || !postalCode || !country) {
      return res.status(400).json({ message: "Please provide all required address fields." });
    }

    const newAddress = new Address({
      userId,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      addressType,
      isDefault,
    });

    if (isDefault) {
      await ensureSingleDefaultAddress(userId, newAddress._id);
    } else {
      const userAddressesCount = await Address.countDocuments({ userId });
      if (userAddressesCount === 0) {
        newAddress.isDefault = true;
      }
    }

    await newAddress.save();
    res.status(201).json({ message: "Address added successfully", address: newAddress });
  } catch (error) {
    console.error("Error adding address:", error);
    res.status(500).json({ message: "Server error while adding address" });
  }
};


exports.getAddresses = async (req, res) => {
  try {
    const userId = req.user.id; 
    const addresses = await Address.find({ userId }).sort({ isDefault: -1, createdAt: 1 }); 
    res.status(200).json({ addresses });
  } catch (error) {
    console.error("Error fetching addresses:", error);
    res.status(500).json({ message: "Server error while fetching addresses" });
  }
};


exports.updateAddress = async (req, res) => {
  try {
    const userId = req.user.id; 
    const { id } = req.params; 
    const updates = req.body;

    const address = await Address.findOne({ _id: id, userId });
    if (!address) {
      return res.status(404).json({ message: "Address not found or does not belong to user" });
    }

    Object.keys(updates).forEach((key) => {
      if (key !== "userId" && key !== "_id" && key !== "createdAt" && key !== "updatedAt") {
        address[key] = updates[key];
      }
    });

    if (updates.isDefault === true) {
      await ensureSingleDefaultAddress(userId, address._id);
      address.isDefault = true;
    } else if (updates.isDefault === false && address.isDefault === true) {
        const userAddressesCount = await Address.countDocuments({ userId });
        if (userAddressesCount === 1) { 
            address.isDefault = true; 
            return res.status(400).json({ message: "Cannot unset default status if this is the only address." });
        }
    }


    await address.save();
    res.status(200).json({ message: "Address updated successfully", address });
  } catch (error) {
    console.error("Error updating address:", error);
    res.status(500).json({ message: "Server error while updating address" });
  }
};


exports.deleteAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const addressToDelete = await Address.findOneAndDelete({ _id: id, userId });

    if (!addressToDelete) {
      return res.status(404).json({ message: "Address not found or does not belong to user" });
    }

    if (addressToDelete.isDefault) {
        const remainingAddresses = await Address.find({ userId }).sort({ createdAt: 1 });
        if (remainingAddresses.length > 0) {
            remainingAddresses[0].isDefault = true;
            await remainingAddresses[0].save();
        }
    }

    res.status(200).json({ message: "Address deleted successfully" });
  } catch (error) {
    console.error("Error deleting address:", error);
    res.status(500).json({ message: "Server error while deleting address" });
  }
};


exports.setAsDefault = async (req, res) => {
    try {
        const userId = req.user.id; 
        const { id } = req.params; 

        const addressToSetDefault = await Address.findOne({ _id: id, userId });
        if (!addressToSetDefault) {
            return res.status(404).json({ message: "Address not found or does not belong to user" });
        }

        await ensureSingleDefaultAddress(userId, addressToSetDefault._id);

        addressToSetDefault.isDefault = true;
        await addressToSetDefault.save();

        res.status(200).json({ message: "Address set as default successfully", address: addressToSetDefault });

    } catch (error) {
        console.error("Error setting default address:", error);
        res.status(500).json({ message: "Server error while setting default address" });
    }
};