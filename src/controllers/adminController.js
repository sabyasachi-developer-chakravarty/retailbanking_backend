const User = require("../models/User");
const Customer = require("../models/Customer");
const Role = require("../models/Role");
const { generateCustomerId } = require("../utils/helpers");
const { logAudit } = require("../middleware/audit");

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .populate("role", "name")
      .select("-password")
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

const createCustomer = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      relationshipManager,
    } = req.body;

    const customer = new Customer({
      customerId: generateCustomerId(),
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      relationshipManager,
      kycStatus: "PENDING",
    });

    await customer.save();
    await customer.populate(
      "relationshipManager",
      "username firstName lastName",
    );

    await logAudit(
      req.user._id,
      "CUSTOMER_CREATED",
      "Customer",
      customer._id,
      { firstName, lastName, email },
      "SUCCESS",
      req,
    );

    res.status(201).json(customer);
  } catch (error) {
    console.error("Create customer error:", error);
    res.status(500).json({ error: "Failed to create customer" });
  }
};

const getAllCustomers = async (req, res) => {
  try {
    const customers = await Customer.find()
      .populate("relationshipManager", "username firstName lastName")
      .sort({ createdAt: -1 });

    res.json(customers);
  } catch (error) {
    console.error("Get all customers error:", error);
    res.status(500).json({ error: "Failed to fetch customers" });
  }
};

const getAllRoles = async (req, res) => {
  try {
    const roles = await Role.find().sort({ name: 1 });
    res.json(roles);
  } catch (error) {
    console.error("Get all roles error:", error);
    res.status(500).json({ error: "Failed to fetch roles" });
  }
};

const createUser = async (req, res) => {
  try {
    const { username, email, password, firstName, lastName, role } = req.body;

    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res
        .status(400)
        .json({ error: "User with that username or email already exists" });
    }

    const roleDoc = await Role.findById(role);
    if (!roleDoc) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const user = new User({
      username,
      email,
      password,
      firstName,
      lastName,
      role,
      isActive: true,
    });

    await user.save();
    await user.populate("role", "name");

    await logAudit(
      req.user._id,
      "USER_CREATED",
      "User",
      user._id,
      { username, email, role: roleDoc.name },
      "SUCCESS",
      req,
    );

    res.status(201).json(user.toJSON());
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, role, isActive } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (email && email !== user.email) {
      const existingEmail = await User.findOne({ email });
      if (
        existingEmail &&
        existingEmail._id.toString() !== user._id.toString()
      ) {
        return res.status(400).json({ error: "Email already in use" });
      }
    }

    if (role) {
      const roleDoc = await Role.findById(role);
      if (!roleDoc) {
        return res.status(400).json({ error: "Invalid role" });
      }
      user.role = role;
    }

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (email) user.email = email;
    if (typeof isActive === "boolean") user.isActive = isActive;

    user.updatedAt = Date.now();
    await user.save();
    await user.populate("role", "name");

    await logAudit(
      req.user._id,
      "USER_UPDATED",
      "User",
      user._id,
      { firstName, lastName, email, role, isActive },
      "SUCCESS",
      req,
    );

    res.json(user.toJSON());
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
};

const getAuditLogs = async (req, res) => {
  try {
    const AuditLog = require("../models/AuditLog");
    const { limit = 100, skip = 0 } = req.query;

    const logs = await AuditLog.find()
      .populate("userId", "username email")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await AuditLog.countDocuments();

    res.json({
      logs,
      pagination: { total, limit: parseInt(limit), skip: parseInt(skip) },
    });
  } catch (error) {
    console.error("Get audit logs error:", error);
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
};

module.exports = {
  getAllUsers,
  createUser,
  updateUser,
  createCustomer,
  getAllCustomers,
  getAllRoles,
  getAuditLogs,
};
