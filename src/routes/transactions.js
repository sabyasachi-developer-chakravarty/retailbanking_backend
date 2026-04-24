const express = require('express');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorization');
const transactionController = require('../controllers/transactionController');

const router = express.Router();

router.get('/history/:accountId', authenticate, transactionController.getTransactionHistory);
router.post('/initiate', authenticate, authorize('create_transaction'), transactionController.initiateTransaction);
router.get('/pending/all', authenticate, authorize('approve_transaction'), transactionController.getPendingTransactions);
router.post('/:transactionId/approve', authenticate, authorize('approve_transaction'), transactionController.approveTransaction);
router.post('/:transactionId/reject', authenticate, authorize('reject_transaction'), transactionController.rejectTransaction);

module.exports = router;
