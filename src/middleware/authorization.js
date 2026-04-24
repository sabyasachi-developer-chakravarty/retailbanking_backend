const authorize = (...allowedPermissions) => {
  return (req, res, next) => {
    try {
      if (!req.user || !req.user.role) {
        return res.status(403).json({ error: 'No role assigned to user' });
      }

      const userPermissions = req.user.role.permissions || [];
      
      const hasPermission = allowedPermissions.some(permission => 
        userPermissions.includes(permission)
      );

      if (!hasPermission) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          required: allowedPermissions,
          current: userPermissions
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({ error: 'Authorization check failed' });
    }
  };
};

const authorizeByRole = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user || !req.user.role) {
        return res.status(403).json({ error: 'No role assigned to user' });
      }

      if (!allowedRoles.includes(req.user.role.name)) {
        return res.status(403).json({ 
          error: 'Access denied',
          requiredRoles: allowedRoles,
          currentRole: req.user.role.name
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({ error: 'Authorization check failed' });
    }
  };
};

module.exports = { authorize, authorizeByRole };
