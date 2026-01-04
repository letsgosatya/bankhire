/**
 * ENHANCED ROLE AUTHORIZATION MIDDLEWARE
 * Strict role-based access control with detailed logging
 * 
 * Security: Enforces role restrictions, prevents privilege escalation
 */

const securityConfig = require('../config/security');

/**
 * Mask mobile number for safe logging
 */
const maskMobile = (mobile) => {
  if (!mobile) return 'N/A';
  const digits = String(mobile).replace(/\D/g, '');
  if (digits.length >= 4) {
    return 'XXXXXX' + digits.slice(-4);
  }
  return 'XXXX';
};

/**
 * Authorize middleware factory
 * 
 * @param {string[]} allowedRoles - Array of roles allowed to access the endpoint
 * @returns {Function} Express middleware
 * 
 * Usage: router.get('/admin', authMiddleware, authorize(['ADMIN']), handler)
 */
const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    // Security: Deny by default if no user is attached
    if (!req.user) {
      console.log(`[AUTH] Access denied - No user attached - RequestId: ${req.requestId || 'N/A'}, Path: ${req.path}`);
      return res.status(401).json({
        error: 'Authentication required',
        requestId: req.requestId,
      });
    }

    // Security: Deny if user has no role
    if (!req.user.role) {
      console.log(`[AUTH] Access denied - No role defined - UserId: ${req.user.id}, RequestId: ${req.requestId || 'N/A'}`);
      return res.status(403).json({
        error: 'Access denied. No role assigned.',
        requestId: req.requestId,
      });
    }

    const userRole = req.user.role.toUpperCase();

    // Security: Check if role is valid
    const validRoles = Object.values(securityConfig.ROLES);
    if (!validRoles.includes(userRole)) {
      console.log(`[SECURITY] Invalid role detected - UserId: ${req.user.id}, Role: ${userRole}, RequestId: ${req.requestId || 'N/A'}`);
      return res.status(403).json({
        error: 'Access denied. Invalid role.',
        requestId: req.requestId,
      });
    }

    // Security: Check if user's role is in allowed roles
    const normalizedAllowedRoles = allowedRoles.map(r => r.toUpperCase());
    if (!normalizedAllowedRoles.includes(userRole)) {
      console.log(`[AUTH] Access denied - Insufficient permissions - UserId: ${req.user.id}, Role: ${userRole}, Required: ${normalizedAllowedRoles.join(',')}, Path: ${req.path}, RequestId: ${req.requestId || 'N/A'}`);
      return res.status(403).json({
        error: 'Access denied. Insufficient permissions.',
        requestId: req.requestId,
      });
    }

    // Security: Apply role-specific restrictions
    const restrictions = securityConfig.ROLE_RESTRICTIONS[userRole] || [];
    const currentPath = req.path.toLowerCase();
    
    for (const restricted of restrictions) {
      if (currentPath.includes(restricted)) {
        console.log(`[AUTH] Role restriction applied - UserId: ${req.user.id}, Role: ${userRole}, Restriction: ${restricted}, Path: ${req.path}, RequestId: ${req.requestId || 'N/A'}`);
        return res.status(403).json({
          error: 'Access denied. This action is not allowed for your role.',
          requestId: req.requestId,
        });
      }
    }

    // Log successful authorization for audit
    // Note: Only log for sensitive operations (admin, referral actions)
    if (normalizedAllowedRoles.includes('ADMIN') || currentPath.includes('referral')) {
      console.log(`[AUTH] Access granted - UserId: ${req.user.id}, Role: ${userRole}, Path: ${req.path}, RequestId: ${req.requestId || 'N/A'}`);
    }

    next();
  };
};

/**
 * Check if user owns the resource
 * Used to ensure users can only access their own data
 */
const ownershipCheck = (resourceUserIdField = 'userId') => {
  return (req, res, next) => {
    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
    
    if (resourceUserId && req.user && String(resourceUserId) !== String(req.user.id)) {
      // Allow ADMIN to access any resource
      if (req.user.role && req.user.role.toUpperCase() === 'ADMIN') {
        return next();
      }
      
      console.log(`[AUTH] Ownership check failed - UserId: ${req.user.id}, ResourceUserId: ${resourceUserId}, RequestId: ${req.requestId || 'N/A'}`);
      return res.status(403).json({
        error: 'Access denied. You can only access your own resources.',
        requestId: req.requestId,
      });
    }
    
    next();
  };
};

/**
 * Admin-only middleware shorthand
 */
const adminOnly = authorize([securityConfig.ROLES.ADMIN]);

/**
 * Employee-only middleware shorthand
 */
const employeeOnly = authorize([securityConfig.ROLES.EMPLOYEE]);

/**
 * Candidate-only middleware shorthand
 */
const candidateOnly = authorize([securityConfig.ROLES.CANDIDATE]);

module.exports = {
  authorize,
  ownershipCheck,
  adminOnly,
  employeeOnly,
  candidateOnly,
};
