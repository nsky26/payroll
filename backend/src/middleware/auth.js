import jwt from 'jsonwebtoken';

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization token' });
  }
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'paypulse_super_secret_jwt_key_change_in_prod');
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Token expired or invalid' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient role permissions' });
    }
    next();
  };
}

/**
 * Resolves the active firm_id for tenant-scoped queries.
 * - super_admin can pass ?firm_id=X or X-Firm-Id header to inspect a specific firm.
 * - All other roles are strictly locked to req.user.firm_id.
 */
export function resolveFirmId(req) {
  if (req.user.role === 'super_admin') {
    const requested = req.query.firm_id || req.headers['x-firm-id'] || req.body?.firm_id;
    return requested ? Number(requested) : null;
  }
  return Number(req.user.firm_id);
}
