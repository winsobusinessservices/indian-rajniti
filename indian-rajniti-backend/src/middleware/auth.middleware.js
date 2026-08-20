const jwt = require("jsonwebtoken");

const AUTH_COOKIE_NAME = "token";

// Verifies the JWT from the auth cookie (falling back to a Bearer header for
// non-browser clients) and attaches its payload ({ userId, role }) to req.user
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.split("Bearer ")[1]
      : null;
    const token = req.cookies?.[AUTH_COOKIE_NAME] || bearerToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication token required",
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("Missing JWT_SECRET in environment");
      return res.status(500).json({
        success: false,
        message: "Server configuration error",
      });
    }

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decodedToken;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token",
    });
  }
};

// Restricts a route to specific roles. Must run after authenticate.
// Usage: router.get("/admin", authenticate, authorize("ADMIN"), handler)
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action",
      });
    }

    next();
  };
};

module.exports = { authenticate, authorize };
