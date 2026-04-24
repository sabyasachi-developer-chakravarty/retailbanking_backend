const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  correlationId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['DEBIT', 'CREDIT'],
    required: true
  },
  amountInCents: {
    type: Number,
    required: true,
    min: 1
  },
  status: {
    type: String,
    enum: ['INITIATED', 'APPROVED', 'REJECTED', 'COMPLETED'],
    default: 'INITIATED',
    index: true
  },
  description: {
    type: String,
    required: true
  },
  initiatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approvalNotes: {
    type: String,
    default: null
  },
  initiatedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  approvedAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  balanceAfterTransaction: {
    type: Number,
    required: true
  }
}, {
  // Make this collection append-only by default
  timestamps: true
});

// Compound index for account and time-based queries
transactionSchema.index({ account: 1, initiatedAt: -1 });
transactionSchema.index({ status: 1, initiatedAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
