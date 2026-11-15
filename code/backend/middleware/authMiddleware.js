const jwt = require('jsonwebtoken');
const User = require('../models/user');
const dbConnect = require('../lib/dbConnect');

// Verifies JWT and attaches req.user
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      await dbConnect();
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      return next();
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  return res.status(401).json({ message: 'Not authorized, no token' });
};

/**
 * Admin/staff guard:
 * - Case-insensitive role handling
 * - Allows a broader set commonly used in hospital apps
 * - Also allows ANY non-patient role (so pharmacist/lab/nurse don’t get blocked)
 */
const admin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Not authorized' });

  const roleRaw = req.user.role || '';
  const role = String(roleRaw).toLowerCase();

  // TEMP debug so you can see what's actually coming from DB
  console.log('MDR access by user:', req.user?._id?.toString?.(), 'role=', roleRaw);

  // Explicit allow-list (case-insensitive)
  const allowList = new Set([
    'admin', 'administrator',
    'hospital',
    'doctor',
    'pharmacist',
    'lab',
    'nurse',
    'operator',
    'staff'
  ]);

  if (allowList.has(role)) return next();

  // Fallback: allow any role that is NOT 'patient'
  if (role && role !== 'patient') return next();

  return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
};

module.exports = { protect, admin };
