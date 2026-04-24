const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    enum: ['ADMIN', 'RM', 'OPS']
  },
  description: {
    type: String,
    required: true
  },
  permissions: [{
    type: String,
    enum: [
      'view_accounts',
      'create_transaction',
      'approve_transaction',
      'reject_transaction',
      'view_all_accounts',
      'manage_users',
      'view_audit_logs'
    ]
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Role', roleSchema);
