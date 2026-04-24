const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
  accountNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  accountType: {
    type: String,
    enum: ['SAVINGS', 'CHECKING', 'MONEY_MARKET'],
    required: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  balanceInCents: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  accountStatus: {
    type: String,
    enum: ['ACTIVE', 'DORMANT', 'CLOSED'],
    default: 'ACTIVE'
  },
  openingDate: {
    type: Date,
    default: Date.now
  },
  closingDate: {
    type: Date,
    default: null
  },
  interestRate: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
accountSchema.index({ customer: 1 });
accountSchema.index({ accountNumber: 1 });

module.exports = mongoose.model('Account', accountSchema);
