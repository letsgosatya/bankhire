/**
 * REQUEST ID MIDDLEWARE
 * Adds a unique request ID to every request for tracing and debugging
 * 
 * Security: Enables request tracing without exposing sensitive data
 */

const { v4: uuidv4 } = require('uuid');

/**
 * Middleware to attach a unique requestId to every incoming request.
 * The requestId is available as req.requestId and also sent in response headers.
 */
const requestIdMiddleware = (req, res, next) => {
  // Use existing X-Request-ID header if provided, otherwise generate new
  const requestId = req.headers['x-request-id'] || uuidv4();
  
  // Attach to request object for logging and error handling
  req.requestId = requestId;
  
  // Add to response headers for client-side correlation
  res.setHeader('X-Request-ID', requestId);
  
  next();
};

module.exports = requestIdMiddleware;
