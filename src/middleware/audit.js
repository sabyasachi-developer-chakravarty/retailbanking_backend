const AuditLog = require('../models/AuditLog');

const logAudit = async (userId, action, resource, resourceId, changes = null, status = 'SUCCESS', req = null) => {
  try {
    const auditEntry = new AuditLog({
      userId,
      action,
      resource,
      resourceId,
      changes,
      status,
      ipAddress: req?.ip || 'unknown',
      userAgent: req?.headers['user-agent'] || 'unknown'
    });
    
    await auditEntry.save();
  } catch (error) {
    console.error('Error logging audit:', error);
    // Don't throw - logging should not break the main flow
  }
};

const auditMiddleware = (action, resource) => {
  return async (req, res, next) => {
    // Capture the original json method
    const originalJson = res.json;

    res.json = function(data) {
      // Call audit logging asynchronously
      if (req.user) {
        const resourceId = req.params.id || req.body?.id || 'N/A';
        logAudit(req.user._id, action, resource, resourceId, null, 'SUCCESS', req).catch(err => {
          console.error('Audit logging error:', err);
        });
      }

      // Call the original json method
      return originalJson.call(this, data);
    };

    next();
  };
};

module.exports = { logAudit, auditMiddleware };
