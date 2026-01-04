const jwt = require('jsonwebtoken');

// Helper to drain request body before sending response
// This prevents ECONNRESET on multipart uploads when auth fails
const sendWithDrain = (req, res, status, body) => {
  if (req.readable && !req.readableEnded) {
    req.resume();
    req.on('end', () => res.status(status).json(body));
    req.on('error', () => res.status(status).json(body));
  } else {
    res.status(status).json(body);
  }
};

const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return sendWithDrain(req, res, 401, { error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    // All token errors (invalid, expired, malformed) should return 401
    sendWithDrain(req, res, 401, { error: 'Invalid or expired token.' });
  }
};

module.exports = authMiddleware;