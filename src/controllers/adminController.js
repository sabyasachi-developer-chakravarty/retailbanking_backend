const User = require('../models/User');
const Customer = require('../models/Customer');
const Role = require('../models/Role');
const { generateCustomerId } = require('../utils/helpers');
const { logAudit } = require('../middleware/audit');

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .populate('role', 'name')
      .select('-password')
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

const createCustomer = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, dateOfBirth, relationshipManager } = req.body;

    const customer = new Customer({
      customerId: generateCustomerId(),
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      relationshipManager,
      kycStatus: 'PENDING'
    });

    await customer.save();
    await customer.populate('relationshipManager', 'username firstName lastName');

    await logAudit(
      req.user._id,
      'CUSTOMER_CREATED',
      'Customer',
      customer._id,
      { firstName, lastName, email },
      'SUCCESS',
      req
    );

    res.status(201).json(customer);
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
};

const getAllCustomers = async (req, res) => {
  try {
    const customers = await Customer.find()
      .populate('relationshipManager', 'username firstName lastName')
      .sort({ createdAt: -1 });

    res.json(customers);
  } catch (error) {
    console.error('Get all customers error:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
};

const getAuditLogs = async (req, res) => {
  try {
    const AuditLog = require('../models/AuditLog');
    const { limit = 100, skip = 0 } = req.query;

    const logs = await AuditLog.find()
      .populate('userId', 'username email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await AuditLog.countDocuments();

    res.json({
      logs,
      pagination: { total, limit: parseInt(limit), skip: parseInt(skip) }
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
};

module.exports = {
  getAllUsers,
  createCustomer,
  getAllCustomers,
  getAuditLogs
};
