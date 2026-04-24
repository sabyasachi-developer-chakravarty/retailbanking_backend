const express = require('express');
const { authenticate } = require('../middleware/auth');
const { authorizeByRole } = require('../middleware/authorization');
const adminController = require('../controllers/adminController');

const router = express.Router();

router.get('/users', authenticate, authorizeByRole('ADMIN'), adminController.getAllUsers);
router.post('/customers', authenticate, authorizeByRole('ADMIN'), adminController.createCustomer);
router.get('/customers', authenticate, authorizeByRole('ADMIN'), adminController.getAllCustomers);
router.get('/audit-logs', authenticate, authorizeByRole('ADMIN'), adminController.getAuditLogs);

module.exports = router;
